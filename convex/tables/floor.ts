import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "floor" area: the weighing scales a business owns, the
 * weigh slips its gate writes, quality checks on incoming loads, production
 * batches, declared capacity and team invites. Mass is integer grams; the
 * one exception is a scale's rated capacity, a specification kept in kg.
 */

export const vScaleKind = v.union(
  v.literal("platform"),
  v.literal("weighbridge"),
  v.literal("beam"),
  v.literal("spring"),
);

export const vSlipDirection = v.union(v.literal("in"), v.literal("out"));

export const vDeductionReason = v.union(
  v.literal("moisture"),
  v.literal("contamination"),
  v.literal("tare"),
  v.literal("other"),
);

export const vQualityKey = v.union(
  v.literal("moisture"),
  v.literal("prohibitives"),
  v.literal("outthrows"),
  v.literal("contamination"),
  v.literal("offColour"),
);

export const vQualityResult = v.union(
  v.literal("accept"),
  v.literal("deduct"),
  v.literal("reject"),
);

export const vShift = v.union(
  v.literal("day"),
  v.literal("evening"),
  v.literal("night"),
);

export const vBatchLine = v.object({
  materialCode: v.string(),
  grams: v.number(),
});

export const vCapacitySource = v.union(v.literal("consent"), v.literal("epr"));

export const vTeamRole = v.union(
  v.literal("purchase"),
  v.literal("gate"),
  v.literal("quality"),
  v.literal("accounts"),
  v.literal("compliance"),
  v.literal("plant"),
);

export const vMemberRole = v.union(
  v.literal("owner"),
  v.literal("staff"),
  vTeamRole,
);

export const floorTables = {
  /** A weighing scale and its Legal Metrology stamp. */
  scales: defineTable({
    orgId: v.id("orgs"),
    kind: vScaleKind,
    /** Rated capacity, whole kg — a specification, not a measurement. */
    capacityKg: v.number(),
    stampNumber: v.string(),
    /** The stamp's last valid day, YYYY-MM-DD. */
    stampValidUntil: v.string(),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  /** One weighing at the gate: a load in or out, usually against a trade. */
  weighSlips: defineTable({
    orgId: v.id("orgs"),
    tradeId: v.optional(v.id("trades")),
    direction: vSlipDirection,
    vehicleNo: v.string(),
    grossGrams: v.number(),
    tareGrams: v.number(),
    deductionGrams: v.number(),
    deductionReason: v.optional(vDeductionReason),
    netGrams: v.number(),
    /** WS-26-0001, numbered per business. */
    slipNumber: v.string(),
    scaleId: v.id("scales"),
    byProfileId: v.id("profiles"),
    /** A photo of the printed slip or the scale's display. */
    photoStorageId: v.optional(v.id("_storage")),
    at: v.number(),
  })
    .index("by_org_at", ["orgId", "at"])
    .index("by_trade", ["tradeId"])
    .index("by_scale", ["scaleId"]),

  /** The buyer's quality check on a load, with the readings and the outcome. */
  qualityChecks: defineTable({
    orgId: v.id("orgs"),
    tradeId: v.id("trades"),
    materialCode: v.string(),
    params: v.array(
      v.object({ key: vQualityKey, value: v.number(), limit: v.number() }),
    ),
    result: vQualityResult,
    /** Whole per cent taken off; 0 unless the result is a deduction. */
    deductionPct: v.number(),
    /** Why, in the checker's words; the seller reads it. */
    reason: v.optional(v.string()),
    byProfileId: v.id("profiles"),
    at: v.number(),
  })
    .index("by_org_at", ["orgId", "at"])
    .index("by_trade", ["tradeId"]),

  /** One run of the plant: what went in, what came out, the yield. */
  productionBatches: defineTable({
    orgId: v.id("orgs"),
    /** YYYY-MM-DD, India time. */
    date: v.string(),
    shift: vShift,
    inputs: v.array(vBatchLine),
    outputs: v.array(vBatchLine),
    /** Output as a share of input, one decimal. */
    yieldPct: v.number(),
    note: v.optional(v.string()),
    byProfileId: v.optional(v.id("profiles")),
    createdAt: v.number(),
  }).index("by_org_date", ["orgId", "date"]),

  /** Installed capacity as declared to the pollution board or CPCB's EPR portal. */
  capacities: defineTable({
    orgId: v.id("orgs"),
    tonnesPerYear: v.number(),
    source: vCapacitySource,
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  /** An owner's invitation by phone; accepted when that phone signs in. */
  teamInvites: defineTable({
    orgId: v.id("orgs"),
    /** E.164. */
    phone: v.string(),
    name: v.optional(v.string()),
    role: vTeamRole,
    status: v.union(v.literal("pending"), v.literal("accepted")),
    invitedBy: v.id("profiles"),
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedProfileId: v.optional(v.id("profiles")),
  })
    .index("by_org", ["orgId"])
    .index("by_phone_status", ["phone", "status"]),
};
