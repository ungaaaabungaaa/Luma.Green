import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import { financialYear } from "./insights";
import type { OrgKind } from "./lib/chain";
import { indiaToday } from "./lib/onboarding";
import { normalizeIndianMobile } from "./lib/phone";
import {
  batchTotals,
  can,
  capacityUse,
  type FloorAction,
  isIsoDate,
  isPercent,
  MAX_CAPACITY_TONNES,
  MAX_DEDUCTION_PCT,
  MAX_SCALE_CAPACITY_KG,
  type MemberRole,
  mergeLines,
  netGramsOf,
  nextSlipNumber,
  normalizeVehicleNumber,
  qualityDefaults,
  type QualityReading,
  reverificationMonths,
  stampStatus,
  weightMismatch,
} from "./lib/quality";
import { vOrgKind, vTradeStatus } from "./lib/validators";
import { vMaterialRef } from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";
import {
  vBatchLine,
  vCapacitySource,
  vDeductionReason,
  vMemberRole,
  vQualityKey,
  vQualityResult,
  vScaleKind,
  vShift,
  vSlipDirection,
  vTeamRole,
} from "./tables/floor";

/**
 * The factory floor — docs/plan.md "Fitting into what exists". A yard,
 * recycler or manufacturer weighs every load in and out on a stamped scale,
 * checks incoming quality against the material's limits, records what its
 * plant turned scrap into, and hands staff a role each. A weigh slip never
 * changes a trade; it sits beside it as evidence, and a gap over 1% between
 * the two sides' scales is flagged for both to see.
 *
 * Every function starts with the caller's business (requireOrg — staff
 * memberships count) and then the member's role, since a gate operator
 * weighs loads but doesn't invite people.
 */

const FACTORY_KINDS: readonly OrgKind[] = ["yard", "recycler", "manufacturer"];

/** Most rows one screen reads. */
const PAGE = 100;
/** Slips and checks listed on the gate screen. */
const RECENT = 20;
/** Most scales, invites and batch lines one business keeps. */
const MAX_SCALES = 20;
const MAX_INVITES = 30;
const MAX_LINES = 10;
const NOTE_MAX_LENGTH = 140;
const REASON_MAX_LENGTH = 280;
/** The heaviest gross weight a slip may carry: a 200-tonne weighbridge. */
const MAX_GROSS_GRAMS = MAX_SCALE_CAPACITY_KG * 1000;
/** How far back a batch may be dated. */
const BATCH_HISTORY_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

type Side = "buyer" | "seller";
type Materials = Awaited<ReturnType<typeof materialIndex>>;

// --- Result shapes -----------------------------------------------------------------

const vStampStatus = v.union(
  v.literal("ok"),
  v.literal("expiring"),
  v.literal("expired"),
);

const vSide = v.union(v.literal("buyer"), v.literal("seller"));

const vParty = v.object({ name: v.string(), area: v.string(), kind: vOrgKind });

const vScaleView = v.object({
  id: v.id("scales"),
  kind: vScaleKind,
  capacityKg: v.number(),
  stampNumber: v.string(),
  stampValidUntil: v.string(),
  note: v.optional(v.string()),
  status: vStampStatus,
  /** Negative once the stamp has run out. */
  daysLeft: v.number(),
  reverifyMonths: v.number(),
  updatedAt: v.number(),
});

const vMismatch = v.object({
  differenceGrams: v.number(),
  differencePct: v.number(),
  flagged: v.boolean(),
});

const vLoadView = v.object({
  tradeId: v.id("trades"),
  side: vSide,
  /** Buyers weigh in, sellers weigh out. */
  direction: vSlipDirection,
  status: vTradeStatus,
  material: vMaterialRef,
  grams: v.number(),
  counterparty: vParty,
  /** My slips on this load. */
  slips: v.number(),
  lastNetGrams: v.union(v.number(), v.null()),
  check: v.union(
    v.null(),
    v.object({ result: vQualityResult, deductionPct: v.number() }),
  ),
  invoiceNo: v.optional(v.string()),
  updatedAt: v.number(),
});

const vSlipView = v.object({
  id: v.id("weighSlips"),
  slipNumber: v.string(),
  direction: vSlipDirection,
  vehicleNo: v.string(),
  grossGrams: v.number(),
  tareGrams: v.number(),
  deductionGrams: v.number(),
  deductionReason: v.optional(vDeductionReason),
  netGrams: v.number(),
  at: v.number(),
  scaleKind: vScaleKind,
  /** Whether the scale's stamp was valid on the day it weighed this. */
  stampWasValid: v.boolean(),
  trade: v.union(
    v.null(),
    v.object({
      id: v.id("trades"),
      material: vMaterialRef,
      grams: v.number(),
      counterparty: v.string(),
      mismatch: vMismatch,
    }),
  ),
  photoUrl: v.union(v.string(), v.null()),
});

const vReading = v.object({
  key: vQualityKey,
  value: v.number(),
  limit: v.number(),
});

const vCheckView = v.object({
  id: v.id("qualityChecks"),
  tradeId: v.id("trades"),
  material: vMaterialRef,
  grams: v.number(),
  result: vQualityResult,
  deductionPct: v.number(),
  reason: v.optional(v.string()),
  params: v.array(vReading),
  /** The other business on the trade. */
  counterparty: v.string(),
  at: v.number(),
});

