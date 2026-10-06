import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  balancedOutputGrams,
  optionalReference,
  positiveGrams,
  requiredLabel,
} from "./lib/lotEvidence";
import { requireOrg } from "./lib/workspace";

const outputValidator = v.object({
  materialCode: v.string(),
  state: v.string(),
  grams: v.number(),
});

/** A physical declaration only: it does not add stock or verify provenance. */
export const declareLot = mutation({
  args: {
    materialCode: v.string(),
    state: v.string(),
    grams: v.number(),
    sourceReference: v.optional(v.string()),
  },
  returns: v.id("materialLots"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("materialLots", {
      orgId: org._id,
      declaredByOrgId: org._id,
      materialCode: requiredLabel(args.materialCode),
      state: requiredLabel(args.state),
      sourceKind: "self_declared",
      sourceReference: optionalReference(args.sourceReference),
      initialGrams: positiveGrams(args.grams),
      availableGrams: args.grams,
      status: "available",
      createdByProfileId: profile._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "material_lot.declared",
      entityTable: "materialLots",
      entityId: id,
      metadata: { sourceKind: "self_declared", grams: args.grams },
      createdAt: now,
    });
    return id;
  },
});

/** Dispatch the whole remaining lot. Custody does not transfer legal title. */
export const dispatch = mutation({
  args: { lotId: v.id("materialLots"), receiverOrgId: v.id("orgs") },
  returns: v.id("lotCustodyEvents"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const lot = await ctx.db.get("materialLots", args.lotId);
    if (lot?.orgId !== org._id) throw new ConvexError("LOT_NOT_FOUND");
    if (lot.status !== "available" || lot.availableGrams <= 0) {
      throw new ConvexError("LOT_NOT_AVAILABLE");
    }
    if (org._id === args.receiverOrgId) throw new ConvexError("SAME_CUSTODIAN");
    const receiver = await ctx.db.get("orgs", args.receiverOrgId);
    if (receiver?.status !== "active") {
      throw new ConvexError("RECEIVER_NOT_ACTIVE");
    }
    const now = Date.now();
    const dispatchId = await ctx.db.insert("lotCustodyEvents", {
      lotId: lot._id,
      kind: "dispatched",
      fromOrgId: org._id,
      toOrgId: receiver._id,
      grams: lot.availableGrams,
      actorProfileId: profile._id,
      createdAt: now,
    });
    await ctx.db.patch("materialLots", lot._id, {
      status: "in_transit",
      pendingReceiverOrgId: receiver._id,
      pendingDispatchId: dispatchId,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "material_lot.dispatched",
      entityTable: "materialLots",
      entityId: lot._id,
      metadata: {
        dispatchId,
        receiverOrgId: receiver._id,
        grams: lot.availableGrams,
      },
      createdAt: now,
    });
    return dispatchId;
  },
});

/** A different measured weight remains in dispute; it is never silently fixed. */
export const receive = mutation({
  args: { lotId: v.id("materialLots"), receivedGrams: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const lot = await ctx.db.get("materialLots", args.lotId);
    if (lot?.pendingReceiverOrgId !== org._id || lot.status !== "in_transit") {
      throw new ConvexError("LOT_NOT_PENDING_FOR_ORG");
    }
    if (positiveGrams(args.receivedGrams) !== lot.availableGrams) {
      throw new ConvexError("WEIGHT_DISPUTE");
    }
    if (!lot.pendingDispatchId) throw new ConvexError("DISPATCH_NOT_FOUND");
    const now = Date.now();
    const receiptId = await ctx.db.insert("lotCustodyEvents", {
      lotId: lot._id,
      kind: "received",
      fromOrgId: lot.orgId,
      toOrgId: org._id,
      grams: args.receivedGrams,
      dispatchId: lot.pendingDispatchId,
      actorProfileId: profile._id,
      createdAt: now,
    });
    await ctx.db.patch("materialLots", lot._id, {
      orgId: org._id,
      status: "available",
      pendingReceiverOrgId: undefined,
      pendingDispatchId: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "material_lot.received",
      entityTable: "materialLots",
      entityId: lot._id,
      metadata: {
        receiptId,
        dispatchId: lot.pendingDispatchId,
        grams: args.receivedGrams,
      },
      createdAt: now,
    });
    return null;
  },
});

