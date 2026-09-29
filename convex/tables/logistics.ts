import { defineTable } from "convex/server";
import { v } from "convex/values";

import { vSaathiTime } from "../lib/drafts";

/**
 * Tables owned by the "logistics" area — docs/plan.md, "pool the business
 * loads, not the household ones". Vehicles and fares, the service rules
 * (slot length, slot limit, minimum pickup, weight tolerance), each shop's
 * own slot limit, pooled kabadiwala-to-yard loads, and the roads Bengaluru
 * closes to goods vehicles. Money in paise, mass in grams, volume in litres.
 */

export const vVehicleKey = v.union(
  v.literal("handcart"),
  v.literal("cycle"),
  v.literal("auto"),
  v.literal("miniTruck"),
  v.literal("truck"),
);

export const vLoadStatus = v.union(
  v.literal("planned"),
  v.literal("collecting"),
  v.literal("delivered"),
  v.literal("cancelled"),
);

export const vStopStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("collected"),
);

export const vPaidBy = v.union(v.literal("buyer"), v.literal("seller"));

/** One pickup on a pooled load: a shop, what it sells, how much. */
export const vLoadStop = v.object({
  orgId: v.id("orgs"),
  listingId: v.optional(v.id("listings")),
  materialCode: v.string(),
  grams: v.number(),
  /** Estimated litres, from the material family's bulk density. */
  litres: v.number(),
  /** Visiting order, 1 first. */
  order: v.number(),
  status: vStopStatus,
  /** What the buyer weighed at this stop, once collected. */
  collectedGrams: v.optional(v.number()),
  respondedAt: v.optional(v.number()),
});

export const logisticsTables = {
  /** The admin's vehicle types: capacity and sample Bengaluru hire fares. */
  vehicleTypes: defineTable({
    key: vVehicleKey,
    name: v.string(),
    payloadKg: v.number(),
    volumeLitres: v.number(),
    baseFarePaise: v.number(),
    perKmPaise: v.number(),
    loadingPaise: v.number(),
    sortOrder: v.number(),
    active: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  /** One number per rule: slotMinutes, defaultSlotLimit, minPickupGrams, weightTolerancePercent. */
  serviceRules: defineTable({
    key: v.string(),
    value: v.number(),
    unit: v.string(),
    note: v.optional(v.string()),
    /** YYYY-MM-DD the value applies from. */
    effectiveFrom: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  /** A shop's own pickups-per-window limit, when it differs from the default. */
  slotLimits: defineTable({
    orgId: v.id("orgs"),
    limit: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  /**
   * One vehicle filled from several nearby sellers. The vehicle's capacity is
   * copied in at planning so a later edit to the vehicle table never
   * restates a load's capacity bar.
   */
  loads: defineTable({
    buyerOrgId: v.id("orgs"),
    vehicleType: vVehicleKey,
    payloadKg: v.number(),
    volumeLitres: v.number(),
    /** The collection window. */
    date: v.string(),
    window: vSaathiTime,
    stops: v.array(vLoadStop),
    totalGrams: v.number(),
    totalLitres: v.number(),
    /** Ask price × grams over every stop: for the e-way bill check. */
    valuePaise: v.number(),
    routeKm: v.number(),
    freightPaise: v.number(),
    freight: v.object({
      basePaise: v.number(),
      distancePaise: v.number(),
      loadingPaise: v.number(),
    }),
    paidBy: vPaidBy,
    status: vLoadStatus,
    timeline: v.array(v.object({ status: vLoadStatus, at: v.number() })),
    driverPhone: v.optional(v.string()),
    vehicleNo: v.optional(v.string()),
    /** Weighed when the vehicle leaves the last stop, and at the buyer's gate. */
    leavingGrams: v.optional(v.number()),
    arrivedGrams: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_buyer", ["buyerOrgId"])
    .index("by_status", ["status"]),

  /** Roads closed to goods vehicles by type and hour, from traffic-police notices. */
  roadRestrictions: defineTable({
    road: v.string(),
    vehicleTypes: v.array(vVehicleKey),
    /** Hours of the day, India time, 0–24; 0 to 24 is all day. */
    hoursFrom: v.number(),
    hoursTo: v.number(),
    /** YYYY-MM-DD, inclusive. */
    from: v.string(),
    to: v.string(),
    note: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_to", ["to"]),
};