const vBatchView = v.object({
  id: v.id("productionBatches"),
  date: v.string(),
  shift: vShift,
  inputs: v.array(v.object({ material: vMaterialRef, grams: v.number() })),
  outputs: v.array(v.object({ material: vMaterialRef, grams: v.number() })),
  inputGrams: v.number(),
  outputGrams: v.number(),
  yieldPct: v.number(),
  note: v.optional(v.string()),
  createdAt: v.number(),
});

// --- Access ---------------------------------------------------------------------

async function memberRoleOf(
  ctx: QueryCtx,
  profileId: Id<"profiles">,
  orgId: Id<"orgs">,
): Promise<MemberRole> {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_profile", (q) => q.eq("profileId", profileId))
    .take(20);
  const membership = memberships.find((row) => row.orgId === orgId);
  if (!membership) throw new ConvexError("NO_BUSINESS");
  return membership.role;
}

/** The caller's business and their role in it. */
async function requireFloor(ctx: QueryCtx, kinds?: readonly OrgKind[]) {
  const { profile, org } = await requireOrg(ctx, kinds);
  const role = await memberRoleOf(ctx, profile._id, org._id);
  return { profile, org, role };
}

/** …and that their role lets them take `action`. */
async function requireFloorAction(
  ctx: QueryCtx,
  action: FloorAction,
  kinds?: readonly OrgKind[],
) {
  const floor = await requireFloor(ctx, kinds);
  if (!can(floor.role, action)) throw new ConvexError("NOT_ALLOWED");
  return floor;
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

// --- Helpers ----------------------------------------------------------------------

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/** A trimmed optional text, empty meaning none, refused past `max` letters. */
function optionalText(
  value: string | undefined,
  max: number,
  error: string,
): string | undefined {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === "") return undefined;
  if (trimmed.length > max) throw new ConvexError(error);
  return trimmed;
}

function materialRef(materials: Materials, code: string) {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? ("other" as const),
  };
}

function sideOf(trade: Doc<"trades">, orgId: Id<"orgs">): Side | null {
  if (trade.buyerOrgId === orgId) return "buyer";
  return trade.sellerOrgId === orgId ? "seller" : null;
}

/** A load that has physically moved or is about to: nothing to weigh before. */
function isWeighable(trade: Doc<"trades">): boolean {
  return trade.status !== "requested" && trade.status !== "declined";
}

function directionFor(side: Side): "in" | "out" {
  return side === "buyer" ? "in" : "out";
}

function toScaleView(scale: Doc<"scales">, today: string) {
  const stamp = stampStatus(scale.stampValidUntil, today);
  return {
    id: scale._id,
    kind: scale.kind,
    capacityKg: scale.capacityKg,
    stampNumber: scale.stampNumber,
    stampValidUntil: scale.stampValidUntil,
    note: scale.note,
    status: stamp.status,
    daysLeft: stamp.daysLeft,
    reverifyMonths: reverificationMonths(scale.kind),
    updatedAt: scale.updatedAt,
  };
}

/** Looks each business up once per request. */
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

function partyOf(org: Doc<"orgs">) {
  return { name: org.name, area: org.area, kind: org.kind };
}

/** My trades that can be weighed, newest first. */
async function myLoads(ctx: QueryCtx, orgId: Id<"orgs">) {
  const bought = await ctx.db
    .query("trades")
    .withIndex("by_buyer", (q) => q.eq("buyerOrgId", orgId))
    .order("desc")
    .take(PAGE);
  const sold = await ctx.db
    .query("trades")
    .withIndex("by_seller", (q) => q.eq("sellerOrgId", orgId))
    .order("desc")
    .take(PAGE);
  return [...bought, ...sold]
    .filter(isWeighable)
    .toSorted((a, b) => b.updatedAt - a.updatedAt);
}

function scaleInputs(
  args: {
    kind: Doc<"scales">["kind"];
    capacityKg: number;
    stampNumber: string;
    stampValidUntil: string;
    note?: string;
  },
  now: number,
) {
  if (
    !isPositiveInteger(args.capacityKg) ||
    args.capacityKg > MAX_SCALE_CAPACITY_KG
  ) {
    throw new ConvexError("INVALID_CAPACITY");
  }
  const stampNumber = args.stampNumber.trim();
  if (stampNumber.length < 3 || stampNumber.length > 40) {
    throw new ConvexError("INVALID_STAMP");
  }
  if (!isIsoDate(args.stampValidUntil)) throw new ConvexError("INVALID_DATE");
  return {
    kind: args.kind,
    capacityKg: args.capacityKg,
    stampNumber,
    stampValidUntil: args.stampValidUntil,
    note: optionalText(args.note, NOTE_MAX_LENGTH, "NOTE_TOO_LONG"),
    updatedAt: now,
  };
}

// --- Scales ---------------------------------------------------------------------------

/**
 * `/app/scales`: every scale this business owns, the most urgent stamp first,
 * and how many need re-verification within 30 days. Every kind of business
 * has a scale, kabadiwalas included.
 */
