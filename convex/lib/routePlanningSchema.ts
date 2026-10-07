import { defineTable } from "convex/server";
import { v } from "convex/values";

export const routeSite = v.object({
  siteReference: v.string(),
  latitude: v.number(),
  longitude: v.number(),
});
export const routeStop = v.object({
  siteReference: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  materialId: v.id("materials"),
  grams: v.number(),
});
export const routeFields = {
  title: v.string(),
  vehicleReference: v.string(),
  capacityGrams: v.number(),
  origin: routeSite,
  stops: v.array(routeStop),
  ordering: v.union(v.literal("entered"), v.literal("geometric")),
};
export const routeVersionFields = {
  ...routeFields,
  planId: v.id("routePlans"),
  orgId: v.id("orgs"),
  revision: v.number(),
  orderIndices: v.array(v.number()),
  materialCodes: v.array(v.string()),
  totalGrams: v.number(),
  straightLineMeters: v.number(),
  reason: v.string(),
  actorProfileId: v.id("profiles"),
  createdAt: v.number(),
};
export const routePlanningTables = {
  routePlans: defineTable({
    orgId: v.id("orgs"),
    reference: v.string(),
    title: v.string(),
    status: v.union(v.literal("active"), v.literal("archived")),
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    archiveReason: v.optional(v.string()),
  })
    .index("by_org_updated", ["orgId", "updatedAt"])
    .index("by_org_reference", ["orgId", "reference"]),
  routePlanVersions: defineTable(routeVersionFields).index("by_plan_revision", [
    "planId",
    "revision",
  ]),
};
