/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";

async function signedHeaders(
  body: string,
  secret = "test-secret",
  timestamp = String(Date.now()),
) {
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
    "x-webhook-timestamp": timestamp,
    "x-webhook-signature": btoa(
      String.fromCodePoint(...new Uint8Array(signature)),
    ),
    "content-type": "application/json",
  };
}

const modules = convexModules(import.meta.glob("./**/*.*s"));
const key = "00000000-0000-4000-8000-000000000001";
const secondKey = "00000000-0000-4000-8000-000000000002";

it.each([
  "closed",
  "expired",
  "sandbox_confirmed",
  "reconciliation_required",
] as const)(
  "does not offer another checkout for an existing %s order",
  async (state) => {
    const w = await world();
    const order = await prepare(w);
    await w.t.run(async (ctx) => {
      if (state === "expired")
        await ctx.db.patch("cashfreeOrders", order._id, {
          expiresAt: Date.now() - 1,
        });
      else if (state === "closed")
        await ctx.db.patch("cashfreeOrders", order._id, { checkout: "closed" });
      else
        await ctx.db.patch("cashfreeOrders", order._id, { collection: state });
    });
    const result = await w.buyer.query(api.cashfreePayments.availability, {
      tradeId: w.tradeId,
    });
    expect(result).toEqual({ sandboxEnabled: true, canCheckout: false });
  },
);

it("offers sandbox checkout only to the eligible buyer and exposes no payment secrets", async () => {
  const w = await world();
  const args = { tradeId: w.tradeId };
  expect(await w.buyer.query(api.cashfreePayments.availability, args)).toEqual({
    sandboxEnabled: true,
    canCheckout: true,
  });
  expect(await w.seller.query(api.cashfreePayments.availability, args)).toEqual(
    { sandboxEnabled: true, canCheckout: false },
  );
  await expect(
    w.outsider.query(api.cashfreePayments.availability, args),
  ).rejects.toThrow("TRADE_NOT_FOUND");
  await w.t.run(async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", "+919000000102"))
      .unique();
    if (!profile) throw new Error("Missing test buyer");
    const member = await ctx.db
      .query("memberships")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .first();
    if (!member) throw new Error("Missing test membership");
    await ctx.db.patch("memberships", member._id, { role: "viewer" });
  });
  expect(await w.buyer.query(api.cashfreePayments.availability, args)).toEqual({
    sandboxEnabled: true,
    canCheckout: false,
  });
});

