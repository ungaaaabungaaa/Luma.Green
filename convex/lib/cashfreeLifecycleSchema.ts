import { defineTable } from "convex/server";
import { v } from "convex/values";

export const vFinancialState = v.union(
  ...(
    [
      "awaiting_payment",
      "authorized",
      "dispatched",
      "received",
      "cancellation_pending",
      "cancelled",
      "hold",
    ] as const
  ).map((value) => v.literal(value)),
);
export const vFinancialCollection = v.union(
  ...(
    ["pending", "sandbox_confirmed", "live_confirmed", "review"] as const
  ).map((value) => v.literal(value)),
);
export const vSettlement = v.union(
  ...(["pending", "settled", "reversed", "review"] as const).map((value) =>
    v.literal(value),
  ),
);
export const vRefund = v.union(
  ...(["none", "pending", "refunded", "review"] as const).map((value) =>
    v.literal(value),
  ),
);
export const policyFields = {
  version: v.string(),
  feePayer: v.union(
    v.literal("buyer"),
    v.literal("seller"),
    v.literal("platform"),
  ),
  refundFunder: v.union(v.literal("seller"), v.literal("platform")),
  refundAuthority: v.literal("platform_admin"),
  settlementTermsReference: v.string(),
  providerAcceptanceReference: v.string(),
};
export const lifecycleTables = {
  cashfreePolicies: defineTable({
    ...policyFields,
    createdAt: v.number(),
    actorId: v.string(),
  }).index("by_version", ["version"]),
  tradeFinancials: defineTable({
    tradeId: v.id("trades"),
    orderId: v.optional(v.id("cashfreeOrders")),
    state: vFinancialState,
    collection: vFinancialCollection,
    settlement: vSettlement,
    refund: vRefund,
    holdReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_trade", ["tradeId"]),
  financialMovements: defineTable({
    tradeId: v.id("trades"),
    kind: v.union(v.literal("dispatch"), v.literal("receive")),
    orgId: v.id("orgs"),
    grams: v.number(),
    reference: v.string(),
    actorProfileId: v.id("profiles"),
    createdAt: v.number(),
  }).index("by_trade_kind", ["tradeId", "kind"]),
  cashfreeRefundTriggers: defineTable({
    orderId: v.id("cashfreeOrders"),
    refundId: v.id("cashfreeRefunds"),
    bodyHash: v.string(),
    consumed: v.boolean(),
    createdAt: v.number(),
  }).index("by_hash", ["bodyHash"]),
  cashfreeRefunds: defineTable({
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
  })
    .index("by_order", ["orderId"])
    .index("by_trade_reference", ["tradeId", "reference"]),
  cashfreeRefundEvidence: defineTable({
    refundId: v.id("cashfreeRefunds"),
    fingerprint: v.string(),
    status: v.string(),
    providerRefundId: v.string(),
    amountPaise: v.number(),
    createdAt: v.number(),
  }).index("by_refund_fingerprint", ["refundId", "fingerprint"]),
  cashfreeSettlementEvents: defineTable({
    mode: v.union(v.literal("sandbox"), v.literal("live")),
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
    createdAt: v.number(),
  })
    .index("by_mode_vendor_settlement", ["mode", "vendorId", "settlementId"])
    .index("by_hash", ["bodyHash"]),
  cashfreeSettlementEvidence: defineTable({
    orderId: v.id("cashfreeOrders"),
    settlementId: v.string(),
    vendorId: v.string(),
    allocationPaise: v.number(),
    feePaise: v.number(),
    status: vSettlement,
    fingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_order_fingerprint", ["orderId", "fingerprint"]),
};
