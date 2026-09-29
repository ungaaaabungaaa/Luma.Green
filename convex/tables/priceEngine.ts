import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "priceEngine" area — docs/plan.md "Live pricing" and
 * the price engine spec v0.1. Money is integer paise per kilo, mass is
 * integer grams. `priceObservations` is append-only: the daily calculation
 * reads it and writes `priceBoards`; nothing ever edits an observation.
 */

/** Who pays whom: L1 kabadiwala → household, L2 yard → kabadiwala. */
export const vPriceLevel = v.union(v.literal("L1"), v.literal("L2"));

export const vObservationSource = v.union(
  v.literal("receipt"),
  v.literal("rateCard"),
  v.literal("survey"),
  v.literal("post"),
);

/** What the price was for: a doorstep pickup, a drop-off, loose or baled. */
export const vObservationBasis = v.union(
  v.literal("pickup"),
  v.literal("dropoff"),
  v.literal("card"),
  v.literal("survey"),
  v.literal("loose"),
  v.literal("baled"),
);

export const vBoardStatus = v.union(v.literal("live"), v.literal("guide"));

export const vPostBasis = v.union(v.literal("loose"), v.literal("baled"));
export const vPostDelivery = v.union(
  v.literal("collected"),
  v.literal("delivered"),
);
export const vPostStatus = v.union(
  v.literal("open"),
  v.literal("expired"),
  v.literal("withdrawn"),
);

export const priceEngineTables = {
  /** Every price input, one row each: receipts, rate cards, survey quotes, yard posts. */
  priceObservations: defineTable({
    city: v.string(),
    materialCode: v.string(),
    level: vPriceLevel,
    paisePerKg: v.number(),
    /** The kilos behind a receipt or trade; none for a card, post or survey. */
    grams: v.optional(v.number()),
    source: vObservationSource,
    orgId: v.id("orgs"),
    observedAt: v.number(),
    basis: vObservationBasis,
    /**
     * Where it came from (`booking:<id>:<code>`, `rateCard:<id>:<updatedAt>`,
     * `trade:<id>`, `post:<id>`), so a re-run never counts a row twice.
     */
    ref: v.optional(v.string()),
    /** The pickup or trade a receipt line belongs to; lines of one pickup share it. */
    pickupRef: v.optional(v.string()),
    /** The admin's note on a survey quote: who was called and when. */
    note: v.optional(v.string()),
  })
    .index("by_city_material_level_observedAt", [
      "city",
      "materialCode",
      "level",
      "observedAt",
    ])
    .index("by_city_observedAt", ["city", "observedAt"])
    .index("by_org_material", ["orgId", "materialCode"])
    .index("by_ref", ["ref"]),

  /** The published price per city, material and level, one row a day. */
  priceBoards: defineTable({
    city: v.string(),
    materialCode: v.string(),
    level: vPriceLevel,
    date: v.string(), // YYYY-MM-DD, India time
    lowPaise: v.union(v.number(), v.null()),
    typicalPaise: v.number(),
    highPaise: v.union(v.number(), v.null()),
    nOrgs: v.number(),
    nTrades: v.number(),
    status: vBoardStatus,
    computedAt: v.number(),
    /** Guide only: when the admin's fallback is next due for review. */
    reviewDate: v.optional(v.string()),
    /** The value the circuit breaker is holding back until the admin confirms. */
    heldPaise: v.optional(v.number()),
    heldPct: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_city_material_level_date", [
      "city",
      "materialCode",
      "level",
      "date",
    ])
    .index("by_city_date", ["city", "date"]),

  /** A plausible range per material, and the largest daily move the board takes on its own. */
  priceBands: defineTable({
    city: v.string(),
    materialCode: v.string(),
    minPaise: v.number(),
    maxPaise: v.number(),
    /** 10 for paper and plastic, 5 for metals. */
    maxDailyMovePct: v.number(),
    updatedAt: v.number(),
  }).index("by_city_material", ["city", "materialCode"]),

  /** What a yard will pay kabadiwalas for a material; expires after 7 days. */
  yardPosts: defineTable({
    orgId: v.id("orgs"),
    city: v.string(),
    materialCode: v.string(),
    paisePerKg: v.number(),
    minGrams: v.number(),
    basis: vPostBasis,
    delivery: vPostDelivery,
    expiresAt: v.number(),
    status: vPostStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_city_status", ["city", "status"]),

  /** One row per daily calculation, so the console can show the last run. */
  priceRuns: defineTable({
    city: v.string(),
    date: v.string(),
    ranAt: v.number(),
    trigger: v.union(v.literal("cron"), v.literal("admin"), v.literal("seed")),
    live: v.number(),
    guide: v.number(),
    held: v.number(),
    flagged: v.number(),
    observations: v.number(),
    ingested: v.number(),
  }).index("by_city_ranAt", ["city", "ranAt"]),
};
