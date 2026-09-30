import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import { isInEscrow, type TradeStatus } from "./lib/chain";
import { indiaToday } from "./lib/onboarding";
import {
  daysUntil,
  defaultDueAt,
  distanceKm,
  type EwayBillCheck,
  ewayBillCheck as checkEwayBill,
  ledgerStatus,
  type MsmeCategory,
  msmeDueAt,
  msmeProtected,
  referenceRequired,
  selfInvoiceDueAt,
  type TaxBreakdown,
  taxBreakdown,
  type Vehicle,
} from "./lib/tax";
import { vOrgKind, vTradeStatus } from "./lib/validators";
import { vMaterialRef } from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";
import {
  vDeclarationKind,
  vLedgerDirection,
  vLedgerStatus,
  vPaymentMethod,
  vPaymentSubject,
  vPaymentSubjectId,
} from "./tables/payments";

/**
 * Payments and tax records: the khata (who owes whom on each trade), every
 * payment reference, the tax and fee breakdown of a trade, the e-way bill
 * helper, the RCM self-invoice data and the monthly purchase register.
 *
 * The pilot moves no money (docs/plan.md, "Payments"): people pay each other
 * in cash, by UPI or by bank transfer and record the reference here. The
 * prototype's escrow step is simulated, and its payments say so. Every tax
 * figure is informational — a label for the accountant, never a filing.
 */

/** The most rows one screen reads. */
const PAGE = 200;
/** How far back the ledger looks for trades. */
const HISTORY = 1000;
const REFERENCE_MAX_LENGTH = 40;
const NOTE_MAX_LENGTH = 140;
/** A recorded payment may be a little ahead of the server clock. */
const CLOCK_SLACK_MS = 5 * 60 * 1000;

/** Trades with money due: from acceptance until the end. */
const OWED_STATUSES: ReadonlySet<TradeStatus> = new Set([
  "accepted",
  "paid_to_escrow",
  "dispatched",
  "completed",
]);
/** Trades whose goods have left the seller (a purchase for the register). */
const INVOICED_STATUSES: ReadonlySet<TradeStatus> = new Set([
  "paid_to_escrow",
  "dispatched",
  "completed",
]);

type Side = "buyer" | "seller";
type Materials = Awaited<ReturnType<typeof materialIndex>>;
type DeclarationKind = Doc<"declarations">["kind"];

// --- Result shapes -------------------------------------------------------------

const vCounterparty = v.object({
  id: v.id("orgs"),
  name: v.string(),
  kind: vOrgKind,
  area: v.string(),
  gstin: v.optional(v.string()),
});

const vMsmeClock = v.union(
  v.object({
    category: v.union(v.literal("micro"), v.literal("small")),
    dueAt: v.number(),
    daysLeft: v.number(),
  }),
  v.null(),
);

const vEntryView = v.object({
  /** Null for a trade whose ledger rows are not written yet. */
  id: v.union(v.id("ledgerEntries"), v.null()),
  tradeId: v.id("trades"),
  direction: vLedgerDirection,
  counterparty: vCounterparty,
  material: vMaterialRef,
  grams: v.number(),
  duePaise: v.number(),
  paidPaise: v.number(),
  balancePaise: v.number(),
  dueAt: v.number(),
  status: vLedgerStatus,
  /** Days to the due date; negative once it has passed. */
  daysLeft: v.number(),
  tradeStatus: vTradeStatus,
  invoiceNo: v.optional(v.string()),
  inEscrow: v.boolean(),
  /** The 45-day MSMED clock, on what I owe a micro or small seller. */
  msme: vMsmeClock,
  createdAt: v.number(),
});

const vPaymentView = v.object({
  id: v.id("payments"),
  subject: vPaymentSubject,
  subjectId: v.string(),
  method: vPaymentMethod,
  reference: v.optional(v.string()),
  amountPaise: v.number(),
  paidAt: v.number(),
  direction: v.union(v.literal("in"), v.literal("out")),
  /** The other side: a business, a household or a Saathi. */
  counterparty: v.string(),
  material: v.optional(vMaterialRef),
  title: v.optional(v.string()),
  note: v.optional(v.string()),
});

const vVehicle = v.union(
  v.literal("handcart"),
  v.literal("cycle"),
  v.literal("auto"),
  v.literal("mini_truck"),
  v.literal("truck"),
);

const vEwayNote = v.union(
  v.literal("ewayBill"),
  v.literal("ewayBillNonMotor"),
  v.literal("ewayBillUnderLimit"),
);

const vEwayBillCheck = v.object({
  needed: v.boolean(),
  motorised: v.boolean(),
  overLimit: v.boolean(),
  raisedBy: v.union(v.literal("seller"), v.literal("buyer"), v.literal("none")),
  validityDays: v.union(v.number(), v.null()),
  partBOptional: v.boolean(),
  note: vEwayNote,
});

const vTaxNote = v.union(
  v.literal("informational"),
  v.literal("forwardCharge"),
  v.literal("reverseCharge"),
  v.literal("selfInvoice"),
  v.literal("noGstUnregistered"),
  v.literal("gstTds"),
  v.literal("tcs"),
  v.literal("tcsWaived"),
  v.literal("tcsSellerSmall"),
  v.literal("tcsNotScrap"),
  vEwayNote,
  v.literal("noPlatformFee"),
);

const vTaxBreakdown = v.object({
  hsn: v.string(),
  taxableValuePaise: v.number(),
  gstRateBp: v.number(),
  gstPaise: v.number(),
  reverseCharge: v.boolean(),
  selfInvoiceDays: v.union(v.number(), v.null()),
  invoiceGstPaise: v.number(),
  invoiceTotalPaise: v.number(),
  gstTdsPaise: v.number(),
  tcsPaise: v.number(),
  tcsWaived: v.boolean(),
  ewayBill: vEwayBillCheck,
  platformFeePaise: v.number(),
  buyerPaysSellerPaise: v.number(),
  buyerPaysGovernmentPaise: v.number(),
  sellerRemitsGovernmentPaise: v.number(),
  notes: v.array(vTaxNote),
});