it("keeps availability closed for disabled configuration, stale vendors and unverified phone scope", async () => {
  const w = await world();
  const args = { tradeId: w.tradeId };
  vi.stubEnv("CASHFREE_SANDBOX_CHECKOUT_ENABLED", "false");
  expect(await w.buyer.query(api.cashfreePayments.availability, args)).toEqual({
    sandboxEnabled: false,
    canCheckout: false,
  });
  vi.stubEnv("CASHFREE_SANDBOX_CHECKOUT_ENABLED", "true");
  vi.setSystemTime(Date.now() + 6 * 60_000);
  const currentAvailability = await w.buyer.query(
    api.cashfreePayments.availability,
    args,
  );
  expect(currentAvailability.canCheckout).toBe(false);
  await w.t.mutation(internal.cashfreePayments.recordVendor, {
    mode: "sandbox",
    vendorId: "test_seller",
    status: "ACTIVE",
  });
  await w.t.run(async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", "+919000000102"))
      .unique();
    if (!profile) throw new Error("Missing test buyer");
    await ctx.db.patch("profiles", profile._id, { phone: undefined });
  });
  const phoneAvailability = await w.buyer.query(
    api.cashfreePayments.availability,
    args,
  );
  expect(phoneAvailability.canCheckout).toBe(false);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function world() {
  vi.useFakeTimers();
  vi.stubEnv("AUTH_DEV_MODE", "true");
  vi.stubEnv("CASHFREE_MODE", "sandbox");
  vi.stubEnv("CASHFREE_SANDBOX_CLIENT_ID", "test-id");
  vi.stubEnv("CASHFREE_SANDBOX_CLIENT_SECRET", "test-secret");
  vi.stubEnv("CASHFREE_SANDBOX_CHECKOUT_ENABLED", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
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
    mode: "sandbox",
    vendorId: "test_seller",
  });
  await t.mutation(internal.cashfreePayments.recordVendor, {
    mode: "sandbox",
    vendorId: "test_seller",
    status: "ACTIVE",
  });
  return { t, buyer, seller, outsider, ...scope };
}
async function prepare(w: Awaited<ReturnType<typeof world>>) {
  const id = await w.buyer.mutation(internal.cashfreePayments.prepare, {
    tradeId: w.tradeId,
    idempotencyKey: key,
  });
  const order = await w.t.run((ctx) => ctx.db.get("cashfreeOrders", id));
  if (!order) throw new Error("missing order");
  return order;
}
function event(
  order: Doc<"cashfreeOrders">,
  paymentId = "12345",
  status: "SUCCESS" | "FAILED" = "SUCCESS",
) {
  return {
    mode: "sandbox" as const,
    providerOrderId: order.providerOrderId,
    providerPaymentId: paymentId,
    status,
    orderPaise: order.totalPaise,
    paymentPaise: order.totalPaise,
    currency: "INR",
    orderCurrency: "INR",
    customerId: order.customerId,
    timestamp: Date.now(),
    bodyHash: "a".repeat(64),
  };
}
function webhook(order: Doc<"cashfreeOrders">) {
  return JSON.stringify({
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: {
      order: {
        order_id: order.providerOrderId,
        order_amount: 170.01,
        order_currency: "INR",
      },
      payment: {
        cf_payment_id: "12345",
        payment_status: "SUCCESS",
        payment_amount: 170.01,
        payment_currency: "INR",
      },
      customer_details: { customer_id: order.customerId },
    },
  });
}
function mockProvider(
  options: {
    timeoutAfterCreate?: boolean;
    wrongVendor?: boolean;
    paid?: boolean;
    uncaptured?: boolean;
    authorization?: unknown;
    vendorStatus?: string;
    vendorLookupFails?: boolean;
  } = {},
) {
  let created: Record<string, unknown> | undefined;
  let posts = 0;
  const keys: string[] = [];
  const mock = vi.fn((url: string, init?: RequestInit) => {
    if (url.includes("/easy-split/vendors/")) {
      if (options.vendorLookupFails)
        return Promise.reject(new Error("provider unavailable"));
      return Promise.resolve(
        Response.json({
          vendor_id: "test_seller",
          status: options.vendorStatus ?? "ACTIVE",
        }),
      );
    }
    if (url.endsWith("/payments"))
      return Promise.resolve(
        Response.json([
          {
            order_id: created?.order_id,
            cf_payment_id: "12345",
            payment_status: "SUCCESS",
            is_captured: !options.uncaptured,
            authorization: options.authorization ?? null,
            payment_amount: 170.01,
            payment_currency: "INR",
          },
        ]),
      );
    if (init?.method === "POST") {
      posts++;
      keys.push(new Headers(init.headers).get("x-idempotency-key") ?? "");
      if (typeof init.body !== "string") throw new Error("Expected JSON body");
      created = JSON.parse(init.body) as Record<string, unknown>;
      if (options.timeoutAfterCreate)
        return Promise.reject(
          new Error("network timeout after provider commit"),
        );
    }
    if (!created)
      return Promise.resolve(
        Response.json({ code: "order_not_found" }, { status: 404 }),
      );
    return Promise.resolve(
      Response.json({
        ...created,
        cf_order_id: "111",
        order_status: options.paid ? "PAID" : "ACTIVE",
        payment_session_id: "private-session",
        ...(options.wrongVendor && {
          order_splits: [{ vendor: "wrong", amount: 170.01 }],
        }),
      }),
    );
  });
  vi.stubGlobal("fetch", mock);
  return { mock, posts: () => posts, keys };
}