export const scales = query({
  args: {},
  returns: v.object({
    rows: v.array(vScaleView),
    dueSoon: v.number(),
    canManage: v.boolean(),
  }),
  handler: async (ctx) => {
    const { org, role } = await requireFloor(ctx);
    const today = indiaToday();
    const rows = await ctx.db
      .query("scales")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(MAX_SCALES);
    const views = rows
      .map((scale) => toScaleView(scale, today))
      .toSorted((a, b) => a.daysLeft - b.daysLeft);
    return {
      rows: views,
      dueSoon: views.filter((scale) => scale.status !== "ok").length,
      canManage: can(role, "manage_scales"),
    };
  },
});

/** Registers a scale with its Legal Metrology stamp. */
export const addScale = mutation({
  args: {
    kind: vScaleKind,
    capacityKg: v.number(),
    stampNumber: v.string(),
    stampValidUntil: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.id("scales"),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(ctx, "manage_scales");
    const existing = await ctx.db
      .query("scales")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(MAX_SCALES);
    if (existing.length >= MAX_SCALES) throw new ConvexError("TOO_MANY_SCALES");
    const now = Date.now();
    const fields = scaleInputs(args, now);
    const scaleId = await ctx.db.insert("scales", {
      orgId: org._id,
      ...fields,
      createdAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "scale.added",
      entityTable: "scales",
      entityId: scaleId,
      metadata: {
        kind: fields.kind,
        capacityKg: fields.capacityKg,
        stampValidUntil: fields.stampValidUntil,
      },
    });
    return scaleId;
  },
});

/** Updates a scale — usually after re-verification, with the new stamp. */
export const editScale = mutation({
  args: {
    scaleId: v.id("scales"),
    kind: vScaleKind,
    capacityKg: v.number(),
    stampNumber: v.string(),
    stampValidUntil: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(ctx, "manage_scales");
    const scale = await ctx.db.get("scales", args.scaleId);
    if (scale?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    const fields = scaleInputs(args, Date.now());
    await ctx.db.patch("scales", scale._id, fields);
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "scale.updated",
      entityTable: "scales",
      entityId: scale._id,
      metadata: {
        from: {
          stampNumber: scale.stampNumber,
          stampValidUntil: scale.stampValidUntil,
        },
        to: {
          stampNumber: fields.stampNumber,
          stampValidUntil: fields.stampValidUntil,
        },
      },
    });
    return null;
  },
});

/** Removes a scale that was entered by mistake; one that has weighed loads stays. */
export const removeScale = mutation({
  args: { scaleId: v.id("scales") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(ctx, "manage_scales");
    const scale = await ctx.db.get("scales", args.scaleId);
    if (scale?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    const slips = await ctx.db
      .query("weighSlips")
      .withIndex("by_org_at", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(PAGE);
    if (slips.some((slip) => slip.scaleId === scale._id)) {
      throw new ConvexError("SCALE_IN_USE");
    }
    await ctx.db.delete("scales", scale._id);
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "scale.removed",
      entityTable: "scales",
      entityId: scale._id,
      metadata: { kind: scale.kind, stampNumber: scale.stampNumber },
    });
    return null;
  },
});

/**
 * "Scale verified until …" for a business's public card: the stamp that runs
 * longest, and whether it's still good. Public — no number, no note.
 */
export const publicStamp = query({
  args: { orgId: v.id("orgs") },
  returns: v.union(
    v.null(),
    v.object({ validUntil: v.string(), status: vStampStatus }),
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db.get("orgs", args.orgId);
    if (org?.status !== "active") return null;
    const rows = await ctx.db
      .query("scales")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(MAX_SCALES);
    const best = rows.toSorted((a, b) =>
      b.stampValidUntil.localeCompare(a.stampValidUntil),
    )[0];
    if (!best) return null;
    return {
      validUntil: best.stampValidUntil,
      status: stampStatus(best.stampValidUntil, indiaToday()).status,
    };
  },
});

// --- Gate: weigh slips ------------------------------------------------------------------

/**
 * `/app/gate`: the scales to weigh on and the loads to weigh — my trades
 * that have moved or are about to, with what's already on record for each.
 * Loads still waiting for a slip come first.
 */
export const gate = query({
  args: {},
  returns: v.object({
    kind: vOrgKind,
    role: vMemberRole,
    canRecordSlip: v.boolean(),
    canCheck: v.boolean(),
    scales: v.array(vScaleView),
    loads: v.array(vLoadView),
  }),
  handler: async (ctx) => {
    const { org, role } = await requireFloor(ctx, FACTORY_KINDS);
    const today = indiaToday();
    const scaleRows = await ctx.db
      .query("scales")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(MAX_SCALES);
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const trades = (await myLoads(ctx, org._id)).slice(0, PAGE / 2);

    const loads = [];
    for (const trade of trades) {
      const side = sideOf(trade, org._id);
      if (!side) continue;
      const counterparty = await orgOf(
        side === "buyer" ? trade.sellerOrgId : trade.buyerOrgId,
      );
      if (!counterparty) continue;
      const onTrade = await ctx.db
        .query("weighSlips")
        .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
        .take(RECENT);
      const mine = onTrade
        .filter((slip) => slip.orgId === org._id)
        .toSorted((a, b) => b.at - a.at);
      const checks = await ctx.db
        .query("qualityChecks")
        .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
        .take(RECENT);
      const check = checks.find((row) => row.orgId === org._id);
      loads.push({
        tradeId: trade._id,
        side,
        direction: directionFor(side),
        status: trade.status,
        material: materialRef(materials, trade.materialCode),
        grams: trade.grams,
        counterparty: partyOf(counterparty),
        slips: mine.length,
        lastNetGrams: mine[0]?.netGrams ?? null,
        check: check
          ? { result: check.result, deductionPct: check.deductionPct }
          : null,
        invoiceNo: trade.invoiceNo,
        updatedAt: trade.updatedAt,
      });
    }
    return {
      kind: org.kind,
      role,
      canRecordSlip: can(role, "record_slip"),
      canCheck: can(role, "quality_check"),
      scales: scaleRows
        .map((scale) => toScaleView(scale, today))
        .toSorted((a, b) => b.capacityKg - a.capacityKg),
      loads: loads.toSorted(
        (a, b) =>
          Number(a.slips > 0) - Number(b.slips > 0) ||
          b.updatedAt - a.updatedAt,
      ),
    };
  },
});

