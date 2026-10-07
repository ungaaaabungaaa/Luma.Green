import { defineTable } from "convex/server";
import { v } from "convex/values";

export const vCashfreeMode = v.union(v.literal("sandbox"), v.literal("live"));
export const vCollection = v.union(
  v.literal("pending"),
  v.literal("success_observed"),
  v.literal("sandbox_confirmed"),
  v.literal("live_confirmed"),
  v.literal("reconciliation_required"),
);
export const vCheckout = v.union(
  v.literal("prepared"),
  v.literal("creating"),
  v.literal("ready"),
  v.literal("uncertain"),
  v.literal("closed"),
);
export const vAttempt = v.union(
  v.literal("SUCCESS"),
  v.literal("FAILED"),
  v.literal("PENDING"),
  v.literal("NOT_ATTEMPTED"),
  v.literal("USER_DROPPED"),
  v.literal("CANCELLED"),
  v.literal("VOID"),
);
export const cashfreeOrderFields = {
  mode: vCashfreeMode,
  policyId: v.optional(v.id("cashfreePolicies")),
  tradeId: v.id("trades"),
  buyerOrgId: v.id("orgs"),
  sellerOrgId: v.id("orgs"),
  totalPaise: v.number(),
  currency: v.literal("INR"),
  customerId: v.string(),
  customerPhone: v.string(),
  vendorId: v.string(),
  providerOrderId: v.string(),
  idempotencyKey: v.string(),
  expiresAt: v.number(),
  checkout: vCheckout,
  collection: vCollection,
  settlement: v.literal("blocked"),
  refund: v.literal("blocked"),
  lease: v.number(),
  leaseUntil: v.number(),
  attempts: v.number(),
  recoveryAttempts: v.optional(v.number()),
  recoveryAt: v.optional(v.number()),
  sessionId: v.optional(v.string()),
  cfOrderId: v.optional(v.string()),
  successPaymentId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
};
export const vCashfreeOrder = v.object({
  _id: v.id("cashfreeOrders"),
  _creationTime: v.number(),
  ...cashfreeOrderFields,
});
export const cashfreeTables = {
  cashfreeVendors: defineTable({
    mode: vCashfreeMode,
    orgId: v.id("orgs"),
    vendorId: v.string(),
    providerStatus: v.string(),
    checkedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_mode", ["orgId", "mode"])
    .index("by_mode_vendor", ["mode", "vendorId"]),
  cashfreeOrders: defineTable(cashfreeOrderFields)
    .index("by_trade_mode", ["tradeId", "mode"])
    .index("by_mode_order", ["mode", "providerOrderId"])
    .index("by_mode_vendor", ["mode", "vendorId"]),
  cashfreeAttempts: defineTable({
    mode: vCashfreeMode,
    providerPaymentId: v.string(),
    providerOrderId: v.string(),
    orderId: v.optional(v.id("cashfreeOrders")),
    status: vAttempt,
    paymentPaise: v.number(),
    currency: v.string(),
    bodyHash: v.optional(v.string()),
    source: v.union(v.literal("webhook"), v.literal("provider_lookup")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mode_payment", ["mode", "providerPaymentId"])
    .index("by_order", ["orderId"]),
  cashfreeIssues: defineTable({
    key: v.string(),
    mode: vCashfreeMode,
    reason: v.string(),
    providerOrderId: v.optional(v.string()),
    providerPaymentId: v.optional(v.string()),
    bodyHash: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_key", ["key"]),
};
