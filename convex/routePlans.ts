import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { routeGeometry, routeInputSchema } from "./lib/routePlanning";
import { routeFields, routeVersionFields } from "./lib/routePlanningSchema";
import { requireOrg } from "./lib/workspace";

const planView = v.object({
  _id: v.id("routePlans"),
  _creationTime: v.number(),
  orgId: v.id("orgs"),
  reference: v.string(),
  title: v.string(),
  status: v.union(v.literal("active"), v.literal("archived")),
  revision: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  archiveReason: v.optional(v.string()),
});
const versionView = v.object({
  ...routeVersionFields,
  _id: v.id("routePlanVersions"),
  _creationTime: v.number(),
});
function snapshot(row: Doc<"routePlanVersions">) {
  return {
    title: row.title,
    vehicleReference: row.vehicleReference,
    capacityGrams: row.capacityGrams,
    origin: row.origin,
    stops: row.stops,
    ordering: row.ordering,
  };
}
function isIdenticalFirst(
  first: Doc<"routePlanVersions"> | null,
  input: unknown,
  reason: string,
) {
  return (
    first?.reason === reason &&
    JSON.stringify(routeInputSchema.parse(snapshot(first))) ===
      JSON.stringify(input)
  );
}
export const mine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(planView),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    return ctx.db
      .query("routePlans")
      .withIndex("by_org_updated", (q) => q.eq("orgId", org._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
  },
});
export const detail = query({
  args: { planId: v.id("routePlans") },
  returns: v.object({ plan: planView, latest: versionView }),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    const plan = await ctx.db.get("routePlans", args.planId);
    if (plan?.orgId !== org._id) throw new ConvexError("ROUTE_NOT_FOUND");
    const latest = await ctx.db
      .query("routePlanVersions")
      .withIndex("by_plan_revision", (q) =>
        q.eq("planId", plan._id).eq("revision", plan.revision),
      )
      .unique();
    if (!latest) throw new ConvexError("ROUTE_NOT_FOUND");
    return { plan, latest };
  },
});
export const history = query({
  args: { planId: v.id("routePlans"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(versionView),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    const plan = await ctx.db.get("routePlans", args.planId);
    if (plan?.orgId !== org._id) throw new ConvexError("ROUTE_NOT_FOUND");
    return ctx.db
      .query("routePlanVersions")
      .withIndex("by_plan_revision", (q) => q.eq("planId", plan._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
  },
});
export const options = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("materials"),
      code: v.string(),
      names: v.record(v.string(), v.string()),
    }),
  ),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, undefined, "read");
    const materials = await ctx.db
      .query("materials")
      .withIndex("by_sortOrder")
      .take(1000);
    return materials
      .filter((m) => m.active && org.families.includes(m.family))
      .map((m) => ({ id: m._id, code: m.code, names: m.names }));
  },
});
function recordReference(value: string, maximum: number): string {
  const text = value.trim();
  if (text.length < 3 || text.length > maximum)
    throw new ConvexError("INVALID_ROUTE");
  return text;
}
async function validateMaterials(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  stops: { materialId: Id<"materials"> }[],
): Promise<string[]> {
  const codes: string[] = [];
  for (const stop of stops) {
    const material = await ctx.db.get("materials", stop.materialId);
    if (!material?.active || !org.families.includes(material.family))
      throw new ConvexError("ROUTE_MATERIAL_UNAVAILABLE");
    codes.push(material.code);
  }
  return codes;
}
export const save = mutation({
  args: {
    ...routeFields,
    reference: v.string(),
    planId: v.optional(v.id("routePlans")),
    expectedRevision: v.optional(v.number()),
    reason: v.string(),
  },
  returns: v.id("routePlans"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const parsed = routeInputSchema.safeParse(args);
    if (!parsed.success) throw new ConvexError("INVALID_ROUTE");
    const reference = recordReference(args.reference, 80);
    const reason = recordReference(args.reason, 200);
    const fields = {
      title: parsed.data.title,
      vehicleReference: parsed.data.vehicleReference,
      capacityGrams: parsed.data.capacityGrams,
      origin: parsed.data.origin,
      ordering: parsed.data.ordering,
      stops: args.stops.map((stop) => ({
        ...stop,
        siteReference: stop.siteReference.trim(),
      })),
    };
    const existing = args.planId
      ? await ctx.db.get("routePlans", args.planId)
      : await ctx.db
          .query("routePlans")
          .withIndex("by_org_reference", (q) =>
            q.eq("orgId", org._id).eq("reference", reference),
          )
          .unique();
    if (
      args.planId &&
      (existing?.orgId !== org._id || existing.reference !== reference)
    )
      throw new ConvexError("ROUTE_NOT_FOUND");
    if (existing?.status === "archived")
      throw new ConvexError("ROUTE_ARCHIVED");
    if (existing && !args.planId) {
      const first = await ctx.db
        .query("routePlanVersions")
        .withIndex("by_plan_revision", (q) =>
          q.eq("planId", existing._id).eq("revision", 1),
        )
        .unique();
      if (isIdenticalFirst(first, parsed.data, reason)) return existing._id;
      throw new ConvexError("ROUTE_REFERENCE_EXISTS");
    }
    if (existing && args.expectedRevision !== existing.revision)
      throw new ConvexError("ROUTE_REVISION_CONFLICT");
    const materialCodes = await validateMaterials(ctx, org, fields.stops);
    const now = Date.now();
    const revision = (existing?.revision ?? 0) + 1;
    const id =
      existing?._id ??
      (await ctx.db.insert("routePlans", {
        orgId: org._id,
        reference,
        title: fields.title,
        revision,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }));
    await ctx.db.insert("routePlanVersions", {
      ...fields,
      ...routeGeometry(parsed.data),
      materialCodes,
      planId: id,
      orgId: org._id,
      revision,
      reason,
      actorProfileId: profile._id,
      createdAt: now,
    });
    if (existing)
      await ctx.db.patch("routePlans", id, {
        title: fields.title,
        revision,
        updatedAt: now,
      });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: existing ? "route_plan.corrected" : "route_plan.created",
      entityTable: "routePlans",
      entityId: id,
      metadata: {
        revision,
        reason,
        previousRevision: existing?.revision,
        source: "manual_plan_only",
      },
      createdAt: now,
    });
    return id;
  },
});
export const archive = mutation({
  args: {
    planId: v.id("routePlans"),
    expectedRevision: v.number(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx, undefined, "manage");
    const plan = await ctx.db.get("routePlans", args.planId);
    if (plan?.orgId !== org._id) throw new ConvexError("ROUTE_NOT_FOUND");
    const reason = args.reason.trim();
    if (reason.length < 3 || reason.length > 200)
      throw new ConvexError("INVALID_ROUTE");
    if (plan.revision !== args.expectedRevision)
      throw new ConvexError("ROUTE_REVISION_CONFLICT");
    if (plan.status === "archived") return null;
    const now = Date.now();
    await ctx.db.patch("routePlans", plan._id, {
      status: "archived",
      archiveReason: reason,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "route_plan.archived",
      entityTable: "routePlans",
      entityId: plan._id,
      metadata: { revision: plan.revision, reason },
      createdAt: now,
    });
    return null;
  },
});