/** Convert measured grams to child lots, with exact integer mass balance. */
export const transform = mutation({
  args: {
    inputLotId: v.id("materialLots"),
    inputGrams: v.number(),
    contaminationGrams: v.number(),
    processLossGrams: v.number(),
    outputs: v.array(outputValidator),
  },
  returns: v.id("lotTransformations"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const lot = await ctx.db.get("materialLots", args.inputLotId);
    if (lot?.orgId !== org._id) throw new ConvexError("LOT_NOT_FOUND");
    if (lot.status !== "available" || args.inputGrams > lot.availableGrams) {
      throw new ConvexError("NOT_ENOUGH_LOT_GRAMS");
    }
    balancedOutputGrams(
      args.inputGrams,
      args.contaminationGrams,
      args.processLossGrams,
      args.outputs,
    );
    const outputs = args.outputs.map((output) => ({
      materialCode: requiredLabel(output.materialCode),
      state: requiredLabel(output.state),
      grams: output.grams,
    }));
    const now = Date.now();
    const transformationId = await ctx.db.insert("lotTransformations", {
      orgId: org._id,
      inputLotId: lot._id,
      inputGrams: args.inputGrams,
      contaminationGrams: args.contaminationGrams,
      processLossGrams: args.processLossGrams,
      actorProfileId: profile._id,
      createdAt: now,
    });
    const outputLotIds = [];
    for (const output of outputs) {
      outputLotIds.push(
        await ctx.db.insert("materialLots", {
          orgId: org._id,
          declaredByOrgId: org._id,
          materialCode: output.materialCode,
          state: output.state,
          sourceKind: "transformed",
          parentTransformationId: transformationId,
          initialGrams: output.grams,
          availableGrams: output.grams,
          status: "available",
          createdByProfileId: profile._id,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    const availableGrams = lot.availableGrams - args.inputGrams;
    await ctx.db.patch("materialLots", lot._id, {
      availableGrams,
      status: availableGrams === 0 ? "exhausted" : "available",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "material_lot.transformed",
      entityTable: "lotTransformations",
      entityId: transformationId,
      metadata: {
        inputLotId: lot._id,
        inputGrams: args.inputGrams,
        contaminationGrams: args.contaminationGrams,
        processLossGrams: args.processLossGrams,
        outputLotIds,
      },
      createdAt: now,
    });
    return transformationId;
  },
});

/** The caller sees only its currently held lots. */
export const mine = query({
  args: {},
  returns: v.object({
    rows: v.array(
      v.object({
        id: v.id("materialLots"),
        materialCode: v.string(),
        state: v.string(),
        sourceKind: v.union(
          v.literal("self_declared"),
          v.literal("transformed"),
        ),
        initialGrams: v.number(),
        availableGrams: v.number(),
        status: v.union(
          v.literal("available"),
          v.literal("in_transit"),
          v.literal("exhausted"),
        ),
        createdAt: v.number(),
      }),
    ),
    hasMore: v.boolean(),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const lots = await ctx.db
      .query("materialLots")
      .withIndex("by_org_created", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(101);
    return {
      rows: lots.slice(0, 100).map((lot) => ({
        id: lot._id,
        materialCode: lot.materialCode,
        state: lot.state,
        sourceKind: lot.sourceKind,
        initialGrams: lot.initialGrams,
        availableGrams: lot.availableGrams,
        status: lot.status,
        createdAt: lot.createdAt,
      })),
      hasMore: lots.length > 100,
    };
  },
});

/** Current holder can inspect lineage and the first 100 hand-offs, with a limit signal. */
export const history = query({
  args: { lotId: v.id("materialLots") },
  returns: v.object({
    lot: v.object({
      id: v.id("materialLots"),
      declaredByOrgId: v.id("orgs"),
      materialCode: v.string(),
      state: v.string(),
      sourceKind: v.union(v.literal("self_declared"), v.literal("transformed")),
      sourceReference: v.optional(v.string()),
      initialGrams: v.number(),
      availableGrams: v.number(),
      status: v.union(
        v.literal("available"),
        v.literal("in_transit"),
        v.literal("exhausted"),
      ),
    }),
    custody: v.array(
      v.object({
        id: v.id("lotCustodyEvents"),
        kind: v.union(v.literal("dispatched"), v.literal("received")),
        fromOrgId: v.id("orgs"),
        toOrgId: v.id("orgs"),
        grams: v.number(),
        createdAt: v.number(),
      }),
    ),
    hasMoreCustody: v.boolean(),
    transformations: v.array(
      v.object({
        id: v.id("lotTransformations"),
        inputGrams: v.number(),
        contaminationGrams: v.number(),
        processLossGrams: v.number(),
        createdAt: v.number(),
        outputs: v.array(
          v.object({
            id: v.id("materialLots"),
            materialCode: v.string(),
            state: v.string(),
            grams: v.number(),
          }),
        ),
      }),
    ),
    hasMoreTransformations: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const lot = await ctx.db.get("materialLots", args.lotId);
    if (lot?.orgId !== org._id) throw new ConvexError("LOT_NOT_FOUND");
    const custody = await ctx.db
      .query("lotCustodyEvents")
      .withIndex("by_lot_created", (q) => q.eq("lotId", lot._id))
      .take(101);
    const transformations = await ctx.db
      .query("lotTransformations")
      .withIndex("by_input_lot_created", (q) => q.eq("inputLotId", lot._id))
      .take(101);
    return {
      lot: {
        id: lot._id,
        declaredByOrgId: lot.declaredByOrgId,
        materialCode: lot.materialCode,
        state: lot.state,
        sourceKind: lot.sourceKind,
        sourceReference: lot.sourceReference,
        initialGrams: lot.initialGrams,
        availableGrams: lot.availableGrams,
        status: lot.status,
      },
      custody: custody.slice(0, 100).map((event) => ({
        id: event._id,
        kind: event.kind,
        fromOrgId: event.fromOrgId,
        toOrgId: event.toOrgId,
        grams: event.grams,
        createdAt: event.createdAt,
      })),
      hasMoreCustody: custody.length > 100,
      transformations: await Promise.all(
        transformations.slice(0, 100).map(async (event) => {
          const outputs = await ctx.db
            .query("materialLots")
            .withIndex("by_parent_transformation", (q) =>
              q.eq("parentTransformationId", event._id),
            )
            .take(10);
          return {
            id: event._id,
            inputGrams: event.inputGrams,
            contaminationGrams: event.contaminationGrams,
            processLossGrams: event.processLossGrams,
            createdAt: event.createdAt,
            outputs: outputs.map((output) => ({
              id: output._id,
              materialCode: output.materialCode,
              state: output.state,
              grams: output.initialGrams,
            })),
          };
        }),
      ),
      hasMoreTransformations: transformations.length > 100,
    };
  },
});