/** My most recent weigh slips, with the gap against the trade on each. */
export const slips = query({
  args: {},
  returns: v.array(vSlipView),
  handler: async (ctx) => {
    const { org } = await requireFloor(ctx, FACTORY_KINDS);
    const rows = await ctx.db
      .query("weighSlips")
      .withIndex("by_org_at", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(RECENT);
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const scaleCache = new Map<Id<"scales">, Doc<"scales"> | null>();

    const views = [];
    for (const slip of rows) {
      let scale = scaleCache.get(slip.scaleId);
      if (scale === undefined) {
        scale = await ctx.db.get("scales", slip.scaleId);
        scaleCache.set(slip.scaleId, scale);
      }
      const trade = slip.tradeId
        ? await ctx.db.get("trades", slip.tradeId)
        : null;
      const counterparty = trade
        ? await orgOf(
            trade.buyerOrgId === org._id ? trade.sellerOrgId : trade.buyerOrgId,
          )
        : null;
      views.push({
        id: slip._id,
        slipNumber: slip.slipNumber,
        direction: slip.direction,
        vehicleNo: slip.vehicleNo,
        grossGrams: slip.grossGrams,
        tareGrams: slip.tareGrams,
        deductionGrams: slip.deductionGrams,
        deductionReason: slip.deductionReason,
        netGrams: slip.netGrams,
        at: slip.at,
        scaleKind: scale?.kind ?? ("platform" as const),
        stampWasValid: scale
          ? stampStatus(scale.stampValidUntil, indiaToday(slip.at)).status !==
            "expired"
          : false,
        trade: trade
          ? {
              id: trade._id,
              material: materialRef(materials, trade.materialCode),
              grams: trade.grams,
              counterparty: counterparty?.name ?? "",
              mismatch: weightMismatch(slip.netGrams, trade.grams),
            }
          : null,
        photoUrl: slip.photoStorageId
          ? await ctx.storage.getUrl(slip.photoStorageId)
          : null,
      });
    }
    return views;
  },
});

/** Where the gate uploads a slip photo; the id it gets back goes on the slip. */
export const slipPhotoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireFloorAction(ctx, "record_slip", FACTORY_KINDS);
    return ctx.storage.generateUploadUrl();
  },
});

/**
 * The gate's three taps: the vehicle, gross and tare (net is worked out),
 * and an optional photo. Against a trade, the net is compared with the
 * trade's grams and a gap over 1% is flagged in the result and the audit
 * log. The trade itself is never changed.
 */
export const recordSlip = mutation({
  args: {
    tradeId: v.optional(v.id("trades")),
    direction: vSlipDirection,
    vehicleNo: v.string(),
    grossGrams: v.number(),
    tareGrams: v.number(),
    deductionGrams: v.optional(v.number()),
    deductionReason: v.optional(vDeductionReason),
    scaleId: v.id("scales"),
    photoStorageId: v.optional(v.id("_storage")),
  },
  returns: v.object({
    slipId: v.id("weighSlips"),
    slipNumber: v.string(),
    netGrams: v.number(),
    mismatch: v.union(v.null(), vMismatch),
  }),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(
      ctx,
      "record_slip",
      FACTORY_KINDS,
    );
    const vehicleNo = normalizeVehicleNumber(args.vehicleNo);
    if (!vehicleNo) throw new ConvexError("INVALID_VEHICLE");
    if (
      !isPositiveInteger(args.grossGrams) ||
      !isNonNegativeInteger(args.tareGrams) ||
      args.grossGrams > MAX_GROSS_GRAMS ||
      args.grossGrams <= args.tareGrams
    ) {
      throw new ConvexError("INVALID_WEIGHT");
    }
    const deductionGrams = args.deductionGrams ?? 0;
    const netGrams = netGramsOf(
      args.grossGrams,
      args.tareGrams,
      deductionGrams,
    );
    if (!isNonNegativeInteger(deductionGrams) || netGrams <= 0) {
      throw new ConvexError("INVALID_DEDUCTION");
    }
    if (deductionGrams > 0 && !args.deductionReason) {
      throw new ConvexError("REASON_REQUIRED");
    }
    const scale = await ctx.db.get("scales", args.scaleId);
    if (scale?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (args.grossGrams > scale.capacityKg * 1000) {
      throw new ConvexError("OVER_CAPACITY");
    }

    let trade: Doc<"trades"> | null = null;
    if (args.tradeId) {
      trade = await ctx.db.get("trades", args.tradeId);
      const side = trade ? sideOf(trade, org._id) : null;
      if (!trade || !side) throw new ConvexError("NOT_FOUND");
      if (!isWeighable(trade)) throw new ConvexError("WRONG_STEP");
      if (directionFor(side) !== args.direction) {
        throw new ConvexError("WRONG_DIRECTION");
      }
    }

    const now = Date.now();
    const last = await ctx.db
      .query("weighSlips")
      .withIndex("by_org_at", (q) => q.eq("orgId", org._id))
      .order("desc")
      .first();
    const slipNumber = nextSlipNumber(
      last?.slipNumber,
      indiaToday(now).slice(2, 4),
    );
    const mismatch = trade ? weightMismatch(netGrams, trade.grams) : null;
    const slipId = await ctx.db.insert("weighSlips", {
      orgId: org._id,
      tradeId: trade?._id,
      direction: args.direction,
      vehicleNo,
      grossGrams: args.grossGrams,
      tareGrams: args.tareGrams,
      deductionGrams,
      deductionReason: deductionGrams > 0 ? args.deductionReason : undefined,
      netGrams,
      slipNumber,
      scaleId: scale._id,
      byProfileId: profile._id,
      photoStorageId: args.photoStorageId,
      at: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "weighSlip.recorded",
      entityTable: "weighSlips",
      entityId: slipId,
      metadata: {
        slipNumber,
        direction: args.direction,
        tradeId: trade?._id,
        grossGrams: args.grossGrams,
        tareGrams: args.tareGrams,
        deductionGrams,
        netGrams,
        scaleId: scale._id,
        stampValidUntil: scale.stampValidUntil,
        mismatch,
      },
    });
    return { slipId, slipNumber, netGrams, mismatch };
  },
});

