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

export type LotOrigin = Infer<typeof vLotOrigin>;
export type LotStatus = Infer<typeof vLotStatus>;

// --- Pure rules ---------------------------------------------------------------

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

/** Whether a lot with `remaining` grams left is open, sold out or sorted away. */
export function lotStatusFor(
  remainingGrams: number,
  moves: readonly Pick<Move, "kind" | "grams">[],
): LotStatus {
  if (remainingGrams > 0) return "open";
  let sold = 0;
  let sorted = 0;
  for (const move of moves) {
    if (move.kind === "sold") sold += move.grams;
    else sorted += move.grams;
  }
  return sorted > sold ? "consumed" : "sold";
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

function leftAt(trade: Trade): number {
  return reachedAt(trade, "dispatched") ?? completedAt(trade);
}

function completedAt(trade: Trade): number {
  return reachedAt(trade, "completed") ?? trade.updatedAt;
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

// --- Loading one business's lots ---------------------------------------------------

function materialRef(materials: Materials, code: string) {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? ("other" as const),
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

/** Looks each business up once per request. */
function orgLookup(ctx: QueryCtx) {
  const cache = new Map<Id<"orgs">, Promise<Org | null>>();
  return (id: Id<"orgs">) => {
    let org = cache.get(id);
    if (!org) {
      org = ctx.db.get("orgs", id);
      cache.set(id, org);
    }
    return org;
  };
}

/** Looks each lot up once per request, whichever business owns it. */
function lotLookup(ctx: QueryCtx, known: Iterable<Lot> = []) {
  const cache = new Map<Id<"lots">, Promise<Lot | null>>();
  for (const lot of known) cache.set(lot._id, Promise.resolve(lot));
  return (id: Id<"lots">) => {
    let lot = cache.get(id);
    if (!lot) {
      lot = ctx.db.get("lots", id);
      cache.set(id, lot);
    }
    return lot;
  };
}

/**
 * How much of a lot has receipts behind it, 0 to 1. Pickups and purchases
 * are receipted at their own hand-off; opening stock never is; a sorting
 * run's outputs inherit their inputs' share, weighted by grams.
 */
async function receiptShareOf(
  ctx: QueryCtx,
  lotOf: ReturnType<typeof lotLookup>,
  memo: Map<Id<"lots">, Promise<number>>,
  lot: Lot,
): Promise<number> {
  const known = memo.get(lot._id);
  if (known) return known;
  const share = (async () => {
    switch (lot.origin) {
      case "pickup":
      case "purchase": {
        return 1;
      }
      case "opening": {
        return 0;
      }
      case "sorting":
      case "production": {
        const runId = ctx.db.normalizeId("sortingRuns", lot.originId);
        const run = runId ? await ctx.db.get("sortingRuns", runId) : null;
        if (!run || run.inputs.length === 0) return 0;
        let weighted = 0;
        let total = 0;
        for (const input of run.inputs) {
          const parent = await lotOf(input.lotId);
          total += input.grams;
          if (parent) {
            weighted +=
              input.grams * (await receiptShareOf(ctx, lotOf, memo, parent));
          }
        }
        return total === 0 ? 0 : weighted / total;
      }
    }
  })();
  memo.set(lot._id, share);
  return share;
}

// --- Result shapes ---------------------------------------------------------------

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

const vLotDetail = v.object({
  lot: vLotRow,
  business: v.object({ name: v.string(), kind: vOrgKind }),
  back: v.array(vTraceNode),
  forward: v.array(vTraceNode),
  checklist: vChecklist,
  creditReady: v.boolean(),
});

// --- Rows -------------------------------------------------------------------------

async function sourceOf(
  ctx: QueryCtx,
  orgOf: ReturnType<typeof orgLookup>,
  lot: Lot,
  city: string,
): Promise<Infer<typeof vSource>> {
  switch (lot.origin) {
    case "pickup": {
      const bookingId = ctx.db.normalizeId("bookings", lot.originId);
      const booking = bookingId
        ? await ctx.db.get("bookings", bookingId)
        : null;
      return { kind: "pickup", area: areaOf(booking?.address, city) };
    }
    case "purchase": {
      const tradeId = ctx.db.normalizeId("trades", lot.originId);
      const trade = tradeId ? await ctx.db.get("trades", tradeId) : null;
      const seller = trade ? await orgOf(trade.sellerOrgId) : null;
      return {
        kind: "purchase",
        sellerName: seller?.name ?? "",
        invoiceNo: trade?.invoiceNo ?? null,
      };
    }
    case "sorting":
    case "production": {
      const runId = ctx.db.normalizeId("sortingRuns", lot.originId);
      const run = runId ? await ctx.db.get("sortingRuns", runId) : null;
      return { kind: "run", runId, date: run?.date ?? null };
    }
    case "opening": {
      return { kind: "opening" };
    }
  }
}

async function lotRow(
  ctx: QueryCtx,
  lot: Lot,
  org: Org,
  materials: Materials,
  orgOf: ReturnType<typeof orgLookup>,
  receiptShare: number,
): Promise<Infer<typeof vLotRow>> {
  return {
    id: lot._id,
    material: materialRef(materials, lot.materialCode),
    grams: lot.grams,
    remainingGrams: lot.remainingGrams,
    origin: lot.origin,
    status: lot.status,
    createdAt: lot.createdAt,
    receiptShare,
    source: await sourceOf(ctx, orgOf, lot, org.city),
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

// --- Queries ----------------------------------------------------------------------

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
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const lots = await lotsOf(ctx, org._id);
    const lotOf = lotLookup(ctx, lots);
    const shares = new Map<Id<"lots">, Promise<number>>();

    const groups = new Map<
      string,
      Infer<typeof vMaterialGroup> & { buyers: Map<Id<"orgs">, number> }
    >();
    const totals = { openGrams: 0, lotCount: 0, receiptedGrams: 0 };

    for (const lot of lots.toSorted((a, b) => b.createdAt - a.createdAt)) {
      const share = await receiptShareOf(ctx, lotOf, shares, lot);
      const row = await lotRow(ctx, lot, org, materials, orgOf, share);
      let group = groups.get(lot.materialCode);
      if (!group) {
        group = {
          material: materialRef(materials, lot.materialCode),
          openGrams: 0,
          lotCount: 0,
          origins: {
            pickup: 0,
            purchase: 0,
            sorting: 0,
            production: 0,
            opening: 0,
          },
          wentTo: [],
          lots: [],
          buyers: new Map(),
        };
        groups.set(lot.materialCode, group);
      }
      group.lots.push(row);
      group.lotCount += 1;
      group.openGrams += lot.remainingGrams;
      group.origins[lot.origin] += 1;
      totals.lotCount += 1;
      totals.openGrams += lot.remainingGrams;
      totals.receiptedGrams += Math.round(lot.remainingGrams * share);

      for (const move of await movesOf(ctx, lot._id)) {
        if (move.kind !== "sold" || !move.tradeId) continue;
        const trade = await ctx.db.get("trades", move.tradeId);
        if (!trade) continue;
        group.buyers.set(
          trade.buyerOrgId,
          (group.buyers.get(trade.buyerOrgId) ?? 0) + move.grams,
        );
      }
    }

    const result = [];
    for (const group of groups.values()) {
      const { buyers, ...rest } = group;
      const wentTo = [];
      for (const [buyerId, grams] of buyers) {
        const buyer = await orgOf(buyerId);
        if (buyer) wentTo.push({ name: buyer.name, kind: buyer.kind, grams });
      }
      result.push({
        ...rest,
        wentTo: wentTo.toSorted((a, b) => b.grams - a.grams),
      });
    }

    const runs = await runsOf(ctx, org._id);
    return {
      kind: org.kind,
      groups: result.toSorted(
        (a, b) => b.openGrams - a.openGrams || b.lotCount - a.lotCount,
      ),
      runs: runs.slice(0, 10).map((run) => runRow(run, materials)),
      totals,
    };
  },
});

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
    const materials = await materialIndex(ctx);
    const lots = await lotsOf(ctx, org._id);
    const lotOf = lotLookup(ctx, lots);
    const shares = new Map<Id<"lots">, Promise<number>>();

    const rows = new Map<string, Infer<typeof vBalanceRow>>();
    const rowFor = (code: string) => {
      let row = rows.get(code);
      if (!row) {
        row = {
          material: materialRef(materials, code),
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
        rows.set(code, row);
      }
      return row;
    };

    const matchedByMaterial = new Map<string, number>();
    for (const lot of lots) {
      const row = rowFor(lot.materialCode);
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
      const share = await receiptShareOf(ctx, lotOf, shares, lot);
      for (const move of await movesOf(ctx, lot._id)) {
        if (move.kind === "sold") {
          row.soldWithoutReceiptsGrams += Math.round(move.grams * (1 - share));
          matchedByMaterial.set(
            lot.materialCode,
            (matchedByMaterial.get(lot.materialCode) ?? 0) + move.grams,
          );
        } else {
          row.consumedGrams += move.grams;
        }
      }
    }

    // Rejects belong to the materials that went in, in proportion.
    for (const run of await runsOf(ctx, org._id)) {
      if (run.rejectGrams === 0) continue;
      const total = run.inputs.reduce((sum, input) => sum + input.grams, 0);
      for (const input of run.inputs) {
        const parent = await lotOf(input.lotId);
        if (!parent || total === 0) continue;
        rowFor(parent.materialCode).rejectGrams += Math.round(
          (run.rejectGrams * input.grams) / total,
        );
      }
    }

    const sales = await ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerOrgId", org._id))
      .order("desc")
      .take(MAX_ROWS);
    for (const trade of sales) {
      if (!hasLeft(trade)) continue;
      const row = rowFor(trade.materialCode);
      if (trade.status === "completed") row.soldGrams += trade.grams;
      else row.inTransitGrams += trade.grams;
    }

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(MAX_LOTS);
    for (const item of inventory) {
      if (item.grams <= 0 && !rows.has(item.materialCode)) continue;
      rowFor(item.materialCode).bookStockGrams += item.grams;
    }

    let warningCount = 0;
    for (const row of rows.values()) {
      const gone = row.soldGrams + row.inTransitGrams;
      const matched = matchedByMaterial.get(row.material.code) ?? 0;
      row.unmatchedGrams = Math.max(0, gone - matched);
      row.soldWithoutReceiptsGrams += row.unmatchedGrams;
      if (row.unmatchedGrams > 0) row.warnings.push("sold_more_than_received");
      if (row.bookStockGrams !== row.lotStockGrams) {
        row.warnings.push("book_differs");
      }
      warningCount += row.warnings.length;
    }

    return {
      rows: [...rows.values()].toSorted(
        (a, b) =>
          b.warnings.length - a.warnings.length ||
          b.lotStockGrams - a.lotStockGrams,
      ),
      warningCount,
    };
  },
});