describe("Cashfree durable checkout and authorization", () => {
  it("freezes one server-priced order for concurrent callers and one active lease", async () => {
    const w = await world();
    const ids = await Promise.all(
      [key, secondKey].map((idempotencyKey) =>
        w.buyer.mutation(internal.cashfreePayments.prepare, {
          tradeId: w.tradeId,
          idempotencyKey,
        }),
      ),
    );
    expect(ids[0]).toBe(ids[1]);
    const claims = await Promise.all(
      ids.map((orderId) =>
        w.t.mutation(internal.cashfreePayments.claim, { orderId }),
      ),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    const orders = await w.t.run((ctx) =>
      ctx.db.query("cashfreeOrders").collect(),
    );
    expect(orders).toHaveLength(1);
    expect(orders[0]?.totalPaise).toBe(17_001);
    expect(orders[0]?.vendorId).toBe("test_seller");
  });
  it("rejects signed-out, seller and unrelated checkout and protects status", async () => {
    const w = await world();
    await prepare(w);
    await expect(
      w.t.action(api.cashfreeActions.checkout, { tradeId: w.tradeId }),
    ).rejects.toThrow("NOT_SIGNED_IN");
    for (const who of [w.seller, w.outsider])
      await expect(
        who.action(api.cashfreeActions.checkout, { tradeId: w.tradeId }),
      ).rejects.toThrow("TRADE_NOT_FOUND");
    await expect(
      w.outsider.query(api.cashfreePayments.status, { tradeId: w.tradeId }),
    ).rejects.toThrow("TRADE_NOT_FOUND");
    const safe = await w.buyer.query(api.cashfreePayments.status, {
      tradeId: w.tradeId,
    });
    expect(JSON.stringify(safe)).not.toMatch(
      /private-session|customerPhone|idempotencyKey/,
    );
  });
  it("blocks missing settings, disabled sandbox and all live checkout", async () => {
    const w = await world();
    vi.stubEnv("CASHFREE_SANDBOX_CHECKOUT_ENABLED", "false");
    await expect(prepare(w)).rejects.toThrow("GATEWAY_REQUIRED");
    vi.stubEnv("CASHFREE_MODE", "live");
    vi.stubEnv("CASHFREE_LIVE_CLIENT_ID", "live-id");
    vi.stubEnv("CASHFREE_LIVE_CLIENT_SECRET", "live-secret");
    await expect(prepare(w)).rejects.toThrow("GATEWAY_REQUIRED");
    vi.stubEnv("CASHFREE_MODE", "");
    await expect(prepare(w)).rejects.toThrow("GATEWAY_REQUIRED");
  });
  it("requires recent provider activation and prevents vendor reassignment", async () => {
    const w = await world();
    await w.t.mutation(internal.cashfreePayments.recordVendor, {
      mode: "sandbox",
      vendorId: "test_seller",
      status: "BLOCKED",
    });
    await expect(prepare(w)).rejects.toThrow("PAYMENT_VENDOR_UNVERIFIED");
    await expect(
      w.t.mutation(internal.cashfreePayments.registerVendor, {
        mode: "sandbox",
        orgId: w.sellerOrgId,
        vendorId: "different",
      }),
    ).rejects.toThrow("VENDOR_MAPPING_FROZEN");
  });
  it("reconciles a timed-out POST and never creates a second provider order", async () => {
    const w = await world();
    const provider = mockProvider({ timeoutAfterCreate: true });
    const first = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(first.status.checkout).toBe("uncertain");
    expect(first.paymentSessionId).toBeNull();
    const retry = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(retry.paymentSessionId).toBe("private-session");
    expect(provider.posts()).toBe(1);
    expect(provider.keys).toHaveLength(1);
  });
  it("withholds checkout on a wrong provider split and rejects stale lease completion", async () => {
    const w = await world();
    mockProvider({ wrongVendor: true });
    const result = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(result.status.collection).toBe("reconciliation_required");
    expect(result.paymentSessionId).toBeNull();
    const order = await prepare(w);
    await w.t.mutation(internal.cashfreePayments.finish, {
      orderId: order._id,
      lease: order.lease - 1,
      outcome: "ready",
      sessionId: "stale",
    });
    const saved = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(saved?.sessionId).toBeUndefined();
  });
});

describe("Cashfree signed events and financial boundaries", () => {
  it("verifies real HTTP raw bytes; invalid signatures and wrong modes write nothing", async () => {
    const w = await world();
    const order = await prepare(w);
    const body = webhook(order);
    const headers = await signedHeaders(body);
    const invalid = await w.t.fetch("/payments/cashfree/sandbox", {
      method: "POST",
      body,
      headers: { ...headers, "x-webhook-signature": "invalid" },
    });
    expect(invalid.status).toBe(401);
    const wrongMode = await w.t.fetch("/payments/cashfree/live", {
      method: "POST",
      body,
      headers,
    });
    expect(wrongMode.status).toBe(503);
    expect(
      await w.t.run((ctx) => ctx.db.query("cashfreeAttempts").collect()),
    ).toHaveLength(0);
    const accepted = await w.t.fetch("/payments/cashfree/sandbox", {
      method: "POST",
      body,
      headers,
    });
    expect(accepted.status).toBe(200);
    const saved = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(saved?.collection).toBe("success_observed");
  });
  it("deduplicates success and ignores later failure without releasing trade or inventory", async () => {
    const w = await world();
    const order = await prepare(w);
    const before = await w.t.run((ctx) => ctx.db.query("inventory").collect());
    for (const status of ["FAILED", "SUCCESS", "SUCCESS", "FAILED"] as const)
      await w.t.mutation(
        internal.cashfreePayments.observe,
        event(order, "12345", status),
      );
    const attempts = await w.t.run((ctx) =>
      ctx.db.query("cashfreeAttempts").collect(),
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.status).toBe("SUCCESS");
    const trade = await w.t.run((ctx) => ctx.db.get("trades", w.tradeId));
    expect(trade?.status).toBe("accepted");
    expect(await w.t.run((ctx) => ctx.db.query("inventory").collect())).toEqual(
      before,
    );
    await expect(
      w.buyer.mutation(api.market.act, { tradeId: w.tradeId, action: "pay" }),
    ).rejects.toThrow("GATEWAY_REQUIRED");
  });
  it.each([
    "amount",
    "currency",
    "customer",
    "orphan",
    "mode",
    "late",
    "duplicate",
  ] as const)("holds %s success for reconciliation", async (kind) => {
    const w = await world();
    const order = await prepare(w);
    const data = event(order);
    switch (kind) {
      case "mode": {
        break;
      }
      case "amount": {
        data.paymentPaise++;
        break;
      }
      case "currency": {
        data.currency = "USD";
        break;
      }
      case "customer": {
        data.customerId = "unrelated";
        break;
      }
      case "orphan": {
        data.providerOrderId = "unknown_order";
        break;
      }
      case "late": {
        await w.t.run((ctx) =>
          ctx.db.patch("trades", w.tradeId, { status: "declined" }),
        );
        break;
      }
      case "duplicate": {
        await w.t.mutation(internal.cashfreePayments.observe, data);
        data.providerPaymentId = "67890";

        break;
      }
      // No default
    }
    await w.t.mutation(internal.cashfreePayments.observe, {
      ...data,
      ...(kind === "mode" && { mode: "live" as const }),
    });
    const saved = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(saved?.collection).not.toBe("sandbox_confirmed");
    expect(
      await w.t.run((ctx) => ctx.db.query("cashfreeIssues").collect()),
    ).toHaveLength(1);
  });
  it("requires provider order and successful attempt evidence for sandbox confirmation", async () => {
    const w = await world();
    mockProvider({ paid: true });
    const result = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(result.status.collection).toBe("sandbox_confirmed");
    expect(result.status.settlement).toBe("blocked");
    expect(result.status.refund).toBe("blocked");
    expect(result.paymentSessionId).toBeNull();
    const trade = await w.t.run((ctx) => ctx.db.get("trades", w.tradeId));
    expect(trade?.status).toBe("accepted");
  });
  it("retains unsupported signed evidence without storing its private payload", async () => {
    const w = await world();
    const body = JSON.stringify({
      type: "VENDOR_SETTLEMENT_SUCCESS",
      private: "bank-secret",
    });
    const response = await w.t.fetch("/payments/cashfree/sandbox", {
      method: "POST",
      body,
      headers: await signedHeaders(body),
    });
    expect(response.status).toBe(200);
    const audit = await w.t.run(async (ctx) => ({
      issues: await ctx.db.query("cashfreeIssues").collect(),
      logs: await ctx.db.query("auditLog").collect(),
    }));
    expect(audit.issues).toHaveLength(1);
    expect(JSON.stringify(audit)).not.toContain("bank-secret");
  });
});

describe("Cashfree reconciliation race regressions", () => {
  it("requires fresh vendor evidence and a verified buyer phone", async () => {
    const w = await world();
    vi.setSystemTime(Date.now() + 6 * 60_000);
    await expect(prepare(w)).rejects.toThrow("PAYMENT_VENDOR_UNVERIFIED");
    await w.t.mutation(internal.cashfreePayments.recordVendor, {
      mode: "sandbox",
      vendorId: "test_seller",
      status: "ACTIVE",
    });
    await w.t.run(async (ctx) => {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_phone", (q) => q.eq("phone", "+919000000102"))
        .unique();
      if (!profile) throw new Error("missing profile");
      await ctx.db.patch("profiles", profile._id, { phone: undefined });
    });
    await expect(prepare(w)).rejects.toThrow("VERIFIED_PHONE_REQUIRED");
  });
  it("rejects a changed trade scope before returning a session", async () => {
    const w = await world();
    const order = await prepare(w);
    await w.t.run((ctx) =>
      ctx.db.patch("trades", w.tradeId, {
        totalPaise: 17_002,
        paisePerKg: 17_002,
      }),
    );
    await expect(prepare(w)).rejects.toThrow("PAYMENT_SCOPE_CHANGED");
    await w.t.mutation(internal.cashfreePayments.finish, {
      orderId: order._id,
      lease: 0,
      outcome: "paid",
      paymentId: "scope-changed",
    });
    const saved = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(saved?.collection).toBe("reconciliation_required");
    expect(saved?.sessionId).toBeUndefined();
  });
  it("does not apply an HTTP result after another worker claims the order", async () => {
    const w = await world();
    const order = await prepare(w);
    const first = await w.t.mutation(internal.cashfreePayments.claim, {
      orderId: order._id,
    });
    vi.setSystemTime(Date.now() + 31_000);
    const second = await w.t.mutation(internal.cashfreePayments.claim, {
      orderId: order._id,
    });
    if (!first || !second) throw new Error("missing claims");
    expect(second.lease).toBe(first.lease + 1);
    expect(
      await w.t.mutation(internal.cashfreePayments.finish, {
        orderId: order._id,
        lease: first.lease,
        outcome: "ready",
        sessionId: "stale",
      }),
    ).toBe(false);
    const saved = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(saved?.sessionId).toBeUndefined();
  });
  it("deduplicates provider lookup payment IDs across orders", async () => {
    const w = await world();
    const first = await prepare(w);
    const secondTrade = await w.t.run(async (ctx) => {
      const trade = await ctx.db.get("trades", w.tradeId);
      if (!trade) throw new Error("missing trade");
      const { _id, _creationTime, ...fields } = trade;

      return ctx.db.insert("trades", fields);
    });
    const second = await w.buyer.mutation(internal.cashfreePayments.prepare, {
      tradeId: secondTrade,
      idempotencyKey: secondKey,
    });
    await w.t.mutation(internal.cashfreePayments.finish, {
      orderId: first._id,
      lease: 0,
      outcome: "paid",
      paymentId: "12345",
    });
    await w.t.mutation(internal.cashfreePayments.finish, {
      orderId: second,
      lease: 0,
      outcome: "paid",
      paymentId: "12345",
    });
    const saved = await w.t.run((ctx) => ctx.db.get("cashfreeOrders", second));
    expect(saved?.collection).toBe("reconciliation_required");
    const attempts = await w.t.run((ctx) =>
      ctx.db.query("cashfreeAttempts").collect(),
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.orderId).toBe(first._id);
  });
  it("keeps already confirmed collection when its success is replayed after expiry", async () => {
    const w = await world();
    mockProvider({ paid: true });
    await w.buyer.action(api.cashfreeActions.checkout, { tradeId: w.tradeId });
    const order = await prepare(w);
    vi.setSystemTime(Date.now() + 31 * 60_000);
    await w.t.mutation(internal.cashfreePayments.observe, event(order));
    const saved = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(saved?.collection).toBe("sandbox_confirmed");
    const issues = await w.t.run((ctx) =>
      ctx.db.query("cashfreeIssues").collect(),
    );
    expect(issues).toHaveLength(0);
  });
  it("never creates an order after an ambiguous provider lookup failure", async () => {
    const w = await world();
    const mock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ code: "authentication_failed" }, { status: 401 }),
      );
    vi.stubGlobal("fetch", mock);
    const result = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(result.paymentSessionId).toBeNull();
    expect(result.status.checkout).toBe("uncertain");
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
  });
  it("rejects oversized requests before signature checks and persistence", async () => {
    const w = await world();
    const response = await w.t.fetch("/payments/cashfree/sandbox", {
      method: "POST",
      body: "x".repeat(65_537),
    });
    expect(response.status).toBe(413);
    expect(
      await w.t.run((ctx) => ctx.db.query("cashfreeIssues").collect()),
    ).toHaveLength(0);
  });
});

