/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signIn,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";
const modules = convexModules(import.meta.glob("./**/*.*s"));
const key = "00000000-0000-4000-8000-000000000001";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function world() {
  vi.useFakeTimers();
  vi.stubEnv("AUTH_DEV_MODE", "true");
  vi.stubEnv("CASHFREE_MODE", "live");
  vi.stubEnv("CASHFREE_LIVE_CLIENT_ID", "test-id");
  vi.stubEnv("CASHFREE_LIVE_CLIENT_SECRET", "test-secret");
  vi.stubEnv("CASHFREE_LIVE_CHECKOUT_ENABLED", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  vi.stubEnv("ADMIN_EMAIL", "admin@example.test");
  vi.stubEnv("CASHFREE_LIVE_POLICY_VERSION", "test-v1");
  const admin = await signIn(t, {
    email: "admin@example.test",
    twoFactorEnabled: true,
  });
  await admin.mutation(api.cashfreeLifecycle.savePolicyForAdmin, {
    version: "test-v1",
    feePayer: "platform",
    refundFunder: "seller",
    refundAuthority: "platform_admin",
    settlementTermsReference: "Approved test settlement terms",
    providerAcceptanceReference: "Injected test approval only",
  });
  const buyer = await signInAs(t, "+919000000102");
  const seller = await signInAs(t, "+919000000101");
  const outsider = await signInAs(t, "+919000000103");
  const scope = await t.run(async (ctx) => {
    const buyerOrg = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "peenya-yard"))
      .unique();
    const listing = await ctx.db.query("listings").first();
    const sellerOrg = await ctx.db
      .query("orgs")
      .withIndex("by_kind_city", (q) => q.eq("kind", "kabadiwala"))
      .first();
    // Pick by actual memberships to avoid assumptions about demonstration slugs.
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", "+919000000102"))
      .unique();
    const membership = profile
      ? await ctx.db
          .query("memberships")
          .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
          .first()
      : null;
    const buyerId = buyerOrg?._id ?? membership?.orgId;
    if (!buyerId || !listing || !sellerOrg)
      throw new Error("missing test world");
    const tradeId = await ctx.db.insert("trades", {
      listingId: listing._id,
      buyerOrgId: buyerId,
      sellerOrgId: sellerOrg._id,
      materialCode: listing.materialCode,
      grams: 1000,
      paisePerKg: 17_001,
      totalPaise: 17_001,
      status: "accepted",
      timeline: [{ status: "accepted", at: Date.now() }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { tradeId, sellerOrgId: sellerOrg._id };
  });
  await t.mutation(internal.cashfreePayments.registerVendor, {
    orgId: scope.sellerOrgId,
    mode: "live",
    vendorId: "test_seller",
  });
  await t.mutation(internal.cashfreePayments.recordVendor, {
    mode: "live",
    vendorId: "test_seller",
    status: "ACTIVE",
  });
  return { t, buyer, seller, outsider, admin, ...scope };
}
async function prepare(w: Awaited<ReturnType<typeof world>>) {
  const id = await w.buyer.mutation(internal.cashfreePayments.prepare, {
    tradeId: w.tradeId,
    idempotencyKey: key,
    mode: "live",
  });
  const order = await w.t.run((ctx) => ctx.db.get("cashfreeOrders", id));
  if (!order) throw new Error("missing order");
  return order;
}
async function collect(w: Awaited<ReturnType<typeof world>>) {
  const order = await prepare(w);
  const claimed = await w.t.mutation(internal.cashfreePayments.claim, {
    orderId: order._id,
  });
  if (!claimed) throw new Error("Missing claim");
  await w.t.mutation(internal.cashfreePayments.finish, {
    orderId: order._id,
    lease: claimed.lease,
    outcome: "paid",
    cfOrderId: "123",
    paymentId: "456",
  });
  return order;
}
it("looks up the persisted refund identity after an uncertain POST and never posts twice", async () => {
  const w = await world();
  const order = await collect(w);
  const refundId = await w.admin.mutation(internal.cashfreeRefunds.prepare, {
    tradeId: w.tradeId,
    reference: "REF-LOOKUP",
    reason: "Approved full refund",
    key,
  });
  const row = await w.t.run((ctx) => ctx.db.get("cashfreeRefunds", refundId));
  if (!row) throw new Error("refund");
  let isPosted = false;
  const ids: string[] = [];
  const payload = {
    order_id: order.providerOrderId,
    refund_id: row.providerRefundId,
    cf_refund_id: "999",
    cf_payment_id: "456",
    refund_amount: 170.01,
    refund_currency: "INR",
    refund_status: "SUCCESS",
    refund_splits: [{ vendor: "test_seller", amount: 170.01 }],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        isPosted = true;
        ids.push(String(new Headers(init.headers).get("x-idempotency-key")));
        return Promise.reject(
          new Error("Network interrupted after provider accepted"),
        );
      }
      return Promise.resolve(
        Response.json(isPosted ? [payload] : [], { status: 200 }),
      );
    }),
  );
  await w.admin.action(internal.cashfreeLifecycleActions.runRefund, {
    refundId,
    manual: true,
  });
  expect(
    await w.buyer.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
  ).toMatchObject({ refund: "pending", state: "hold" });
  await w.admin.action(internal.cashfreeLifecycleActions.runRefund, {
    refundId,
    manual: true,
  });
  expect(ids).toEqual([key]);
  expect(
    await w.buyer.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
  ).toMatchObject({
    refund: "refunded",
    collection: "live_confirmed",
    state: "hold",
  });
});
it("uses the approved funder and rejects a different returned seller split", async () => {
  const w = await world();
  const order = await collect(w);
  const refundId = await w.admin.mutation(internal.cashfreeRefunds.prepare, {
    tradeId: w.tradeId,
    reference: "REF-SPLIT",
    reason: "Approved refund",
    key,
  });
  const row = await w.t.run((ctx) => ctx.db.get("cashfreeRefunds", refundId));
  if (!row) throw new Error("refund");
  const bodies: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method !== "POST")
        return Promise.resolve(new Response("[]", { status: 200 }));
      if (typeof init.body !== "string")
        throw new Error("Expected exact JSON body");
      bodies.push(init.body);
      return Promise.resolve(
        Response.json(
          {
            order_id: order.providerOrderId,
            refund_id: row.providerRefundId,
            cf_refund_id: "999",
            cf_payment_id: "456",
            refund_amount: 170.01,
            refund_currency: "INR",
            refund_status: "SUCCESS",
            refund_splits: [{ vendor: "other", amount: 170.01 }],
          },
          { status: 200 },
        ),
      );
    }),
  );
  await w.admin.action(internal.cashfreeLifecycleActions.runRefund, {
    refundId,
    manual: true,
  });
  expect(bodies[0]).toContain(
    '"refund_splits":[{"vendor":"test_seller","amount":170.01}]',
  );
  expect(
    await w.buyer.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
  ).toMatchObject({ refund: "review", state: "hold" });
});
it("does not retry a mismatched or externally refunded order with a new refund", async () => {
  const w = await world();
  const order = await collect(w);
  const refundId = await w.admin.mutation(internal.cashfreeRefunds.prepare, {
    tradeId: w.tradeId,
    reference: "REF-EXTERNAL",
    reason: "Approved refund",
    key,
  });
  const mock = vi.fn((_url: string, init?: RequestInit) => {
    expect(init?.method).toBe("GET");
    return Promise.resolve(
      Response.json(
        [
          {
            order_id: order.providerOrderId,
            refund_id: "external-refund",
            cf_refund_id: "998",
            cf_payment_id: "456",
            refund_amount: 1,
            refund_currency: "INR",
            refund_status: "SUCCESS",
            refund_splits: [],
          },
        ],
        { status: 200 },
      ),
    );
  });
  vi.stubGlobal("fetch", mock);
  await w.admin.action(internal.cashfreeLifecycleActions.runRefund, {
    refundId,
    manual: true,
  });
  await w.admin.action(internal.cashfreeLifecycleActions.runRefund, {
    refundId,
    manual: true,
  });
  expect(mock).toHaveBeenCalledTimes(1);
  expect(
    await w.buyer.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
  ).toMatchObject({ refund: "review" });
});
it("keeps provider mismatch held even when a later matching capture proves funds", async () => {
  const w = await world();
  const order = await prepare(w);
  let claim = await w.t.mutation(internal.cashfreePayments.claim, {
    orderId: order._id,
  });
  if (!claim) throw new Error("claim");
  await w.t.mutation(internal.cashfreePayments.finish, {
    orderId: order._id,
    lease: claim.lease,
    outcome: "mismatch",
  });
  claim = await w.t.mutation(internal.cashfreePayments.claim, {
    orderId: order._id,
  });
  if (!claim) throw new Error("claim");
  await w.t.mutation(internal.cashfreePayments.finish, {
    orderId: order._id,
    lease: claim.lease,
    outcome: "paid",
    cfOrderId: "123",
    paymentId: "456",
  });
  expect(
    await w.buyer.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
  ).toMatchObject({ state: "hold", collection: "live_confirmed", actions: [] });
});
it("recovers a transient uncertain lookup without turning it into a permanent hold", async () => {
  const w = await world();
  const order = await prepare(w);
  let claim = await w.t.mutation(internal.cashfreePayments.claim, {
    orderId: order._id,
  });
  if (!claim) throw new Error("claim");
  await w.t.mutation(internal.cashfreePayments.finish, {
    orderId: order._id,
    lease: claim.lease,
    outcome: "uncertain",
  });
  claim = await w.t.mutation(internal.cashfreePayments.claim, {
    orderId: order._id,
  });
  if (!claim) throw new Error("claim");
  await w.t.mutation(internal.cashfreePayments.finish, {
    orderId: order._id,
    lease: claim.lease,
    outcome: "paid",
    cfOrderId: "123",
    paymentId: "456",
  });
  expect(
    await w.seller.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
  ).toMatchObject({
    state: "authorized",
    collection: "live_confirmed",
    actions: ["dispatch"],
  });
});
it.each(["disabled", "missing-policy"])(
  "continues existing receipt and refund with new checkout %s",
  async (mode) => {
    const w = await world();
    await collect(w);
    await w.seller.mutation(api.cashfreeLifecycle.act, {
      tradeId: w.tradeId,
      action: "dispatch",
      reference: "LOAD-001",
    });
    if (mode === "disabled")
      vi.stubEnv("CASHFREE_LIVE_CHECKOUT_ENABLED", "false");
    else vi.stubEnv("CASHFREE_LIVE_POLICY_VERSION", "unknown-new-policy");
    await w.buyer.mutation(api.cashfreeLifecycle.act, {
      tradeId: w.tradeId,
      action: "receive",
      reference: "GRN-001",
    });
    expect(
      await w.buyer.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
    ).toMatchObject({ state: "received", policyReady: false });
    await expect(
      w.admin.mutation(internal.cashfreeRefunds.prepare, {
        tradeId: w.tradeId,
        reference: "OLD-ORDER-REFUND",
        reason: "Approved under frozen original policy",
        key,
      }),
    ).resolves.toBeTruthy();
    expect(
      await w.buyer.query(api.cashfreePayments.availability, {
        tradeId: w.tradeId,
      }),
    ).toMatchObject({ canCheckout: false });
  },
);
it("holds changed provider order identity even if its next lookup matches again", async () => {
  const w = await world();
  const order = await prepare(w);
  await w.t.run((ctx) =>
    ctx.db.patch("cashfreeOrders", order._id, { cfOrderId: "123" }),
  );
  let claim = await w.t.mutation(internal.cashfreePayments.claim, {
    orderId: order._id,
  });
  if (!claim) throw new Error("claim");
  await w.t.mutation(internal.cashfreePayments.finish, {
    orderId: order._id,
    lease: claim.lease,
    outcome: "ready",
    cfOrderId: "different-provider-order",
  });
  claim = await w.t.mutation(internal.cashfreePayments.claim, {
    orderId: order._id,
  });
  if (!claim) throw new Error("claim");
  await w.t.mutation(internal.cashfreePayments.finish, {
    orderId: order._id,
    lease: claim.lease,
    outcome: "paid",
    cfOrderId: "123",
    paymentId: "456",
  });
  expect(
    await w.buyer.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
  ).toMatchObject({ state: "hold", collection: "live_confirmed", actions: [] });
});
it("accepts the documented per-order split response only as pending before corroboration", async () => {
  const w = await world();
  const order = await collect(w);
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        Response.json(
          {
            settlement: {
              entity: "settlement",
              cf_settlement_id: 999,
              cf_payment_id: 456,
              order_id: order.providerOrderId,
              order_currency: "INR",
              order_amount: 170.01,
              service_charge: 0,
              service_tax: 0,
              settlement_amount: 0,
              settlement_currency: "INR",
            },
            refunds: [],
            vendors: [
              {
                vendor_id: "test_seller",
                settlement_id: 987,
                settlement_amount: 170.01,
                settlement_eligibility_date: "2026-10-07 00:00:00",
              },
            ],
          },
          { status: 200 },
        ),
      ),
    ),
  );
  await w.t.action(internal.cashfreeLifecycleActions.reconcileSettlement, {
    orderId: order._id,
  });
  expect(
    await w.buyer.query(api.cashfreeLifecycle.status, { tradeId: w.tradeId }),
  ).toMatchObject({ state: "authorized", settlement: "pending" });
  const evidence = await w.t.run((ctx) =>
    ctx.db.query("cashfreeSettlementEvidence").collect(),
  );
  expect(evidence).toHaveLength(1);
});