// --- Quality checks ----------------------------------------------------------------------

function toCheckView(
  check: Doc<"qualityChecks">,
  trade: Doc<"trades"> | null,
  counterparty: Doc<"orgs"> | null,
  materials: Materials,
) {
  return {
    id: check._id,
    tradeId: check.tradeId,
    material: materialRef(materials, check.materialCode),
    grams: trade?.grams ?? 0,
    result: check.result,
    deductionPct: check.deductionPct,
    reason: check.reason,
    params: check.params,
    counterparty: counterparty?.name ?? "",
    at: check.at,
  };
}

/**
 * Quality checks around this business: the ones I made on loads I bought
 * (`mine`) and the ones buyers made on loads I sold (`onMySales`), so a
 * seller sees a deduction and its reason as soon as it's recorded.
 */
export const checks = query({
  args: {},
  returns: v.object({
    mine: v.array(vCheckView),
    onMySales: v.array(vCheckView),
  }),
  handler: async (ctx) => {
    const { org } = await requireFloor(ctx, FACTORY_KINDS);
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);

    const mineRows = await ctx.db
      .query("qualityChecks")
      .withIndex("by_org_at", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(RECENT);
    const mine = [];
    for (const check of mineRows) {
      const trade = await ctx.db.get("trades", check.tradeId);
      const seller = trade ? await orgOf(trade.sellerOrgId) : null;
      mine.push(toCheckView(check, trade, seller, materials));
    }

    const sold = await ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerOrgId", org._id))
      .order("desc")
      .take(PAGE / 2);
    const onMySales = [];
    for (const trade of sold.filter(isWeighable)) {
      const rows = await ctx.db
        .query("qualityChecks")
        .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
        .take(RECENT);
      for (const check of rows) {
        if (check.orgId === org._id) continue;
        const buyer = await orgOf(trade.buyerOrgId);
        onMySales.push(toCheckView(check, trade, buyer, materials));
      }
    }
    return {
      mine,
      onMySales: onMySales.toSorted((a, b) => b.at - a.at).slice(0, RECENT),
    };
  },
});

/**
 * The buyer's check on a load: the readings against the material's default
 * limits (convex/lib/quality.ts), and accept, deduct or reject. A deduction
 * records the percentage and the reason; the trade's own figures stay as
 * agreed — settling the difference is between the two businesses.
 */
