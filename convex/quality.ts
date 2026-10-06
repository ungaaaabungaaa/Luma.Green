import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { optionalReference, requiredLabel } from "./lib/lotEvidence";
import { requireOrg } from "./lib/workspace";

const vDecision = v.union(
  v.literal("accepted"),
  v.literal("rejected"),
  v.literal("conditional"),
);
const vResult = v.object({
  parameter: v.string(),
  unit: v.string(),
  value: v.string(),
});
const inspectionFields = {
  lotId: v.id("materialLots"),
  buyerOrgId: v.optional(v.id("orgs")),
  specificationReference: v.string(),
  specificationVersion: v.string(),
  sampleMethod: v.string(),
  results: v.array(vResult),
  decision: vDecision,
  evidenceReference: v.optional(v.string()),
};

/** Seller or current holder's observation, not independent certification. */
export const recordInspection = mutation({
  args: inspectionFields,
  returns: v.id("lotInspections"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const lot = await ctx.db.get("materialLots", args.lotId);
    if (lot?.orgId !== org._id) throw new ConvexError("LOT_NOT_FOUND");
    if (args.buyerOrgId) {
      const buyer = await ctx.db.get("orgs", args.buyerOrgId);
      if (buyer?.status !== "active") throw new ConvexError("BUYER_NOT_ACTIVE");
    }
    if (args.results.length === 0 || args.results.length > 30) {
      throw new ConvexError("INVALID_RESULTS");
    }
    const now = Date.now();
    const id = await ctx.db.insert("lotInspections", {
      lotId: lot._id,
      orgId: org._id,
      buyerOrgId: args.buyerOrgId,
      assessmentScope: "inspecting_org",
      specificationReference: requiredLabel(args.specificationReference),
      specificationVersion: requiredLabel(args.specificationVersion),
      sampleMethod: requiredLabel(args.sampleMethod),
      results: args.results.map((result) => ({
        parameter: requiredLabel(result.parameter),
        unit: requiredLabel(result.unit),
        value: requiredLabel(result.value),
      })),
      decision: args.decision,
      evidenceReference: optionalReference(args.evidenceReference),
      actorProfileId: profile._id,
      createdAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "lot_inspection.recorded",
      entityTable: "lotInspections",
      entityId: id,
      metadata: { lotId: lot._id, buyerOrgId: args.buyerOrgId },
      createdAt: now,
    });
    return id;
  },
});

/** Creates a new result; the old result stays unchanged until separate approval. */
export const proposeCorrection = mutation({
  args: {
    ...inspectionFields,
    supersedesInspectionId: v.id("lotInspections"),
    reason: v.string(),
  },
  returns: v.id("lotInspections"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const old = await ctx.db.get("lotInspections", args.supersedesInspectionId);
    const lot = await ctx.db.get("materialLots", args.lotId);
    if (lot?.orgId !== org._id) throw new ConvexError("INSPECTION_NOT_FOUND");
    if (old?.lotId !== lot._id || old.orgId !== org._id) {
      throw new ConvexError("INSPECTION_NOT_FOUND");
    }
    if (
      args.buyerOrgId !== old.buyerOrgId ||
      args.specificationReference.trim() !== old.specificationReference ||
      args.specificationVersion.trim() !== old.specificationVersion
    ) {
      throw new ConvexError("CORRECTION_SCOPE_CHANGED");
    }
    if (old.supersedesInspectionId) {
      const approval = await ctx.db
        .query("lotInspectionApprovals")
        .withIndex("by_inspection", (q) => q.eq("inspectionId", old._id))
        .unique();
      if (!approval) throw new ConvexError("INSPECTION_NOT_APPROVED");
    }
    const alreadySuperseded = await ctx.db
      .query("lotInspectionApprovals")
      .withIndex("by_superseded", (q) =>
        q.eq("supersededInspectionId", old._id),
      )
      .first();
    if (alreadySuperseded) throw new ConvexError("INSPECTION_SUPERSEDED");
    if (args.results.length === 0 || args.results.length > 30) {
      throw new ConvexError("INVALID_RESULTS");
    }
    const now = Date.now();
    const id = await ctx.db.insert("lotInspections", {
      lotId: lot._id,
      orgId: org._id,
      buyerOrgId: args.buyerOrgId,
      assessmentScope: "inspecting_org",
      specificationReference: requiredLabel(args.specificationReference),
      specificationVersion: requiredLabel(args.specificationVersion),
      sampleMethod: requiredLabel(args.sampleMethod),
      results: args.results.map((result) => ({
        parameter: requiredLabel(result.parameter),
        unit: requiredLabel(result.unit),
        value: requiredLabel(result.value),
      })),
      decision: args.decision,
      evidenceReference: optionalReference(args.evidenceReference),
      supersedesInspectionId: old._id,
      correctionReason: requiredLabel(args.reason),
      actorProfileId: profile._id,
      createdAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "lot_inspection.correction_proposed",
      entityTable: "lotInspections",
      entityId: id,
      metadata: { lotId: lot._id, supersedesInspectionId: old._id },
      createdAt: now,
    });
    return id;
  },
});

