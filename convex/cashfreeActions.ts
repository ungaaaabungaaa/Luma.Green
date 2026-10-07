import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { cashfreeEnv } from "../src/lib/env";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, type ActionCtx, internalAction } from "./_generated/server";
import {
  type CashfreeConfig,
  CashfreeFailure,
  cashfreeRequest,
  createOrderBody,
  isFullyCaptured,
  isOrderMatch,
  orderResponse,
  paymentLookupResponse,
  type ProviderOrder,
  vendorResponse,
} from "./lib/cashfree";
import { vCashfreeMode, vCheckout, vCollection } from "./lib/cashfreeSchema";

export const verifyVendor = internalAction({
  args: { vendorId: v.string() },
  returns: v.null(),
  handler: async (ctx, { vendorId }) => {
    const config = cashfreeEnv();
    if (!config || !/^\w{1,100}$/.test(vendorId))
      throw new ConvexError("GATEWAY_REQUIRED");
    const response = vendorResponse.safeParse(
      await cashfreeRequest(
        config,
        `/easy-split/vendors/${encodeURIComponent(vendorId)}`,
      ),
    );
    if (!response.success || response.data.vendor_id !== vendorId)
      throw new ConvexError("PAYMENT_VENDOR_UNVERIFIED");
    await ctx.runMutation(internal.cashfreePayments.recordVendor, {
      mode: config.mode,
      vendorId,
      status: response.data.status,
    });
    return null;
  },
});

/** The administrator may request a provider read, but cannot assert ACTIVE. */
export const verifyVendorForAdmin = action({
  args: { orgId: v.id("orgs"), mode: vCashfreeMode },
  returns: v.null(),
  handler: async (ctx, args) => {
    const vendorId = await ctx.runQuery(
      internal.cashfreePayments.vendorForAdmin,
      args,
    );
    const config = cashfreeEnv();
    if (config?.mode !== args.mode) throw new ConvexError("GATEWAY_REQUIRED");
    await ctx.runAction(internal.cashfreeActions.verifyVendor, { vendorId });
    return null;
  },
});

async function didRefreshActiveVendor(
  ctx: ActionCtx,
  config: CashfreeConfig,
  vendorId: string,
): Promise<boolean> {
  const response = vendorResponse.safeParse(
    await cashfreeRequest(
      config,
      `/easy-split/vendors/${encodeURIComponent(vendorId)}`,
    ),
  );
  const hasMatchingVendor =
    response.success && response.data.vendor_id === vendorId;
  const status = hasMatchingVendor ? response.data.status : "UNVERIFIED";
  await ctx.runMutation(internal.cashfreePayments.recordVendor, {
    mode: config.mode,
    vendorId,
    status,
  });
  return status === "ACTIVE";
}

function canOpenCheckout(
  order: Doc<"cashfreeOrders">,
  provider: ProviderOrder,
  hasActiveVendor: boolean,
): boolean {
  return (
    hasActiveVendor &&
    provider.order_status === "ACTIVE" &&
    Date.now() < order.expiresAt
  );
}