const vParty = v.object({
  name: v.string(),
  kind: vOrgKind,
  address: v.string(),
  area: v.string(),
  gstin: v.optional(v.string()),
  registered: v.boolean(),
});

const vPartAParty = v.object({
  /** "URP" when the party has no GSTIN, as the portal expects. */
  gstin: v.string(),
  name: v.string(),
  address: v.string(),
  place: v.string(),
  state: v.string(),
  stateCode: v.string(),
});

const vRegisterRow = v.object({
  date: v.string(),
  tradeId: v.id("trades"),
  invoiceNo: v.union(v.string(), v.null()),
  supplier: v.string(),
  supplierGstin: v.union(v.string(), v.null()),
  material: vMaterialRef,
  hsn: v.string(),
  grams: v.number(),
  taxableValuePaise: v.number(),
  gstRateBp: v.number(),
  gstPaise: v.number(),
  reverseCharge: v.boolean(),
  gstTdsPaise: v.number(),
  tcsPaise: v.number(),
  totalPaise: v.number(),
});

const vSelfInvoiceItem = v.object({
  tradeId: v.id("trades"),
  selfInvoiceNo: v.string(),
  invoiceNo: v.union(v.string(), v.null()),
  supplier: vCounterparty,
  material: vMaterialRef,
  grams: v.number(),
  taxableValuePaise: v.number(),
  gstRateBp: v.number(),
  gstPaise: v.number(),
  receivedAt: v.number(),
  dueAt: v.number(),
  daysLeft: v.number(),
});

const vDeclarationValue = v.string();

const vDeclarationItem = v.object({
  kind: vDeclarationKind,
  value: vDeclarationValue,
  validFrom: v.string(),
  source: v.union(v.literal("declared"), v.literal("default")),
});

/** What each kind of declaration may say. */
const DECLARATION_VALUES: Record<DeclarationKind, readonly string[]> = {
  manufacturingUse: ["yes", "no"],
  gstStatus: ["registered", "unregistered", "composition"],
  msme: ["none", "micro", "small", "medium"],
};

// --- Helpers -------------------------------------------------------------------

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function materialRef(materials: Materials, code: string) {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? ("other" as const),
  };
}

function orgLookup(ctx: QueryCtx) {
  const cache = new Map<Id<"orgs">, Promise<Doc<"orgs"> | null>>();
  return (id: Id<"orgs">) => {
    let org = cache.get(id);
    if (!org) {
      org = ctx.db.get("orgs", id);
      cache.set(id, org);
    }
    return org;
  };
}

function counterpartyOf(org: Doc<"orgs">) {
  return {
    id: org._id,
    name: org.name,
    kind: org.kind,
    area: org.area,
    gstin: org.gstin,
  };
}

function sideOf(trade: Doc<"trades">, orgId: Id<"orgs">): Side | null {
  if (trade.buyerOrgId === orgId) return "buyer";
  return trade.sellerOrgId === orgId ? "seller" : null;
}

/** A trade the caller's business is party to; anyone else sees NOT_FOUND. */
async function tradeFor(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  tradeId: Id<"trades">,
): Promise<{ trade: Doc<"trades">; side: Side }> {
  const trade = await ctx.db.get("trades", tradeId);
  const side = trade ? sideOf(trade, orgId) : null;
  if (!trade || !side) throw new ConvexError("NOT_FOUND");
  return { trade, side };
}

function stepAt(trade: Doc<"trades">, status: TradeStatus): number | null {
  return trade.timeline.find((step) => step.status === status)?.at ?? null;
}

/** When the money became due: the seller's acceptance. */
function acceptedAt(trade: Doc<"trades">): number {
  return stepAt(trade, "accepted") ?? trade.createdAt;
}

/** When the buyer had the goods: delivery confirmed, else dispatch. */
function receivedAt(trade: Doc<"trades">): number | null {
  return stepAt(trade, "completed") ?? stepAt(trade, "dispatched");
}

/** From payment into escrow on, the prototype's escrow holds the money. */
function isEscrowFunded(status: TradeStatus): boolean {
  return (
    status === "paid_to_escrow" ||
    status === "dispatched" ||
    status === "completed"
  );
}

/** The simulated reference an escrow payment carries: ESC-<receipt no.>. */
function escrowReference(trade: Doc<"trades">): string {
  return `ESC-${trade.invoiceNo ?? trade._id.slice(-6).toUpperCase()}`;
}

/** The seller's or the buyer's vehicle: what the load most likely moves on. */
function vehicleOf(seller: Doc<"orgs">, buyer: Doc<"orgs">): Vehicle {
  return seller.vehicle ?? buyer.vehicle ?? "mini_truck";
}

