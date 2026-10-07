import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  optionalReference,
  positiveGrams,
  requiredLabel,
} from "./lib/lotEvidence";
import { indiaToday } from "./lib/onboarding";
import { vMaterialRef } from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";

function isEligible(material: Doc<"materials">, org: Doc<"orgs">) {
  return (
    material.active &&
    material.stage === "scrap" &&
    material.byproductEligibility?.hazardStatus === "non_hazardous" &&
    org.families.includes(material.family)
  );
}
function requiredReference(value: string) {
  const clean = optionalReference(value);
  if (!clean) throw new ConvexError("INVALID_REFERENCE");
  return clean;
}
function productionDate(value: string) {
  const time = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value ||
    value > indiaToday()
  )
    throw new ConvexError("INVALID_PRODUCTION_DATE");
  return value;
}

export const materials = query({
  args: {},
  returns: v.array(vMaterialRef),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, ["manufacturer"], "read");
    const catalogue = await materialIndex(ctx);
    return [...catalogue.values()]
      .filter((material) => isEligible(material, org))
      .map(({ code, names, family }) => ({ code, names, family }));
  },
});

/** Explicit stock intake for the manufacturer's own weighed production byproduct. */
export const record = mutation({
  args: {
    intakeReference: v.string(),
    materialCode: v.string(),
    grams: v.number(),
    producedOn: v.string(),
    sourceReference: v.string(),
    weighingReference: v.string(),
    ownProductionConfirmed: v.literal(true),
  },
  returns: v.id("manufacturerStockIntakes"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx, ["manufacturer"]);
    const values = {
      intakeReference: requiredLabel(args.intakeReference),
      materialCode: requiredLabel(args.materialCode),
      grams: positiveGrams(args.grams),
      producedOn: productionDate(args.producedOn),
      sourceReference: requiredReference(args.sourceReference),
      weighingReference: requiredReference(args.weighingReference),
      ownProductionConfirmed: args.ownProductionConfirmed,
    };
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", values.materialCode))
      .unique();
    if (!material || !isEligible(material, org))
      throw new ConvexError("BYPRODUCT_NOT_ELIGIBLE");
    const existing = await ctx.db
      .query("manufacturerStockIntakes")
      .withIndex("by_org_reference", (q) =>
        q.eq("orgId", org._id).eq("intakeReference", values.intakeReference),
      )
      .unique();
    if (existing) {
      if (
        existing.materialCode !== values.materialCode ||
        existing.grams !== values.grams ||
        existing.producedOn !== values.producedOn ||
        existing.sourceReference !== values.sourceReference ||
        existing.weighingReference !== values.weighingReference
      )
        throw new ConvexError("INTAKE_REFERENCE_CONFLICT");
      return existing._id;
    }
    const stock = await ctx.db
      .query("inventory")
      .withIndex("by_org_material", (q) =>
        q.eq("orgId", org._id).eq("materialCode", values.materialCode),
      )
      .unique();
    const previousGrams = stock?.grams ?? 0;
    const grams = previousGrams + values.grams;
    if (
      !Number.isSafeInteger(previousGrams) ||
      previousGrams < 0 ||
      !Number.isSafeInteger(grams)
    )
      throw new ConvexError("INVALID_WEIGHT");
    const now = Date.now();
    const id = await ctx.db.insert("manufacturerStockIntakes", {
      ...values,
      orgId: org._id,
      actorProfileId: profile._id,
      createdAt: now,
    });
    if (stock)
      await ctx.db.patch("inventory", stock._id, { grams, updatedAt: now });
    else
      await ctx.db.insert("inventory", {
        orgId: org._id,
        materialCode: values.materialCode,
        grams,
        updatedAt: now,
      });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "inventory.manufacturer_intake_recorded",
      entityTable: "manufacturerStockIntakes",
      entityId: id,
      metadata: {
        materialCode: values.materialCode,
        intakeGrams: values.grams,
        previousGrams,
        grams,
        evidenceScope: "manufacturer_declared_own_production",
      },
      createdAt: now,
    });
    return id;
  },
});

const view = v.object({
  id: v.id("manufacturerStockIntakes"),
  intakeReference: v.string(),
  materialCode: v.string(),
  grams: v.number(),
  producedOn: v.string(),
  sourceReference: v.string(),
  weighingReference: v.string(),
  createdAt: v.number(),
});
export const mine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(view),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, ["manufacturer"], "read");
    const result = await ctx.db
      .query("manufacturerStockIntakes")
      .withIndex("by_org_created", (q) => q.eq("orgId", org._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.max(1, Math.min(20, args.paginationOpts.numItems)),
        maximumRowsRead: 20,
      });
    return {
      ...result,
      page: result.page.map(
        ({
          _id,
          intakeReference,
          materialCode,
          grams,
          producedOn,
          sourceReference,
          weighingReference,
          createdAt,
        }) => ({
          id: _id,
          intakeReference,
          materialCode,
          grams,
          producedOn,
          sourceReference,
          weighingReference,
          createdAt,
        }),
      ),
    };
  },
});