async function capturedPaymentId(
  config: CashfreeConfig,
  order: Doc<"cashfreeOrders">,
): Promise<string | null> {
  const payments = z
    .array(paymentLookupResponse)
    .max(100)
    .parse(
      await cashfreeRequest(
        config,
        `/orders/${encodeURIComponent(order.providerOrderId)}/payments`,
      ),
    );
  const successes = payments.filter(
    (payment) => payment.payment_status === "SUCCESS",
  );
  const payment = successes.at(0);
  return successes.length !== 1 ||
    payment?.order_id !== order.providerOrderId ||
    payment.payment_currency !== "INR" ||
    !isFullyCaptured(payment, order.totalPaise)
    ? null
    : payment.cf_payment_id;
}
async function lookupOrCreate(
  ctx: ActionCtx,
  config: CashfreeConfig,
  order: Doc<"cashfreeOrders">,
  canCreate: boolean,
): Promise<{ raw: unknown; hasActiveVendor: boolean }> {
  try {
    return {
      raw: await cashfreeRequest(
        config,
        `/orders/${encodeURIComponent(order.providerOrderId)}`,
      ),
      hasActiveVendor: false,
    };
  } catch (error) {
    if (
      !canCreate ||
      !(error instanceof CashfreeFailure) ||
      error.kind !== "not_found" ||
      !config.checkoutEnabled ||
      Date.now() >= order.expiresAt ||
      !(await ctx.runQuery(internal.cashfreePayments.scope, {
        orderId: order._id,
      }))
    )
      throw error;
    const hasActiveVendor = await didRefreshActiveVendor(
      ctx,
      config,
      order.vendorId,
    );
    if (!hasActiveVendor) return { raw: null, hasActiveVendor };
    return {
      raw: await cashfreeRequest(config, "/orders", {
        body: createOrderBody(order),
        idempotencyKey: order.idempotencyKey,
      }),
      hasActiveVendor,
    };
  }
}
async function synchronize(
  ctx: ActionCtx,
  orderId: Id<"cashfreeOrders">,
  canCreate: boolean,
) {
  const config = cashfreeEnv();
  if (!config) return;
  const order = await ctx.runMutation(internal.cashfreePayments.claim, {
    orderId,
  });
  if (config.mode !== order?.mode) return;
  const finish = (args: {
    outcome: "ready" | "paid" | "closed" | "uncertain" | "mismatch";
    sessionId?: string;
    cfOrderId?: string;
    paymentId?: string;
    unpaidTerminal?: boolean;
  }) =>
    ctx.runMutation(internal.cashfreePayments.finish, {
      orderId,
      lease: order.lease,
      ...args,
    });
  try {
    const result = await lookupOrCreate(ctx, config, order, canCreate);
    if (result.raw === null) {
      await finish({ outcome: "closed" });
      return;
    }
    let hasActiveVendor = result.hasActiveVendor;
    const raw = result.raw;
    const parsed = orderResponse.safeParse(raw);
    if (!parsed.success || !isOrderMatch(order, parsed.data)) {
      await finish({ outcome: "mismatch" });
      return;
    }
    const provider = parsed.data;
    if (provider.order_status === "PAID") {
      const paymentId = await capturedPaymentId(config, order);
      if (!paymentId) {
        await finish({ outcome: "mismatch" });
        return;
      }
      await finish({
        outcome: "paid",
        cfOrderId: provider.cf_order_id,
        paymentId,
      });
      return;
    }
    if (
      provider.order_status === "EXPIRED" ||
      provider.order_status === "TERMINATED"
    ) {
      const attempts = z
        .array(paymentLookupResponse)
        .max(100)
        .parse(
          await cashfreeRequest(
            config,
            `/orders/${encodeURIComponent(order.providerOrderId)}/payments`,
          ),
        );
      if (
        attempts.some(
          (p) =>
            p.payment_status === "SUCCESS" ||
            p.payment_status === "PENDING" ||
            p.order_id !== order.providerOrderId,
        )
      ) {
        await finish({ outcome: "mismatch" });
        return;
      }
      await finish({
        outcome: "closed",
        cfOrderId: provider.cf_order_id,
        unpaidTerminal: true,
      });
      return;
    }
    // Collection reconciliation above remains available after a vendor is blocked.
    if (!hasActiveVendor && provider.order_status === "ACTIVE") {
      hasActiveVendor = await didRefreshActiveVendor(
        ctx,
        config,
        order.vendorId,
      );
    }
    await finish({
      outcome: canOpenCheckout(order, provider, hasActiveVendor)
        ? "ready"
        : "closed",
      sessionId: provider.payment_session_id,
      cfOrderId: provider.cf_order_id,
    });
  } catch {
    await finish({ outcome: "uncertain" });
  }
}

export const reconcile = internalAction({
  args: { orderId: v.id("cashfreeOrders"), recoveryAt: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { orderId, recoveryAt }) => {
    const canRecover =
      recoveryAt === undefined ||
      (await ctx.runMutation(internal.cashfreePayments.beginRecovery, {
        orderId,
        recoveryAt,
      }));
    if (canRecover) {
      await synchronize(ctx, orderId, false);
      await ctx.runMutation(internal.cashfreePayments.requestRecovery, {
        orderId,
      });
    }
    return null;
  },
});

export const checkout = action({
  args: { tradeId: v.id("trades"), mode: v.optional(vCashfreeMode) },
  returns: v.object({
    status: v.object({
      mode: vCashfreeMode,
      checkout: vCheckout,
      collection: vCollection,
      settlement: v.literal("blocked"),
      refund: v.literal("blocked"),
      totalPaise: v.number(),
      currency: v.literal("INR"),
    }),
    paymentSessionId: v.union(v.string(), v.null()),
  }),
  handler: async (
    ctx,
    { tradeId, mode },
  ): Promise<{
    status: Pick<
      Doc<"cashfreeOrders">,
      | "mode"
      | "checkout"
      | "collection"
      | "settlement"
      | "refund"
      | "totalPaise"
      | "currency"
    >;
    paymentSessionId: string | null;
  }> => {
    const orderId = await ctx.runMutation(internal.cashfreePayments.prepare, {
      tradeId,
      mode,
      idempotencyKey: crypto.randomUUID(),
    });
    await synchronize(ctx, orderId, true);
    return ctx.runQuery(internal.cashfreePayments.checkoutResult, { orderId });
  },
});