async function audit(
  ctx: MutationCtx,
  entry: {
    orgId: Id<"orgs">;
    actorProfileId: Id<"profiles">;
    action: string;
    entityTable: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert("auditLog", { ...entry, createdAt: Date.now() });
}

// --- Declarations and the tax profile of a business -----------------------------

/** The newest declaration of each kind a business has made. */
async function declarationsOf(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
): Promise<Map<DeclarationKind, Doc<"declarations">>> {
  const rows = await ctx.db
    .query("declarations")
    .withIndex("by_org_kind", (q) => q.eq("orgId", orgId))
    .take(PAGE);
  const newest = new Map<DeclarationKind, Doc<"declarations">>();
  for (const row of rows) {
    const current = newest.get(row.kind);
    const isNewer =
      !current ||
      row.validFrom > current.validFrom ||
      (row.validFrom === current.validFrom && row.createdAt > current.createdAt);
    if (isNewer) newest.set(row.kind, row);
  }
  return newest;
}

interface TaxProfile {
  registered: boolean;
  manufacturingUse: boolean;
  msme: MsmeCategory;
}

function isMsmeCategory(value: string): value is MsmeCategory {
  return DECLARATION_VALUES.msme.includes(value);
}

/** What decides a business's tax treatment: its declarations, else its GSTIN. */
function taxProfileOf(
  org: Doc<"orgs">,
  declarations: Map<DeclarationKind, Doc<"declarations">>,
): TaxProfile {
  const gst = declarations.get("gstStatus")?.value;
  const msme = declarations.get("msme")?.value;
  return {
    registered: gst === undefined ? org.gstin !== undefined : gst !== "unregistered",
    manufacturingUse: declarations.get("manufacturingUse")?.value === "yes",
    msme: msme !== undefined && isMsmeCategory(msme) ? msme : "none",
  };
}

/** Looks each business's tax profile up once per request. */
function profileLookup(ctx: QueryCtx) {
  const cache = new Map<Id<"orgs">, Promise<TaxProfile>>();
  return (org: Doc<"orgs">) => {
    let profile = cache.get(org._id);
    if (!profile) {
      profile = declarationsOf(ctx, org._id).then((declarations) =>
        taxProfileOf(org, declarations),
      );
      cache.set(org._id, profile);
    }
    return profile;
  };
}

function breakdownOf(
  trade: Doc<"trades">,
  material: Doc<"materials"> | undefined,
  seller: { org: Doc<"orgs">; profile: TaxProfile },
  buyer: { org: Doc<"orgs">; profile: TaxProfile },
): TaxBreakdown {
  return taxBreakdown({
    taxableValuePaise: trade.totalPaise,
    materialCode: trade.materialCode,
    family: material?.family ?? "other",
    stage: material?.stage ?? "scrap",
    catalogueHsn: material?.hsn,
    sellerRegistered: seller.profile.registered,
    buyerRegistered: buyer.profile.registered,
    buyerManufacturingDeclaration: buyer.profile.manufacturingUse,
    vehicle: vehicleOf(seller.org, buyer.org),
  });
}

// --- The ledger ------------------------------------------------------------------

interface LedgerPair {
  seller: Doc<"ledgerEntries">;
  buyer: Doc<"ledgerEntries">;
}

/** What's already been paid on a trade, from the payments table. */
async function paidOn(ctx: QueryCtx, tradeId: Id<"trades">): Promise<number> {
  const rows = await ctx.db
    .query("payments")
    .withIndex("by_subject", (q) =>
      q.eq("subject", "trade").eq("subjectId", tradeId),
    )
    .take(PAGE);
  return rows.reduce((sum, row) => sum + row.amountPaise, 0);
}

/**
 * Writes the two khata rows of a trade (the seller's receivable and the
 * buyer's payable) if they don't exist yet, and returns both. The market can
 * call this when a seller accepts a trade; the khata also opens them lazily
 * the first time anyone records a payment.
 */
export async function openLedgerFor(
  ctx: MutationCtx,
  trade: Doc<"trades">,
  now: number,
): Promise<LedgerPair> {
  const existing = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
    .take(PAGE);
  let seller = existing.find((row) => row.direction === "receivable");
  let buyer = existing.find((row) => row.direction === "payable");
  if (seller && buyer) return { seller, buyer };

  const paidPaise = await paidOn(ctx, trade._id);
  const dueAt = defaultDueAt(acceptedAt(trade));
  const base = {
    tradeId: trade._id,
    duePaise: trade.totalPaise,
    paidPaise,
    dueAt,
    status: ledgerStatus({ duePaise: trade.totalPaise, paidPaise, dueAt }, now),
    createdAt: now,
    updatedAt: now,
  };
  if (!seller) {
    const id = await ctx.db.insert("ledgerEntries", {
      ...base,
      orgId: trade.sellerOrgId,
      counterpartyOrgId: trade.buyerOrgId,
      direction: "receivable",
    });
    seller = (await ctx.db.get("ledgerEntries", id)) ?? undefined;
  }
  if (!buyer) {
    const id = await ctx.db.insert("ledgerEntries", {
      ...base,
      orgId: trade.buyerOrgId,
      counterpartyOrgId: trade.sellerOrgId,
      direction: "payable",
    });
    buyer = (await ctx.db.get("ledgerEntries", id)) ?? undefined;
  }
  if (!seller || !buyer) throw new ConvexError("LEDGER_WRITE_FAILED");
  return { seller, buyer };
}

/**
 * Brings a trade's khata in line with where the trade stands. The market
 * can call this after every step it applies (accept, pay, dispatch,
 * confirm): it opens the two rows on acceptance and, once the buyer has
 * paid into the prototype's escrow, records that payment under its
 * simulated reference so both sides read as settled. Safe to call twice.
 */
export async function syncLedger(
  ctx: MutationCtx,
  trade: Doc<"trades">,
  byProfileId: Id<"profiles">,
  now: number,
): Promise<void> {
  if (!OWED_STATUSES.has(trade.status)) return;
  if (isEscrowFunded(trade.status)) {
    await recordEscrowPayment(ctx, trade, byProfileId, now);
  }
  const ledger = await openLedgerFor(ctx, trade, now);
  const paidPaise = await paidOn(ctx, trade._id);
  for (const entry of [ledger.seller, ledger.buyer]) {
    if (entry.paidPaise === paidPaise) continue;
    await ctx.db.patch("ledgerEntries", entry._id, {
      paidPaise,
      status: ledgerStatus(
        { duePaise: entry.duePaise, paidPaise, dueAt: entry.dueAt },
        now,
      ),
      updatedAt: now,
    });
  }
}

/** The escrow hold on a trade, written once, with its simulated reference. */
async function recordEscrowPayment(
  ctx: MutationCtx,
  trade: Doc<"trades">,
  byProfileId: Id<"profiles">,
  now: number,
): Promise<void> {
  const rows = await ctx.db
    .query("payments")
    .withIndex("by_subject", (q) =>
      q.eq("subject", "trade").eq("subjectId", trade._id),
    )
    .take(PAGE);
  if (rows.some((row) => row.method === "escrow")) return;
  const alreadyPaid = rows.reduce((sum, row) => sum + row.amountPaise, 0);
  const amountPaise = trade.totalPaise - alreadyPaid;
  if (amountPaise <= 0) return;
  const paidAt = stepAt(trade, "paid_to_escrow") ?? now;
  await ctx.db.insert("payments", {
    subject: "trade",
    subjectId: trade._id,
    method: "escrow",
    reference: escrowReference(trade),
    amountPaise,
    paidAt,
    fromOrgId: trade.buyerOrgId,
    toOrgId: trade.sellerOrgId,
    byProfileId,
    createdAt: now,
  });
}

type EntryView = typeof vEntryView.type;

/** Every khata entry of a business: its trades from acceptance on. */
async function entriesFor(
  ctx: QueryCtx,
  org: Doc<"orgs">,
  now: number,
): Promise<EntryView[]> {
  const [sales, purchases, rows, materials] = await Promise.all([
    ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerOrgId", org._id))
      .order("desc")
      .take(HISTORY),
    ctx.db
      .query("trades")
      .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
      .order("desc")
      .take(HISTORY),
    ctx.db
      .query("ledgerEntries")
      .withIndex("by_org_status", (q) => q.eq("orgId", org._id))
      .take(HISTORY),
    materialIndex(ctx),
  ]);
  const byTrade = new Map(rows.map((row) => [row.tradeId, row]));
  const lookupOrg = orgLookup(ctx);
  const lookupProfile = profileLookup(ctx);

  const entries: EntryView[] = [];
  for (const trade of [...sales, ...purchases]) {
    if (!OWED_STATUSES.has(trade.status)) continue;
    const direction = trade.sellerOrgId === org._id ? "receivable" : "payable";
    const counterparty = await lookupOrg(
      direction === "receivable" ? trade.buyerOrgId : trade.sellerOrgId,
    );
    if (!counterparty) continue;
    const row = byTrade.get(trade._id);
    const duePaise = row?.duePaise ?? trade.totalPaise;
    // No khata row yet: the market hasn't opened one. Money paid into the
    // prototype's escrow still counts as paid, so the two screens agree.
    const paidPaise =
      row?.paidPaise ??
      (isEscrowFunded(trade.status) ? trade.totalPaise : 0);
    const dueAt = row?.dueAt ?? defaultDueAt(acceptedAt(trade));

    let msme: EntryView["msme"] = null;
    if (direction === "payable") {
      const profile = await lookupProfile(counterparty);
      const delivered = stepAt(trade, "completed");
      if (
        msmeProtected(profile.msme) &&
        (profile.msme === "micro" || profile.msme === "small") &&
        delivered !== null
      ) {
        const clock = msmeDueAt(delivered);
        msme = {
          category: profile.msme,
          dueAt: clock,
          daysLeft: daysUntil(clock, now),
        };
      }
    }

    entries.push({
      id: row?._id ?? null,
      tradeId: trade._id,
      direction,
      counterparty: counterpartyOf(counterparty),
      material: materialRef(materials, trade.materialCode),
      grams: trade.grams,
      duePaise,
      paidPaise,
      balancePaise: Math.max(0, duePaise - paidPaise),
      dueAt,
      status: ledgerStatus({ duePaise, paidPaise, dueAt }, now),
      daysLeft: daysUntil(dueAt, now),
      tradeStatus: trade.status,
      invoiceNo: trade.invoiceNo,
      inEscrow: isInEscrow(trade.status),
      msme,
      createdAt: trade.createdAt,
    });
  }
  return entries.sort(byUrgency);
}

const STATUS_RANK: Record<EntryView["status"], number> = {
  overdue: 0,
  part: 1,
  open: 1,
  settled: 2,
};

/** Overdue first, then by due date; settled entries last, newest first. */
function byUrgency(a: EntryView, b: EntryView): number {
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (rank !== 0) return rank;
  return a.status === "settled" ? b.dueAt - a.dueAt : a.dueAt - b.dueAt;
}

// --- Khata ---------------------------------------------------------------------------

const vCounterpartyBalance = v.object({
  org: vCounterparty,
  receivablePaise: v.number(),
  payablePaise: v.number(),
  overdue: v.boolean(),
  nextDueAt: v.union(v.number(), v.null()),
  msmeDaysLeft: v.union(v.number(), v.null()),
});

type CounterpartyBalance = typeof vCounterpartyBalance.type;

export const khataSummary = query({
  args: {},
  returns: v.object({
    receivablePaise: v.number(),
    payablePaise: v.number(),
    overduePaise: v.number(),
    overdueCount: v.number(),
    openCount: v.number(),
    counterparties: v.array(vCounterpartyBalance),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const entries = await entriesFor(ctx, org, Date.now());
    const totals = {
      receivablePaise: 0,
      payablePaise: 0,
      overduePaise: 0,
      overdueCount: 0,
      openCount: 0,
    };
    const parties = new Map<Id<"orgs">, CounterpartyBalance>();
    for (const entry of entries) {
      if (entry.status === "settled") continue;
      totals.openCount += 1;
      if (entry.direction === "receivable") {
        totals.receivablePaise += entry.balancePaise;
      } else {
        totals.payablePaise += entry.balancePaise;
      }
      if (entry.status === "overdue") {
        totals.overdueCount += 1;
        totals.overduePaise += entry.balancePaise;
      }
      let party = parties.get(entry.counterparty.id);
      if (!party) {
        party = {
          org: entry.counterparty,
          receivablePaise: 0,
          payablePaise: 0,
          overdue: false,
          nextDueAt: null,
          msmeDaysLeft: null,
        };
        parties.set(entry.counterparty.id, party);
      }
      if (entry.direction === "receivable") {
        party.receivablePaise += entry.balancePaise;
      } else {
        party.payablePaise += entry.balancePaise;
      }
      party.overdue ||= entry.status === "overdue";
      party.nextDueAt =
        party.nextDueAt === null
          ? entry.dueAt
          : Math.min(party.nextDueAt, entry.dueAt);
      if (entry.msme) {
        party.msmeDaysLeft =
          party.msmeDaysLeft === null
            ? entry.msme.daysLeft
            : Math.min(party.msmeDaysLeft, entry.msme.daysLeft);
      }
    }
    return {
      ...totals,
      counterparties: [...parties.values()].sort(
        (a, b) => (a.nextDueAt ?? 0) - (b.nextDueAt ?? 0),
      ),
    };
  },
});

export const khataEntries = query({
  args: { direction: v.optional(vLedgerDirection) },
  returns: v.array(vEntryView),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const entries = await entriesFor(ctx, org, Date.now());
    return args.direction
      ? entries.filter((entry) => entry.direction === args.direction)
      : entries;
  },
});

// --- Payments ------------------------------------------------------------------------

type PaymentView = typeof vPaymentView.type;

/** Fills in the other side of a payment and what it was for. */
async function toPaymentView(
  ctx: QueryCtx,
  payment: Doc<"payments">,
  orgId: Id<"orgs">,
  materials: Materials,
  lookupOrg: ReturnType<typeof orgLookup>,
): Promise<PaymentView> {
  const direction = payment.toOrgId === orgId ? "in" : "out";
  let counterparty = "";
  let material: PaymentView["material"];
  let title: string | undefined;
  switch (payment.subject) {
    case "trade": {
      const trade = await ctx.db.get(
        "trades",
        payment.subjectId as Id<"trades">,
      );
      if (trade) {
        const other = await lookupOrg(
          direction === "in" ? trade.buyerOrgId : trade.sellerOrgId,
        );
        counterparty = other?.name ?? "";
        material = materialRef(materials, trade.materialCode);
      }
      break;
    }
    case "booking": {
      const booking = await ctx.db.get(
        "bookings",
        payment.subjectId as Id<"bookings">,
      );
      counterparty = booking?.name ?? booking?.phone ?? "";
      break;
    }
    case "job": {
      const job = await ctx.db.get("jobs", payment.subjectId as Id<"jobs">);
      title = job?.title;
      if (job?.saathiProfileId) {
        const saathi = await ctx.db.get("saathiProfiles", job.saathiProfileId);
        counterparty = saathi?.name ?? "";
      }
      break;
    }
  }
  return {
    id: payment._id,
    subject: payment.subject,
    subjectId: payment.subjectId,
    method: payment.method,
    reference: payment.reference,
    amountPaise: payment.amountPaise,
    paidAt: payment.paidAt,
    direction,
    counterparty,
    material,
    title,
    note: payment.note,
  };
}

/** Every payment the business made or received, newest first. */
export const history = query({
  args: {},
  returns: v.array(vPaymentView),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const [out, inward, materials] = await Promise.all([
      ctx.db
        .query("payments")
        .withIndex("by_from_paidAt", (q) => q.eq("fromOrgId", org._id))
        .order("desc")
        .take(PAGE),
      ctx.db
        .query("payments")
        .withIndex("by_to_paidAt", (q) => q.eq("toOrgId", org._id))
        .order("desc")
        .take(PAGE),
      materialIndex(ctx),
    ]);
    const lookupOrg = orgLookup(ctx);
    const seen = new Set<Id<"payments">>();
    const rows = [...out, ...inward]
      .filter((row) => {
        if (seen.has(row._id)) return false;
        seen.add(row._id);
        return true;
      })
      .sort((a, b) => b.paidAt - a.paidAt)
      .slice(0, PAGE);
    const views: PaymentView[] = [];
    for (const row of rows) {
      views.push(await toPaymentView(ctx, row, org._id, materials, lookupOrg));
    }
    return views;
  },
});