export const check = mutation({
  args: {
    tradeId: v.id("trades"),
    params: v.array(v.object({ key: vQualityKey, value: v.number() })),
    result: vQualityResult,
    deductionPct: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  returns: v.id("qualityChecks"),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(
      ctx,
      "quality_check",
      FACTORY_KINDS,
    );
    const trade = await ctx.db.get("trades", args.tradeId);
    const side = trade ? sideOf(trade, org._id) : null;
    if (!trade || !side) throw new ConvexError("NOT_FOUND");
    if (side !== "buyer") throw new ConvexError("WRONG_SIDE");
    if (!isWeighable(trade)) throw new ConvexError("WRONG_STEP");
    const earlier = await ctx.db
      .query("qualityChecks")
      .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
      .take(RECENT);
    if (earlier.some((row) => row.orgId === org._id)) {
      throw new ConvexError("ALREADY_CHECKED");
    }

    const materials = await materialIndex(ctx);
    const material = materials.get(trade.materialCode);
    const defaults = qualityDefaults({
      code: trade.materialCode,
      family: material?.family ?? "other",
      stage: material?.stage ?? "scrap",
    });
    const readings: QualityReading[] = [];
    for (const limit of defaults) {
      const reading = args.params.find((param) => param.key === limit.key);
      if (!reading) throw new ConvexError("MISSING_READING");
      if (!isPercent(reading.value)) throw new ConvexError("INVALID_READING");
      readings.push({ ...limit, value: reading.value });
    }
    if (
      args.params.some(
        (param) => !readings.some((reading) => reading.key === param.key),
      )
    ) {
      throw new ConvexError("UNKNOWN_PARAM");
    }

    let deductionPct = 0;
    if (args.result === "deduct") {
      deductionPct = args.deductionPct ?? 0;
      if (
        !isPositiveInteger(deductionPct) ||
        deductionPct > MAX_DEDUCTION_PCT
      ) {
        throw new ConvexError("INVALID_DEDUCTION");
      }
    }
    const reason = optionalText(
      args.reason,
      REASON_MAX_LENGTH,
      "REASON_TOO_LONG",
    );
    if (
      args.result !== "accept" &&
      (reason === undefined || reason.length < 3)
    ) {
      throw new ConvexError("REASON_REQUIRED");
    }

    const now = Date.now();
    const checkId = await ctx.db.insert("qualityChecks", {
      orgId: org._id,
      tradeId: trade._id,
      materialCode: trade.materialCode,
      params: readings,
      result: args.result,
      deductionPct,
      reason,
      byProfileId: profile._id,
      at: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: `qualityCheck.${args.result}`,
      entityTable: "qualityChecks",
      entityId: checkId,
      metadata: {
        tradeId: trade._id,
        sellerOrgId: trade.sellerOrgId,
        materialCode: trade.materialCode,
        grams: trade.grams,
        readings,
        deductionPct,
        reason,
      },
    });
    return checkId;
  },
});

// --- Production ----------------------------------------------------------------------------

/**
 * `/app/production`: this financial year's batches, what went in and came
 * out, the yield, and how much of the declared capacity the year has used.
 * `materials` is what this business handles, for the batch form.
 */
export const production = query({
  args: {},
  returns: v.object({
    fy: v.object({ from: v.string(), to: v.string(), startYear: v.number() }),
    capacity: v.union(
      v.null(),
      v.object({
        tonnesPerYear: v.number(),
        source: vCapacitySource,
        updatedAt: v.number(),
      }),
    ),
    use: v.union(v.null(), v.object({ pct: v.number(), over: v.boolean() })),
    totals: v.object({
      batches: v.number(),
      inputGrams: v.number(),
      outputGrams: v.number(),
      yieldPct: v.number(),
    }),
    batches: v.array(vBatchView),
    materials: v.array(
      v.object({
        material: vMaterialRef,
        stage: v.union(v.literal("scrap"), v.literal("recycled")),
      }),
    ),
    canRecord: v.boolean(),
    canSetCapacity: v.boolean(),
  }),
  handler: async (ctx) => {
    const { org, role } = await requireFloor(ctx, FACTORY_KINDS);
    const today = indiaToday();
    const fy = financialYear(today);
    const materials = await materialIndex(ctx);
    const rows = await ctx.db
      .query("productionBatches")
      .withIndex("by_org_date", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(PAGE * 2);
    const capacity = await ctx.db
      .query("capacities")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .first();

    const thisYear = rows.filter(
      (batch) => batch.date >= fy.from && batch.date <= fy.to,
    );
    const totals = batchTotals(
      thisYear.flatMap((batch) => batch.inputs),
      thisYear.flatMap((batch) => batch.outputs),
    );
    const line = (entry: { materialCode: string; grams: number }) => ({
      material: materialRef(materials, entry.materialCode),
      grams: entry.grams,
    });
    return {
      fy,
      capacity: capacity
        ? {
            tonnesPerYear: capacity.tonnesPerYear,
            source: capacity.source,
            updatedAt: capacity.updatedAt,
          }
        : null,
      use: capacity
        ? capacityUse(totals.inputGrams, capacity.tonnesPerYear)
        : null,
      totals: { batches: thisYear.length, ...totals },
      batches: rows.slice(0, PAGE).map((batch) => {
        const sums = batchTotals(batch.inputs, batch.outputs);
        return {
          id: batch._id,
          date: batch.date,
          shift: batch.shift,
          inputs: batch.inputs.map(line),
          outputs: batch.outputs.map(line),
          inputGrams: sums.inputGrams,
          outputGrams: sums.outputGrams,
          yieldPct: batch.yieldPct,
          note: batch.note,
          createdAt: batch.createdAt,
        };
      }),
      materials: Array.from(materials.values())
        .filter(
          (material) =>
            material.active && org.families.includes(material.family),
        )
        .map((material) => ({
          material: materialRef(materials, material.code),
          stage: material.stage,
        })),
      canRecord: can(role, "record_batch"),
      canSetCapacity: can(role, "set_capacity"),
    };
  },
});

async function batchLines(
  ctx: QueryCtx,
  lines: readonly { materialCode: string; grams: number }[],
  emptyError: string,
) {
  if (lines.length === 0) throw new ConvexError(emptyError);
  if (lines.length > MAX_LINES) throw new ConvexError("TOO_MANY_LINES");
  const materials = await materialIndex(ctx);
  for (const entry of lines) {
    if (!isPositiveInteger(entry.grams))
      throw new ConvexError("INVALID_WEIGHT");
    if (!materials.get(entry.materialCode)?.active) {
      throw new ConvexError("UNKNOWN_MATERIAL");
    }
  }
  return mergeLines(lines);
}

/** Records one run of the plant. Output can't weigh more than what went in. */
export const recordBatch = mutation({
  args: {
    date: v.string(),
    shift: vShift,
    inputs: v.array(vBatchLine),
    outputs: v.array(vBatchLine),
    note: v.optional(v.string()),
  },
  returns: v.object({
    batchId: v.id("productionBatches"),
    yieldPct: v.number(),
  }),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(
      ctx,
      "record_batch",
      FACTORY_KINDS,
    );
    const now = Date.now();
    const today = indiaToday(now);
    const earliest = indiaToday(now - BATCH_HISTORY_DAYS * DAY_MS);
    if (!isIsoDate(args.date) || args.date > today || args.date < earliest) {
      throw new ConvexError("INVALID_DATE");
    }
    const inputs = await batchLines(ctx, args.inputs, "NO_INPUTS");
    const outputs = await batchLines(ctx, args.outputs, "NO_OUTPUTS");
    const totals = batchTotals(inputs, outputs);
    if (totals.outputGrams > totals.inputGrams) {
      throw new ConvexError("OUTPUT_EXCEEDS_INPUT");
    }
    const note = optionalText(args.note, NOTE_MAX_LENGTH, "NOTE_TOO_LONG");
    const batchId = await ctx.db.insert("productionBatches", {
      orgId: org._id,
      date: args.date,
      shift: args.shift,
      inputs,
      outputs,
      yieldPct: totals.yieldPct,
      note,
      byProfileId: profile._id,
      createdAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "productionBatch.recorded",
      entityTable: "productionBatches",
      entityId: batchId,
      metadata: { date: args.date, shift: args.shift, ...totals },
    });
    return { batchId, yieldPct: totals.yieldPct };
  },
});

