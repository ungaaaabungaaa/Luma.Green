import { ConvexError, type Infer, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import { indiaToday } from "./lib/onboarding";
import { vOrgKind, vTradeStatus } from "./lib/validators";
import { vMaterialRef } from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";
import { vLotOrigin, vLotStatus } from "./tables/lots";

/**
 * Lots and traceability. Every kilo a business holds belongs to a lot; a lot
 * links back to the pickup receipt, the purchase or the sorting run it came
 * from, and forward to the trades and sorting runs that took kilos off it.
 *
 * Tracing is by mass balance, never by following one household's bottle into
 * a bale: a sale is matched to the lots it could have come from — receipted
 * lots first, oldest first, then opening stock — and a sorting run's outputs
 * inherit their inputs' receipts in proportion. The numbers are exact
 * (integer grams); the attribution is a bookkeeping convention, stated as
 * such on every screen.
 *
 * Lots are derived from the ledger (completed pickups and trades) by
 * `rebuildFromLedger`, which is idempotent. Sorting runs are recorded by the
 * business and move the stock book like a trade does.
 */

/** Lots one business reads at a time. */
const MAX_LOTS = 1000;
/** Bookings and trades a rebuild scans; keep running totals past it. */
const MAX_ROWS = 2000;
const MAX_INPUTS = 30;
const MAX_OUTPUTS = 20;
/** A sorting run's note, in characters. The form uses the same limit. */
export const NOTE_MAX_LENGTH = 140;
/** How deep and how wide a trace tree goes before it says "more". */
const TRACE_DEPTH = 8;
const TRACE_NODES = 120;

type Lot = Doc<"lots">;
type Move = Doc<"lotMoves">;
type Run = Doc<"sortingRuns">;
type Org = Doc<"orgs">;
type Trade = Doc<"trades">;
type Materials = Awaited<ReturnType<typeof materialIndex>>;
type MaterialRef = Infer<typeof vMaterialRef>;

export type LotOrigin = Infer<typeof vLotOrigin>;
export type LotStatus = Infer<typeof vLotStatus>;

// --- Pure rules -------------------------------------------------------------

export interface OpenLot {
  id: Id<"lots">;
  origin: LotOrigin;
  createdAt: number;
  remainingGrams: number;
}

export interface Allocation {
  lotId: Id<"lots">;
  grams: number;
}

/** Receipted lots come before opening stock; within each, the oldest first. */
function byAllocationOrder(a: OpenLot, b: OpenLot): number {
  return (
    Number(a.origin === "opening") - Number(b.origin === "opening") ||
    a.createdAt - b.createdAt
  );
}

/**
 * Which lots a sale of `grams` came from, by mass balance: receipted lots
 * that existed when the load left (`before`), oldest first, then opening
 * stock (which by definition was already there). Whatever no lot can cover
 * is `unmatchedGrams`: the business sold more than it had on record.
 */
export function allocateSale(
  lots: readonly OpenLot[],
  grams: number,
  before: number,
): { allocations: Allocation[]; unmatchedGrams: number } {
  const allocations: Allocation[] = [];
  let left = grams;
  const candidates = lots
    .filter(
      (lot) =>
        lot.remainingGrams > 0 &&
        (lot.origin === "opening" || lot.createdAt <= before),
    )
    .toSorted(byAllocationOrder);
  for (const lot of candidates) {
    if (left === 0) break;
    const taken = Math.min(left, lot.remainingGrams);
    allocations.push({ lotId: lot.id, grams: taken });
    left -= taken;
  }
  return { allocations, unmatchedGrams: left };
}

/** What a sorting run adds up to; `lossGrams` is what neither output nor reject explains. */
export function sortingTotals(
  inputs: readonly { grams: number }[],
  outputs: readonly { grams: number }[],
  rejectGrams: number,
): { inputGrams: number; outputGrams: number; lossGrams: number } {
  const inputGrams = inputs.reduce((sum, input) => sum + input.grams, 0);
  const outputGrams = outputs.reduce((sum, output) => sum + output.grams, 0);
  return {
    inputGrams,
    outputGrams,
    lossGrams: inputGrams - outputGrams - rejectGrams,
  };
}

/** Whether a lot with `remainingGrams` left is open, sold out or sorted away. */
export function lotStatusFor(
  remainingGrams: number,
  moves: readonly Pick<Move, "kind" | "grams">[],
): LotStatus {
  if (remainingGrams > 0) return "open";
  let sold = 0;
  let other = 0;
  for (const move of moves) {
    if (move.kind === "sold") sold += move.grams;
    else other += move.grams;
  }
  return other > sold ? "consumed" : "sold";
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/** When a trade reached a status, or undefined if it never did. */
function reachedAt(trade: Trade, status: Trade["status"]): number | undefined {
  return trade.timeline.find((step) => step.status === status)?.at;
}

/** A load has left the seller once it's dispatched; the sale is then a lot move. */
function hasLeft(trade: Trade): boolean {
  return trade.status === "dispatched" || trade.status === "completed";
}

function completedAt(trade: Trade): number {
  return reachedAt(trade, "completed") ?? trade.updatedAt;
}

function leftAt(trade: Trade): number {
  return reachedAt(trade, "dispatched") ?? completedAt(trade);
}

/**
 * The area of an address: the last part before the city. "Flat 4B, Rose
 * Apartments, Yeshwanthpur, Bengaluru" → "Yeshwanthpur". Households are
 * traced to their area only, never to a door.
 */
export function areaOf(
  address: string | undefined,
  city: string,
): string | null {
  if (!address) return null;
  const cityAt = address.toLowerCase().indexOf(`, ${city.toLowerCase()}`);
  const beforeCity = cityAt === -1 ? address : address.slice(0, cityAt);
  const parts = beforeCity
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  return parts.at(-1) ?? null;
}

function firstName(name: string | undefined): string | null {
  const first = name?.trim().split(/\s+/, 1)[0];
  return first === undefined || first === "" ? null : first;
}

// --- Loading one business's lots --------------------------------------------

function materialRef(materials: Materials, code: string): MaterialRef {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? "other",
  };
}

async function lotsOf(ctx: QueryCtx, orgId: Id<"orgs">): Promise<Lot[]> {
  return ctx.db
    .query("lots")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .take(MAX_LOTS);
}

async function movesOf(ctx: QueryCtx, lotId: Id<"lots">): Promise<Move[]> {
  return ctx.db
    .query("lotMoves")
    .withIndex("by_lot", (q) => q.eq("lotId", lotId))
    .take(MAX_LOTS);
}

async function runsOf(ctx: QueryCtx, orgId: Id<"orgs">): Promise<Run[]> {
  return ctx.db
    .query("sortingRuns")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .order("desc")
    .take(MAX_LOTS);
}

async function childLotsOf(ctx: QueryCtx, run: Run): Promise<Lot[]> {
  const sorted = await ctx.db
    .query("lots")
    .withIndex("by_origin", (q) =>
      q.eq("origin", "sorting").eq("originId", run._id),
    )
    .take(MAX_OUTPUTS);
  const produced = await ctx.db
    .query("lots")
    .withIndex("by_origin", (q) =>
      q.eq("origin", "production").eq("originId", run._id),
    )
    .take(MAX_OUTPUTS);
  return [...sorted, ...produced];
}

/** Everything the read functions share: caches and the viewer's business. */
interface Reader {
  ctx: QueryCtx;
  viewer: Org;
  materials: Materials;
  orgOf: (id: Id<"orgs">) => Promise<Org | null>;
  lotOf: (id: Id<"lots">) => Promise<Lot | null>;
  shares: Map<Id<"lots">, Promise<number>>;
}

async function readerFor(
  ctx: QueryCtx,
  viewer: Org,
  known: readonly Lot[],
): Promise<Reader> {
  const orgs = new Map<Id<"orgs">, Promise<Org | null>>();
  const lots = new Map<Id<"lots">, Promise<Lot | null>>();
  for (const lot of known) lots.set(lot._id, Promise.resolve(lot));
  return {
    ctx,
    viewer,
    materials: await materialIndex(ctx),
    orgOf: (id) => {
      let org = orgs.get(id);
      if (!org) {
        org = ctx.db.get("orgs", id);
        orgs.set(id, org);
      }
      return org;
    },
    lotOf: (id) => {
      let lot = lots.get(id);
      if (!lot) {
        lot = ctx.db.get("lots", id);
        lots.set(id, lot);
      }
      return lot;
    },
    shares: new Map(),
  };
}

async function runOf(
  ctx: QueryCtx,
  originId: string,
): Promise<Run | null> {
  const runId = ctx.db.normalizeId("sortingRuns", originId);
  return runId ? ctx.db.get("sortingRuns", runId) : null;
}

async function bookingOf(ctx: QueryCtx, originId: string) {
  const bookingId = ctx.db.normalizeId("bookings", originId);
  return bookingId ? ctx.db.get("bookings", bookingId) : null;
}

async function tradeOf(ctx: QueryCtx, originId: string) {
  const tradeId = ctx.db.normalizeId("trades", originId);
  return tradeId ? ctx.db.get("trades", tradeId) : null;
}

/** A run's outputs inherit their inputs' receipts, weighted by grams. */
async function runShareOf(reader: Reader, run: Run | null): Promise<number> {
  if (!run || run.inputs.length === 0) return 0;
  let weighted = 0;
  let total = 0;
  for (const input of run.inputs) {
    const parent = await reader.lotOf(input.lotId);
    total += input.grams;
    if (parent) weighted += input.grams * (await receiptShareOf(reader, parent));
  }
  return total === 0 ? 0 : weighted / total;
}

async function sortedShareOf(reader: Reader, originId: string) {
  return runShareOf(reader, await runOf(reader.ctx, originId));
}

/**
 * How much of a lot has receipts behind it, 0 to 1. Pickups and purchases
 * are receipted at their own hand-off; opening stock never is; a sorting
 * run's outputs inherit their inputs' share.
 */
async function receiptShareOf(reader: Reader, lot: Lot): Promise<number> {
  const known = reader.shares.get(lot._id);
  if (known) return known;
  let share: Promise<number>;
  switch (lot.origin) {
    case "pickup":
    case "purchase": {
      share = Promise.resolve(1);
      break;
    }
    case "opening": {
      share = Promise.resolve(0);
      break;
    }
    case "sorting":
    case "production": {
      share = sortedShareOf(reader, lot.originId);
      break;
    }
  }
  reader.shares.set(lot._id, share);
  return share;
}

// --- Result shapes ----------------------------------------------------------

const vSource = v.union(
  v.object({ kind: v.literal("pickup"), area: v.union(v.string(), v.null()) }),
  v.object({
    kind: v.literal("purchase"),
    sellerName: v.string(),
    invoiceNo: v.union(v.string(), v.null()),
  }),
  v.object({
    kind: v.literal("run"),
    runId: v.union(v.id("sortingRuns"), v.null()),
    date: v.union(v.string(), v.null()),
  }),
  v.object({ kind: v.literal("opening") }),
);

const vLotRow = v.object({
  id: v.id("lots"),
  material: vMaterialRef,
  grams: v.number(),
  remainingGrams: v.number(),
  origin: vLotOrigin,
  status: vLotStatus,
  createdAt: v.number(),
  /** 0 to 1: how much of the lot has receipts behind it. */
  receiptShare: v.number(),
  source: vSource,
});

type LotRow = Infer<typeof vLotRow>;

const vWentTo = v.object({
  name: v.string(),
  kind: vOrgKind,
  grams: v.number(),
});

const vOriginCounts = v.object({
  pickup: v.number(),
  purchase: v.number(),
  sorting: v.number(),
  production: v.number(),
  opening: v.number(),
});

const vMaterialGroup = v.object({
  material: vMaterialRef,
  openGrams: v.number(),
  lotCount: v.number(),
  origins: vOriginCounts,
  /** Who bought from these lots, most kilos first. */
  wentTo: v.array(vWentTo),
  lots: v.array(vLotRow),
});

type MaterialGroup = Infer<typeof vMaterialGroup>;

const vRunRow = v.object({
  id: v.id("sortingRuns"),
  date: v.string(),
  inputGrams: v.number(),
  outputGrams: v.number(),
  rejectGrams: v.number(),
  outputs: v.array(v.object({ material: vMaterialRef, grams: v.number() })),
  note: v.union(v.string(), v.null()),
  createdAt: v.number(),
});

const vBalanceWarning = v.union(
  /** Sold or dispatched more than every lot, opening stock included, could cover. */
  v.literal("sold_more_than_received"),
  /** The stock book and the lots disagree: a rebuild is due, or stock moved off-book. */
  v.literal("book_differs"),
);

const vBalanceRow = v.object({
  material: vMaterialRef,
  openingGrams: v.number(),
  /** Pickup receipts and completed purchases. */
  receivedGrams: v.number(),
  /** Outputs of sorting and production runs. */
  producedGrams: v.number(),
  /** Inputs to sorting and production runs. */
  consumedGrams: v.number(),
  rejectGrams: v.number(),
  /** Completed sales. */
  soldGrams: v.number(),
  /** Dispatched, not yet confirmed by the buyer. */
  inTransitGrams: v.number(),
  /** Of what was sold or dispatched, how much has no receipts behind it. */
  soldWithoutReceiptsGrams: v.number(),
  /** Sold or dispatched beyond what any lot could cover. */
  unmatchedGrams: v.number(),
  lotStockGrams: v.number(),
  bookStockGrams: v.number(),
  warnings: v.array(vBalanceWarning),
});

type BalanceRow = Infer<typeof vBalanceRow>;

const vTraceNode = v.union(
  v.object({
    kind: v.literal("lot"),
    depth: v.number(),
    lotId: v.id("lots"),
    /** Mine: the screen can link to it. */
    isMine: v.boolean(),
    orgName: v.string(),
    material: vMaterialRef,
    /** Kilos of this lot attributed along this path. */
    grams: v.number(),
    origin: vLotOrigin,
    status: vLotStatus,
    createdAt: v.number(),
  }),
  v.object({
    kind: v.literal("pickup"),
    depth: v.number(),
    at: v.number(),
    shopName: v.string(),
    /** The household's area, never its door. */
    area: v.union(v.string(), v.null()),
    /** First name, only for the shop that did the pickup. */
    household: v.union(v.string(), v.null()),
    grams: v.number(),
    paise: v.number(),
    method: v.union(v.literal("cash"), v.literal("upi")),
  }),
  v.object({
    kind: v.literal("trade"),
    depth: v.number(),
    tradeId: v.id("trades"),
    invoiceNo: v.union(v.string(), v.null()),
    sellerName: v.string(),
    buyerName: v.string(),
    /** The receiver's pollution-board consent number is on file. */
    buyerConsent: v.boolean(),
    grams: v.number(),
    status: vTradeStatus,
    paidAt: v.union(v.number(), v.null()),
    dispatchedAt: v.union(v.number(), v.null()),
    completedAt: v.union(v.number(), v.null()),
  }),
  v.object({
    kind: v.literal("run"),
    depth: v.number(),
    runId: v.id("sortingRuns"),
    orgName: v.string(),
    date: v.string(),
    inputGrams: v.number(),
    outputGrams: v.number(),
    rejectGrams: v.number(),
    note: v.union(v.string(), v.null()),
  }),
  v.object({
    kind: v.literal("opening"),
    depth: v.number(),
    orgName: v.string(),
    grams: v.number(),
    createdAt: v.number(),
  }),
  /** The tree was cut here: `count` more steps exist. */
  v.object({ kind: v.literal("more"), depth: v.number(), count: v.number() }),
);

export type TraceNode = Infer<typeof vTraceNode>;

const vCheckStatus = v.union(
  v.literal("done"),
  v.literal("partial"),
  v.literal("missing"),
  v.literal("not_yet"),
);

const vCheckItem = v.union(
  v.literal("weighed"),
  v.literal("both_sides"),
  v.literal("paid"),
  v.literal("receiver_consent"),
);

const vChecklist = v.array(
  v.object({ id: vCheckItem, status: vCheckStatus }),
);

export type CheckStatus = Infer<typeof vCheckStatus>;
export type Checklist = Infer<typeof vChecklist>;

const vLotDetail = v.object({
  lot: vLotRow,
  business: v.object({ name: v.string(), kind: vOrgKind }),
  back: v.array(vTraceNode),
  forward: v.array(vTraceNode),
  checklist: vChecklist,
  creditReady: v.boolean(),
});

const vRebuildResult = v.object({
  lotsCreated: v.number(),
  movesCreated: v.number(),
  openingCreated: v.number(),
});

export type RebuildResult = Infer<typeof vRebuildResult>;

// --- Rows -------------------------------------------------------------------

async function sourceOf(
  reader: Reader,
  lot: Lot,
): Promise<Infer<typeof vSource>> {
  switch (lot.origin) {
    case "pickup": {
      const booking = await bookingOf(reader.ctx, lot.originId);
      return {
        kind: "pickup",
        area: areaOf(booking?.address, reader.viewer.city),
      };
    }
    case "purchase": {
      const trade = await tradeOf(reader.ctx, lot.originId);
      const seller = trade ? await reader.orgOf(trade.sellerOrgId) : null;
      return {
        kind: "purchase",
        sellerName: seller?.name ?? "",
        invoiceNo: trade?.invoiceNo ?? null,
      };
    }
    case "sorting":
    case "production": {
      const run = await runOf(reader.ctx, lot.originId);
      return { kind: "run", runId: run?._id ?? null, date: run?.date ?? null };
    }
    case "opening": {
      return { kind: "opening" };
    }
  }
}

async function lotRow(reader: Reader, lot: Lot): Promise<LotRow> {
  return {
    id: lot._id,
    material: materialRef(reader.materials, lot.materialCode),
    grams: lot.grams,
    remainingGrams: lot.remainingGrams,
    origin: lot.origin,
    status: lot.status,
    createdAt: lot.createdAt,
    receiptShare: await receiptShareOf(reader, lot),
    source: await sourceOf(reader, lot),
  };
}

function runRow(run: Run, materials: Materials): Infer<typeof vRunRow> {
  const totals = sortingTotals(run.inputs, run.outputs, run.rejectGrams);
  return {
    id: run._id,
    date: run.date,
    inputGrams: totals.inputGrams,
    outputGrams: totals.outputGrams,
    rejectGrams: run.rejectGrams,
    outputs: run.outputs.map((output) => ({
      material: materialRef(materials, output.materialCode),
      grams: output.grams,
    })),
    note: run.note ?? null,
    createdAt: run.createdAt,
  };
}

// --- Lots by material -------------------------------------------------------

type Grouping = MaterialGroup & { buyers: Map<Id<"orgs">, number> };

function emptyGroup(material: MaterialRef): Grouping {
  return {
    material,
    openGrams: 0,
    lotCount: 0,
    origins: { pickup: 0, purchase: 0, sorting: 0, production: 0, opening: 0 },
    wentTo: [],
    lots: [],
    buyers: new Map(),
  };
}

/** Who bought from a lot and how much, from its "sold" moves. */
async function addBuyers(reader: Reader, lot: Lot, buyers: Map<Id<"orgs">, number>) {
  const moves = await movesOf(reader.ctx, lot._id);
  for (const move of moves) {
    if (move.kind !== "sold" || !move.tradeId) continue;
    const trade = await reader.ctx.db.get("trades", move.tradeId);
    if (!trade) continue;
    buyers.set(trade.buyerOrgId, (buyers.get(trade.buyerOrgId) ?? 0) + move.grams);
  }
}

async function finishGroup(reader: Reader, group: Grouping): Promise<MaterialGroup> {
  const { buyers, ...rest } = group;
  const wentTo: Infer<typeof vWentTo>[] = [];
  for (const [buyerId, grams] of buyers) {
    const buyer = await reader.orgOf(buyerId);
    if (buyer) wentTo.push({ name: buyer.name, kind: buyer.kind, grams });
  }
  return { ...rest, wentTo: wentTo.toSorted((a, b) => b.grams - a.grams) };
}

interface Totals {
  openGrams: number;
  lotCount: number;
  receiptedGrams: number;
}

/** Newest lots first, grouped by material, with who bought from each group. */
async function groupLots(
  reader: Reader,
  lots: readonly Lot[],
): Promise<{ groups: MaterialGroup[]; totals: Totals }> {
  const groups = new Map<string, Grouping>();
  const totals: Totals = { openGrams: 0, lotCount: 0, receiptedGrams: 0 };
  const newestFirst = lots.toSorted((a, b) => b.createdAt - a.createdAt);
  for (const lot of newestFirst) {
    const row = await lotRow(reader, lot);
    let group = groups.get(lot.materialCode);
    if (!group) {
      group = emptyGroup(row.material);
      groups.set(lot.materialCode, group);
    }
    group.lots.push(row);
    group.lotCount += 1;
    group.openGrams += lot.remainingGrams;
    group.origins[lot.origin] += 1;
    totals.lotCount += 1;
    totals.openGrams += lot.remainingGrams;
    totals.receiptedGrams += Math.round(lot.remainingGrams * row.receiptShare);
    await addBuyers(reader, lot, group.buyers);
  }
  const finished: MaterialGroup[] = [];
  for (const group of groups.values()) {
    finished.push(await finishGroup(reader, group));
  }
  return {
    groups: finished.toSorted(
      (a, b) => b.openGrams - a.openGrams || b.lotCount - a.lotCount,
    ),
    totals,
  };
}

/**
 * `/app/lots`: my lots grouped by material — kilos on hand, where they came
 * from and who bought from them — plus my latest sorting runs.
 */
export const mine = query({
  args: {},
  returns: v.object({
    kind: vOrgKind,
    groups: v.array(vMaterialGroup),
    runs: v.array(vRunRow),
    totals: v.object({
      openGrams: v.number(),
      lotCount: v.number(),
      /** Kilos on hand with receipts behind them. */
      receiptedGrams: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const lots = await lotsOf(ctx, org._id);
    const reader = await readerFor(ctx, org, lots);
    const { groups, totals } = await groupLots(reader, lots);
    const runs = await runsOf(ctx, org._id);
    return {
      kind: org.kind,
      groups,
      runs: runs.slice(0, 10).map((run) => runRow(run, reader.materials)),
      totals,
    };
  },
});

/**
 * "Record a sorting run": my open lots to pick inputs from, and the active
 * materials the outputs can be.
 */
export const openLots = query({
  args: {},
  returns: v.object({
    lots: v.array(vLotRow),
    materials: v.array(
      v.object({
        code: v.string(),
        names: v.record(v.string(), v.string()),
        family: vMaterialRef.fields.family,
        stage: v.union(v.literal("scrap"), v.literal("recycled")),
      }),
    ),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const all = await lotsOf(ctx, org._id);
    const open = all.filter(
      (lot) => lot.status === "open" && lot.remainingGrams > 0,
    );
    const reader = await readerFor(ctx, org, open);
    const lots: LotRow[] = [];
    const oldestFirst = open.toSorted((a, b) => a.createdAt - b.createdAt);
    for (const lot of oldestFirst) lots.push(await lotRow(reader, lot));
    const materials = [];
    for (const material of reader.materials.values()) {
      if (!material.active) continue;
      materials.push({
        code: material.code,
        names: material.names,
        family: material.family,
        stage: material.stage,
      });
    }
    return { lots, materials };
  },
});

// --- Mass balance -----------------------------------------------------------

function emptyBalanceRow(material: MaterialRef): BalanceRow {
  return {
    material,
    openingGrams: 0,
    receivedGrams: 0,
    producedGrams: 0,
    consumedGrams: 0,
    rejectGrams: 0,
    soldGrams: 0,
    inTransitGrams: 0,
    soldWithoutReceiptsGrams: 0,
    unmatchedGrams: 0,
    lotStockGrams: 0,
    bookStockGrams: 0,
    warnings: [],
  };
}

/**
 * One business's mass balance as it adds up: a row per material, from its
 * lots, its sales in the ledger and its stock book.
 */
class BalanceSheet {
  private readonly rows = new Map<string, BalanceRow>();
  /** Kilos of sales that a lot move accounts for, per material. */
  private readonly matched = new Map<string, number>();

  constructor(private readonly reader: Reader) {}

  private rowFor(code: string): BalanceRow {
    let row = this.rows.get(code);
    if (!row) {
      row = emptyBalanceRow(materialRef(this.reader.materials, code));
      this.rows.set(code, row);
    }
    return row;
  }

  /** What a lot brought in, what's left, and what its moves took out. */
  async addLot(lot: Lot) {
    const row = this.rowFor(lot.materialCode);
    row.lotStockGrams += lot.remainingGrams;
    switch (lot.origin) {
      case "opening": {
        row.openingGrams += lot.grams;
        break;
      }
      case "pickup":
      case "purchase": {
        row.receivedGrams += lot.grams;
        break;
      }
      case "sorting":
      case "production": {
        row.producedGrams += lot.grams;
        break;
      }
    }
    // Sold moves count against receipts; every other move is stock sorted or used.
    const share = await receiptShareOf(this.reader, lot);
    const moves = await movesOf(this.reader.ctx, lot._id);
    for (const move of moves) {
      if (move.kind === "sold") {
        row.soldWithoutReceiptsGrams += Math.round(move.grams * (1 - share));
        this.matched.set(
          lot.materialCode,
          (this.matched.get(lot.materialCode) ?? 0) + move.grams,
        );
      } else {
        row.consumedGrams += move.grams;
      }
    }
  }

  /** Rejects belong to the materials that went in, in proportion. */
  async addRejects() {
    const runs = await runsOf(this.reader.ctx, this.reader.viewer._id);
    for (const run of runs) {
      const total = run.inputs.reduce((sum, input) => sum + input.grams, 0);
      if (total === 0 || run.rejectGrams === 0) continue;
      for (const input of run.inputs) {
        const parent = await this.reader.lotOf(input.lotId);
        if (!parent) continue;
        const row = this.rowFor(parent.materialCode);
        row.rejectGrams += Math.round((run.rejectGrams * input.grams) / total);
      }
    }
  }

  /** Sales from the ledger: delivered, or on the road. */
  async addSales() {
    const sales = await this.reader.ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerOrgId", this.reader.viewer._id))
      .order("desc")
      .take(MAX_ROWS);
    for (const trade of sales) {
      if (!hasLeft(trade)) continue;
      const row = this.rowFor(trade.materialCode);
      if (trade.status === "completed") row.soldGrams += trade.grams;
      else row.inTransitGrams += trade.grams;
    }
  }

  /** The stock book, for materials it holds or the lots know. */
  async addBook() {
    const inventory = await this.reader.ctx.db
      .query("inventory")
      .withIndex("by_org", (q) => q.eq("orgId", this.reader.viewer._id))
      .take(MAX_LOTS);
    for (const item of inventory) {
      if (item.grams <= 0 && !this.rows.has(item.materialCode)) continue;
      const row = this.rowFor(item.materialCode);
      row.bookStockGrams += item.grams;
    }
  }

  /** Every row with its warnings, the ones that need a look first. */
  finish(): { rows: BalanceRow[]; warningCount: number } {
    let warningCount = 0;
    for (const row of this.rows.values()) {
      const gone = row.soldGrams + row.inTransitGrams;
      const matched = this.matched.get(row.material.code) ?? 0;
      row.unmatchedGrams = Math.max(0, gone - matched);
      row.soldWithoutReceiptsGrams += row.unmatchedGrams;
      if (row.unmatchedGrams > 0) row.warnings.push("sold_more_than_received");
      if (row.bookStockGrams !== row.lotStockGrams) {
        row.warnings.push("book_differs");
      }
      warningCount += row.warnings.length;
    }
    return {
      rows: [...this.rows.values()].toSorted(
        (a, b) =>
          b.warnings.length - a.warnings.length ||
          b.lotStockGrams - a.lotStockGrams,
      ),
      warningCount,
    };
  }
}

/**
 * Per material: what came in, what went out and what's left, from the lots
 * and the ledger side by side. Warns when a business sold more than every
 * lot could cover, or when the stock book and the lots disagree.
 */
export const massBalance = query({
  args: {},
  returns: v.object({
    rows: v.array(vBalanceRow),
    warningCount: v.number(),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const lots = await lotsOf(ctx, org._id);
    const reader = await readerFor(ctx, org, lots);
    const sheet = new BalanceSheet(reader);
    for (const lot of lots) await sheet.addLot(lot);
    await sheet.addRejects();
    await sheet.addSales();
    await sheet.addBook();
    return sheet.finish();
  },
});

// --- Tracing ----------------------------------------------------------------

interface Tracer extends Reader {
  nodes: TraceNode[];
  seen: Set<string>;
}

function tracerFor(reader: Reader): Tracer {
  return { ...reader, nodes: [], seen: new Set() };
}

function orgName(org: Org | null): string {
  return org?.name ?? "";
}

/** Adds a node unless the tree is already as wide as it may be. */
function didAdd(tracer: Tracer, node: TraceNode): boolean {
  if (tracer.nodes.length < TRACE_NODES) {
    tracer.nodes.push(node);
    return true;
  }
  const last = tracer.nodes.at(-1);
  if (last?.kind === "more") last.count += 1;
  else tracer.nodes.push({ kind: "more", depth: node.depth, count: 1 });
  return false;
}

function lotNode(
  tracer: Tracer,
  lot: Lot,
  depth: number,
  grams: number,
  owner: Org | null,
): TraceNode {
  return {
    kind: "lot",
    depth,
    lotId: lot._id,
    isMine: lot.orgId === tracer.viewer._id,
    orgName: orgName(owner),
    material: materialRef(tracer.materials, lot.materialCode),
    grams,
    origin: lot.origin,
    status: lot.status,
    createdAt: lot.createdAt,
  };
}

function tradeNode(
  trade: Trade,
  depth: number,
  grams: number,
  seller: Org | null,
  buyer: Org | null,
): TraceNode {
  return {
    kind: "trade",
    depth,
    tradeId: trade._id,
    invoiceNo: trade.invoiceNo ?? null,
    sellerName: orgName(seller),
    buyerName: orgName(buyer),
    buyerConsent: Boolean(buyer?.consent?.number),
    grams,
    status: trade.status,
    paidAt: reachedAt(trade, "paid_to_escrow") ?? null,
    dispatchedAt: reachedAt(trade, "dispatched") ?? null,
    completedAt: reachedAt(trade, "completed") ?? null,
  };
}

function runNode(run: Run, depth: number, owner: Org | null): TraceNode {
  const totals = sortingTotals(run.inputs, run.outputs, run.rejectGrams);
  return {
    kind: "run",
    depth,
    runId: run._id,
    orgName: orgName(owner),
    date: run.date,
    inputGrams: totals.inputGrams,
    outputGrams: totals.outputGrams,
    rejectGrams: run.rejectGrams,
    note: run.note ?? null,
  };
}

/** Kilos of `part` attributed when `whole` is split over `share` of `total`. */
function portion(whole: number, share: number, total: number): number {
  return total === 0 ? 0 : Math.round((whole * share) / total);
}

async function backFromPickup(
  tracer: Tracer,
  lot: Lot,
  grams: number,
  depth: number,
) {
  const booking = await bookingOf(tracer.ctx, lot.originId);
  if (!booking?.receipt) return;
  const line = booking.receipt.lines.find(
    (item) => item.materialCode === lot.materialCode,
  );
  const shop = await tracer.orgOf(booking.orgId);
  const isMine = booking.orgId === tracer.viewer._id;
  didAdd(tracer, {
    kind: "pickup",
    depth,
    at: booking.receipt.paidAt,
    shopName: orgName(shop),
    area: areaOf(booking.address, shop?.city ?? tracer.viewer.city),
    household: isMine ? firstName(booking.name) : null,
    grams: line?.grams ?? grams,
    paise: line?.paise ?? 0,
    method: booking.receipt.method,
  });
}

/** The trade, then the seller's lots it was matched to by mass balance. */
async function backFromPurchase(
  tracer: Tracer,
  lot: Lot,
  grams: number,
  depth: number,
) {
  const trade = await tradeOf(tracer.ctx, lot.originId);
  if (!trade) return;
  const seller = await tracer.orgOf(trade.sellerOrgId);
  const buyer = await tracer.orgOf(trade.buyerOrgId);
  if (!didAdd(tracer, tradeNode(trade, depth, grams, seller, buyer))) return;
  const moves = await tracer.ctx.db
    .query("lotMoves")
    .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
    .take(MAX_LOTS);
  for (const move of moves) {
    const source = await tracer.lotOf(move.lotId);
    if (!source) continue;
    await traceLotBack(
      tracer,
      source,
      portion(grams, move.grams, trade.grams),
      depth + 1,
    );
  }
}

/** The run, then each input lot in proportion to what it put in. */
async function backFromRun(
  tracer: Tracer,
  lot: Lot,
  grams: number,
  depth: number,
) {
  const run = await runOf(tracer.ctx, lot.originId);
  if (!run) return;
  const owner = await tracer.orgOf(run.orgId);
  if (!didAdd(tracer, runNode(run, depth, owner))) return;
  const total = run.inputs.reduce((sum, input) => sum + input.grams, 0);
  for (const input of run.inputs) {
    const parent = await tracer.lotOf(input.lotId);
    if (!parent) continue;
    await traceLotBack(
      tracer,
      parent,
      portion(grams, input.grams, total),
      depth + 1,
    );
  }
}

async function backFromOpening(
  tracer: Tracer,
  lot: Lot,
  grams: number,
  depth: number,
) {
  const owner = await tracer.orgOf(lot.orgId);
  didAdd(tracer, {
    kind: "opening",
    depth,
    orgName: orgName(owner),
    grams,
    createdAt: lot.createdAt,
  });
}

/**
 * Back to where the kilos came from: through sorting runs to their inputs,
 * through purchases to the seller's lots, down to pickup receipts and
 * opening stock. Household details stop at the area.
 */
async function traceBack(
  tracer: Tracer,
  lot: Lot,
  grams: number,
  depth: number,
): Promise<void> {
  if (depth > TRACE_DEPTH) {
    didAdd(tracer, { kind: "more", depth, count: 1 });
    return;
  }
  switch (lot.origin) {
    case "pickup": {
      return backFromPickup(tracer, lot, grams, depth);
    }
    case "purchase": {
      return backFromPurchase(tracer, lot, grams, depth);
    }
    case "sorting":
    case "production": {
      return backFromRun(tracer, lot, grams, depth);
    }
    case "opening": {
      return backFromOpening(tracer, lot, grams, depth);
    }
  }
}

/** A lot on the way back, then whatever it came from. */
async function traceLotBack(
  tracer: Tracer,
  lot: Lot,
  grams: number,
  depth: number,
): Promise<void> {
  const key = `back:${lot._id}:${String(depth)}`;
  if (tracer.seen.has(key)) return;
  tracer.seen.add(key);
  const owner = await tracer.orgOf(lot.orgId);
  const isShown = didAdd(tracer, lotNode(tracer, lot, depth, grams, owner));
  if (isShown) await traceBack(tracer, lot, grams, depth + 1);
}

/** A sale to the buyer: one hop — the buyer's onward sales are theirs to show. */
async function forwardSale(tracer: Tracer, move: Move, depth: number) {
  if (!move.tradeId) return;
  const trade = await tracer.ctx.db.get("trades", move.tradeId);
  if (!trade) return;
  const seller = await tracer.orgOf(trade.sellerOrgId);
  const buyer = await tracer.orgOf(trade.buyerOrgId);
  didAdd(tracer, tradeNode(trade, depth, move.grams, seller, buyer));
}

/** A sorting run and the lots it made, each traced onward. */
async function forwardRun(
  tracer: Tracer,
  runId: Id<"sortingRuns">,
  depth: number,
) {
  const run = await tracer.ctx.db.get("sortingRuns", runId);
  if (!run) return;
  const owner = await tracer.orgOf(run.orgId);
  if (!didAdd(tracer, runNode(run, depth, owner))) return;
  const children = await childLotsOf(tracer.ctx, run);
  for (const child of children) {
    const node = lotNode(tracer, child, depth + 1, child.grams, owner);
    if (didAdd(tracer, node)) await traceForward(tracer, child, depth + 2);
  }
}

/** Forward to where the kilos went: sales and sorting runs, in time order. */
async function traceForward(
  tracer: Tracer,
  lot: Lot,
  depth: number,
): Promise<void> {
  if (depth > TRACE_DEPTH) {
    didAdd(tracer, { kind: "more", depth, count: 1 });
    return;
  }
  const key = `forward:${lot._id}`;
  if (tracer.seen.has(key)) return;
  tracer.seen.add(key);
  const moves = await movesOf(tracer.ctx, lot._id);
  const inOrder = moves.toSorted((a, b) => a.at - b.at);
  const runsShown = new Set<Id<"sortingRuns">>();
  for (const move of inOrder) {
    if (move.kind === "sold") {
      await forwardSale(tracer, move, depth);
    } else if (move.sortingRunId && !runsShown.has(move.sortingRunId)) {
      runsShown.add(move.sortingRunId);
      await forwardRun(tracer, move.sortingRunId, depth);
    }
  }
}

// --- Credit readiness -------------------------------------------------------

/** Done when all of it is covered, partial when some is, missing when none. */
function coverage(covered: number, total: number): CheckStatus {
  if (covered >= total) return "done";
  return covered > 0 ? "partial" : "missing";
}

/**
 * Whether the kilos in a lot could back a credit or certificate claim one
 * day: weighed and receipted, confirmed by both sides, paid by a recorded
 * method, and — once sold — received by a business whose pollution-board
 * consent is on file. Opening stock fails the first three by definition.
 */
export function readinessOf(
  receiptShare: number,
  forward: readonly TraceNode[],
): Checklist {
  const receipted = coverage(receiptShare, 1);
  const sales = forward.filter((node) => node.kind === "trade");
  const consented = sales.filter((sale) => sale.buyerConsent).length;
  const consent: CheckStatus =
    sales.length === 0 ? "not_yet" : coverage(consented, sales.length);
  return [
    { id: "weighed", status: receipted },
    { id: "both_sides", status: receipted },
    { id: "paid", status: receipted },
    { id: "receiver_consent", status: consent },
  ];
}

async function lotDetail(
  ctx: QueryCtx,
  org: Org,
  lot: Lot,
): Promise<Infer<typeof vLotDetail>> {
  const reader = await readerFor(ctx, org, [lot]);
  const row = await lotRow(reader, lot);
  const back = tracerFor(reader);
  await traceBack(back, lot, lot.grams, 0);
  const forward = tracerFor(reader);
  await traceForward(forward, lot, 0);
  const checklist = readinessOf(row.receiptShare, forward.nodes);
  return {
    lot: row,
    business: { name: org.name, kind: org.kind },
    back: back.nodes,
    forward: forward.nodes,
    checklist,
    creditReady: checklist.every((item) => item.status === "done"),
  };
}

/** One of my lots, or null — never another business's. */
async function myLot(
  ctx: QueryCtx,
  org: Org,
  lotId: string,
): Promise<Lot | null> {
  const id = ctx.db.normalizeId("lots", lotId);
  const lot = id ? await ctx.db.get("lots", id) : null;
  return lot?.orgId === org._id ? lot : null;
}

/**
 * `/app/lots/[id]`: one lot, traced back to pickup receipts and opening
 * stock and forward to trades and sorting runs, with its credit-readiness
 * checklist. Null for an unknown id or another business's lot.
 */
export const get = query({
  args: { lotId: v.string() },
  returns: v.union(v.null(), vLotDetail),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const lot = await myLot(ctx, org, args.lotId);
    return lot ? lotDetail(ctx, org, lot) : null;
  },
});

/**
 * The evidence pack for a lot, ready to save as JSON: the business, the lot,
 * its whole trace with weights, times, both sides' confirmations, payment
 * methods and receiver names, and the checklist. Supporting evidence, never
 * a certificate — `tracing` says how the kilos were attributed.
 */
export const evidencePack = query({
  args: { lotId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      format: v.literal("luma.green/evidence-pack/v1"),
      tracing: v.literal("mass_balance"),
      generatedAt: v.number(),
      business: v.object({
        name: v.string(),
        kind: vOrgKind,
        city: v.string(),
        gstin: v.union(v.string(), v.null()),
        consent: v.union(
          v.null(),
          v.object({
            board: v.string(),
            number: v.string(),
            validUntil: v.string(),
          }),
        ),
      }),
      lot: vLotRow,
      back: v.array(vTraceNode),
      forward: v.array(vTraceNode),
      checklist: vChecklist,
      creditReady: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const lot = await myLot(ctx, org, args.lotId);
    if (!lot) return null;
    const detail = await lotDetail(ctx, org, lot);
    return {
      format: "luma.green/evidence-pack/v1" as const,
      tracing: "mass_balance" as const,
      generatedAt: Date.now(),
      business: {
        name: org.name,
        kind: org.kind,
        city: org.city,
        gstin: org.gstin ?? null,
        consent: org.consent ?? null,
      },
      lot: detail.lot,
      back: detail.back,
      forward: detail.forward,
      checklist: detail.checklist,
      creditReady: detail.creditReady,
    };
  },
});

// --- Stock book -------------------------------------------------------------

interface Actor {
  orgId: Id<"orgs">;
  profileId?: Id<"profiles">;
}

/**
 * Adds (or, negative, takes) grams of one material in the stock book, the
 * way a trade does, and audits it. Never below zero: the lots are the check
 * that matters here, and a short book is reported on the balance screen.
 */
async function adjustStock(
  ctx: MutationCtx,
  actor: Actor,
  materialCode: string,
  deltaGrams: number,
  runId: Id<"sortingRuns">,
  now: number,
) {
  const row = await ctx.db
    .query("inventory")
    .withIndex("by_org_material", (q) =>
      q.eq("orgId", actor.orgId).eq("materialCode", materialCode),
    )
    .first();
  const grams = Math.max(0, (row?.grams ?? 0) + deltaGrams);
  let inventoryId: Id<"inventory">;
  if (row) {
    inventoryId = row._id;
    await ctx.db.patch("inventory", row._id, { grams, updatedAt: now });
  } else {
    inventoryId = await ctx.db.insert("inventory", {
      orgId: actor.orgId,
      materialCode,
      grams,
      updatedAt: now,
    });
  }
  await ctx.db.insert("auditLog", {
    orgId: actor.orgId,
    actorProfileId: actor.profileId,
    action: "inventory.adjusted",
    entityTable: "inventory",
    entityId: inventoryId,
    metadata: { materialCode, deltaGrams, grams, sortingRunId: runId },
    createdAt: now,
  });
}

// --- Sorting runs -----------------------------------------------------------

interface InputLine {
  lotId: Id<"lots">;
  grams: number;
}

interface OutputLine {
  materialCode: string;
  grams: number;
}

export interface RunInput {
  inputs: InputLine[];
  outputs: OutputLine[];
  rejectGrams: number;
  note?: string;
  date: string;
  now: number;
}

/** One line per key (repeats are added up), every gram a positive integer. */
function mergedLines<T extends { grams: number }>(
  lines: readonly T[],
  keyOf: (line: T) => string,
  max: number,
  emptyCode: string,
): T[] {
  if (lines.length === 0) throw new ConvexError(emptyCode);
  if (lines.length > max) throw new ConvexError("TOO_MANY_LINES");
  const byKey = new Map<string, T>();
  for (const line of lines) {
    if (!isPositiveInteger(line.grams)) throw new ConvexError("INVALID_WEIGHT");
    const known = byKey.get(keyOf(line));
    if (known) known.grams += line.grams;
    else byKey.set(keyOf(line), { ...line });
  }
  return [...byKey.values()];
}

/** The run's shape: lines, totals and note — refusing mass from nowhere. */
function checkRun(run: RunInput) {
  const inputs = mergedLines(
    run.inputs,
    (line) => line.lotId,
    MAX_INPUTS,
    "NOTHING_TO_SORT",
  );
  const outputs = mergedLines(
    run.outputs,
    (line) => line.materialCode,
    MAX_OUTPUTS,
    "NOTHING_SORTED",
  );
  if (!Number.isSafeInteger(run.rejectGrams) || run.rejectGrams < 0) {
    throw new ConvexError("INVALID_WEIGHT");
  }
  const note = run.note?.trim();
  if (note !== undefined && note.length > NOTE_MAX_LENGTH) {
    throw new ConvexError("NOTE_TOO_LONG");
  }
  const totals = sortingTotals(inputs, outputs, run.rejectGrams);
  if (totals.lossGrams < 0) throw new ConvexError("OUTPUT_EXCEEDS_INPUT");
  return {
    inputs,
    outputs,
    totals,
    note: note === undefined || note === "" ? undefined : note,
  };
}

function checkOutputs(materials: Materials, outputs: readonly OutputLine[]) {
  for (const output of outputs) {
    if (materials.get(output.materialCode)?.active !== true) {
      throw new ConvexError("UNKNOWN_MATERIAL");
    }
  }
}

/** My open lots with enough left, paired with what the run takes from each. */
async function parentsOf(
  ctx: MutationCtx,
  org: Org,
  inputs: readonly InputLine[],
): Promise<{ lot: Lot; grams: number }[]> {
  const parents: { lot: Lot; grams: number }[] = [];
  for (const input of inputs) {
    const lot = await ctx.db.get("lots", input.lotId);
    if (lot?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (lot.status !== "open") throw new ConvexError("LOT_NOT_OPEN");
    if (input.grams > lot.remainingGrams) {
      throw new ConvexError("NOT_ENOUGH_IN_LOT");
    }
    parents.push({ lot, grams: input.grams });
  }
  return parents;
}

async function takeInput(
  ctx: MutationCtx,
  actor: Actor,
  parent: { lot: Lot; grams: number },
  runId: Id<"sortingRuns">,
  now: number,
) {
  await ctx.db.insert("lotMoves", {
    lotId: parent.lot._id,
    kind: "sorted",
    grams: parent.grams,
    sortingRunId: runId,
    at: now,
  });
  const remainingGrams = parent.lot.remainingGrams - parent.grams;
  const moves = await movesOf(ctx, parent.lot._id);
  await ctx.db.patch("lots", parent.lot._id, {
    remainingGrams,
    status: lotStatusFor(remainingGrams, moves),
  });
  await adjustStock(ctx, actor, parent.lot.materialCode, -parent.grams, runId, now);
}

async function addOutput(
  ctx: MutationCtx,
  actor: Actor,
  materials: Materials,
  output: OutputLine,
  runId: Id<"sortingRuns">,
  parentLotIds: Id<"lots">[],
  now: number,
): Promise<Id<"lots">> {
  const stage = materials.get(output.materialCode)?.stage;
  const lotId = await ctx.db.insert("lots", {
    orgId: actor.orgId,
    materialCode: output.materialCode,
    grams: output.grams,
    remainingGrams: output.grams,
    origin: stage === "recycled" ? "production" : "sorting",
    originId: runId,
    parentLotIds,
    status: "open",
    createdAt: now,
  });
  await adjustStock(ctx, actor, output.materialCode, output.grams, runId, now);
  return lotId;
}

/**
 * Records a sorting run for `org`: takes the inputs off their lots, writes
 * one child lot per output with the inputs as parents, moves the stock book
 * and audits it. Refuses anything that would make mass appear from nowhere.
 */
async function recordRun(
  ctx: MutationCtx,
  org: Org,
  actorProfileId: Id<"profiles"> | undefined,
  run: RunInput,
): Promise<{ runId: Id<"sortingRuns">; lotIds: Id<"lots">[] }> {
  const { inputs, outputs, totals, note } = checkRun(run);
  const materials = await materialIndex(ctx);
  checkOutputs(materials, outputs);
  const parents = await parentsOf(ctx, org, inputs);

  const runId = await ctx.db.insert("sortingRuns", {
    orgId: org._id,
    date: run.date,
    inputs,
    outputs,
    rejectGrams: run.rejectGrams,
    note,
    createdAt: run.now,
  });
  const actor: Actor = { orgId: org._id, profileId: actorProfileId };
  for (const parent of parents) {
    await takeInput(ctx, actor, parent, runId, run.now);
  }
  const parentLotIds = parents.map((parent) => parent.lot._id);
  const lotIds: Id<"lots">[] = [];
  for (const output of outputs) {
    lotIds.push(
      await addOutput(ctx, actor, materials, output, runId, parentLotIds, run.now),
    );
  }
  await ctx.db.insert("auditLog", {
    orgId: org._id,
    actorProfileId,
    action: "sorting.recorded",
    entityTable: "sortingRuns",
    entityId: runId,
    metadata: {
      inputGrams: totals.inputGrams,
      outputGrams: totals.outputGrams,
      rejectGrams: run.rejectGrams,
      lossGrams: totals.lossGrams,
      lotIds,
    },
    createdAt: run.now,
  });
  return { runId, lotIds };
}

/**
 * "Record a sorting run": which of my open lots went in and how much, what
 * came out by material, and what was rejected. Outputs plus reject may not
 * exceed the inputs; a shortfall is recorded as loss (moisture, dust).
 */
export const recordSorting = mutation({
  args: {
    inputs: v.array(v.object({ lotId: v.id("lots"), grams: v.number() })),
    outputs: v.array(
      v.object({ materialCode: v.string(), grams: v.number() }),
    ),
    rejectGrams: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.object({
    runId: v.id("sortingRuns"),
    lotIds: v.array(v.id("lots")),
  }),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx);
    const now = Date.now();
    return recordRun(ctx, org, profile._id, {
      ...args,
      date: indiaToday(now),
      now,
    });
  },
});

/** The seed hook records runs the same way a business does. */
export async function seedSortingRun(
  ctx: MutationCtx,
  org: Org,
  run: RunInput,
): Promise<{ runId: Id<"sortingRuns">; lotIds: Id<"lots">[] }> {
  return recordRun(ctx, org, undefined, run);
}

// --- Rebuilding from the ledger ---------------------------------------------

interface WorkingLot extends OpenLot {
  materialCode: string;
  isTouched: boolean;
}

interface Rebuild {
  ctx: MutationCtx;
  org: Org;
  /** origin:originId:material of every lot, so nothing is created twice. */
  known: Set<string>;
  working: WorkingLot[];
  result: RebuildResult;
}

interface UnmatchedSale {
  trade: Trade;
  grams: number;
}

function lotKey(origin: LotOrigin, originId: string, materialCode: string) {
  return `${origin}:${originId}:${materialCode}`;
}

async function addLot(
  state: Rebuild,
  origin: LotOrigin,
  originId: string,
  materialCode: string,
  grams: number,
  createdAt: number,
) {
  const key = lotKey(origin, originId, materialCode);
  if (state.known.has(key) || grams <= 0) return;
  state.known.add(key);
  const id = await state.ctx.db.insert("lots", {
    orgId: state.org._id,
    materialCode,
    grams,
    remainingGrams: grams,
    origin,
    originId,
    parentLotIds: [],
    status: "open",
    createdAt,
  });
  state.working.push({
    id,
    origin,
    createdAt,
    remainingGrams: grams,
    materialCode,
    isTouched: false,
  });
  state.result.lotsCreated += 1;
}

/** 1. Pickup receipts, one lot per line. */
async function addReceiptLots(state: Rebuild) {
  const bookings = await state.ctx.db
    .query("bookings")
    .withIndex("by_org_status", (q) =>
      q.eq("orgId", state.org._id).eq("status", "completed"),
    )
    .order("desc")
    .take(MAX_ROWS);
  for (const booking of bookings) {
    if (!booking.receipt) continue;
    for (const line of booking.receipt.lines) {
      await addLot(
        state,
        "pickup",
        booking._id,
        line.materialCode,
        line.grams,
        booking.receipt.paidAt,
      );
    }
  }
}

/** 2. Completed purchases, one lot each. */
async function addPurchaseLots(state: Rebuild) {
  const purchases = await state.ctx.db
    .query("trades")
    .withIndex("by_buyer", (q) => q.eq("buyerOrgId", state.org._id))
    .order("desc")
    .take(MAX_ROWS);
  for (const trade of purchases) {
    if (trade.status !== "completed") continue;
    await addLot(
      state,
      "purchase",
      trade._id,
      trade.materialCode,
      trade.grams,
      completedAt(trade),
    );
  }
}

/** Matches a sale to my lots of that material and records the moves. */
async function recordSale(
  state: Rebuild,
  trade: Trade,
  grams: number,
): Promise<number> {
  const at = leftAt(trade);
  const candidates = state.working.filter(
    (lot) => lot.materialCode === trade.materialCode,
  );
  const { allocations, unmatchedGrams } = allocateSale(candidates, grams, at);
  for (const allocation of allocations) {
    await state.ctx.db.insert("lotMoves", {
      lotId: allocation.lotId,
      kind: "sold",
      grams: allocation.grams,
      tradeId: trade._id,
      at,
    });
    const lot = state.working.find((entry) => entry.id === allocation.lotId);
    if (lot) {
      lot.remainingGrams -= allocation.grams;
      lot.isTouched = true;
    }
    state.result.movesCreated += 1;
  }
  return unmatchedGrams;
}

/** 3. Sales that have left, matched in the order they left. */
async function recordSales(state: Rebuild): Promise<UnmatchedSale[]> {
  const trades = await state.ctx.db
    .query("trades")
    .withIndex("by_seller", (q) => q.eq("sellerOrgId", state.org._id))
    .order("desc")
    .take(MAX_ROWS);
  const sales = trades
    .filter((trade) => hasLeft(trade))
    .toSorted((a, b) => leftAt(a) - leftAt(b));
  const unmatched: UnmatchedSale[] = [];
  for (const trade of sales) {
    const already = await state.ctx.db
      .query("lotMoves")
      .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
      .first();
    if (already) continue;
    const grams = await recordSale(state, trade, trade.grams);
    if (grams > 0) unmatched.push({ trade, grams });
  }
  return unmatched;
}

function sumBy(entries: readonly UnmatchedSale[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const code = entry.trade.materialCode;
    totals.set(code, (totals.get(code) ?? 0) + entry.grams);
  }
  return totals;
}

/** What the book holds beyond the lots, plus what sold without any lot. */
async function addOpeningLot(
  state: Rebuild,
  materialCode: string,
  bookGrams: number,
  unmatched: readonly UnmatchedSale[],
) {
  const onLots = state.working
    .filter((lot) => lot.materialCode === materialCode)
    .reduce((sum, lot) => sum + lot.remainingGrams, 0);
  const gap = Math.max(0, bookGrams - onLots);
  const mine = unmatched.filter(
    (entry) => entry.trade.materialCode === materialCode,
  );
  const missing = mine.reduce((sum, entry) => sum + entry.grams, 0);
  if (gap + missing <= 0) return;
  // It was there before the first sale that needed it, at the latest.
  const openedAt = Math.min(
    state.org.createdAt,
    ...mine.map((entry) => leftAt(entry.trade) - 1),
  );
  await addLot(
    state,
    "opening",
    state.org._id,
    materialCode,
    gap + missing,
    openedAt,
  );
  state.result.openingCreated += 1;
  for (const entry of mine) await recordSale(state, entry.trade, entry.grams);
}

/**
 * 4. Opening stock, once per material: what the business held when it
 *    joined, which no receipt explains. Never created twice, so later sales
 *    beyond receipts stay unmatched and show as a warning.
 */
async function addOpeningStock(
  state: Rebuild,
  unmatched: readonly UnmatchedSale[],
) {
  const hasOpeningFor = new Set(
    state.working
      .filter((lot) => lot.origin === "opening")
      .map((lot) => lot.materialCode),
  );
  const inventory = await state.ctx.db
    .query("inventory")
    .withIndex("by_org", (q) => q.eq("orgId", state.org._id))
    .take(MAX_LOTS);
  const book = new Map(inventory.map((row) => [row.materialCode, row.grams]));
  const codes = new Set([...book.keys(), ...sumBy(unmatched).keys()]);
  for (const materialCode of codes) {
    if (hasOpeningFor.has(materialCode)) continue;
    await addOpeningLot(state, materialCode, book.get(materialCode) ?? 0, unmatched);
  }
}

/** 5. Settle what changed. */
async function settleLots(state: Rebuild) {
  for (const lot of state.working) {
    if (!lot.isTouched) continue;
    const moves = await movesOf(state.ctx, lot.id);
    await state.ctx.db.patch("lots", lot.id, {
      remainingGrams: lot.remainingGrams,
      status: lotStatusFor(lot.remainingGrams, moves),
    });
  }
}

/**
 * Derives a business's lots from the ledger, idempotently: one lot per
 * completed pickup receipt line and per completed purchase; one set of
 * "sold" moves per dispatched or completed sale, matched by mass balance;
 * and, the first time only, one opening-stock lot per material for what the
 * stock book held that no receipt explains. Running it again creates only
 * what's new. Sorting runs are never touched.
 */
export async function rebuildOrg(
  ctx: MutationCtx,
  org: Org,
): Promise<RebuildResult> {
  const lots = await lotsOf(ctx, org._id);
  const state: Rebuild = {
    ctx,
    org,
    known: new Set(
      lots.map((lot) => lotKey(lot.origin, lot.originId, lot.materialCode)),
    ),
    working: lots.map((lot) => ({
      id: lot._id,
      origin: lot.origin,
      createdAt: lot.createdAt,
      remainingGrams: lot.remainingGrams,
      materialCode: lot.materialCode,
      isTouched: false,
    })),
    result: { lotsCreated: 0, movesCreated: 0, openingCreated: 0 },
  };
  await addReceiptLots(state);
  await addPurchaseLots(state);
  const unmatched = await recordSales(state);
  await addOpeningStock(state, unmatched);
  await settleLots(state);
  return state.result;
}

/** Rebuilds and writes the audit row; shared by the seed and both mutations. */
export async function rebuildLedger(
  ctx: MutationCtx,
  org: Org,
  actorProfileId?: Id<"profiles">,
): Promise<RebuildResult> {
  const now = Date.now();
  const result = await rebuildOrg(ctx, org);
  await ctx.db.insert("auditLog", {
    orgId: org._id,
    actorProfileId,
    action: "lots.rebuilt",
    entityTable: "orgs",
    entityId: org._id,
    metadata: result,
    createdAt: now,
  });
  return result;
}

/** For the seed and for repairs: derives one business's lots from the ledger. */
export const rebuildFromLedger = internalMutation({
  args: { orgId: v.id("orgs") },
  returns: vRebuildResult,
  handler: async (ctx, args) => {
    const org = await ctx.db.get("orgs", args.orgId);
    if (!org) throw new ConvexError("NOT_FOUND");
    return rebuildLedger(ctx, org);
  },
});

/**
 * "Rebuild from ledger" on `/app/lots`: turns my completed pickups and
 * trades since the last rebuild into lots and moves. Safe to press twice.
 */
export const rebuild = mutation({
  args: {},
  returns: vRebuildResult,
  handler: async (ctx) => {
    const { profile, org } = await requireOrg(ctx);
    return rebuildLedger(ctx, org, profile._id);
  },
});