/** The payments on one trade, pickup or job of the business. */
export const forSubject = query({
  args: { subject: vPaymentSubject, subjectId: vPaymentSubjectId },
  returns: v.array(vPaymentView),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    switch (args.subject) {
      case "trade": {
        await tradeFor(ctx, org._id, args.subjectId as Id<"trades">);
        break;
      }
      case "booking": {
        const booking = await ctx.db.get(
          "bookings",
          args.subjectId as Id<"bookings">,
        );
        if (booking?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
        break;
      }
      case "job": {
        const job = await ctx.db.get("jobs", args.subjectId as Id<"jobs">);
        if (job?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
        break;
      }
    }
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_subject", (q) =>
        q.eq("subject", args.subject).eq("subjectId", args.subjectId),
      )
      .take(PAGE);
    const materials = await materialIndex(ctx);
    const lookupOrg = orgLookup(ctx);
    const views: PaymentView[] = [];
    for (const row of rows.sort((a, b) => b.paidAt - a.paidAt)) {
      views.push(await toPaymentView(ctx, row, org._id, materials, lookupOrg));
    }
    return views;
  },
});

/**
 * Records a payment (or part payment) on a trade, with its reference, and
 * brings both sides' khata up to date. Either side may record it: the buyer
 * who paid or the seller who received.
 */
