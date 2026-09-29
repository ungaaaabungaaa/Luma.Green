import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "lots" area: every kilo a business holds belongs to a
 * lot, each lot links back to the pickup, purchase or sorting run it came
 * from, and forward to the trades and sorting runs that took kilos off it.
 * Tracing is by mass balance — a bale is never one household's bottles.
 * Mass is integer grams.
 */

/** Where a lot's kilos came from. */
export const vLotOrigin = v.union(
  /** A household pickup's receipt line (kabadiwalas). */
  v.literal("pickup"),
  /** A completed trade this business bought. */
  v.literal("purchase"),
  /** The output of a sorting run, same stage of material. */
  v.literal("sorting"),
  /** The output of a run that made recycled material (recyclers). */
  v.literal("production"),
  /** Stock on hand when the business joined: no receipts behind it. */
  v.literal("opening"),
);

export const vLotStatus = v.union(
  v.literal("open"),
  v.literal("sold"),
  v.literal("consumed"),
);

/** What took kilos off a lot. */
export const vLotMoveKind = v.union(
  v.literal("sold"),
  v.literal("sorted"),
  v.literal("consumed"),
  v.literal("adjusted"),
);

export const lotsTables = {
  lots: defineTable({
    orgId: v.id("orgs"),
    materialCode: v.string(),
    /** Kilos the lot started with. */
    grams: v.number(),
    /** Kilos still on hand: grams less every move. */
    remainingGrams: v.number(),
    origin: vLotOrigin,
    /**
     * The booking, trade or sorting run the lot came from (its id as a
     * string); the org id for opening stock. With `origin` it makes a lot
     * unique per material, so a rebuild never creates one twice.
     */
    originId: v.string(),
    /** The lots a sorting run took its inputs from. */
    parentLotIds: v.array(v.id("lots")),
    status: vLotStatus,
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_material", ["orgId", "materialCode"])
    .index("by_origin", ["origin", "originId"]),

  lotMoves: defineTable({
    lotId: v.id("lots"),
    kind: vLotMoveKind,
    grams: v.number(),
    tradeId: v.optional(v.id("trades")),
    sortingRunId: v.optional(v.id("sortingRuns")),
    at: v.number(),
  })
    .index("by_lot", ["lotId"])
    .index("by_trade", ["tradeId"])
    .index("by_sortingRun", ["sortingRunId"]),

  /** Inputs → graded outputs plus what was rejected; outputs + reject ≤ inputs. */
  sortingRuns: defineTable({
    orgId: v.id("orgs"),
    /** YYYY-MM-DD, India time. */
    date: v.string(),
    inputs: v.array(v.object({ lotId: v.id("lots"), grams: v.number() })),
    outputs: v.array(
      v.object({ materialCode: v.string(), grams: v.number() }),
    ),
    rejectGrams: v.number(),
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),
};