it("does not confirm an authorized but uncaptured payment", async () => {
  const w = await world();
  mockProvider({ paid: true, uncaptured: true });
  const result = await w.buyer.action(api.cashfreeActions.checkout, {
    tradeId: w.tradeId,
  });
  expect(result.status.collection).toBe("reconciliation_required");
  expect(result.paymentSessionId).toBeNull();
});

describe("Cashfree capture authorization and renewed vendor checks", () => {
  it.each([
    { action: "CAPTURE", status: "PENDING", captured_amount: 100 },
    { action: "CAPTURE", status: "SUCCESS", captured_amount: 100 },
    { action: "CAPTURE", status: "PENDING", captured_amount: 170.01 },
    { action: "VOID", status: "SUCCESS", captured_amount: 170.01 },
    { action: "CAPTURE", status: "SUCCESS" },
  ])(
    "does not confirm incomplete capture evidence %j",
    async (authorization) => {
      const w = await world();
      mockProvider({ paid: true, authorization });
      const result = await w.buyer.action(api.cashfreeActions.checkout, {
        tradeId: w.tradeId,
      });
      expect(result.status.collection).not.toBe("sandbox_confirmed");
      expect(result.paymentSessionId).toBeNull();
      const attempts = await w.t.run((ctx) =>
        ctx.db.query("cashfreeAttempts").collect(),
      );
      expect(attempts).toHaveLength(0);
    },
  );
  it("confirms a successful full capture in exact paise", async () => {
    const w = await world();
    mockProvider({
      paid: true,
      authorization: {
        action: "CAPTURE",
        status: "SUCCESS",
        captured_amount: "170.01",
      },
    });
    const result = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(result.status.collection).toBe("sandbox_confirmed");
  });
  it("withholds an existing session after its provider vendor becomes blocked", async () => {
    const w = await world();
    const options = { vendorStatus: "ACTIVE" };
    const provider = mockProvider(options);
    const first = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(first.paymentSessionId).toBe("private-session");
    options.vendorStatus = "BLOCKED";
    const second = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(second.paymentSessionId).toBeNull();
    expect(second.status.checkout).toBe("closed");
    expect(provider.posts()).toBe(1);
    const vendor = await w.t.run((ctx) =>
      ctx.db.query("cashfreeVendors").first(),
    );
    expect(vendor?.providerStatus).toBe("BLOCKED");
  });
  it("withholds stale sessions and refreshes the same order before reuse", async () => {
    const w = await world();
    const provider = mockProvider();
    await w.buyer.action(api.cashfreeActions.checkout, { tradeId: w.tradeId });
    const order = await prepare(w);
    vi.setSystemTime(Date.now() + 6 * 60_000);
    const stale = await w.buyer.query(
      internal.cashfreePayments.checkoutResult,
      { orderId: order._id },
    );
    expect(stale.paymentSessionId).toBeNull();
    const refreshed = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(refreshed.paymentSessionId).toBe("private-session");
    expect(provider.posts()).toBe(1);
    const vendorCalls = provider.mock.mock.calls.filter(([url]) =>
      url.includes("/easy-split/vendors/"),
    );
    expect(vendorCalls).toHaveLength(2);
  });
  it("checks local vendor status again at the final session boundary", async () => {
    const w = await world();
    mockProvider();
    await w.buyer.action(api.cashfreeActions.checkout, { tradeId: w.tradeId });
    const order = await prepare(w);
    await w.t.mutation(internal.cashfreePayments.recordVendor, {
      mode: "sandbox",
      vendorId: "test_seller",
      status: "BLOCKED",
    });
    const result = await w.buyer.query(
      internal.cashfreePayments.checkoutResult,
      { orderId: order._id },
    );
    expect(result.paymentSessionId).toBeNull();
  });
  it("withholds existing sessions when vendor lookup fails", async () => {
    const w = await world();
    const options = { vendorLookupFails: false };
    const provider = mockProvider(options);
    await w.buyer.action(api.cashfreeActions.checkout, { tradeId: w.tradeId });
    options.vendorLookupFails = true;
    const result = await w.buyer.action(api.cashfreeActions.checkout, {
      tradeId: w.tradeId,
    });
    expect(result.paymentSessionId).toBeNull();
    expect(result.status.checkout).toBe("uncertain");
    expect(provider.posts()).toBe(1);
  });
  it("still reconciles captured funds after vendor activation is revoked", async () => {
    const w = await world();
    const options = { paid: false, vendorStatus: "ACTIVE" };
    const provider = mockProvider(options);
    await w.buyer.action(api.cashfreeActions.checkout, { tradeId: w.tradeId });
    const order = await prepare(w);
    options.paid = true;
    options.vendorStatus = "BLOCKED";
    await w.t.mutation(internal.cashfreePayments.recordVendor, {
      mode: "sandbox",
      vendorId: "test_seller",
      status: "BLOCKED",
    });
    await w.t.action(internal.cashfreeActions.reconcile, {
      orderId: order._id,
    });
    const result = await w.buyer.query(
      internal.cashfreePayments.checkoutResult,
      { orderId: order._id },
    );
    expect(result.status.collection).toBe("sandbox_confirmed");
    expect(result.paymentSessionId).toBeNull();
    expect(provider.posts()).toBe(1);
  });
});

