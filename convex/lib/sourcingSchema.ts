import { defineTable } from "convex/server";
import { v } from "convex/values";

export const vDecision = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);
export const vAcknowledgement = v.union(
  v.literal("requested"),
  v.literal("acknowledged"),
  v.literal("declined"),
);
export const planFields = {
  orgId: v.id("orgs"),
  materialCode: v.string(),
  quantityGrams: v.number(),
  area: v.string(),
  specification: v.string(),
  everyDays: v.number(),
  nextNeededBy: v.string(),
  status: v.union(v.literal("active"), v.literal("closed")),
  lastPublishedDate: v.optional(v.string()),
  lastDemandId: v.optional(v.id("materialDemands")),
  createdAt: v.number(),
};
export const qualificationFields = {
  buyerOrgId: v.id("orgs"),
  supplierOrgId: v.id("orgs"),
  materialCode: v.string(),
  sampleReference: v.string(),
  specification: v.string(),
  decision: vDecision,
  validUntil: v.string(),
  reason: v.string(),
  createdAt: v.number(),
};
export const agreementFields = {
  buyerOrgId: v.id("orgs"),
  supplierOrgId: v.id("orgs"),
  qualificationId: v.id("supplierQualifications"),
  materialCode: v.string(),
  reference: v.string(),
  specification: v.string(),
  quantityGrams: v.number(),
  paisePerKg: v.number(),
  startsOn: v.string(),
  endsOn: v.string(),
  status: vAcknowledgement,
  acknowledgementReference: v.optional(v.string()),
  closed: v.boolean(),
  createdAt: v.number(),
};
export const releaseFields = {
  agreementId: v.id("sourcingAgreements"),
  buyerOrgId: v.id("orgs"),
  supplierOrgId: v.id("orgs"),
  reference: v.string(),
  quantityGrams: v.number(),
  neededBy: v.string(),
  status: vAcknowledgement,
  acknowledgementReference: v.optional(v.string()),
  createdAt: v.number(),
};
export const sourcingTables = {
  sourcingPlans: defineTable(planFields).index("by_org", ["orgId"]),
  supplierQualifications: defineTable(qualificationFields)
    .index("by_buyer", ["buyerOrgId"])
    .index("by_buyer_supplier_material", [
      "buyerOrgId",
      "supplierOrgId",
      "materialCode",
    ]),
  sourcingAgreements: defineTable(agreementFields)
    .index("by_buyer", ["buyerOrgId"])
    .index("by_supplier", ["supplierOrgId"])
    .index("by_buyer_reference", ["buyerOrgId", "reference"]),
  sourcingReleases: defineTable(releaseFields)
    .index("by_agreement", ["agreementId"])
    .index("by_agreement_reference", ["agreementId", "reference"]),
  sourcingEvents: defineTable({
    agreementId: v.id("sourcingAgreements"),
    releaseId: v.optional(v.id("sourcingReleases")),
    actorOrgId: v.id("orgs"),
    action: v.string(),
    reference: v.string(),
    createdAt: v.number(),
  }).index("by_agreement", ["agreementId"]),
};
export const vPlan = v.object({
  _id: v.id("sourcingPlans"),
  _creationTime: v.number(),
  ...planFields,
});
export const vQualification = v.object({
  _id: v.id("supplierQualifications"),
  _creationTime: v.number(),
  ...qualificationFields,
});
export const vAgreement = v.object({
  _id: v.id("sourcingAgreements"),
  _creationTime: v.number(),
  ...agreementFields,
});
export const vRelease = v.object({
  _id: v.id("sourcingReleases"),
  _creationTime: v.number(),
  ...releaseFields,
});
