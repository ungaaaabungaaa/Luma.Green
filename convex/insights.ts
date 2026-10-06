import { ConvexError, type Infer, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/access";
import { findProfile } from "./lib/applicationAccess";
import type { Family } from "./lib/catalogue";
import { type OrgKind, requiresEwayBill } from "./lib/chain";
import { shiftDate } from "./lib/dates";
import { vSaathiWork } from "./lib/drafts";
import { indiaToday } from "./lib/onboarding";
import { vFamily, vOrgKind } from "./lib/validators";
import { vMaterialRef } from "./lib/views";
import {
  findOrgFor,
  findSaathiFor,
  materialIndex,
  requireOrg,
} from "./lib/workspace";
import {
  bySchedule,
  earningsOf,
  jobsOf,
  jobViews,
  RECENT_DONE,
  vJobView,
} from "./saathi";

/**
 * Impact and compliance: what a business has kept in the recycling loop, and
 * the papers and records it needs to keep doing it. Historical completed
 * trades are records, not proof that a gateway received payment.
 */

/** Most rows one list reads — a prototype bound; keep running totals past it. */
const MAX_ROWS = 2000;
/** Receipts listed on the compliance screen, newest first. */
const MAX_RECEIPTS = 50;

type Materials = ReadonlyMap<
  string,
  Pick<Doc<"materials">, "code" | "family" | "stage" | "names" | "co2eFactor">
>;

// --- Pure rules: kilos and CO2e ---------------------------------------------

export interface Movement {
  materialCode: string;
  grams: number;
}

export interface FamilyTotal {
  family: Family;
  grams: number;
  co2eKg: number;
}

/**
 * Kilos a business kept in the loop, per material family: the larger of what
 * came in and what moved on, so a kilo bought and later sold counts once (and
 * scrap turned into granules within one family isn't counted twice). The
 * CO2e comes from the same side as the kilos. Conservative by design: stock
 * the platform never saw arrive is not credited twice.
 */
export function familyTotals(
  incoming: readonly Movement[],
  outgoing: readonly Movement[],
  materials: Materials,
): FamilyTotal[] {
  const sums = new Map<
    Family,
    { inGrams: number; inCo2e: number; outGrams: number; outCo2e: number }
  >();
  const add = (movement: Movement, side: "in" | "out") => {
    const material = materials.get(movement.materialCode);
    const family = material?.family ?? "other";
    const co2eGrams = movement.grams * (material?.co2eFactor ?? 0);
    const sum = sums.get(family) ?? {
      inGrams: 0,
      inCo2e: 0,
      outGrams: 0,
      outCo2e: 0,
    };
    if (side === "in") {
      sum.inGrams += movement.grams;
      sum.inCo2e += co2eGrams;
    } else {
      sum.outGrams += movement.grams;
      sum.outCo2e += co2eGrams;
    }
    sums.set(family, sum);
  };
  for (const movement of incoming) add(movement, "in");
  for (const movement of outgoing) add(movement, "out");

  return Array.from(sums, ([family, sum]) => {
    const isInLarger = sum.inGrams >= sum.outGrams;
    return {
      family,
      grams: isInLarger ? sum.inGrams : sum.outGrams,
      co2eKg: Math.round(isInLarger ? sum.inCo2e : sum.outCo2e) / 1000,
    };
  })
    .filter((total) => total.grams > 0)
    .toSorted((a, b) => b.grams - a.grams);
}

// --- Pure rules: consent, checklist, EPR ------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A consent is flagged for renewal when it has fewer days left than this. */
export const CONSENT_WARNING_DAYS = 90;

export type ConsentStatus = "ok" | "expiring" | "expired" | "missing";

function dayNumber(date: string): number {
  return ISO_DATE.test(date) ? Date.parse(`${date}T00:00:00Z`) / DAY_MS : NaN;
}

/**
 * Where a pollution-board consent stands on `today` (both YYYY-MM-DD). The
 * consent is good through its last day; under 90 days left is "expiring".
 */
export function consentStatus(
  validUntil: string | undefined,
  today: string,
): { status: ConsentStatus; daysLeft: number | null } {
  const daysLeft = validUntil ? dayNumber(validUntil) - dayNumber(today) : NaN;
  if (!Number.isFinite(daysLeft)) return { status: "missing", daysLeft: null };
  if (daysLeft < 0) return { status: "expired", daysLeft };
  return {
    status: daysLeft < CONSENT_WARNING_DAYS ? "expiring" : "ok",
    daysLeft,
  };
}

export type CheckStatus =
  | "done"
  | "due_soon"
  | "overdue"
  | "missing"
  | "optional"
  | "not_needed"
  | "self_declared";

export type CheckItem = "gst" | "consent" | "scale" | "safety";

/**
 * The compliance checklist. GST is optional for a small scrap shop and so is
 * a consent; yards, recyclers and factories need both. The weighing scale's
 * Legal Metrology stamp and the workers' safety kit are self-declared for now.
 */
export function checklistFor(
  kind: OrgKind,
  hasGstin: boolean,
  consent: ConsentStatus,
): { id: CheckItem; status: CheckStatus }[] {
  const isShop = kind === "kabadiwala";
  const consentCheck: Record<ConsentStatus, CheckStatus> = {
    ok: "done",
    expiring: "due_soon",
    expired: "overdue",
    missing: isShop ? "not_needed" : "missing",
  };
  const gst: CheckStatus = isShop ? "optional" : "missing";
  return [
    { id: "gst", status: hasGstin ? "done" : gst },
    { id: "consent", status: consentCheck[consent] },
    { id: "scale", status: "self_declared" },
    { id: "safety", status: "self_declared" },
  ];
}

/** The Indian financial year (April to March) that `today` falls in. */
export function financialYear(today: string): {
  from: string;
  to: string;
  startYear: number;
} {
  const year = Number(today.slice(0, 4));
  const startYear = Number(today.slice(5, 7)) >= 4 ? year : year - 1;
  return {
    from: `${String(startYear)}-04-01`,
    to: `${String(startYear + 1)}-03-31`,
    startYear,
  };
}

export type EprStream =
  "plastic" | "ewaste" | "battery" | "paper" | "metal" | "glass" | "other";
export type EprRegime = "pwm_2016" | "ewaste_2022" | "bwm_2022";

/** Streams in the order they're listed: the ones under EPR rules first. */
export const EPR_STREAMS: readonly EprStream[] = [
  "plastic",
  "ewaste",
  "battery",
  "paper",
  "metal",
  "glass",
  "other",
];

/**
 * Which Extended Producer Responsibility rules cover a stream: the Plastic
 * Waste Management Rules 2016, the E-Waste (Management) Rules 2022 and the
 * Battery Waste Management Rules 2022. Paper, metal and glass have none yet.
 */
export const EPR_REGIME: Record<EprStream, EprRegime | null> = {
  plastic: "pwm_2016",
  ewaste: "ewaste_2022",
  battery: "bwm_2022",
  paper: null,
  metal: null,
  glass: null,
  other: null,
};

/** Batteries sit in the e-waste family but have rules of their own. */
export function eprStream(material: {
  code: string;
  family: Family;
}): EprStream {
  return material.code.includes("BATTERY") ? "battery" : material.family;
}

// --- Validators ---------------------------------------------------------------

const vFlow = v.object({
  grams: v.number(),
  paise: v.number(),
  count: v.number(),
});

const vOrgImpact = v.object({
  kind: v.literal("org"),
  orgKind: vOrgKind,
  /** Bought from households at completed pickups (kabadiwalas only). */
  households: vFlow,
  /** Bought from other businesses in completed trades. */
  bought: vFlow,
  /** Sold up the chain in completed trades. */
  sold: vFlow,
  /** Each kilo once — see `familyTotals`. */
  recycledGrams: v.number(),
  co2eKg: v.number(),
  families: v.array(
    v.object({ family: vFamily, grams: v.number(), co2eKg: v.number() }),
  ),
  /** When the first completed pickup or trade happened; null if none yet. */
  since: v.union(v.number(), v.null()),
});

const vSaathiImpact = v.object({
  kind: v.literal("saathi"),
  totalPaise: v.number(),
  jobsDone: v.number(),
  weekPaise: v.number(),
  weekJobs: v.number(),
  byKind: v.array(
    v.object({ kind: vSaathiWork, jobs: v.number(), paise: v.number() }),
  ),
  recent: v.array(vJobView),
});

const vConsentStatus = v.union(
  v.literal("ok"),
  v.literal("expiring"),
  v.literal("expired"),
  v.literal("missing"),
);

const vCheckStatus = v.union(
  v.literal("done"),
  v.literal("due_soon"),
  v.literal("overdue"),
  v.literal("missing"),
  v.literal("optional"),
  v.literal("not_needed"),
  v.literal("self_declared"),
);

const vEprStream = v.union(
  v.literal("plastic"),
  v.literal("ewaste"),
  v.literal("battery"),
  v.literal("paper"),
  v.literal("metal"),
  v.literal("glass"),
  v.literal("other"),
);

const vEprRegime = v.union(
  v.literal("pwm_2016"),
  v.literal("ewaste_2022"),
  v.literal("bwm_2022"),
);

const vReceiptRow = v.object({
  tradeId: v.id("trades"),
  /** Old LG reference from the prototype; not a verified GST invoice. */
  legacyReceiptNo: v.string(),
  /** When the old reference was recorded, not a verified payment date. */
  recordedAt: v.number(),
  paymentVerification: v.literal("legacy_unverified"),
  side: v.union(v.literal("sale"), v.literal("purchase")),
  /** The other business; null only if its record is gone. */
  counterparty: v.union(
    v.null(),
    v.object({ name: v.string(), kind: vOrgKind }),
  ),
  material: vMaterialRef,
  grams: v.number(),
  totalPaise: v.number(),
  needsEwayBill: v.boolean(),
});

const vEprSummary = v.object({
  role: v.union(v.literal("recycler"), v.literal("manufacturer")),
  /** Old completed rows are physical-flow claims without verified evidence. */
  evidenceStatus: v.literal("source_records_unverified"),
  /** The financial year, YYYY-MM-DD, April to March. */
  from: v.string(),
  to: v.string(),
  rows: v.array(
    v.object({
      stream: vEprStream,
      regime: v.union(vEprRegime, v.null()),
      receivedGrams: v.number(),
      /** Recycled output sold (recyclers); 0 for manufacturers. */
      recycledGrams: v.number(),
    }),
  ),
});

// --- Reading the ledger -----------------------------------------------------------

/** When a trade reached a status, or undefined if it never did. */
function reachedAt(
  trade: Doc<"trades">,
  status: Doc<"trades">["status"],
): number | undefined {
  return trade.timeline.find((step) => step.status === status)?.at;
}

function completedAt(trade: Doc<"trades">): number {
  return reachedAt(trade, "completed") ?? trade.updatedAt;
}

async function tradesOf(ctx: QueryCtx, orgId: Id<"orgs">) {
  const sales = await ctx.db
    .query("trades")
    .withIndex("by_seller", (q) => q.eq("sellerOrgId", orgId))
    .order("desc")
    .take(MAX_ROWS);
  const purchases = await ctx.db
    .query("trades")
    .withIndex("by_buyer", (q) => q.eq("buyerOrgId", orgId))
    .order("desc")
    .take(MAX_ROWS);
  return { sales, purchases };
}

async function completedPickups(ctx: QueryCtx, orgId: Id<"orgs">) {
  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_org_status", (q) =>
      q.eq("orgId", orgId).eq("status", "completed"),
    )
    .order("desc")
    .take(MAX_ROWS);
  return bookings.flatMap((booking) =>
    booking.receipt ? [booking.receipt] : [],
  );
}

