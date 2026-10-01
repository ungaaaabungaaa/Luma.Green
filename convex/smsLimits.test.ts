// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "./_generated/api";
import { convexModules } from "./lib/auth.testing";
import {
  SMS_DAY_MS,
  SMS_WINDOW_MS,
  smsAllowance,
  smsPhoneHash,
} from "./lib/smsLimits";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const phoneHash = "a".repeat(64);
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("SMS quotas", () => {
  it("allows three codes per rolling 15 minutes with a server cooldown", () => {
    const now = 1_000_000;
    expect(smsAllowance([], now).allowed).toBe(true);
    expect(smsAllowance([now - 29_000], now)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(smsAllowance([now - 60_000, now - 30_000], now).allowed).toBe(true);
    expect(
      smsAllowance([now - 60_000, now - 30_000, now], now + 30_000),
    ).toMatchObject({ allowed: false, retryAfterSeconds: 810 });
    expect(
      smsAllowance([now - SMS_WINDOW_MS, now - 60_000, now - 30_000], now)
        .allowed,
    ).toBe(true);
  });

  it("allows only ten codes in a rolling day, even across many short windows", () => {
    const now = 2 * SMS_DAY_MS;
    const sent = Array.from(
      { length: 10 },
      (_, i) => now - (i + 1) * 60 * 60_000,
    );
    expect(smsAllowance(sent, now).allowed).toBe(false);
    expect(smsAllowance(sent, now + 14 * 60 * 60_000).allowed).toBe(true);
    expect(smsAllowance([now - SMS_DAY_MS], now).recent).toEqual([]);
  });

  it("uses a secret-keyed identifier, stable for one number and different after key rotation", async () => {
    const hash = await smsPhoneHash("+919876543210", "secret-a");
    expect(hash).toMatch(/^[a-f\d]{64}$/);
    expect(await smsPhoneHash("+919876543210", "secret-a")).toBe(hash);
    expect(await smsPhoneHash("+919876543210", "secret-b")).not.toBe(hash);
    expect(await smsPhoneHash("+919876543211", "secret-a")).not.toBe(hash);
  });

  it("reserves atomically across concurrent requests and isolates different numbers", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        t.mutation(internal.smsLimits.reserve, { phoneHash }),
      ),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(
      await t.mutation(internal.smsLimits.reserve, {
        phoneHash: "b".repeat(64),
      }),
    ).toMatchObject({ allowed: true });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(
      await t.mutation(internal.smsLimits.reserve, { phoneHash }),
    ).toMatchObject({ allowed: true });
    const rows = await t.run((ctx) => ctx.db.query("smsRateLimits").collect());
    expect(rows).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toContain("9876543210");
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(
      await t.run((ctx) => ctx.db.query("smsRateLimits").collect()),
    ).toHaveLength(0);
  });

  it("does not let an old cleanup timer erase a newer request", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    await t.mutation(internal.smsLimits.reserve, { phoneHash });
    await vi.advanceTimersByTimeAsync(SMS_DAY_MS - 1000);
    await t.mutation(internal.smsLimits.reserve, { phoneHash });
    await vi.advanceTimersByTimeAsync(1000);
    await t.finishInProgressScheduledFunctions();
    expect(
      await t.mutation(internal.smsLimits.reserve, { phoneHash }),
    ).toMatchObject({ allowed: false });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  });
});

describe("SMS provider response", () => {
  it.each([
    { status: 200, body: { type: "success", message: "id" }, ok: true },
    {
      status: 200,
      body: { type: "error", message: "secret provider details" },
      ok: false,
    },
    { status: 200, body: {}, ok: false },
    { status: 429, body: { type: "error" }, ok: false },
  ])("handles $status with $body.type", async ({ status, body, ok }) => {
    vi.stubEnv("MSG91_AUTH_KEY", "key");
    vi.stubEnv("MSG91_OTP_TEMPLATE_ID", "template");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(body, { status }));
    vi.stubGlobal("fetch", fetchMock);
    const t = convexTest(schema, modules);
    const sending = t.action(internal.sms.sendCode, {
      phone: "+919876543210",
      code: "654321",
    });
    if (ok) await expect(sending).resolves.toBeNull();
    else await expect(sending).rejects.toThrow(/MSG91/);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("does not retry an ambiguous transport failure", async () => {
    vi.stubEnv("MSG91_AUTH_KEY", "key");
    vi.stubEnv("MSG91_OTP_TEMPLATE_ID", "template");
    const fetchMock = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", fetchMock);
    const t = convexTest(schema, modules);
    await expect(
      t.action(internal.sms.sendCode, {
        phone: "+919876543210",
        code: "654321",
      }),
    ).rejects.toThrow("timeout");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