/** Declares the installed capacity, as on the consent or the EPR registration. */
export const setCapacity = mutation({
  args: { tonnesPerYear: v.number(), source: vCapacitySource },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(
      ctx,
      "set_capacity",
      FACTORY_KINDS,
    );
    if (
      !isPositiveInteger(args.tonnesPerYear) ||
      args.tonnesPerYear > MAX_CAPACITY_TONNES
    ) {
      throw new ConvexError("INVALID_CAPACITY");
    }
    const now = Date.now();
    const current = await ctx.db
      .query("capacities")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .first();
    const record = {
      tonnesPerYear: args.tonnesPerYear,
      source: args.source,
      updatedAt: now,
    };
    const capacityId = current
      ? current._id
      : await ctx.db.insert("capacities", { orgId: org._id, ...record });
    if (current) await ctx.db.patch("capacities", current._id, record);
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "capacity.declared",
      entityTable: "capacities",
      entityId: capacityId,
      metadata: { from: current?.tonnesPerYear ?? null, ...record },
    });
    return null;
  },
});

// --- Team ---------------------------------------------------------------------------------

/**
 * `/app/team`: who works here and as what, and the invitations still
 * waiting for someone to sign in. Names come from the invitation; the owner
 * is shown as the business.
 */
export const team = query({
  args: {},
  returns: v.object({
    members: v.array(
      v.object({
        membershipId: v.id("memberships"),
        role: vMemberRole,
        phone: v.union(v.string(), v.null()),
        name: v.union(v.string(), v.null()),
        isMe: v.boolean(),
        joinedAt: v.number(),
      }),
    ),
    invites: v.array(
      v.object({
        inviteId: v.id("teamInvites"),
        phone: v.string(),
        name: v.union(v.string(), v.null()),
        role: vTeamRole,
        invitedAt: v.number(),
      }),
    ),
    myRole: vMemberRole,
    canManage: v.boolean(),
  }),
  handler: async (ctx) => {
    const { profile, org, role } = await requireFloor(ctx, FACTORY_KINDS);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(PAGE);
    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(PAGE);
    const nameOf = new Map(
      invites
        .filter((invite) => invite.acceptedProfileId && invite.name)
        .map((invite) => [invite.acceptedProfileId, invite.name ?? null]),
    );

    const members = [];
    for (const membership of memberships) {
      const person = await ctx.db.get("profiles", membership.profileId);
      members.push({
        membershipId: membership._id,
        role: membership.role,
        phone: person?.phone ?? null,
        name: nameOf.get(membership.profileId) ?? null,
        isMe: membership.profileId === profile._id,
        joinedAt: membership.createdAt,
      });
    }
    return {
      members: members.toSorted(
        (a, b) =>
          Number(b.role === "owner") - Number(a.role === "owner") ||
          a.joinedAt - b.joinedAt,
      ),
      invites: invites
        .filter((invite) => invite.status === "pending")
        .toSorted((a, b) => b.invitedAt - a.invitedAt)
        .map((invite) => ({
          inviteId: invite._id,
          phone: invite.phone,
          name: invite.name ?? null,
          role: invite.role,
          invitedAt: invite.invitedAt,
        })),
      myRole: role,
      canManage: can(role, "manage_team"),
    };
  },
});

async function membershipAt(
  ctx: QueryCtx,
  profileId: Id<"profiles">,
  orgId: Id<"orgs">,
) {
  const rows = await ctx.db
    .query("memberships")
    .withIndex("by_profile", (q) => q.eq("profileId", profileId))
    .take(20);
  return rows.find((row) => row.orgId === orgId) ?? null;
}