describe("bounded durable payment recovery", () => {
  it("reconciles success after a webhook arrives during the checkout lease", async () => {
    const w = await world();
    const options = { paid: false };
    const provider = mockProvider(options);
    await w.buyer.action(api.cashfreeActions.checkout, { tradeId: w.tradeId });
    const order = await prepare(w);
    await w.t.mutation(internal.cashfreePayments.claim, { orderId: order._id });
    options.paid = true;
    await w.t.mutation(internal.cashfreePayments.observe, event(order));
    await w.t.action(internal.cashfreeActions.reconcile, {
      orderId: order._id,
    });
    const pending = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(pending?.collection).toBe("success_observed");
    if (!pending?.recoveryAt) throw new Error("Missing durable recovery");
    expect(pending.recoveryAt).toBeGreaterThan(pending.leaseUntil);
    // Duplicate delivery must preserve the one scheduled recovery and budget.
    await w.t.mutation(internal.cashfreePayments.observe, event(order));
    const duplicate = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(duplicate?.recoveryAt).toBe(pending.recoveryAt);
    vi.setSystemTime(pending.recoveryAt);
    await w.t.action(internal.cashfreeActions.reconcile, {
      orderId: order._id,
      recoveryAt: pending.recoveryAt,
    });
    const settled = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(settled?.collection).toBe("sandbox_confirmed");
    expect(settled?.recoveryAttempts).toBe(1);
    expect(provider.posts()).toBe(1);
    const trade = await w.t.run((ctx) => ctx.db.get("trades", w.tradeId));
    expect(trade?.status).toBe("accepted");
  });
  it("keeps one watchdog after action failure and stops after four recovery runs", async () => {
    const w = await world();
    const order = await prepare(w);
    const network = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", network);
    // A worker may disappear after claim without calling finish.
    await w.t.mutation(internal.cashfreePayments.claim, { orderId: order._id });
    for (let attempt = 1; attempt <= 4; attempt++) {
      const pending = await w.t.run((ctx) =>
        ctx.db.get("cashfreeOrders", order._id),
      );
      if (!pending?.recoveryAt) throw new Error("Missing recovery run");
      vi.setSystemTime(pending.recoveryAt);
      await w.t.action(internal.cashfreeActions.reconcile, {
        orderId: order._id,
        recoveryAt: pending.recoveryAt,
      });
      // A stale scheduler replay does not make another request or consume budget.
      const calls = network.mock.calls.length;
      await w.t.action(internal.cashfreeActions.reconcile, {
        orderId: order._id,
        recoveryAt: pending.recoveryAt,
      });
      expect(network).toHaveBeenCalledTimes(calls);
    }
    const finalCheck = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    if (!finalCheck?.recoveryAt)
      throw new Error("Missing final audit watchdog");
    vi.setSystemTime(finalCheck.recoveryAt);
    await w.t.action(internal.cashfreeActions.reconcile, {
      orderId: order._id,
      recoveryAt: finalCheck.recoveryAt,
    });
    const exhausted = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(exhausted?.recoveryAttempts).toBe(4);
    expect(exhausted?.recoveryAt).toBeUndefined();
    expect(network).toHaveBeenCalledTimes(4);
    const issues = await w.t.run((ctx) =>
      ctx.db.query("cashfreeIssues").collect(),
    );
    expect(
      issues.filter((entry) => entry.reason === "automatic_recovery_exhausted"),
    ).toHaveLength(1);
    await w.t.mutation(internal.cashfreePayments.requestRecovery, {
      orderId: order._id,
    });
    const stillExhausted = await w.t.run((ctx) =>
      ctx.db.get("cashfreeOrders", order._id),
    );
    expect(stillExhausted?.recoveryAt).toBeUndefined();
  });
  it("checks the caller's verified phone even when an order already exists", async () => {
    const w = await world();
    await prepare(w);
    await w.t.run(async (ctx) => {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_phone", (q) => q.eq("phone", "+919000000102"))
        .unique();
      if (!profile) throw new Error("Missing test buyer");
      await ctx.db.patch("profiles", profile._id, { phone: undefined });
    });
    await expect(prepare(w)).rejects.toThrow("VERIFIED_PHONE_REQUIRED");
    expect(
      await w.t.run((ctx) => ctx.db.query("cashfreeOrders").collect()),
    ).toHaveLength(1);
  });
});

it("keeps a durable successor if recovery stops before it claims provider I/O", async () => {
  const w = await world();
  const order = await prepare(w);
  await w.t.mutation(internal.cashfreePayments.claim, { orderId: order._id });
  const pending = await w.t.run((ctx) =>
    ctx.db.get("cashfreeOrders", order._id),
  );
  if (!pending?.recoveryAt) throw new Error("Missing recovery watchdog");
  vi.setSystemTime(pending.recoveryAt);
  expect(
    await w.t.mutation(internal.cashfreePayments.beginRecovery, {
      orderId: order._id,
      recoveryAt: pending.recoveryAt,
    }),
  ).toBe(true);
  // No action or provider call follows: simulate process loss after this commit.
  const successor = await w.t.run((ctx) =>
    ctx.db.get("cashfreeOrders", order._id),
  );
  expect(successor?.recoveryAt).toBeGreaterThan(Date.now());
  expect(successor?.recoveryAttempts).toBe(1);
  expect(
    await w.t.mutation(internal.cashfreePayments.beginRecovery, {
      orderId: order._id,
      recoveryAt: pending.recoveryAt,
    }),
  ).toBe(false);
});