/** Only a different owner of the inspecting organisation can approve. */
export const approveCorrection = mutation({
  args: { inspectionId: v.id("lotInspections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const corrected = await ctx.db.get("lotInspections", args.inspectionId);
    if (!corrected?.supersedesInspectionId || corrected.orgId !== org._id) {
      throw new ConvexError("CORRECTION_NOT_FOUND");
    }
    if (corrected.actorProfileId === profile._id) {
      throw new ConvexError("SELF_APPROVAL_FORBIDDEN");
    }
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_profile_org", (q) =>
        q.eq("profileId", profile._id).eq("orgId", org._id),
      )
      .unique();
    if (membership?.role !== "owner") throw new ConvexError("OWNER_REQUIRED");
    const supersededInspectionId = corrected.supersedesInspectionId;
    const existing = await ctx.db
      .query("lotInspectionApprovals")
      .withIndex("by_superseded", (q) =>
        q.eq("supersededInspectionId", supersededInspectionId),
      )
      .first();
    if (existing) throw new ConvexError("INSPECTION_SUPERSEDED");
    const lot = await ctx.db.get("materialLots", corrected.lotId);
    if (lot?.orgId !== org._id) throw new ConvexError("LOT_NOT_FOUND");
    const now = Date.now();
    const approvalId = await ctx.db.insert("lotInspectionApprovals", {
      inspectionId: corrected._id,
      supersededInspectionId,
      orgId: org._id,
      approverProfileId: profile._id,
      createdAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "lot_inspection.correction_approved",
      entityTable: "lotInspectionApprovals",
      entityId: approvalId,
      metadata: { inspectionId: corrected._id, supersededInspectionId },
      createdAt: now,
    });
    return null;
  },
});

/** Report both records and approval status; callers must not hide prior results. */
export const forLot = query({
  args: { lotId: v.id("materialLots") },
  returns: v.object({
    rows: v.array(
      v.object({
        id: v.id("lotInspections"),
        orgId: v.id("orgs"),
        buyerOrgId: v.optional(v.id("orgs")),
        assessmentScope: v.literal("inspecting_org"),
        specificationReference: v.string(),
        specificationVersion: v.string(),
        sampleMethod: v.string(),
        results: v.array(vResult),
        decision: vDecision,
        evidenceReference: v.optional(v.string()),
        supersedesInspectionId: v.optional(v.id("lotInspections")),
        correctionReason: v.optional(v.string()),
        approvedByProfileId: v.optional(v.id("profiles")),
        createdAt: v.number(),
      }),
    ),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const lot = await ctx.db.get("materialLots", args.lotId);
    if (lot?.orgId !== org._id) throw new ConvexError("LOT_NOT_FOUND");
    const rows = await ctx.db
      .query("lotInspections")
      .withIndex("by_lot_created", (q) => q.eq("lotId", lot._id))
      .order("desc")
      .take(101);
    return {
      rows: await Promise.all(
        rows.slice(0, 100).map(async (row) => {
          const approval = await ctx.db
            .query("lotInspectionApprovals")
            .withIndex("by_inspection", (q) => q.eq("inspectionId", row._id))
            .first();
          return {
            id: row._id,
            orgId: row.orgId,
            buyerOrgId: row.buyerOrgId,
            assessmentScope: row.assessmentScope,
            specificationReference: row.specificationReference,
            specificationVersion: row.specificationVersion,
            sampleMethod: row.sampleMethod,
            results: row.results,
            decision: row.decision,
            evidenceReference: row.evidenceReference,
            supersedesInspectionId: row.supersedesInspectionId,
            correctionReason: row.correctionReason,
            approvedByProfileId: approval?.approverProfileId,
            createdAt: row.createdAt,
          };
        }),
      ),
      hasMore: rows.length > 100,
    };
  },
});