/** Turns a pending invitation into a membership for `profile`. */
async function acceptInvite(
  ctx: MutationCtx,
  invite: Doc<"teamInvites">,
  profile: Doc<"profiles">,
  now: number,
): Promise<boolean> {
  const existing = await membershipAt(ctx, profile._id, invite.orgId);
  await ctx.db.patch("teamInvites", invite._id, {
    status: "accepted",
    acceptedAt: now,
    acceptedProfileId: profile._id,
  });
  if (existing) return false;
  const membershipId = await ctx.db.insert("memberships", {
    profileId: profile._id,
    orgId: invite.orgId,
    role: invite.role,
    createdAt: now,
  });
  await audit(ctx, {
    orgId: invite.orgId,
    actorProfileId: profile._id,
    action: "team.joined",
    entityTable: "memberships",
    entityId: membershipId,
    metadata: { role: invite.role, inviteId: invite._id },
  });
  return true;
}

/**
 * Invites a person by phone with a role. If they already have a Luma.Green
 * profile they join at once; otherwise they join the moment that phone
 * signs in (acceptInvitesFor, called from identity.ensureProfile).
 */
export const invite = mutation({
  args: { phone: v.string(), role: vTeamRole, name: v.optional(v.string()) },
  returns: v.object({
    status: v.union(v.literal("pending"), v.literal("accepted")),
  }),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(
      ctx,
      "manage_team",
      FACTORY_KINDS,
    );
    const phone = normalizeIndianMobile(args.phone);
    if (!phone) throw new ConvexError("INVALID_PHONE");
    const name = optionalText(args.name, 60, "INVALID_NAME");

    const person = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (person && (await membershipAt(ctx, person._id, org._id))) {
      throw new ConvexError("ALREADY_MEMBER");
    }
    const pending = await ctx.db
      .query("teamInvites")
      .withIndex("by_phone_status", (q) =>
        q.eq("phone", phone).eq("status", "pending"),
      )
      .take(20);
    if (pending.some((row) => row.orgId === org._id)) {
      throw new ConvexError("ALREADY_INVITED");
    }
    const all = await ctx.db
      .query("teamInvites")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(MAX_INVITES);
    if (all.length >= MAX_INVITES) throw new ConvexError("TOO_MANY_INVITES");

    const now = Date.now();
    const inviteId = await ctx.db.insert("teamInvites", {
      orgId: org._id,
      phone,
      name,
      role: args.role,
      status: "pending",
      invitedBy: profile._id,
      invitedAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "team.invited",
      entityTable: "teamInvites",
      entityId: inviteId,
      metadata: { role: args.role, phone },
    });
    if (!person) return { status: "pending" as const };
    const created = await ctx.db.get("teamInvites", inviteId);
    if (created) await acceptInvite(ctx, created, person, now);
    return { status: "accepted" as const };
  },
});

/** Withdraws an invitation nobody has accepted yet. */
export const cancelInvite = mutation({
  args: { inviteId: v.id("teamInvites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(
      ctx,
      "manage_team",
      FACTORY_KINDS,
    );
    const row = await ctx.db.get("teamInvites", args.inviteId);
    if (row?.orgId !== org._id || row.status !== "pending") {
      throw new ConvexError("NOT_FOUND");
    }
    await ctx.db.delete("teamInvites", row._id);
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "team.invite_cancelled",
      entityTable: "teamInvites",
      entityId: row._id,
      metadata: { role: row.role, phone: row.phone },
    });
    return null;
  },
});

/** Takes a person off the team. The owner can't be removed. */
export const removeMember = mutation({
  args: { membershipId: v.id("memberships") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireFloorAction(
      ctx,
      "manage_team",
      FACTORY_KINDS,
    );
    const membership = await ctx.db.get("memberships", args.membershipId);
    if (membership?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (membership.role === "owner") {
      throw new ConvexError("CANNOT_REMOVE_OWNER");
    }
    await ctx.db.delete("memberships", membership._id);
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "team.removed",
      entityTable: "memberships",
      entityId: membership._id,
      metadata: { role: membership.role, profileId: membership.profileId },
    });
    return null;
  },
});

/**
 * Accepts every pending invitation addressed to a profile's phone, creating
 * the memberships. Query-free by design: identity.ensureProfile calls this
 * after every sign-in, so an invited person lands on their team's app the
 * first time they sign in. Returns how many memberships were created.
 */
export async function acceptInvitesFor(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
): Promise<number> {
  const profile = await ctx.db.get("profiles", profileId);
  if (!profile?.phone) return 0;
  const pending = await ctx.db
    .query("teamInvites")
    .withIndex("by_phone_status", (q) =>
      q.eq("phone", profile.phone ?? "").eq("status", "pending"),
    )
    .take(20);
  const now = Date.now();
  let created = 0;
  for (const invite of pending) {
    if (await acceptInvite(ctx, invite, profile, now)) created += 1;
  }
  return created;
}

/** The same, callable from other Convex functions (`internal.floor.acceptInvites`). */
export const acceptInvites = internalMutation({
  args: { profileId: v.id("profiles") },
  returns: v.number(),
  handler: (ctx, args) => acceptInvitesFor(ctx, args.profileId),
});
