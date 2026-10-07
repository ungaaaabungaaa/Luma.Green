import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { findProfile } from "./lib/applicationAccess";

/**
 * Admin review of a material category for manufacturer byproduct offers.
 * This platform review does not replace a facility-specific legal, lab, or
 * hazardous-waste determination.
 */
export const reviewMaterial = mutation({
  args: {
    materialCode: v.string(),
    hazardStatus: v.union(v.literal("non_hazardous"), v.literal("hazardous")),
    sourceReference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const sourceReference = args.sourceReference.trim();
    if (sourceReference.length < 3 || sourceReference.length > 160) {
      throw new ConvexError("INVALID_CLASSIFICATION_SOURCE");
    }
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", args.materialCode))
      .unique();
    if (!material?.active || material.stage !== "scrap") {
      throw new ConvexError("MATERIAL_NOT_ELIGIBLE");
    }
    const adminProfile = await findProfile(ctx, admin._id);
    const actorProfileId = adminProfile?._id;
    const now = Date.now();
    const previous = material.byproductEligibility ?? null;
    await ctx.db.patch("materials", material._id, {
      byproductEligibility: {
        hazardStatus: args.hazardStatus,
        sourceReference,
        reviewedAt: now,
        reviewedByProfileId: actorProfileId,
      },
    });
    await ctx.db.insert("auditLog", {
      actorProfileId,
      action: "material.byproduct_classified",
      entityTable: "materials",
      entityId: material._id,
      metadata: {
        materialCode: material.code,
        from: previous,
        to: { hazardStatus: args.hazardStatus, sourceReference },
      },
      createdAt: now,
    });
    return null;
  },
});

/** Admin-only review evidence; never expose these references in the public catalogue. */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      code: v.string(),
      name: v.string(),
      review: v.union(
        v.null(),
        v.object({
          hazardStatus: v.union(
            v.literal("non_hazardous"),
            v.literal("hazardous"),
          ),
          sourceReference: v.string(),
          reviewedAt: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const materials = await ctx.db
      .query("materials")
      .withIndex("by_sortOrder")
      .take(200);
    return materials
      .filter((material) => material.active && material.stage === "scrap")
      .map((material) => ({
        code: material.code,
        name: material.names.en,
        review: material.byproductEligibility
          ? {
              hazardStatus: material.byproductEligibility.hazardStatus,
              sourceReference: material.byproductEligibility.sourceReference,
              reviewedAt: material.byproductEligibility.reviewedAt,
            }
          : null,
      }));
  },
});
