import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import { safePaiseFor } from "./lib/chain";
import { shiftDate } from "./lib/dates";
import { canDemand, createDemand } from "./lib/demand";
import { indiaToday } from "./lib/onboarding";
import {
  agreementSchema,
  canSupply,
  pair,
  planSchema,
  qualificationSchema,
  releaseSchema,
  sourcingReference,
} from "./lib/sourcing";
import {
  vAgreement,
  vDecision,
  vPlan,
  vQualification,
  vRelease,
} from "./lib/sourcingSchema";
import { vMaterialRef } from "./lib/views";
import { requireOrg } from "./lib/workspace";

const pagination = { paginationOpts: paginationOptsValidator };
async function audit(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  profileId: Id<"profiles">,
  action: string,
  entityTable: string,
  entityId: string,
) {
  await ctx.db.insert("auditLog", {
    orgId,
    actorProfileId: profileId,
    action: `sourcing.${action}`,
    entityTable,
    entityId,
    createdAt: Date.now(),
  });
}
async function agreementFor(
  ctx: QueryCtx,
  id: Id<"sourcingAgreements">,
  orgId: Id<"orgs">,
) {
  const row = await ctx.db.get("sourcingAgreements", id);
  if (!row || ![row.buyerOrgId, row.supplierOrgId].includes(orgId))
    throw new ConvexError("NOT_FOUND");
  return row;
}
async function latestQualification(
  ctx: QueryCtx,
  buyer: Id<"orgs">,
  supplier: Id<"orgs">,
  materialCode: string,
) {
  const row = await ctx.db
    .query("supplierQualifications")
    .withIndex("by_buyer_supplier_material", (q) =>
      q
        .eq("buyerOrgId", buyer)
        .eq("supplierOrgId", supplier)
        .eq("materialCode", materialCode),
    )
    .order("desc")
    .first();
  if (row?.decision !== "approved" || row.validUntil < indiaToday())
    throw new ConvexError("QUALIFICATION_REQUIRED");
  return row;
}
async function checkAgreement(ctx: QueryCtx, row: Doc<"sourcingAgreements">) {
  await pair(ctx, row.buyerOrgId, row.supplierOrgId, row.materialCode);
  const qualification = await latestQualification(
    ctx,
    row.buyerOrgId,
    row.supplierOrgId,
    row.materialCode,
  );
  if (qualification.specification !== row.specification)
    throw new ConvexError("QUALIFICATION_REQUIRED");
  if (row.closed || row.endsOn < indiaToday())
    throw new ConvexError("AGREEMENT_CLOSED");
}
async function event(
  ctx: MutationCtx,
  row: Doc<"sourcingAgreements">,
  actorOrgId: Id<"orgs">,
  action: string,
  reference: string,
  releaseId?: Id<"sourcingReleases">,
) {
  await ctx.db.insert("sourcingEvents", {
    agreementId: row._id,
    actorOrgId,
    action,
    reference,
    releaseId,
    createdAt: Date.now(),
  });
}
export const options = query({
  args: { materialCode: v.optional(v.string()) },
  returns: v.object({
    materials: v.array(vMaterialRef),
    suppliers: v.array(
      v.object({ id: v.id("orgs"), name: v.string(), city: v.string() }),
    ),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    const materials = await ctx.db
      .query("materials")
      .withIndex("by_sortOrder")
      .take(201);
    const selected = materials.find((m) => m.code === args.materialCode);
    const pages = selected
      ? await Promise.all(
          (["kabadiwala", "yard", "recycler", "manufacturer"] as const).map(
            (kind) =>
              ctx.db
                .query("orgs")
                .withIndex("by_kind_city", (q) =>
                  q
                    .eq("kind", kind)
                    .eq("city", org.city)
                    .eq("status", "active"),
                )
                .take(101),
          ),
        )
      : [];
    const eligibleSuppliers = pages
      .flat()
      .filter((supplier) => selected && canSupply(supplier, org, selected));
    return {
      materials: materials
        .slice(0, 200)
        .filter((m) => canDemand(org, m))
        .map(({ code, names, family }) => ({ code, names, family })),
      suppliers: eligibleSuppliers
        .slice(0, 100)
        .map((s) => ({ id: s._id, name: s.name, city: s.city })),
      truncated:
        materials.length > 200 ||
        eligibleSuppliers.length > 100 ||
        pages.some((page) => page.length > 100),
    };
  },
});
export const plans = query({
  args: pagination,
  returns: paginationResultValidator(vPlan),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    return ctx.db
      .query("sourcingPlans")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
  },
});
export const postPlan = mutation({
  args: {
    materialCode: v.string(),
    quantityGrams: v.number(),
    area: v.string(),
    specification: v.string(),
    neededBy: v.string(),
    everyDays: v.number(),
  },
  returns: v.id("sourcingPlans"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const p = planSchema.safeParse(args);
    if (!p.success) throw new ConvexError("INVALID_DEMAND");
    const m = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", p.data.materialCode))
      .unique();
    if (!m || !canDemand(org, m)) throw new ConvexError("MATERIAL_NOT_ALLOWED");
    const { neededBy, ...rest } = p.data;
    const id = await ctx.db.insert("sourcingPlans", {
      ...rest,
      orgId: org._id,
      nextNeededBy: neededBy,
      status: "active",
      createdAt: Date.now(),
    });
    await audit(ctx, org._id, profile._id, "plan_created", "sourcingPlans", id);
    return id;
  },
});
export const publishNext = mutation({
  args: { planId: v.id("sourcingPlans"), expectedDate: v.string() },
  returns: v.id("materialDemands"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const row = await ctx.db.get("sourcingPlans", args.planId);
    if (row?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (row.lastPublishedDate === args.expectedDate && row.lastDemandId)
      return row.lastDemandId;
    if (row.status !== "active" || row.nextNeededBy !== args.expectedDate)
      throw new ConvexError("STALE_PLAN");
    const id = await createDemand(ctx, org, profile, {
      ...row,
      neededBy: row.nextNeededBy,
    });
    await ctx.db.patch("sourcingPlans", row._id, {
      lastPublishedDate: row.nextNeededBy,
      lastDemandId: id,
      nextNeededBy: shiftDate(row.nextNeededBy, row.everyDays),
    });
    await audit(
      ctx,
      org._id,
      profile._id,
      "occurrence_published",
      "sourcingPlans",
      row._id,
    );
    return id;
  },
});
export const closePlan = mutation({
  args: { planId: v.id("sourcingPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const row = await ctx.db.get("sourcingPlans", args.planId);
    if (row?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (row.status !== "closed") {
      await ctx.db.patch("sourcingPlans", row._id, { status: "closed" });
      await audit(
        ctx,
        org._id,
        profile._id,
        "plan_closed",
        "sourcingPlans",
        row._id,
      );
    }
    return null;
  },
});
export const qualifications = query({
  args: pagination,
  returns: paginationResultValidator(
    v.object({ record: vQualification, supplierName: v.string() }),
  ),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    const result = await ctx.db
      .query("supplierQualifications")
      .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (record) => {
          const supplier = await ctx.db.get("orgs", record.supplierOrgId);
          return { record, supplierName: supplier?.name ?? "" };
        }),
      ),
    };
  },
});
export const recordQualification = mutation({
  args: {
    supplierOrgId: v.id("orgs"),
    materialCode: v.string(),
    sampleReference: v.string(),
    specification: v.string(),
    decision: vDecision,
    validUntil: v.string(),
    reason: v.string(),
  },
  returns: v.id("supplierQualifications"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const parsed = qualificationSchema.safeParse(args);
    if (!parsed.success) throw new ConvexError("INVALID_INPUT");
    await pair(ctx, org._id, args.supplierOrgId, args.materialCode);
    const id = await ctx.db.insert("supplierQualifications", {
      ...parsed.data,
      buyerOrgId: org._id,
      supplierOrgId: args.supplierOrgId,
      materialCode: args.materialCode,
      createdAt: Date.now(),
    });
    await audit(
      ctx,
      org._id,
      profile._id,
      "qualification_recorded",
      "supplierQualifications",
      id,
    );
    return id;
  },
});
export const agreements = query({
  args: {
    ...pagination,
    side: v.union(v.literal("buying"), v.literal("supplying")),
  },
  returns: paginationResultValidator(
    v.object({
      record: vAgreement,
      buyerName: v.string(),
      supplierName: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    const result = await ctx.db
      .query("sourcingAgreements")
      .withIndex(args.side === "buying" ? "by_buyer" : "by_supplier", (q) =>
        args.side === "buying"
          ? q.eq("buyerOrgId", org._id)
          : q.eq("supplierOrgId", org._id),
      )
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (record) => {
          const [buyer, supplier] = await Promise.all([
            ctx.db.get("orgs", record.buyerOrgId),
            ctx.db.get("orgs", record.supplierOrgId),
          ]);
          return {
            record,
            buyerName: buyer?.name ?? "",
            supplierName: supplier?.name ?? "",
          };
        }),
      ),
    };
  },
});
export const propose = mutation({
  args: {
    supplierOrgId: v.id("orgs"),
    materialCode: v.string(),
    reference: v.string(),
    specification: v.string(),
    quantityGrams: v.number(),
    paisePerKg: v.number(),
    startsOn: v.string(),
    endsOn: v.string(),
  },
  returns: v.id("sourcingAgreements"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const p = agreementSchema.safeParse(args);
    if (
      !p.success ||
      safePaiseFor(args.quantityGrams, args.paisePerKg) === null
    )
      throw new ConvexError("INVALID_INPUT");
    await pair(ctx, org._id, args.supplierOrgId, args.materialCode);
    const qualification = await latestQualification(
      ctx,
      org._id,
      args.supplierOrgId,
      args.materialCode,
    );
    if (qualification.specification !== p.data.specification)
      throw new ConvexError("QUALIFICATION_REQUIRED");
    if (p.data.endsOn < indiaToday()) throw new ConvexError("INVALID_DATE");
    const prior = await ctx.db
      .query("sourcingAgreements")
      .withIndex("by_buyer_reference", (q) =>
        q.eq("buyerOrgId", org._id).eq("reference", p.data.reference),
      )
      .unique();
    if (prior) {
      const expected = Object.entries({
        ...p.data,
        supplierOrgId: args.supplierOrgId,
        materialCode: args.materialCode,
      });
      for (const [key, value] of expected)
        if (Reflect.get(prior, key) !== value)
          throw new ConvexError("REFERENCE_CONFLICT");
      return prior._id;
    }
    const id = await ctx.db.insert("sourcingAgreements", {
      ...p.data,
      buyerOrgId: org._id,
      supplierOrgId: args.supplierOrgId,
      materialCode: args.materialCode,
      qualificationId: qualification._id,
      status: "requested",
      closed: false,
      createdAt: Date.now(),
    });
    await audit(
      ctx,
      org._id,
      profile._id,
      "agreement_proposed",
      "sourcingAgreements",
      id,
    );
    const row = await ctx.db.get("sourcingAgreements", id);
    if (row) await event(ctx, row, org._id, "proposed", p.data.reference);
    return id;
  },
});
export const acknowledge = mutation({
  args: {
    agreementId: v.id("sourcingAgreements"),
    decision: v.union(v.literal("acknowledged"), v.literal("declined")),
    reference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const row = await agreementFor(ctx, args.agreementId, org._id);
    if (row.supplierOrgId !== org._id) throw new ConvexError("WRONG_ROLE");
    const ref = sourcingReference.safeParse(args.reference);
    if (!ref.success) throw new ConvexError("INVALID_INPUT");
    if (row.status !== "requested") {
      if (
        row.status === args.decision &&
        row.acknowledgementReference === ref.data
      )
        return null;
      throw new ConvexError("INVALID_TRANSITION");
    }
    if (args.decision === "acknowledged") await checkAgreement(ctx, row);
    await ctx.db.patch("sourcingAgreements", row._id, {
      status: args.decision,
      acknowledgementReference: ref.data,
    });
    await event(ctx, row, org._id, args.decision, ref.data);
    await audit(
      ctx,
      org._id,
      profile._id,
      "agreement_acknowledged",
      "sourcingAgreements",
      row._id,
    );
    return null;
  },
});
export const release = mutation({
  args: {
    agreementId: v.id("sourcingAgreements"),
    reference: v.string(),
    quantityGrams: v.number(),
    neededBy: v.string(),
  },
  returns: v.id("sourcingReleases"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const row = await agreementFor(ctx, args.agreementId, org._id);
    if (row.buyerOrgId !== org._id) throw new ConvexError("WRONG_ROLE");
    const p = releaseSchema.safeParse(args);
    if (!p.success) throw new ConvexError("INVALID_INPUT");
    const prior = await ctx.db
      .query("sourcingReleases")
      .withIndex("by_agreement_reference", (q) =>
        q.eq("agreementId", row._id).eq("reference", p.data.reference),
      )
      .unique();
    if (prior) {
      if (
        prior.quantityGrams !== p.data.quantityGrams ||
        prior.neededBy !== p.data.neededBy
      )
        throw new ConvexError("REFERENCE_CONFLICT");
      return prior._id;
    }
    await checkAgreement(ctx, row);
    if (
      row.status !== "acknowledged" ||
      p.data.neededBy < indiaToday() ||
      p.data.neededBy < row.startsOn ||
      p.data.neededBy > row.endsOn
    )
      throw new ConvexError("INVALID_TRANSITION");
    const releases = await ctx.db
      .query("sourcingReleases")
      .withIndex("by_agreement", (q) => q.eq("agreementId", row._id))
      .take(201);
    const used = releases
      .filter((r) => r.status !== "declined")
      .reduce((sum, r) => sum + r.quantityGrams, 0);
    if (
      releases.length >= 200 ||
      !Number.isSafeInteger(used + p.data.quantityGrams) ||
      used + p.data.quantityGrams > row.quantityGrams
    )
      throw new ConvexError("QUANTITY_EXCEEDED");
    const id = await ctx.db.insert("sourcingReleases", {
      ...p.data,
      agreementId: row._id,
      buyerOrgId: row.buyerOrgId,
      supplierOrgId: row.supplierOrgId,
      status: "requested",
      createdAt: Date.now(),
    });
    await event(ctx, row, org._id, "release_requested", p.data.reference, id);
    await audit(
      ctx,
      org._id,
      profile._id,
      "release_requested",
      "sourcingReleases",
      id,
    );
    return id;
  },
});
export const acknowledgeRelease = mutation({
  args: {
    releaseId: v.id("sourcingReleases"),
    decision: v.union(v.literal("acknowledged"), v.literal("declined")),
    reference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const release = await ctx.db.get("sourcingReleases", args.releaseId);
    if (release?.supplierOrgId !== org._id) throw new ConvexError("NOT_FOUND");
    const row = await agreementFor(ctx, release.agreementId, org._id);
    const ref = sourcingReference.safeParse(args.reference);
    if (!ref.success) throw new ConvexError("INVALID_INPUT");
    if (release.status !== "requested") {
      if (
        release.status === args.decision &&
        release.acknowledgementReference === ref.data
      )
        return null;
      throw new ConvexError("INVALID_TRANSITION");
    }
    if (args.decision === "acknowledged") await checkAgreement(ctx, row);
    await ctx.db.patch("sourcingReleases", release._id, {
      status: args.decision,
      acknowledgementReference: ref.data,
    });
    await event(
      ctx,
      row,
      org._id,
      `release_${args.decision}`,
      ref.data,
      release._id,
    );
    await audit(
      ctx,
      org._id,
      profile._id,
      "release_acknowledged",
      "sourcingReleases",
      release._id,
    );
    return null;
  },
});
export const detail = query({
  args: { agreementId: v.id("sourcingAgreements") },
  returns: v.object({
    releases: v.array(vRelease),
    events: v.array(
      v.object({
        action: v.string(),
        reference: v.string(),
        createdAt: v.number(),
      }),
    ),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    await agreementFor(ctx, args.agreementId, org._id);
    const releases = await ctx.db
      .query("sourcingReleases")
      .withIndex("by_agreement", (q) => q.eq("agreementId", args.agreementId))
      .order("desc")
      .take(201);
    const events = await ctx.db
      .query("sourcingEvents")
      .withIndex("by_agreement", (q) => q.eq("agreementId", args.agreementId))
      .order("desc")
      .take(201);
    return {
      releases: releases.slice(0, 200),
      events: events.slice(0, 200).map(({ action, reference, createdAt }) => ({
        action,
        reference,
        createdAt,
      })),
      truncated: events.length > 200 || releases.length > 200,
    };
  },
});
export const closeAgreement = mutation({
  args: { agreementId: v.id("sourcingAgreements"), reference: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const row = await agreementFor(ctx, args.agreementId, org._id);
    if (row.buyerOrgId !== org._id) throw new ConvexError("WRONG_ROLE");
    const ref = sourcingReference.safeParse(args.reference);
    if (!ref.success) throw new ConvexError("INVALID_INPUT");
    if (!row.closed) {
      await ctx.db.patch("sourcingAgreements", row._id, { closed: true });
      await event(ctx, row, org._id, "closed", ref.data);
      await audit(
        ctx,
        org._id,
        profile._id,
        "agreement_closed",
        "sourcingAgreements",
        row._id,
      );
    }
    return null;
  },
});
export const reschedule = mutation({
  args: {
    planId: v.id("sourcingPlans"),
    expectedDate: v.string(),
    neededBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const row = await ctx.db.get("sourcingPlans", args.planId);
    if (row?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (row.status !== "active" || row.nextNeededBy !== args.expectedDate)
      throw new ConvexError("STALE_PLAN");
    const parsed = planSchema.safeParse({ ...row, neededBy: args.neededBy });
    if (!parsed.success) throw new ConvexError("INVALID_DEMAND");
    if (args.neededBy <= row.nextNeededBy)
      throw new ConvexError("INVALID_DATE");
    await ctx.db.patch("sourcingPlans", row._id, {
      nextNeededBy: args.neededBy,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "sourcing.plan_rescheduled",
      entityTable: "sourcingPlans",
      entityId: row._id,
      metadata: { previousDate: row.nextNeededBy, nextDate: args.neededBy },
      createdAt: Date.now(),
    });
    return null;
  },
});