export const record = mutation({
  args: {
    tradeId: v.id("trades"),
    method: vPaymentMethod,
    reference: v.optional(v.string()),
    amountPaise: v.number(),
    paidAt: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  returns: v.object({
    paymentId: v.id("payments"),
    balancePaise: v.number(),
    status: vLedgerStatus,
  }),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx);
    const { trade, side } = await tradeFor(ctx, org._id, args.tradeId);
    if (!OWED_STATUSES.has(trade.status)) {
      throw new ConvexError("WRONG_STEP");
    }
    // The escrow hold is the prototype's own step, never typed in by hand.
    if (args.method === "escrow") throw new ConvexError("INVALID_METHOD");
    if (!isPositiveInteger(args.amountPaise)) {
      throw new ConvexError("INVALID_AMOUNT");
    }
    const reference = args.reference?.trim() || undefined;
    if (referenceRequired(args.method) && !reference) {
      throw new ConvexError("REFERENCE_REQUIRED");
    }
    if (reference && reference.length > REFERENCE_MAX_LENGTH) {
      throw new ConvexError("REFERENCE_TOO_LONG");
    }
    const note = args.note?.trim() || undefined;
    if (note && note.length > NOTE_MAX_LENGTH) {
      throw new ConvexError("NOTE_TOO_LONG");
    }
    const now = Date.now();
    const paidAt = args.paidAt ?? now;
    if (!Number.isFinite(paidAt) || paidAt > now + CLOCK_SLACK_MS) {
      throw new ConvexError("INVALID_DATE");
    }

    // Open the khata rows if the market hasn't, and count the escrow hold.
    await syncLedger(ctx, trade, profile._id, now);
    const ledger = await openLedgerFor(ctx, trade, now);
    const balancePaise = ledger.seller.duePaise - ledger.seller.paidPaise;
    if (args.amountPaise > balancePaise) throw new ConvexError("OVERPAYMENT");

    const paymentId = await ctx.db.insert("payments", {
      subject: "trade",
      subjectId: trade._id,
      method: args.method,
      reference,
      amountPaise: args.amountPaise,
      paidAt,
      fromOrgId: trade.buyerOrgId,
      toOrgId: trade.sellerOrgId,
      byProfileId: profile._id,
      note,
      createdAt: now,
    });

    let status: Doc<"ledgerEntries">["status"] = "open";
    for (const entry of [ledger.seller, ledger.buyer]) {
      const paidPaise = entry.paidPaise + args.amountPaise;
      status = ledgerStatus(
        { duePaise: entry.duePaise, paidPaise, dueAt: entry.dueAt },
        now,
      );
      await ctx.db.patch("ledgerEntries", entry._id, {
        paidPaise,
        status,
        updatedAt: now,
      });
    }
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "payment.recorded",
      entityTable: "payments",
      entityId: paymentId,
      metadata: {
        tradeId: trade._id,
        side,
        method: args.method,
        amountPaise: args.amountPaise,
        reference,
      },
    });
    return {
      paymentId,
      balancePaise: balancePaise - args.amountPaise,
      status,
    };
  },
});

