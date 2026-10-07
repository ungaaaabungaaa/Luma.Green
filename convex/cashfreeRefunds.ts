import { ConvexError, v } from "convex/values";

import { cashfreeEnv } from "../src/lib/env";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import {
  financial,
  hold,
  log,
  reference,
  setFinancial,
} from "./lib/cashfreeLifecycle";
import { vCashfreeOrder } from "./lib/cashfreeSchema";
const refundFields = {
  orderId: v.id("cashfreeOrders"),
  tradeId: v.id("trades"),
  reference: v.string(),
  reason: v.string(),
  amountPaise: v.number(),
  providerRefundId: v.string(),
  providerIdentity: v.optional(v.string()),
  idempotencyKey: v.string(),
  actorId: v.string(),
  status: v.union(
    v.literal("prepared"),
    v.literal("pending"),
    v.literal("success"),
    v.literal("review"),
  ),
  lease: v.number(),
  leaseUntil: v.number(),
  attempts: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
};
const refundView = v.object({
  _id: v.id("cashfreeRefunds"),
  _creationTime: v.number(),
  ...refundFields,
});
export const prepare = internalMutation({
  args: {
    tradeId: v.id("trades"),
    reference: v.string(),
    reason: v.string(),
    key: v.string(),
  },
  returns: v.id("cashfreeRefunds"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const ref = reference(args.reference),
      reason = reference(args.reason);
    const previous = await ctx.db
      .query("cashfreeRefunds")
      .withIndex("by_trade_reference", (q) =>
        q.eq("tradeId", args.tradeId).eq("reference", ref),
      )
      .unique();
    if (previous) {
      if (previous.reason !== reason) throw new ConvexError("REFUND_CONFLICT");
      return previous._id;
    }
    const row = await financial(ctx, args.tradeId);
    const order = row?.orderId
      ? await ctx.db.get("cashfreeOrders", row.orderId)
      : null;
    const policy = order?.policyId
      ? await ctx.db.get("cashfreePolicies", order.policyId)
      : null;
    if (
      order?.mode !== "live" ||
      order.collection !== "live_confirmed" ||
      row?.collection !== "live_confirmed" ||
      row.refund !== "none" ||
      policy?.refundAuthority !== "platform_admin" ||
      cashfreeEnv()?.mode !== "live"
    )
      throw new ConvexError("REFUND_UNAVAILABLE");
    const existing = await ctx.db
      .query("cashfreeRefunds")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .take(101);
    if (existing.length > 0) throw new ConvexError("REFUND_ALREADY_REQUESTED");
    if (
      !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(args.key) ||
      !Number.isSafeInteger(order.totalPaise) ||
      order.totalPaise <= 0
    )
      throw new ConvexError("INVALID_REFUND");
    const id = await ctx.db.insert("cashfreeRefunds", {
      orderId: order._id,
      tradeId: args.tradeId,
      reference: ref,
      reason,
      amountPaise: order.totalPaise,
      providerRefundId: `rf_${args.key.replaceAll("-", "")}`,
      idempotencyKey: args.key,
      actorId: admin._id,
      status: "prepared",
      lease: 0,
      leaseUntil: 0,
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await setFinancial(ctx, args.tradeId, { refund: "pending" });
    await hold(ctx, args.tradeId, "refund_requested");
    await log(ctx, args.tradeId, "refund_requested", {
      refundId: id,
      amountPaise: order.totalPaise,
      actorId: admin._id,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.cashfreeLifecycleActions.runRefund,
      { refundId: id },
    );
    return id;
  },
});
export const claim = internalMutation({
  args: {
    refundId: v.id("cashfreeRefunds"),
    manual: v.optional(v.boolean()),
    triggerId: v.optional(v.id("cashfreeRefundTriggers")),
  },
  returns: v.union(
    v.object({
      refund: refundView,
      order: vCashfreeOrder,
      funder: v.union(v.literal("seller"), v.literal("platform")),
      canPost: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    if (args.manual) await requireAdmin(ctx);
    const trigger = args.triggerId
      ? await ctx.db.get("cashfreeRefundTriggers", args.triggerId)
      : null;
    const hasTrigger =
      trigger?.consumed === false && trigger.refundId === args.refundId;
    const refund = await ctx.db.get("cashfreeRefunds", args.refundId);
    if (refund && hasTrigger && refund.leaseUntil > Date.now()) {
      await ctx.scheduler.runAfter(
        refund.leaseUntil - Date.now() + 1000,
        internal.cashfreeLifecycleActions.runRefund,
        args,
      );
      return null;
    }
    if (
      !refund ||
      refund.status === "success" ||
      refund.status === "review" ||
      refund.leaseUntil > Date.now() ||
      (!hasTrigger && !args.manual && refund.attempts >= 4)
    )
      return null;
    const order = await ctx.db.get("cashfreeOrders", refund.orderId);
    const policy = order?.policyId
      ? await ctx.db.get("cashfreePolicies", order.policyId)
      : null;
    if (!order || !policy || cashfreeEnv()?.mode !== order.mode) return null;
    if (trigger && hasTrigger)
      await ctx.db.patch("cashfreeRefundTriggers", trigger._id, {
        consumed: true,
      });
    const change = {
      lease: refund.lease + 1,
      leaseUntil: Date.now() + 30_000,
      attempts: refund.attempts + 1,
      updatedAt: Date.now(),
    };
    await ctx.db.patch("cashfreeRefunds", refund._id, change);
    if (change.attempts <= 4)
      await ctx.scheduler.runAfter(
        35_000,
        internal.cashfreeLifecycleActions.runRefund,
        { refundId: refund._id },
      );
    await log(ctx, refund.tradeId, "refund_claimed", { refundId: refund._id });
    return {
      refund: { ...refund, ...change },
      order,
      funder: policy.refundFunder,
      canPost:
        cashfreeEnv()?.mode === "live" &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Retain the explicit frozen refund-authority check, independent of the new-checkout flag.
        policy.refundAuthority === "platform_admin",
    };
  },
});
export const finish = internalMutation({
  args: {
    refundId: v.id("cashfreeRefunds"),
    lease: v.number(),
    outcome: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("review"),
    ),
    providerRefundId: v.string(),
    providerIdentity: v.optional(v.string()),
    fingerprint: v.string(),
    amountPaise: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("cashfreeRefunds", args.refundId);
    if (row?.lease !== args.lease || row.status === "success") return false;
    const outcome =
      args.amountPaise !== row.amountPaise ||
      args.providerRefundId !== row.providerRefundId ||
      (row.providerIdentity !== undefined &&
        args.providerIdentity !== undefined &&
        row.providerIdentity !== args.providerIdentity)
        ? "review"
        : args.outcome;
    const prior = await ctx.db
      .query("cashfreeRefundEvidence")
      .withIndex("by_refund_fingerprint", (q) =>
        q.eq("refundId", row._id).eq("fingerprint", args.fingerprint),
      )
      .unique();
    if (!prior)
      await ctx.db.insert("cashfreeRefundEvidence", {
        refundId: row._id,
        fingerprint: args.fingerprint,
        status: outcome,
        providerRefundId: args.providerRefundId,
        amountPaise: args.amountPaise,
        createdAt: Date.now(),
      });
    await ctx.db.patch("cashfreeRefunds", row._id, {
      status: outcome,
      ...(args.providerIdentity &&
        !row.providerIdentity && { providerIdentity: args.providerIdentity }),
      leaseUntil: 0,
      updatedAt: Date.now(),
    });
    await setFinancial(ctx, row.tradeId, {
      refund: outcome === "success" ? "refunded" : outcome,
    });
    const reason = {
      success: "refund_confirmed_physical_resolution_required",
      review: "refund_requires_review",
      pending: "refund_pending",
    }[outcome];
    await hold(ctx, row.tradeId, reason);
    await log(ctx, row.tradeId, `refund_${outcome}`, {
      refundId: row._id,
      amountPaise: row.amountPaise,
    });
    return true;
  },
});
export const forOrder = internalQuery({
  args: { orderId: v.id("cashfreeOrders") },
  returns: v.array(v.id("cashfreeRefunds")),
  handler: async (ctx, { orderId }) => {
    const rows = await ctx.db
      .query("cashfreeRefunds")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .take(100);
    return rows.map((r) => r._id);
  },
});

export const notify = internalMutation({
  args: {
    mode: v.union(v.literal("sandbox"), v.literal("live")),
    providerOrderId: v.string(),
    providerRefundId: v.string(),
    bodyHash: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("cashfreeOrders")
      .withIndex("by_mode_order", (q) =>
        q.eq("mode", args.mode).eq("providerOrderId", args.providerOrderId),
      )
      .unique();
    if (!order) return false;
    if (order.mode !== "live") {
      await log(ctx, order.tradeId, "sandbox_refund_observed");
      return false;
    }
    const rows = await ctx.db
      .query("cashfreeRefunds")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .take(100);
    const refund = rows.find(
      (r) => r.providerRefundId === args.providerRefundId,
    );
    if (!refund) {
      await hold(ctx, order.tradeId, "external_refund_requires_review");
      return false;
    }
    const prior = await ctx.db
      .query("cashfreeRefundTriggers")
      .withIndex("by_hash", (q) => q.eq("bodyHash", args.bodyHash))
      .unique();
    if (prior) return false;
    const triggerId = await ctx.db.insert("cashfreeRefundTriggers", {
      orderId: order._id,
      refundId: refund._id,
      bodyHash: args.bodyHash,
      consumed: false,
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      Math.max(0, refund.leaseUntil - Date.now() + 1000),
      internal.cashfreeLifecycleActions.runRefund,
      { refundId: refund._id, triggerId },
    );
    await log(ctx, order.tradeId, "refund_lookup_triggered", {
      refundId: refund._id,
    });
    return true;
  },
});