function flowOf(trades: readonly Doc<"trades">[]) {
  return {
    grams: trades.reduce((sum, trade) => sum + trade.grams, 0),
    paise: trades.reduce((sum, trade) => sum + trade.totalPaise, 0),
    count: trades.length,
  };
}

async function orgImpact(
  ctx: QueryCtx,
  org: Doc<"orgs">,
): Promise<Infer<typeof vOrgImpact>> {
  const materials = await materialIndex(ctx);
  const receipts =
    org.kind === "kabadiwala" ? await completedPickups(ctx, org._id) : [];
  const { sales, purchases } = await tradesOf(ctx, org._id);
  const sold = sales.filter((trade) => trade.status === "completed");
  const bought = purchases.filter((trade) => trade.status === "completed");

  const incoming: Movement[] = [
    ...receipts.flatMap((receipt) => receipt.lines),
    ...bought,
  ];
  const families = familyTotals(incoming, sold, materials);
  const times = [
    ...receipts.map((receipt) => receipt.paidAt),
    ...[...sold, ...bought].map((trade) => completedAt(trade)),
  ];

  return {
    kind: "org",
    orgKind: org.kind,
    households: {
      grams: receipts.reduce(
        (sum, receipt) =>
          sum + receipt.lines.reduce((lines, line) => lines + line.grams, 0),
        0,
      ),
      paise: receipts.reduce((sum, receipt) => sum + receipt.totalPaise, 0),
      count: receipts.length,
    },
    bought: flowOf(bought),
    sold: flowOf(sold),
    recycledGrams: families.reduce((sum, total) => sum + total.grams, 0),
    co2eKg:
      Math.round(
        families.reduce((sum, total) => sum + total.co2eKg * 1000, 0),
      ) / 1000,
    families,
    since: times.length > 0 ? Math.min(...times) : null,
  };
}