// --- Fees and taxes on a trade ---------------------------------------------------------

function partyOf(org: Doc<"orgs">, profile: TaxProfile) {
  return {
    name: org.name,
    kind: org.kind,
    address: org.address,
    area: org.area,
    gstin: org.gstin,
    registered: profile.registered,
  };
}

/** The parties, material and tax breakdown of one of the caller's trades. */
async function tradeTax(ctx: QueryCtx, orgId: Id<"orgs">, tradeId: Id<"trades">) {
  const { trade, side } = await tradeFor(ctx, orgId, tradeId);
  const [sellerOrg, buyerOrg, materials] = await Promise.all([
    ctx.db.get("orgs", trade.sellerOrgId),
    ctx.db.get("orgs", trade.buyerOrgId),
    materialIndex(ctx),
  ]);
  if (!sellerOrg || !buyerOrg) throw new ConvexError("NOT_FOUND");
  const lookupProfile = profileLookup(ctx);
  const seller = { org: sellerOrg, profile: await lookupProfile(sellerOrg) };
  const buyer = { org: buyerOrg, profile: await lookupProfile(buyerOrg) };
  const material = materials.get(trade.materialCode);
  return {
    trade,
    side,
    seller,
    buyer,
    material,
    materialRef: materialRef(materials, trade.materialCode),
    breakdown: breakdownOf(trade, material, seller, buyer),
  };
}

export const breakdown = query({
  args: { tradeId: v.id("trades") },
  returns: v.object({
    tradeId: v.id("trades"),
    side: v.union(v.literal("buyer"), v.literal("seller")),
    status: vTradeStatus,
    invoiceNo: v.union(v.string(), v.null()),
    material: vMaterialRef,
    grams: v.number(),
    paisePerKg: v.number(),
    seller: vParty,
    buyer: vParty,
    buyerManufacturingDeclaration: v.boolean(),
    vehicle: vVehicle,
    /** When the RCM self-invoice is due, if one is needed and goods arrived. */
    selfInvoiceDueAt: v.union(v.number(), v.null()),
    breakdown: vTaxBreakdown,
  }),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const tax = await tradeTax(ctx, org._id, args.tradeId);
    const received = receivedAt(tax.trade);
    return {
      tradeId: tax.trade._id,
      side: tax.side,
      status: tax.trade.status,
      invoiceNo: tax.trade.invoiceNo ?? null,
      material: tax.materialRef,
      grams: tax.trade.grams,
      paisePerKg: tax.trade.paisePerKg,
      seller: partyOf(tax.seller.org, tax.seller.profile),
      buyer: partyOf(tax.buyer.org, tax.buyer.profile),
      buyerManufacturingDeclaration: tax.buyer.profile.manufacturingUse,
      vehicle: vehicleOf(tax.seller.org, tax.buyer.org),
      selfInvoiceDueAt:
        tax.breakdown.reverseCharge && received !== null
          ? selfInvoiceDueAt(received)
          : null,
      breakdown: tax.breakdown,
    };
  },
});

// --- E-way bills ----------------------------------------------------------------------

/** Does this load need an e-way bill, and who raises it? */
export const ewayBillCheck = query({
  args: {
    valuePaise: v.number(),
    vehicle: vVehicle,
    sellerRegistered: v.boolean(),
    buyerRegistered: v.optional(v.boolean()),
    distanceKm: v.optional(v.number()),
  },
  returns: vEwayBillCheck,
  handler: async (ctx, args): Promise<EwayBillCheck> => {
    await requireOrg(ctx);
    if (!Number.isFinite(args.valuePaise) || args.valuePaise < 0) {
      throw new ConvexError("INVALID_AMOUNT");
    }
    return checkEwayBill({
      valuePaise: args.valuePaise,
      vehicle: args.vehicle,
      sellerRegistered: args.sellerRegistered,
      buyerRegistered: args.buyerRegistered ?? true,
      distanceKm: args.distanceKm,
    });
  },
});

const KARNATAKA = { state: "Karnataka", stateCode: "29" };

function partAParty(org: Doc<"orgs">, profile: TaxProfile) {
  return {
    gstin: profile.registered && org.gstin ? org.gstin : "URP",
    name: org.name,
    address: org.address,
    place: `${org.area}, ${org.city}`,
    ...KARNATAKA,
  };
}

