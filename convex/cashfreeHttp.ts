import { cashfreeEnv } from "../src/lib/env";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  bodyHash,
  boundedBody,
  isSignatureValid,
  webhookResponse,
} from "./lib/cashfree";
import {
  refundWebhook,
  settlementWebhook,
} from "./lib/cashfreeLifecycleProvider";

export const serve = httpAction(async (ctx, request) => {
  const config = cashfreeEnv();
  if (
    !config ||
    new URL(request.url).pathname !== `/payments/cashfree/${config.mode}`
  )
    return new Response(null, { status: 503 });
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await boundedBody(request);
  } catch {
    return new Response(null, { status: 413 });
  }
  const timestamp = request.headers.get("x-webhook-timestamp");
  if (
    !(await isSignatureValid(
      bytes,
      timestamp,
      request.headers.get("x-webhook-signature"),
      config.clientSecret,
    ))
  )
    return new Response(null, { status: 401 });
  const hash = await bodyHash(bytes);
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    await ctx.runMutation(internal.cashfreePayments.recordMalformed, {
      mode: config.mode,
      bodyHash: hash,
    });
    return new Response(null, { status: 200 });
  }
  const refund = refundWebhook.safeParse(input);
  if (refund.success) {
    await ctx.runMutation(internal.cashfreeRefunds.notify, {
      mode: config.mode,
      providerOrderId: refund.data.data.refund.order_id,
      providerRefundId: refund.data.data.refund.refund_id,
      bodyHash: hash,
    });
    return new Response(null, { status: 200 });
  }
  const settlement = settlementWebhook.safeParse(input);
  if (settlement.success) {
    const row = settlement.data.data.settlement;
    await ctx.runMutation(internal.cashfreeSettlements.observe, {
      mode: config.mode,
      vendorId: row.vendor_id,
      settlementId: row.settlement_id,
      status: row.status === "CREATED" ? "INITIATED" : row.status,
      amountPaise: row.amount_settled ?? 0,
      settlementPaise: row.settlement_amount,
      grossPaise: row.vendor_transaction_amount,
      feePaise: row.service_charge + row.service_tax,
      adjustmentPaise: row.adjustment,
      eventAt: Date.parse(settlement.data.event_time),
      bodyHash: hash,
    });
    return new Response(null, { status: 200 });
  }
  const parsed = webhookResponse.safeParse(input);
  if (!parsed.success) {
    await ctx.runMutation(internal.cashfreePayments.recordMalformed, {
      mode: config.mode,
      bodyHash: hash,
    });
    return new Response(null, { status: 200 });
  }
  const { order, payment, customer_details: customer } = parsed.data.data;
  await ctx.runMutation(internal.cashfreePayments.observe, {
    mode: config.mode,
    providerOrderId: order.order_id,
    providerPaymentId: payment.cf_payment_id,
    status: payment.payment_status,
    orderPaise: order.order_amount,
    paymentPaise: payment.payment_amount,
    currency: payment.payment_currency,
    orderCurrency: order.order_currency,
    customerId: customer.customer_id,
    timestamp: Number(timestamp),
    bodyHash: hash,
  });
  return new Response(null, { status: 200 });
});
