/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { convexModules, registerAuth, seedDemo } from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const providerOrderId = "luma_http_test_order";
const providerRefundId = "rf_http_test";
const secret = "test-http-secret";
const paymentKey = "00000000-0000-4000-8000-000000000001";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function signedHeaders(body: string) {
  const timestamp = String(Date.now());
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(timestamp + body),
  );
  return {
    "content-type": "application/json",
    "x-webhook-timestamp": timestamp,
    "x-webhook-signature": btoa(
      String.fromCodePoint(...new Uint8Array(signature)),
    ),
  };
}

/** Persisted synthetic history isolates HTTP evidence authority from checkout tests. */
async function world(mode: "live" | "sandbox" = "live") {
  vi.useFakeTimers();
  vi.stubEnv("AUTH_DEV_MODE", "true");
  vi.stubEnv("CASHFREE_MODE", mode);
  vi.stubEnv("CASHFREE_LIVE_CLIENT_ID", "test-http-live-id");
  vi.stubEnv(
    "CASHFREE_LIVE_CLIENT_SECRET",
    mode === "live" ? secret : "inactive-live-secret",
  );
  vi.stubEnv("CASHFREE_SANDBOX_CLIENT_ID", "test-http-sandbox-id");
  vi.stubEnv(
    "CASHFREE_SANDBOX_CLIENT_SECRET",
    mode === "sandbox" ? secret : "inactive-sandbox-secret",
  );
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const ids = await t.run(async (ctx) => {
    const listing = await ctx.db.query("listings").first();
    const orgs = await ctx.db.query("orgs").take(20);
    const buyer = orgs.find((org) => org._id !== listing?.orgId);
    if (!listing || !buyer) throw new Error("Missing HTTP fixture");
    const tradeId = await ctx.db.insert("trades", {
      listingId: listing._id,
      sellerOrgId: listing.orgId,
      buyerOrgId: buyer._id,
      materialCode: listing.materialCode,
      grams: 1000,
      paisePerKg: 17_001,
      totalPaise: 17_001,
      status: "accepted",
      timeline: [{ status: "accepted", at: Date.now() }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const orderId = await ctx.db.insert("cashfreeOrders", {
      mode,
      tradeId,
      sellerOrgId: listing.orgId,
      buyerOrgId: buyer._id,
      totalPaise: 17_001,
      currency: "INR",
      customerId: "synthetic_http_customer",
      customerPhone: "9000000102",
      vendorId: "synthetic_http_vendor",
      providerOrderId,
      idempotencyKey: paymentKey,
      expiresAt: Date.now() + 30 * 60_000,
      checkout: "closed",
      collection: mode === "live" ? "live_confirmed" : "sandbox_confirmed",
      settlement: "blocked",
      refund: "blocked",
      lease: 0,
      leaseUntil: 0,
      attempts: 0,
      cfOrderId: "123",
      successPaymentId: "456",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (mode === "live") {
      await ctx.db.insert("tradeFinancials", {
        tradeId,
        orderId,
        state: "hold",
        collection: "live_confirmed",
        refund: "pending",
        settlement: "pending",
        holdReason: "refund_requested",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("cashfreeRefunds", {
        tradeId,
        orderId,
        reference: "HTTP-REFUND",
        reason: "Synthetic approved refund",
        amountPaise: 17_001,
        providerRefundId,
        idempotencyKey: paymentKey,
        actorId: "synthetic-admin",
        status: "pending",
        lease: 0,
        leaseUntil: 0,
        attempts: 4,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return { tradeId, orderId };
  });
  const network = vi.fn().mockRejectedValue(new Error("Unexpected network"));
  vi.stubGlobal("fetch", network);
  const snapshot = () =>
    t.run(async (ctx) => ({
      trade: await ctx.db.get("trades", ids.tradeId),
      order: await ctx.db.get("cashfreeOrders", ids.orderId),
      financials: await ctx.db.query("tradeFinancials").collect(),
      refunds: await ctx.db.query("cashfreeRefunds").collect(),
      movements: await ctx.db.query("financialMovements").collect(),
      inventory: await ctx.db.query("inventory").collect(),
    }));
  const post = async (payload: unknown, isForged = false) => {
    const body = JSON.stringify(payload);
    const headers = await signedHeaders(body);
    return t.fetch(`/payments/cashfree/${mode}`, {
      method: "POST",
      body,
      headers: {
        ...headers,
        ...(isForged && { "x-webhook-signature": "forged" }),
      },
    });
  };
  return { t, network, snapshot, post, ...ids };
}

function refundEvent() {
  return {
    type: "REFUND_STATUS_WEBHOOK",
    data: {
      refund: {
        order_id: providerOrderId,
        refund_id: providerRefundId,
        refund_status: "SUCCESS",
      },
    },
  };
}
function settlementEvent() {
  return {
    type: "VENDOR_SETTLEMENT_SUCCESS",
    event_time: new Date().toISOString(),
    data: {
      settlement: {
        settlement_id: "987",
        vendor_id: "synthetic_http_vendor",
        status: "SUCCESS",
        settlement_amount: "170.01",
        vendor_transaction_amount: "170.01",
        amount_settled: "170.01",
        adjustment: "0.00",
        service_charge: "0.00",
        service_tax: "0.00",
      },
    },
  };
}

it.each(["refund", "settlement"])(
  "rejects a forged %s event before any financial evidence write",
  async (kind) => {
    const w = await world();
    const before = await w.snapshot();
    const response = await w.post(
      kind === "refund" ? refundEvent() : settlementEvent(),
      true,
    );
    expect(response.status).toBe(401);
    expect(await w.snapshot()).toEqual(before);
    const evidence = await w.t.run(async (ctx) => ({
      triggers: await ctx.db.query("cashfreeRefundTriggers").collect(),
      events: await ctx.db.query("cashfreeSettlementEvents").collect(),
      issues: await ctx.db.query("cashfreeIssues").collect(),
    }));
    expect(evidence).toEqual({ triggers: [], events: [], issues: [] });
    expect(w.network).not.toHaveBeenCalled();
  },
);

it.each(["-1.00", "170.001", "1000000000000000000"])(
  "acknowledges signed unsupported exact money %s without mutating the lifecycle",
  async (amount) => {
    const w = await world();
    const before = await w.snapshot();
    const payload = settlementEvent();
    payload.data.settlement.amount_settled = amount;
    const response = await w.post(payload);
    expect(response.status).toBe(200);
    expect(await w.snapshot()).toEqual(before);
    const issues = await w.t.run((ctx) =>
      ctx.db.query("cashfreeIssues").collect(),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.reason).toBe("unsupported_signed_event");
    expect(w.network).not.toHaveBeenCalled();
  },
);

it("deduplicates a signed refund success as a lookup trigger without confirming funds or releasing stock", async () => {
  const w = await world();
  const before = await w.snapshot();
  for (let delivery = 0; delivery < 2; delivery++) {
    const response = await w.post(refundEvent());
    expect(response.status).toBe(200);
  }
  expect(await w.snapshot()).toEqual(before);
  const triggers = await w.t.run((ctx) =>
    ctx.db.query("cashfreeRefundTriggers").collect(),
  );
  expect(triggers).toHaveLength(1);
  expect(triggers[0]?.consumed).toBe(false);
  expect(w.network).not.toHaveBeenCalled();
});

it("keeps a signed sandbox refund from creating a real trade hold", async () => {
  const w = await world("sandbox");
  const before = await w.snapshot();
  const response = await w.post(refundEvent());
  expect(response.status).toBe(200);
  expect(await w.snapshot()).toEqual(before);
  const triggers = await w.t.run((ctx) =>
    ctx.db.query("cashfreeRefundTriggers").collect(),
  );
  expect(triggers).toEqual([]);
  expect(w.network).not.toHaveBeenCalled();
});

it("stores signed aggregate settlement evidence without declaring an individual trade settled", async () => {
  const w = await world();
  const before = await w.snapshot();
  for (let delivery = 0; delivery < 2; delivery++) {
    const response = await w.post(settlementEvent());
    expect(response.status).toBe(200);
  }
  expect(await w.snapshot()).toEqual(before);
  const evidence = await w.t.run(async (ctx) => ({
    events: await ctx.db.query("cashfreeSettlementEvents").collect(),
    orders: await ctx.db.query("cashfreeSettlementEvidence").collect(),
  }));
  expect(evidence.events).toHaveLength(1);
  expect(evidence.events[0]).toMatchObject({
    status: "SUCCESS",
    amountPaise: 17_001,
  });
  expect(evidence.orders).toEqual([]);
  expect(w.network).not.toHaveBeenCalled();
});