/** The Part A fields of an e-way bill for a trade, ready to download. */
export const ewayBillPartA = query({
  args: { tradeId: v.id("trades") },
  returns: v.object({
    tradeId: v.id("trades"),
    supplyType: v.union(v.literal("Outward"), v.literal("Inward")),
    subType: v.literal("Supply"),
    transactionType: v.literal("Regular"),
    documentType: v.union(
      v.literal("Tax Invoice"),
      v.literal("Bill of Supply"),
      v.literal("Self Invoice"),
    ),
    documentNo: v.union(v.string(), v.null()),
    documentDate: v.union(v.string(), v.null()),
    from: vPartAParty,
    to: vPartAParty,
    item: v.object({
      description: v.string(),
      hsn: v.string(),
      quantityKg: v.number(),
      unit: v.literal("KGS"),
      taxableValuePaise: v.number(),
      cgstBp: v.number(),
      sgstBp: v.number(),
      igstBp: v.number(),
      cessBp: v.number(),
    }),
    totals: v.object({
      taxableValuePaise: v.number(),
      cgstPaise: v.number(),
      sgstPaise: v.number(),
      igstPaise: v.number(),
      totalPaise: v.number(),
    }),
    transport: v.object({
      mode: v.literal("Road"),
      vehicle: vVehicle,
      approxDistanceKm: v.union(v.number(), v.null()),
    }),
    check: vEwayBillCheck,
  }),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const tax = await tradeTax(ctx, org._id, args.tradeId);
    const { trade, seller, buyer, breakdown: taxes } = tax;
    const invoiceAt = stepAt(trade, "paid_to_escrow");
    const halfRate = taxes.gstRateBp / 2;
    const gstOnDocument = taxes.invoiceGstPaise;
    const distance =
      seller.org.location && buyer.org.location
        ? distanceKm(seller.org.location, buyer.org.location)
        : null;
    let documentType: "Tax Invoice" | "Bill of Supply" | "Self Invoice" =
      "Bill of Supply";
    if (seller.profile.registered) documentType = "Tax Invoice";
    else if (taxes.reverseCharge) documentType = "Self Invoice";
    return {
      tradeId: trade._id,
      supplyType:
        tax.side === "seller" ? ("Outward" as const) : ("Inward" as const),
      subType: "Supply" as const,
      transactionType: "Regular" as const,
      documentType,
      documentNo: trade.invoiceNo ?? null,
      documentDate: invoiceAt === null ? null : indiaToday(invoiceAt),
      from: partAParty(seller.org, seller.profile),
      to: partAParty(buyer.org, buyer.profile),
      item: {
        description: tax.materialRef.names.en ?? trade.materialCode,
        hsn: taxes.hsn,
        quantityKg: trade.grams / 1000,
        unit: "KGS" as const,
        taxableValuePaise: trade.totalPaise,
        cgstBp: gstOnDocument > 0 ? halfRate : 0,
        sgstBp: gstOnDocument > 0 ? halfRate : 0,
        igstBp: 0,
        cessBp: 0,
      },
      totals: {
        taxableValuePaise: trade.totalPaise,
        cgstPaise: Math.floor(gstOnDocument / 2),
        sgstPaise: gstOnDocument - Math.floor(gstOnDocument / 2),
        igstPaise: 0,
        totalPaise: taxes.invoiceTotalPaise,
      },
      transport: {
        mode: "Road" as const,
        vehicle: vehicleOf(seller.org, buyer.org),
        approxDistanceKm: distance,
      },
      check: checkEwayBill({
        valuePaise: taxes.invoiceTotalPaise,
        vehicle: vehicleOf(seller.org, buyer.org),
        sellerRegistered: seller.profile.registered,
        buyerRegistered: buyer.profile.registered,
        distanceKm: distance ?? undefined,
      }),
    };
  },
});

