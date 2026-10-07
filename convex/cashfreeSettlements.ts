import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { financial, hold, log, setFinancial } from "./lib/cashfreeLifecycle";
import { vCashfreeMode, vCashfreeOrder } from "./lib/cashfreeSchema";
const eventArgs = {
  mode: vCashfreeMode,
  vendorId: v.string(),
  settlementId: v.string(),
  status: v.union(
    v.literal("INITIATED"),
    v.literal("SUCCESS"),
    v.literal("FAILED"),
    v.literal("REVERSED"),
  ),
  amountPaise: v.number(),
  settlementPaise: v.number(),
  grossPaise: v.number(),
  feePaise: v.number(),
  adjustmentPaise: v.number(),
  eventAt: v.number(),
  bodyHash: v.string(),
};
export const observe = internalMutation({
  args: eventArgs,
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (
      !Number.isSafeInteger(args.amountPaise) ||
      args.amountPaise < 0 ||
      !Number.isFinite(args.eventAt)
    )
      return false;
    const prior = await ctx.db
      .query("cashfreeSettlementEvents")
      .withIndex("by_hash", (q) => q.eq("bodyHash", args.bodyHash))
      .unique();
    if (prior) return false;
    const id = await ctx.db.insert("cashfreeSettlementEvents", {
      ...args,
      createdAt: Date.now(),
    });
    await ctx.db.insert("auditLog", {
      entityTable: "cashfreeSettlementEvents",
      entityId: id,
      action: "payment.settlement.observed",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.cashfreeSettlements.queueVendor, {
      mode: args.mode,
      vendorId: args.vendorId,
      cursor: null,
    });
    return true;
  },
});
export const queueVendor = internalMutation({
  args: {
    mode: vCashfreeMode,
    vendorId: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("cashfreeOrders")
      .withIndex("by_mode_vendor", (q) =>
        q.eq("mode", args.mode).eq("vendorId", args.vendorId),
      )
      .paginate({ numItems: 50, cursor: args.cursor });
    for (const row of page.page)
      await ctx.scheduler.runAfter(
        0,
        internal.cashfreeLifecycleActions.reconcileSettlement,
        { orderId: row._id },
      );
    if (!page.isDone)
      await ctx.scheduler.runAfter(
        1000,
        internal.cashfreeSettlements.queueVendor,
        { ...args, cursor: page.continueCursor },
      );
    return null;
  },
});
export const order = internalQuery({
  args: { orderId: v.id("cashfreeOrders") },
  returns: v.union(vCashfreeOrder, v.null()),
  handler: async (ctx, { orderId }) => ctx.db.get("cashfreeOrders", orderId),
});
export const record = internalMutation({
  args: {
    orderId: v.id("cashfreeOrders"),
    settlementId: v.string(),
    vendorId: v.string(),
    allocationPaise: v.number(),
    feePaise: v.number(),
    fingerprint: v.string(),
    matches: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("cashfreeOrders", args.orderId);
    if (order?.mode !== "live") return false;
    const row = await financial(ctx, order.tradeId);
    if (row?.orderId !== order._id) return false;
    const events = await ctx.db
      .query("cashfreeSettlementEvents")
      .withIndex("by_mode_vendor_settlement", (q) =>
        q
          .eq("mode", order.mode)
          .eq("vendorId", args.vendorId)
          .eq("settlementId", args.settlementId),
      )
      .take(101);
    const policy = order.policyId
      ? await ctx.db.get("cashfreePolicies", order.policyId)
      : null;
    const expectedAllocation =
      policy?.feePayer === "seller"
        ? order.totalPaise - args.feePaise
        : order.totalPaise;
    const isMatching =
      args.matches &&
      args.vendorId === order.vendorId &&
      Number.isSafeInteger(args.allocationPaise) &&
      args.allocationPaise === expectedAllocation &&
      Number.isSafeInteger(args.feePaise) &&
      args.feePaise >= 0 &&
      events.length <= 100;
    // A reversal is sticky. An aggregate event is insufficient without the exact order/vendor allocation.
    let status: "pending" | "settled" | "reversed" | "review" = "pending";
    if (!isMatching) status = "review";
    else if (events.some((e) => e.status === "REVERSED")) status = "reversed";
    else if (events.some((e) => e.status === "FAILED")) status = "review";
    else if (
      events.some(
        (e) =>
          e.status === "SUCCESS" &&
          e.grossPaise >= order.totalPaise &&
          e.adjustmentPaise === 0 &&
          e.amountPaise === e.settlementPaise &&
          e.settlementPaise === e.grossPaise - e.feePaise &&
          (e.feePaise === 0 || policy?.feePayer === "seller"),
      )
    )
      status = "settled";
    else if (events.some((e) => e.status === "SUCCESS")) status = "review";
    if (row.settlement === "reversed") status = "reversed";
    if (status !== "reversed" && row.settlement === "review") status = "review";
    const fingerprint = `${args.fingerprint}:${status}`;
    const prior = await ctx.db
      .query("cashfreeSettlementEvidence")
      .withIndex("by_order_fingerprint", (q) =>
        q.eq("orderId", order._id).eq("fingerprint", fingerprint),
      )
      .unique();
    if (prior) return false;
    await ctx.db.insert("cashfreeSettlementEvidence", {
      orderId: order._id,
      settlementId: args.settlementId,
      vendorId: args.vendorId,
      allocationPaise: args.allocationPaise,
      feePaise: args.feePaise,
      status,
      fingerprint,
      createdAt: Date.now(),
    });
    await setFinancial(ctx, order.tradeId, { settlement: status });
    if (status === "reversed" || status === "review")
      await hold(ctx, order.tradeId, "settlement_requires_review");
    await log(ctx, order.tradeId, `settlement_${status}`, {
      orderId: order._id,
      settlementId: args.settlementId,
    });
    return true;
  },
});