async function saathiImpact(
  ctx: QueryCtx,
  saathi: Doc<"saathiProfiles">,
): Promise<Infer<typeof vSaathiImpact>> {
  const today = indiaToday();
  const own = await jobsOf(ctx, saathi._id);
  const done = own
    .filter((job) => job.status === "done")
    .toSorted((a, b) => bySchedule(b, a));
  const byKind = new Map<
    Doc<"jobs">["kind"],
    { jobs: number; paise: number }
  >();
  for (const job of done) {
    const sum = byKind.get(job.kind) ?? { jobs: 0, paise: 0 };
    byKind.set(job.kind, {
      jobs: sum.jobs + 1,
      paise: sum.paise + job.payPaise,
    });
  }
  return {
    kind: "saathi",
    ...earningsOf(done, today),
    byKind: Array.from(byKind, ([kind, sum]) => ({ kind, ...sum })).toSorted(
      (a, b) => b.paise - a.paise,
    ),
    recent: await jobViews(ctx, done.slice(0, RECENT_DONE), saathi.area),
  };
}

/**
 * The impact screen. A business sees the kilos it kept in the loop, the CO2e
 * they avoided and the money that moved; a Saathi sees jobs and earnings.
 */
export const impact = query({
  args: {},
  returns: v.union(vOrgImpact, vSaathiImpact),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const profile = await findProfile(ctx, user._id);
    if (!profile) throw new ConvexError("NO_PROFILE");
    const org = await findOrgFor(ctx, profile._id);
    if (org) return orgImpact(ctx, org);
    const saathi = await findSaathiFor(ctx, profile._id);
    if (saathi) return saathiImpact(ctx, saathi);
    throw new ConvexError("NO_WORKSPACE");
  },
});

