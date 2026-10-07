import { z } from "zod";

import { parsePaise } from "./cashfree";
const id = z.union([
  z.string().min(1).max(100),
  z.number().int().nonnegative().transform(String),
]);
const amount = z.union([z.string(), z.number()]).transform((value, ctx) => {
  try {
    return parsePaise(value);
  } catch {
    ctx.addIssue({ code: "custom", message: "Invalid exact amount" });
    return z.NEVER;
  }
});
export const refundResponse = z.object({
  order_id: z.string(),
  refund_id: z.string(),
  cf_refund_id: id,
  cf_payment_id: id,
  refund_amount: amount,
  refund_currency: z.literal("INR"),
  refund_status: z.enum([
    "SUCCESS",
    "PENDING",
    "PENDING_APPROVAL",
    "CANCELLED",
    "ONHOLD",
    "REJECTED",
  ]),
  refund_splits: z.array(z.object({ vendor: z.string(), amount })).max(10),
});
export const splitResponse = z.object({
  settlement: z.object({
    order_id: z.string(),
    cf_payment_id: id,
    order_amount: amount,
    order_currency: z.literal("INR"),
    service_charge: amount,
    service_tax: amount,
  }),
  vendors: z
    .array(
      z.object({
        vendor_id: z.string(),
        settlement_id: id.nullable(),
        settlement_amount: amount,
      }),
    )
    .max(10),
  refunds: z.array(z.unknown()).max(100),
});
export const settlementWebhook = z
  .object({
    type: z.enum([
      "VENDOR_SETTLEMENT_INITIATED",
      "VENDOR_SETTLEMENT_CREATED",
      "VENDOR_SETTLEMENT_SUCCESS",
      "VENDOR_SETTLEMENT_FAILED",
      "VENDOR_SETTLEMENT_REVERSED",
    ]),
    event_time: z.iso.datetime({ offset: true }),
    data: z.object({
      settlement: z.object({
        settlement_id: id,
        vendor_id: z.string().min(1).max(100),
        status: z.enum([
          "CREATED",
          "INITIATED",
          "SUCCESS",
          "FAILED",
          "REVERSED",
        ]),
        settlement_amount: amount,
        vendor_transaction_amount: amount,
        amount_settled: amount.nullable(),
        adjustment: amount,
        service_charge: amount,
        service_tax: amount,
      }),
    }),
  })
  .refine((x) => x.type === `VENDOR_SETTLEMENT_${x.data.settlement.status}`);

export const refundWebhook = z.object({
  type: z.string().regex(/^REFUND_[A-Z_]+_WEBHOOK$/),
  data: z.object({
    refund: z.object({
      order_id: z.string().min(1).max(100),
      refund_id: z.string().min(1).max(100),
    }),
  }),
});