// --- Tracing -------------------------------------------------------------------------

interface Tracer {
  ctx: QueryCtx;
  viewer: Org;
  materials: Materials;
  orgOf: ReturnType<typeof orgLookup>;
  lotOf: ReturnType<typeof lotLookup>;
  nodes: TraceNode[];
  seen: Set<string>;
}

function orgName(org: Org | null): string {
  return org?.name ?? "";
}

/** Adds a node unless the tree is already as wide as it may be. */
function push(tracer: Tracer, node: TraceNode): boolean {
  if (tracer.nodes.length >= TRACE_NODES) {
    const last = tracer.nodes.at(-1);
    if (last?.kind === "more") last.count += 1;
    else tracer.nodes.push({ kind: "more", depth: node.depth, count: 1 });
    return false;
  }
  tracer.nodes.push(node);
  return true;
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
function portion(part: number, share: number, total: number): number {
  return total === 0 ? 0 : Math.round((part * share) / total);
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
  const { ctx } = tracer;
  if (depth > TRACE_DEPTH) {
    push(tracer, { kind: "more", depth, count: 1 });
    return;
  }
  switch (lot.origin) {
    case "pickup": {
      const bookingId = ctx.db.normalizeId("bookings", lot.originId);
      const booking = bookingId
        ? await ctx.db.get("bookings", bookingId)
        : null;
      if (!booking?.receipt) return;
      const line = booking.receipt.lines.find(
        (item) => item.materialCode === lot.materialCode,
      );
      const shop = await tracer.orgOf(booking.orgId);
      const isMine = booking.orgId === tracer.viewer._id;
      push(tracer, {
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
      return;
    }
    case "purchase": {
      const tradeId = ctx.db.normalizeId("trades", lot.originId);
      const trade = tradeId ? await ctx.db.get("trades", tradeId) : null;
      if (!trade) return;
      const seller = await tracer.orgOf(trade.sellerOrgId);
      const buyer = await tracer.orgOf(trade.buyerOrgId);
      if (!push(tracer, tradeNode(trade, depth, grams, seller, buyer))) return;
      // The seller's lots this trade was matched to, by mass balance.
      const moves = await ctx.db
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
      return;
    }
    case "sorting":
    case "production": {
      const runId = ctx.db.normalizeId("sortingRuns", lot.originId);
      const run = runId ? await ctx.db.get("sortingRuns", runId) : null;
      if (!run) return;
      const owner = await tracer.orgOf(run.orgId);
      if (!push(tracer, runNode(run, depth, owner))) return;
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
      return;
    }
    case "opening": {
      const owner = await tracer.orgOf(lot.orgId);
      push(tracer, {
        kind: "opening",
        depth,
        orgName: orgName(owner),
        grams,
        createdAt: lot.createdAt,
      });
      return;
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
  const shown = push(tracer, {
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
  });
  if (shown) await traceBack(tracer, lot, grams, depth + 1);
}

/**
 * Forward to where the kilos went: sales to the buyer (one hop — the buyer's
 * own onward sales are theirs to show), and sorting runs to their outputs.
 */
async function traceForward(
  tracer: Tracer,
  lot: Lot,
  depth: number,
): Promise<void> {
  const { ctx } = tracer;
  if (depth > TRACE_DEPTH) {
    push(tracer, { kind: "more", depth, count: 1 });
    return;
  }
  const key = `forward:${lot._id}`;
  if (tracer.seen.has(key)) return;
  tracer.seen.add(key);
  const moves = (await movesOf(ctx, lot._id)).toSorted((a, b) => a.at - b.at);
  const runsShown = new Set<Id<"sortingRuns">>();
  for (const move of moves) {
    if (move.kind === "sold" && move.tradeId) {
      const trade = await ctx.db.get("trades", move.tradeId);
      if (!trade) continue;
      const seller = await tracer.orgOf(trade.sellerOrgId);
      const buyer = await tracer.orgOf(trade.buyerOrgId);
      push(tracer, tradeNode(trade, depth, move.grams, seller, buyer));
    } else if (move.sortingRunId && !runsShown.has(move.sortingRunId)) {
      runsShown.add(move.sortingRunId);
      const run = await ctx.db.get("sortingRuns", move.sortingRunId);
      if (!run) continue;
      const owner = await tracer.orgOf(run.orgId);
      if (!push(tracer, runNode(run, depth, owner))) return;
      const children = [
        ...(await ctx.db
          .query("lots")
          .withIndex("by_origin", (q) =>
            q.eq("origin", "sorting").eq("originId", run._id),
          )
          .take(MAX_OUTPUTS)),
        ...(await ctx.db
          .query("lots")
          .withIndex("by_origin", (q) =>
            q.eq("origin", "production").eq("originId", run._id),
          )
          .take(MAX_OUTPUTS)),
      ];
      for (const child of children) {
        const shown = push(tracer, {
          kind: "lot",
          depth: depth + 1,
          lotId: child._id,
          isMine: child.orgId === tracer.viewer._id,
          orgName: orgName(owner),
          material: materialRef(tracer.materials, child.materialCode),
          grams: child.grams,
          origin: child.origin,
          status: child.status,
          createdAt: child.createdAt,
        });
        if (shown) await traceForward(tracer, child, depth + 2);
      }
    }
  }
}

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
): { checklist: { id: Infer<typeof vCheckItem>; status: CheckStatus }[] } {
  const receipted = coverage(receiptShare, 1);
  const sales = forward.filter((node) => node.kind === "trade");
  const consent: CheckStatus =
    sales.length === 0
      ? "not_yet"
      : coverage(
          sales.filter((sale) => sale.buyerConsent).length,
          sales.length,
        );
  return {
    checklist: [
      { id: "weighed", status: receipted },
      { id: "both_sides", status: receipted },
      { id: "paid", status: receipted },
      { id: "receiver_consent", status: consent },
    ],
  };
}

async function lotDetail(
  ctx: QueryCtx,
  org: Org,
  lot: Lot,
): Promise<Infer<typeof vLotDetail>> {
  const materials = await materialIndex(ctx);
  const orgOf = orgLookup(ctx);
  const lotOf = lotLookup(ctx, [lot]);
  const share = await receiptShareOf(ctx, lotOf, new Map(), lot);
  const row = await lotRow(ctx, lot, org, materials, orgOf, share);

  const back: Tracer = {
    ctx,
    viewer: org,
    materials,
    orgOf,
    lotOf,
    nodes: [],
    seen: new Set(),
  };
  await traceBack(back, lot, lot.grams, 0);
  const forward: Tracer = { ...back, nodes: [], seen: new Set() };
  await traceForward(forward, lot, 0);

  const { checklist } = readinessOf(share, forward.nodes);
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

// --- Stock book ------------------------------------------------------------------------

/**
 * Adds (or, negative, takes) grams of one material in the stock book, the
 * way a trade does, and audits it. Never below zero: the lots are the check
 * that matters here, and a short book is reported on the balance screen.
 */
async function adjustStock(
  ctx: MutationCtx,
  actor: { orgId: Id<"orgs">; profileId?: Id<"profiles"> },
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

// --- Sorting runs ------------------------------------------------------------------------

/** One line per lot or material (repeats are added up), every gram a positive integer. */
function merged<T extends { grams: number }, K extends keyof T>(
  lines: readonly T[],
  key: K,
  max: number,
  emptyCode: string,
  tooMany: string,
): T[] {
  if (lines.length === 0) throw new ConvexError(emptyCode);
  if (lines.length > max) throw new ConvexError(tooMany);
  const byKey = new Map<T[K], T>();
  for (const line of lines) {
    if (!isPositiveInteger(line.grams)) throw new ConvexError("INVALID_WEIGHT");
    const known = byKey.get(line[key]);
    if (known) known.grams += line.grams;
    else byKey.set(line[key], { ...line });
  }
  return [...byKey.values()];
}

interface RunInput {
  inputs: { lotId: Id<"lots">; grams: number }[];
  outputs: { materialCode: string; grams: number }[];
  rejectGrams: number;
  note?: string;
  date: string;
  now: number;
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
  const inputs = merged(
    run.inputs,
    "lotId",
    MAX_INPUTS,
    "NOTHING_TO_SORT",
    "TOO_MANY_LINES",
  );
  const outputs = merged(
    run.outputs,
    "materialCode",
    MAX_OUTPUTS,
    "NOTHING_SORTED",
    "TOO_MANY_LINES",
  );
  if (!Number.isSafeInteger(run.rejectGrams) || run.rejectGrams < 0) {
    throw new ConvexError("INVALID_WEIGHT");
  }
  if (run.note !== undefined && run.note.length > NOTE_MAX_LENGTH) {
    throw new ConvexError("NOTE_TOO_LONG");
  }
  const totals = sortingTotals(inputs, outputs, run.rejectGrams);
  if (totals.lossGrams < 0) throw new ConvexError("OUTPUT_EXCEEDS_INPUT");

  const materials = await materialIndex(ctx);
  for (const output of outputs) {
    if (materials.get(output.materialCode)?.active !== true) {
      throw new ConvexError("UNKNOWN_MATERIAL");
    }
  }
  const parents: Lot[] = [];
  for (const input of inputs) {
    const lot = await ctx.db.get("lots", input.lotId);
    if (lot?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (lot.status !== "open") throw new ConvexError("LOT_NOT_OPEN");
    if (input.grams > lot.remainingGrams) {
      throw new ConvexError("NOT_ENOUGH_IN_LOT");
    }
    parents.push(lot);
  }

  const note = run.note?.trim();
  const runId = await ctx.db.insert("sortingRuns", {
    orgId: org._id,
    date: run.date,
    inputs,
    outputs,
    rejectGrams: run.rejectGrams,
    note: note === undefined || note === "" ? undefined : note,
    createdAt: run.now,
  });
  const actor = { orgId: org._id, profileId: actorProfileId };

  for (const [index, input] of inputs.entries()) {
    const parent = parents[index];
    if (!parent) continue;
    await ctx.db.insert("lotMoves", {
      lotId: parent._id,
      kind: "sorted",
      grams: input.grams,
      sortingRunId: runId,
      at: run.now,
    });
    const remainingGrams = parent.remainingGrams - input.grams;
    await ctx.db.patch("lots", parent._id, {
      remainingGrams,
      status: lotStatusFor(remainingGrams, await movesOf(ctx, parent._id)),
    });
    await adjustStock(
      ctx,
      actor,
      parent.materialCode,
      -input.grams,
      runId,
      run.now,
    );
  }

  const lotIds: Id<"lots">[] = [];
  const parentLotIds = parents.map((parent) => parent._id);
  for (const output of outputs) {
    const stage = materials.get(output.materialCode)?.stage;
    lotIds.push(
      await ctx.db.insert("lots", {
        orgId: org._id,
        materialCode: output.materialCode,
        grams: output.grams,
        remainingGrams: output.grams,
        origin: stage === "recycled" ? "production" : "sorting",
        originId: runId,
        parentLotIds,
        status: "open",
        createdAt: run.now,
      }),
    );
    await adjustStock(
      ctx,
      actor,
      output.materialCode,
      output.grams,
      runId,
      run.now,
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

// --- Rebuilding from the ledger -------------------------------------------------------------

export interface RebuildResult {
  lotsCreated: number;
  movesCreated: number;
  openingCreated: number;
}

const vRebuildResult = v.object({
  lotsCreated: v.number(),
  movesCreated: v.number(),
  openingCreated: v.number(),
});

function lotKey(origin: LotOrigin, originId: string, materialCode: string) {
  return `${origin}:${originId}:${materialCode}`;
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
  now: number,
): Promise<RebuildResult> {
  const result: RebuildResult = {
    lotsCreated: 0,
    movesCreated: 0,
    openingCreated: 0,
  };
  const lots = await lotsOf(ctx, org._id);
  const known = new Set(
    lots.map((lot) => lotKey(lot.origin, lot.originId, lot.materialCode)),
  );
  const working: (OpenLot & { materialCode: string; touched: boolean })[] =
    lots.map((lot) => ({
      id: lot._id,
      origin: lot.origin,
      createdAt: lot.createdAt,
      remainingGrams: lot.remainingGrams,
      materialCode: lot.materialCode,
      touched: false,
    }));

  const addLot = async (
    origin: LotOrigin,
    originId: string,
    materialCode: string,
    grams: number,
    createdAt: number,
  ) => {
    const key = lotKey(origin, originId, materialCode);
    if (known.has(key) || grams <= 0) return;
    known.add(key);
    const id = await ctx.db.insert("lots", {
      orgId: org._id,
      materialCode,
      grams,
      remainingGrams: grams,
      origin,
      originId,
      parentLotIds: [],
      status: "open",
      createdAt,
    });
    working.push({
      id,
      origin,
      createdAt,
      remainingGrams: grams,
      materialCode,
      touched: false,
    });
    result.lotsCreated += 1;
  };

  // 1. Pickup receipts, one lot per line.
  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_org_status", (q) =>
      q.eq("orgId", org._id).eq("status", "completed"),
    )
    .order("desc")
    .take(MAX_ROWS);
  for (const booking of bookings) {
    if (!booking.receipt) continue;
    for (const line of booking.receipt.lines) {
      await addLot(
        "pickup",
        booking._id,
        line.materialCode,
        line.grams,
        booking.receipt.paidAt,
      );
    }
  }

  // 2. Completed purchases.
  const purchases = await ctx.db
    .query("trades")
    .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
    .order("desc")
    .take(MAX_ROWS);
  for (const trade of purchases) {
    if (trade.status !== "completed") continue;
    await addLot(
      "purchase",
      trade._id,
      trade.materialCode,
      trade.grams,
      completedAt(trade),
    );
  }

  // 3. Sales that have left, matched to lots in the order they left.
  const sales = (
    await ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerOrgId", org._id))
      .order("desc")
      .take(MAX_ROWS)
  )
    .filter((trade) => hasLeft(trade))
    .toSorted((a, b) => leftAt(a) - leftAt(b));
  const unmatched: { trade: Trade; grams: number }[] = [];
  const allocate = async (trade: Trade, grams: number) => {
    const at = leftAt(trade);
    const { allocations, unmatchedGrams } = allocateSale(
      working.filter((lot) => lot.materialCode === trade.materialCode),
      grams,
      at,
    );
    for (const allocation of allocations) {
      await ctx.db.insert("lotMoves", {
        lotId: allocation.lotId,
        kind: "sold",
        grams: allocation.grams,
        tradeId: trade._id,
        at,
      });
      const lot = working.find((entry) => entry.id === allocation.lotId);
      if (lot) {
        lot.remainingGrams -= allocation.grams;
        lot.touched = true;
      }
      result.movesCreated += 1;
    }
    return unmatchedGrams;
  };
  for (const trade of sales) {
    const already = await ctx.db
      .query("lotMoves")
      .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
      .first();
    if (already) continue;
    const left = await allocate(trade, trade.grams);
    if (left > 0) unmatched.push({ trade, grams: left });
  }

  // 4. Opening stock, once: what the book holds beyond the lots, plus what
  //    was sold without any lot to come from.
  const hasOpening = new Set(
    working
      .filter((lot) => lot.origin === "opening")
      .map((lot) => lot.materialCode),
  );
  const inventory = await ctx.db
    .query("inventory")
    .withIndex("by_org", (q) => q.eq("orgId", org._id))
    .take(MAX_LOTS);
  const book = new Map(inventory.map((row) => [row.materialCode, row.grams]));
  const unmatchedBy = new Map<string, number>();
  for (const entry of unmatched) {
    unmatchedBy.set(
      entry.trade.materialCode,
      (unmatchedBy.get(entry.trade.materialCode) ?? 0) + entry.grams,
    );
  }
  const codes = new Set([...book.keys(), ...unmatchedBy.keys()]);
  for (const materialCode of codes) {
    if (hasOpening.has(materialCode)) continue;
    const onLots = working
      .filter((lot) => lot.materialCode === materialCode)
      .reduce((sum, lot) => sum + lot.remainingGrams, 0);
    const gap = Math.max(0, (book.get(materialCode) ?? 0) - onLots);
    const missing = unmatchedBy.get(materialCode) ?? 0;
    if (gap + missing <= 0) continue;
    const openedAt = Math.min(
      org.createdAt,
      ...unmatched
        .filter((entry) => entry.trade.materialCode === materialCode)
        .map((entry) => leftAt(entry.trade) - 1),
    );
    await addLot("opening", org._id, materialCode, gap + missing, openedAt);
    result.openingCreated += 1;
    for (const entry of unmatched) {
      if (entry.trade.materialCode !== materialCode) continue;
      await allocate(entry.trade, entry.grams);
    }
  }

  // 5. Settle what changed.
  for (const lot of working) {
    if (!lot.touched) continue;
    await ctx.db.patch("lots", lot.id, {
      remainingGrams: lot.remainingGrams,
      status: lotStatusFor(lot.remainingGrams, await movesOf(ctx, lot.id)),
    });
  }
  return result;
}

/** For the seed and for repairs: derives one business's lots from the ledger. */
export const rebuildFromLedger = internalMutation({
  args: { orgId: v.id("orgs") },
  returns: vRebuildResult,
  handler: async (ctx, args) => {
    const org = await ctx.db.get("orgs", args.orgId);
    if (!org) throw new ConvexError("NOT_FOUND");
    const now = Date.now();
    const result = await rebuildOrg(ctx, org, now);
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      action: "lots.rebuilt",
      entityTable: "orgs",
      entityId: org._id,
      metadata: result,
      createdAt: now,
    });
    return result;
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
    const now = Date.now();
    const result = await rebuildOrg(ctx, org, now);
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "lots.rebuilt",
      entityTable: "orgs",
      entityId: org._id,
      metadata: result,
      createdAt: now,
    });
    return result;
  },
});