// --- Compliance -----------------------------------------------------------------

function materialRef(
  materials: Materials,
  code: string,
): Infer<typeof vMaterialRef> {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? "other",
  };
}

async function receiptsOf(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  trades: readonly Doc<"trades">[],
  materials: Materials,
): Promise<Infer<typeof vReceiptRow>[]> {
  const legacyReferences = trades
    .filter((trade) => trade.invoiceNo !== undefined)
    .map((trade) => ({
      trade,
      recordedAt: reachedAt(trade, "paid_to_escrow") ?? trade.updatedAt,
    }))
    .toSorted((a, b) => b.recordedAt - a.recordedAt)
    .slice(0, MAX_RECEIPTS);

  const others = new Map<Id<"orgs">, Doc<"orgs"> | null>();
  const rows: Infer<typeof vReceiptRow>[] = [];
  for (const { trade, recordedAt } of legacyReferences) {
    const side = trade.sellerOrgId === orgId ? "sale" : "purchase";
    const otherId = side === "sale" ? trade.buyerOrgId : trade.sellerOrgId;
    if (!others.has(otherId)) {
      others.set(otherId, await ctx.db.get("orgs", otherId));
    }
    const other = others.get(otherId);
    rows.push({
      tradeId: trade._id,
      legacyReceiptNo: trade.invoiceNo ?? "",
      recordedAt,
      paymentVerification: "legacy_unverified",
      side,
      counterparty: other ? { name: other.name, kind: other.kind } : null,
      material: materialRef(materials, trade.materialCode),
      grams: trade.grams,
      totalPaise: trade.totalPaise,
      needsEwayBill: requiresEwayBill(trade.totalPaise),
    });
  }
  return rows;
}

