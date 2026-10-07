// @vitest-environment edge-runtime
import { afterEach, describe, expect, it, vi } from "vitest";

import { cashfreeEnv } from "../../src/lib/env";
import {
  bodyHash,
  boundedBody,
  CashfreeFailure,
  cashfreeRequest,
  createOrderBody,
  decimalPaise,
  isOrderMatch,
  isSignatureValid,
  MAX_PAYMENT_PAISE,
  orderResponse,
  parsePaise,
  webhookResponse,
} from "./cashfree";

const frozen = {
  providerOrderId: "luma_s_example",
  totalPaise: 17_001,
  customerId: "buyer",
  customerPhone: "9000000102",
  vendorId: "seller",
  expiresAt: 1_800_000_000_000,
};
const config = {
  mode: "sandbox" as const,
  baseUrl: "https://sandbox.cashfree.com/pg",
  clientId: "test-id",
  clientSecret: "test-secret",
  checkoutEnabled: true,
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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

describe("Cashfree exact HTTP contract", () => {
  it.each([0, 1, 29, 17_001, MAX_PAYMENT_PAISE])(
    "preserves %i paise through a decimal boundary",
    (value) => {
      expect(parsePaise(decimalPaise(value))).toBe(value);
    },
  );
  it.each([-1, 0.5, NaN, Infinity, MAX_PAYMENT_PAISE + 1])(
    "rejects invalid stored amount %s",
    (value) => {
      expect(() => decimalPaise(value)).toThrow();
    },
  );
  it.each(["1.001", "1e2", "-1", "01.00", "999999999999999999999", {}, null])(
    "rejects ambiguous provider amount %s",
    (value) => {
      expect(() => parsePaise(value)).toThrow();
    },
  );
  it("serializes numeric paise only at the boundary and assigns the full seller split", () => {
    const body = createOrderBody(frozen);
    expect(body).toContain('"order_amount":170.01');
    expect(body).toContain('"amount":170.01');
    expect(() => createOrderBody({ ...frozen, totalPaise: 99 })).toThrow(
      "PAYMENT_BELOW_MINIMUM",
    );
  });
  it("requires exact customer, amount, expiry and sole seller allocation", () => {
    const response = orderResponse.parse({
      ...JSON.parse(createOrderBody(frozen)),
      cf_order_id: "123",
      order_status: "ACTIVE",
      payment_session_id: "private-session",
    });
    expect(isOrderMatch(frozen, response)).toBe(true);
    expect(isOrderMatch({ ...frozen, vendorId: "other" }, response)).toBe(
      false,
    );
    expect(isOrderMatch({ ...frozen, customerId: "other" }, response)).toBe(
      false,
    );
    expect(isOrderMatch({ ...frozen, totalPaise: 17_000 }, response)).toBe(
      false,
    );
    expect(
      isOrderMatch(frozen, {
        ...response,
        order_splits: [
          ...response.order_splits,
          { vendor: "extra", amount: 0 },
        ],
      }),
    ).toBe(false);
  });
  it("checks raw bytes and timestamp with the account-specific secret", async () => {
    const raw = '{"amount":170.00,"name":"₹"}';
    const headers = await signedHeaders(raw);
    const bytes = new TextEncoder().encode(raw);
    expect(
      await isSignatureValid(
        bytes,
        headers["x-webhook-timestamp"],
        headers["x-webhook-signature"],
        "test-secret",
      ),
    ).toBe(true);
    expect(
      await isSignatureValid(
        new TextEncoder().encode('{"amount":170,"name":"₹"}'),
        headers["x-webhook-timestamp"],
        headers["x-webhook-signature"],
        "test-secret",
      ),
    ).toBe(false);
    expect(
      await isSignatureValid(
        bytes,
        headers["x-webhook-timestamp"],
        headers["x-webhook-signature"],
        "live-secret",
      ),
    ).toBe(false);
    expect(
      await isSignatureValid(
        bytes,
        "123",
        headers["x-webhook-signature"],
        "test-secret",
      ),
    ).toBe(false);
    expect(
      await isSignatureValid(
        bytes,
        headers["x-webhook-timestamp"],
        "invalid",
        "test-secret",
      ),
    ).toBe(false);
    expect(await bodyHash(bytes)).toHaveLength(64);
  });
  it("bounds streamed bodies even without a Content-Length", async () => {
    await expect(boundedBody(new Response("x".repeat(65_537)))).rejects.toThrow(
      "PAYMENT_BODY_TOO_LARGE",
    );
    expect(await boundedBody(new Response("x".repeat(65_536)))).toHaveLength(
      65_536,
    );
    await expect(
      boundedBody(
        new Response("x", { headers: { "content-length": "999999" } }),
      ),
    ).rejects.toThrow();
  });
  it("only permits documented order-not-found errors to trigger a create retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ code: "order_not_found" }, { status: 404 }),
        )
        .mockResolvedValueOnce(
          Response.json(
            { code: "authentication_failed", key: "do-not-log" },
            { status: 401 },
          ),
        ),
    );
    await expect(cashfreeRequest(config, "/orders/id")).rejects.toEqual(
      new CashfreeFailure("not_found"),
    );
    await expect(cashfreeRequest(config, "/orders/id")).rejects.toEqual(
      new CashfreeFailure("unavailable"),
    );
  });
  it("rejects incompatible success event types and unsafe numeric payment IDs", () => {
    const event = {
      type: "PAYMENT_FAILED_WEBHOOK",
      data: {
        order: { order_id: "order_1", order_amount: 1, order_currency: "INR" },
        payment: {
          cf_payment_id: "123",
          payment_status: "SUCCESS",
          payment_amount: 1,
          payment_currency: "INR",
        },
        customer_details: { customer_id: "buyer" },
      },
    };
    expect(webhookResponse.safeParse(event).success).toBe(false);
    event.type = "PAYMENT_SUCCESS_WEBHOOK";
    expect(webhookResponse.safeParse(event).success).toBe(true);
  });
  it("uses a bounded timeout without exposing provider errors", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener("abort", () => {
              reject(new Error("private provider body"));
            });
          }),
      ),
    );
    const pending = expect(
      cashfreeRequest(config, "/orders/id"),
    ).rejects.toThrow("CASHFREE_UNAVAILABLE");
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
  });
});

describe("Cashfree configuration", () => {
  it("is off with no settings or incomplete credentials", () => {
    vi.stubEnv("CASHFREE_MODE", "");
    expect(cashfreeEnv()).toBeNull();
    vi.stubEnv("CASHFREE_MODE", "sandbox");
    vi.stubEnv("CASHFREE_SANDBOX_CLIENT_ID", "");
    expect(cashfreeEnv()).toBeNull();
  });
  it("cannot turn live checkout on and rejects shared account keys", () => {
    vi.stubEnv("CASHFREE_MODE", "live");
    vi.stubEnv("CASHFREE_LIVE_CLIENT_ID", "live-id");
    vi.stubEnv("CASHFREE_LIVE_CLIENT_SECRET", "live-secret");
    vi.stubEnv("CASHFREE_SANDBOX_CHECKOUT_ENABLED", "true");
    expect(cashfreeEnv()?.checkoutEnabled).toBe(false);
    vi.stubEnv("CASHFREE_SANDBOX_CLIENT_SECRET", "live-secret");
    expect(cashfreeEnv()).toBeNull();
  });
});
