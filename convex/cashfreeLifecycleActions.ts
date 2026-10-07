import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { cashfreeEnv } from "../src/lib/env";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import type { CashfreeConfig } from "./lib/cashfree";
import { bodyHash, cashfreeRequest, decimalPaise } from "./lib/cashfree";
import { refundResponse, splitResponse } from "./lib/cashfreeLifecycleProvider";

type Refund = Doc<"cashfreeRefunds">;
type Order = Doc<"cashfreeOrders">;
type RefundProvider = z.infer<typeof refundResponse>;
async function getRefund(
  config: CashfreeConfig,
  refund: Refund,
  order: Order,
  funder: "seller" | "platform",
  canPost: boolean,
) {
  const path = `/orders/${encodeURIComponent(order.providerOrderId)}/refunds`;
  const all = z
    .array(refundResponse)
    .max(100)
    .parse(await cashfreeRequest(config, path));
  if (all.some((r) => r.refund_id !== refund.providerRefundId))
    throw new ConvexError("EXTERNAL_REFUND_REVIEW");
  const existing = all.find((r) => r.refund_id === refund.providerRefundId);
  if (existing) return existing;
  if (!canPost) throw new ConvexError("GATEWAY_REQUIRED");
  const split =
    funder === "seller"
      ? `[{"vendor":${JSON.stringify(order.vendorId)},"amount":${decimalPaise(refund.amountPaise)}}]`
      : "[]";
  const body = `{"refund_id":${JSON.stringify(refund.providerRefundId)},"refund_amount":${decimalPaise(refund.amountPaise)},"refund_note":"Approved full refund","refund_speed":"STANDARD","refund_splits":${split}}`;
  const raw = await cashfreeRequest(config, path, {
    body,
    idempotencyKey: refund.idempotencyKey,
  });
  return z
    .union([
      refundResponse,
      z
        .array(refundResponse)
        .length(1)
        .transform((rows) => rows[0]),
    ])
    .parse(raw);
}
function refundOutcome(
  provider: RefundProvider,
  refund: Refund,
  order: Order,
  funder: "seller" | "platform",
): "pending" | "success" | "review" {
  const split = provider.refund_splits.at(0);
  const hasMatchingSplit =
    funder === "seller"
      ? provider.refund_splits.length === 1 &&
        split?.vendor === order.vendorId &&
        split.amount === refund.amountPaise
      : provider.refund_splits.length === 0;
  if (
    !hasMatchingSplit ||
    provider.order_id !== order.providerOrderId ||
    provider.cf_payment_id !== order.successPaymentId ||
    provider.refund_id !== refund.providerRefundId ||
    provider.refund_amount !== refund.amountPaise
  )
    return "review";
  if (provider.refund_status === "SUCCESS") return "success";
  return ["PENDING", "PENDING_APPROVAL", "ONHOLD"].includes(
    provider.refund_status,
  )
    ? "pending"
    : "review";
}
export const runRefund = internalAction({
  args: {
    refundId: v.id("cashfreeRefunds"),
    manual: v.optional(v.boolean()),
    triggerId: v.optional(v.id("cashfreeRefundTriggers")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(internal.cashfreeRefunds.claim, args);
    const config = cashfreeEnv();
    if (!claimed || config?.mode !== claimed.order.mode) return false;
    const { refund, order, funder, canPost } = claimed;
    let outcome: "pending" | "success" | "review" = "pending",
      fingerprint = "unavailable",
      amountPaise = refund.amountPaise,
      providerRefundId = refund.providerRefundId;
    let providerIdentity: string | undefined;
    try {
      const provider = await getRefund(config, refund, order, funder, canPost);
      amountPaise = provider.refund_amount;
      providerRefundId = provider.refund_id;
      providerIdentity = provider.cf_refund_id;
      fingerprint = await bodyHash(
        new TextEncoder().encode(JSON.stringify(provider)),
      );
      outcome = refundOutcome(provider, refund, order, funder);
    } catch (error) {
      if (error instanceof ConvexError || error instanceof z.ZodError)
        outcome = "review";
    }
    await ctx.runMutation(internal.cashfreeRefunds.finish, {
      refundId: refund._id,
      lease: refund.lease,
      outcome,
      fingerprint,
      amountPaise,
      providerRefundId,
      providerIdentity,
    });
    return true;
  },
});
export const requestRefundForAdmin = action({
  args: { tradeId: v.id("trades"), reference: v.string(), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const refundId = await ctx.runMutation(internal.cashfreeRefunds.prepare, {
      ...args,
      key: crypto.randomUUID(),
    });
    await ctx.runAction(internal.cashfreeLifecycleActions.runRefund, {
      refundId,
      manual: true,
    });
    return null;
  },
});
export const reconcileSettlement = internalAction({
  args: { orderId: v.id("cashfreeOrders") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(internal.cashfreeSettlements.order, args);
    const config = cashfreeEnv();
    if (
      order?.mode !== "live" ||
      config?.mode !== order.mode ||
      !order.successPaymentId
    )
      return false;
    try {
      const parsed = splitResponse.parse(
        await cashfreeRequest(
          config,
          `/easy-split/orders/${encodeURIComponent(order.providerOrderId)}`,
        ),
      );
      const vendor = parsed.vendors.at(0);
      const fees =
        parsed.settlement.service_charge + parsed.settlement.service_tax;
      const isMatches =
        parsed.settlement.order_id === order.providerOrderId &&
        parsed.settlement.cf_payment_id === order.successPaymentId &&
        parsed.settlement.order_amount === order.totalPaise &&
        parsed.vendors.length === 1 &&
        vendor?.vendor_id === order.vendorId &&
        parsed.refunds.length === 0 &&
        Number.isSafeInteger(fees);
      await ctx.runMutation(internal.cashfreeSettlements.record, {
        orderId: order._id,
        vendorId: vendor?.vendor_id ?? order.vendorId,
        settlementId: vendor?.settlement_id ?? "pending",
        allocationPaise: vendor?.settlement_amount ?? 0,
        feePaise: fees,
        matches: isMatches,
        fingerprint: await bodyHash(
          new TextEncoder().encode(JSON.stringify(parsed)),
        ),
      });
    } catch {
      await ctx.runMutation(internal.cashfreeLifecycle.lookupUnavailable, {
        tradeId: order.tradeId,
        kind: "settlement",
      });
    }
    return true;
  },
});
export const reconcileForAdmin = action({
  args: { tradeId: v.id("trades") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const orderId = await ctx.runQuery(
      internal.cashfreeLifecycle.orderForAdmin,
      args,
    );
    if (orderId) {
      await ctx.runAction(internal.cashfreeActions.reconcile, { orderId });
      const refunds = await ctx.runQuery(internal.cashfreeRefunds.forOrder, {
        orderId,
      });
      for (const refundId of refunds)
        await ctx.runAction(internal.cashfreeLifecycleActions.runRefund, {
          refundId,
          manual: true,
        });
      await ctx.runAction(
        internal.cashfreeLifecycleActions.reconcileSettlement,
        {
          orderId,
        },
      );
    }
    return null;
  },
});