/**
 * The year's EPR record for a recycler or manufacturer: what came in and
 * (for recyclers) the recycled material that went out, by stream. The
 * certificates themselves are generated on CPCB's EPR portals.
 */
function eprSummary(
  role: "recycler" | "manufacturer",
  sales: readonly Doc<"trades">[],
  purchases: readonly Doc<"trades">[],
  materials: Materials,
  today: string,
): Infer<typeof vEprSummary> {
  const { from, to } = financialYear(today);
  const inYear = (trade: Doc<"trades">) => {
    if (trade.status !== "completed") return false;
    const day = indiaToday(completedAt(trade));
    return day >= from && day <= to;
  };
  const totals = new Map<EprStream, { received: number; recycled: number }>();
  const add = (trade: Doc<"trades">, column: "received" | "recycled") => {
    const stream = eprStream({
      code: trade.materialCode,
      family: materials.get(trade.materialCode)?.family ?? "other",
    });
    const sum = totals.get(stream) ?? { received: 0, recycled: 0 };
    sum[column] += trade.grams;
    totals.set(stream, sum);
  };
  for (const trade of purchases) {
    if (inYear(trade)) add(trade, "received");
  }
  if (role === "recycler") {
    for (const trade of sales) {
      const isOutput = materials.get(trade.materialCode)?.stage === "recycled";
      if (isOutput && inYear(trade)) add(trade, "recycled");
    }
  }
  return {
    role,
    evidenceStatus: "source_records_unverified",
    from,
    to,
    rows: EPR_STREAMS.flatMap((stream) => {
      const sum = totals.get(stream);
      return sum
        ? [
            {
              stream,
              regime: EPR_REGIME[stream],
              receivedGrams: sum.received,
              recycledGrams: sum.recycled,
            },
          ]
        : [];
    }),
  };
}

/**
 * The compliance screen: GST, the pollution-board consent and how long it
 * has left, a checklist, old trade references and — for recyclers and
 * manufacturers — a financial-year material-flow summary.
 */
export const compliance = query({
  args: {},
  returns: v.object({
    orgKind: vOrgKind,
    gstin: v.union(v.string(), v.null()),
    consent: v.object({
      status: vConsentStatus,
      board: v.optional(v.string()),
      number: v.optional(v.string()),
      validUntil: v.optional(v.string()),
      daysLeft: v.optional(v.number()),
      /** When the renewal reminder is due: 90 days before it runs out. */
      remindOn: v.optional(v.string()),
    }),
    checklist: v.array(
      v.object({
        id: v.union(
          v.literal("gst"),
          v.literal("consent"),
          v.literal("scale"),
          v.literal("safety"),
        ),
        status: vCheckStatus,
      }),
    ),
    receipts: v.array(vReceiptRow),
    epr: v.union(vEprSummary, v.null()),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const today = indiaToday();
    const materials = await materialIndex(ctx);
    const { sales, purchases } = await tradesOf(ctx, org._id);
    const { status, daysLeft } = consentStatus(org.consent?.validUntil, today);
    const role =
      org.kind === "recycler" || org.kind === "manufacturer" ? org.kind : null;

    return {
      orgKind: org.kind,
      gstin: org.gstin ?? null,
      consent: {
        status,
        board: org.consent?.board,
        number: org.consent?.number,
        validUntil: org.consent?.validUntil,
        daysLeft: daysLeft ?? undefined,
        remindOn:
          status === "ok" && org.consent
            ? shiftDate(org.consent.validUntil, -CONSENT_WARNING_DAYS)
            : undefined,
      },
      checklist: checklistFor(org.kind, Boolean(org.gstin), status),
      receipts: await receiptsOf(
        ctx,
        org._id,
        [...sales, ...purchases],
        materials,
      ),
      epr: role ? eprSummary(role, sales, purchases, materials, today) : null,
    };
  },
});