// --- Registers and self-invoices ---------------------------------------------------------

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The month's purchases as a buyer, one row per received trade. */
export const purchaseRegister = query({
  args: { month: v.string() },
  returns: v.object({
    month: v.string(),
    rows: v.array(vRegisterRow),
    totals: v.object({
      grams: v.number(),
      taxableValuePaise: v.number(),
      gstPaise: v.number(),
      gstTdsPaise: v.number(),
      tcsPaise: v.number(),
      totalPaise: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    if (!MONTH.test(args.month)) throw new ConvexError("INVALID_MONTH");
    const [purchases, materials] = await Promise.all([
      ctx.db
        .query("trades")
        .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
        .order("desc")
        .take(HISTORY),
      materialIndex(ctx),
    ]);
    const lookupOrg = orgLookup(ctx);
    const lookupProfile = profileLookup(ctx);
    const buyerProfile = await lookupProfile(org);
    const rows: (typeof vRegisterRow.type)[] = [];
    const totals = {
      grams: 0,
      taxableValuePaise: 0,
      gstPaise: 0,
      gstTdsPaise: 0,
      tcsPaise: 0,
      totalPaise: 0,
    };
    for (const trade of purchases) {
      if (!INVOICED_STATUSES.has(trade.status)) continue;
      const invoiceAt = stepAt(trade, "paid_to_escrow") ?? trade.createdAt;
      const date = indiaToday(invoiceAt);
      if (!date.startsWith(args.month)) continue;
      const sellerOrg = await lookupOrg(trade.sellerOrgId);
      if (!sellerOrg) continue;
      const seller = { org: sellerOrg, profile: await lookupProfile(sellerOrg) };
      const taxes = breakdownOf(trade, materials.get(trade.materialCode), seller, {
        org,
        profile: buyerProfile,
      });
      rows.push({
        date,
        tradeId: trade._id,
        invoiceNo: trade.invoiceNo ?? null,
        supplier: sellerOrg.name,
        supplierGstin: seller.profile.registered ? (sellerOrg.gstin ?? null) : null,
        material: materialRef(materials, trade.materialCode),
        hsn: taxes.hsn,
        grams: trade.grams,
        taxableValuePaise: taxes.taxableValuePaise,
        gstRateBp: taxes.gstRateBp,
        gstPaise: taxes.gstPaise,
        reverseCharge: taxes.reverseCharge,
        gstTdsPaise: taxes.gstTdsPaise,
        tcsPaise: taxes.tcsPaise,
        totalPaise: taxes.invoiceTotalPaise,
      });
      totals.grams += trade.grams;
      totals.taxableValuePaise += taxes.taxableValuePaise;
      totals.gstPaise += taxes.gstPaise;
      totals.gstTdsPaise += taxes.gstTdsPaise;
      totals.tcsPaise += taxes.tcsPaise;
      totals.totalPaise += taxes.invoiceTotalPaise;
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return { month: args.month, rows, totals };
  },
});

function selfInvoiceNumber(trade: Doc<"trades">): string {
  return `SI-${trade.invoiceNo ?? trade._id.slice(-6).toUpperCase()}`;
}

/** Metal bought from unregistered sellers: each needs a self-invoice within 30 days. */
export const selfInvoices = query({
  args: {},
  returns: v.array(vSelfInvoiceItem),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const now = Date.now();
    const [purchases, materials] = await Promise.all([
      ctx.db
        .query("trades")
        .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
        .order("desc")
        .take(HISTORY),
      materialIndex(ctx),
    ]);
    const lookupOrg = orgLookup(ctx);
    const lookupProfile = profileLookup(ctx);
    const buyer = { org, profile: await lookupProfile(org) };
    const items: (typeof vSelfInvoiceItem.type)[] = [];
    for (const trade of purchases) {
      const received = receivedAt(trade);
      if (received === null || trade.status === "declined") continue;
      const sellerOrg = await lookupOrg(trade.sellerOrgId);
      if (!sellerOrg) continue;
      const seller = { org: sellerOrg, profile: await lookupProfile(sellerOrg) };
      const taxes = breakdownOf(
        trade,
        materials.get(trade.materialCode),
        seller,
        buyer,
      );
      if (!taxes.reverseCharge) continue;
      const dueAt = selfInvoiceDueAt(received);
      items.push({
        tradeId: trade._id,
        selfInvoiceNo: selfInvoiceNumber(trade),
        invoiceNo: trade.invoiceNo ?? null,
        supplier: counterpartyOf(sellerOrg),
        material: materialRef(materials, trade.materialCode),
        grams: trade.grams,
        taxableValuePaise: taxes.taxableValuePaise,
        gstRateBp: taxes.gstRateBp,
        gstPaise: taxes.gstPaise,
        receivedAt: received,
        dueAt,
        daysLeft: daysUntil(dueAt, now),
      });
    }
    return items.sort((a, b) => a.dueAt - b.dueAt);
  },
});

/** The RCM self-invoice for one trade, or null when none is needed. */
export const selfInvoice = query({
  args: { tradeId: v.id("trades") },
  returns: v.union(
    v.null(),
    v.object({
      tradeId: v.id("trades"),
      selfInvoiceNo: v.string(),
      invoiceNo: v.union(v.string(), v.null()),
      receivedAt: v.number(),
      dueAt: v.number(),
      supplier: vPartAParty,
      recipient: vPartAParty,
      item: v.object({
        description: v.string(),
        hsn: v.string(),
        grams: v.number(),
        paisePerKg: v.number(),
        taxableValuePaise: v.number(),
      }),
      gstRateBp: v.number(),
      cgstPaise: v.number(),
      sgstPaise: v.number(),
      totalPaise: v.number(),
      reverseCharge: v.literal(true),
    }),
  ),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const tax = await tradeTax(ctx, org._id, args.tradeId);
    const received = receivedAt(tax.trade);
    if (!tax.breakdown.reverseCharge || received === null) return null;
    const gst = tax.breakdown.gstPaise;
    return {
      tradeId: tax.trade._id,
      selfInvoiceNo: selfInvoiceNumber(tax.trade),
      invoiceNo: tax.trade.invoiceNo ?? null,
      receivedAt: received,
      dueAt: selfInvoiceDueAt(received),
      supplier: partAParty(tax.seller.org, tax.seller.profile),
      recipient: partAParty(tax.buyer.org, tax.buyer.profile),
      item: {
        description: tax.materialRef.names.en ?? tax.trade.materialCode,
        hsn: tax.breakdown.hsn,
        grams: tax.trade.grams,
        paisePerKg: tax.trade.paisePerKg,
        taxableValuePaise: tax.trade.totalPaise,
      },
      gstRateBp: tax.breakdown.gstRateBp,
      cgstPaise: Math.floor(gst / 2),
      sgstPaise: gst - Math.floor(gst / 2),
      totalPaise: tax.trade.totalPaise + gst,
      reverseCharge: true as const,
    };
  },
});

// --- Declarations ---------------------------------------------------------------------------

/** The business's standing declarations, with defaults where none was made. */
export const declarations = query({
  args: {},
  returns: v.object({
    gstin: v.optional(v.string()),
    items: v.array(vDeclarationItem),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const declared = await declarationsOf(ctx, org._id);
    const defaults: Record<DeclarationKind, string> = {
      manufacturingUse: "no",
      gstStatus: org.gstin ? "registered" : "unregistered",
      msme: "none",
    };
    const kinds: DeclarationKind[] = ["gstStatus", "msme", "manufacturingUse"];
    return {
      gstin: org.gstin,
      items: kinds.map((kind) => {
        const row = declared.get(kind);
        return row
          ? {
              kind,
              value: row.value,
              validFrom: row.validFrom,
              source: "declared" as const,
            }
          : {
              kind,
              value: defaults[kind],
              validFrom: indiaToday(org.createdAt),
              source: "default" as const,
            };
      }),
    };
  },
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const setDeclaration = mutation({
  args: {
    kind: vDeclarationKind,
    value: vDeclarationValue,
    validFrom: v.optional(v.string()),
  },
  returns: v.id("declarations"),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx);
    if (!DECLARATION_VALUES[args.kind].includes(args.value)) {
      throw new ConvexError("INVALID_DECLARATION");
    }
    const now = Date.now();
    const validFrom = args.validFrom ?? indiaToday(now);
    if (!DATE.test(validFrom)) throw new ConvexError("INVALID_DATE");
    const id = await ctx.db.insert("declarations", {
      orgId: org._id,
      kind: args.kind,
      value: args.value,
      validFrom,
      byProfileId: profile._id,
      createdAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "declaration.set",
      entityTable: "declarations",
      entityId: id,
      metadata: { kind: args.kind, value: args.value, validFrom },
    });
    return id;
  },
});
