// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { components } from "./_generated/api";
import { convexModules, registerAuth, signIn } from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("rejects a resend before storing another code, even with a different client IP", async () => {
  vi.useFakeTimers();
  vi.stubEnv("SITE_URL", "https://luma.test");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
  vi.stubEnv("BETTER_AUTH_SECRET", "0123456789abcdef0123456789abcdef");
  vi.stubEnv("MSG91_AUTH_KEY", "test-key");
  vi.stubEnv("MSG91_OTP_TEMPLATE_ID", "test-template");
  const t = convexTest(schema, modules);
  registerAuth(t);
  const send = (ip: string) =>
    t.fetch("/api/auth/phone-number/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://luma.test",
        "X-Forwarded-For": ip,
      },
      body: JSON.stringify({ phoneNumber: "+919876543210" }),
    });
  const first = await send("192.0.2.1");
  expect(first.status).toBe(200);
  const second = await send("192.0.2.2");
  expect(second.status).toBe(429);
  expect(second.headers.get("Retry-After")).toBe("30");
  const codes = await t.run((ctx) =>
    ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "verification",
      where: [{ field: "identifier", value: "+919876543210" }],
      paginationOpts: { cursor: null, numItems: 10 },
    }),
  );
  expect(codes.page).toHaveLength(1);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ type: "success" })),
  );
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

it.each([
  { email: "admin@luma.test", status: 403 },
  { email: "919876543210@phone.luma.green", status: 200 },
])(
  "phone-code sign-in permits members but requires the admin route for $email",
  async ({ email, status }) => {
    vi.stubEnv("SITE_URL", "https://luma.test");
    vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
    vi.stubEnv("BETTER_AUTH_SECRET", "0123456789abcdef0123456789abcdef");
    vi.stubEnv("ADMIN_EMAIL", "admin@luma.test");
    const t = convexTest(schema, modules);
    registerAuth(t);
    await signIn(t, {
      email,
      phoneNumber: "+919876543210",
      twoFactorEnabled: email === "admin@luma.test",
    });
    const sessions = () =>
      t.run((ctx) =>
        ctx.runQuery(components.betterAuth.adapter.findMany, {
          model: "session",
          paginationOpts: { cursor: null, numItems: 10 },
        }),
      );
    const before = await sessions();
    const now = Date.now();
    await t.run((ctx) =>
      ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "verification",
          data: {
            identifier: "+919876543210",
            value: "345678:0",
            expiresAt: now + 60_000,
            createdAt: now,
            updatedAt: now,
          },
        },
      }),
    );
    const result = await t.fetch("/api/auth/phone-number/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://luma.test",
      },
      body: JSON.stringify({ phoneNumber: "+919876543210", code: "345678" }),
    });
    expect(result.status).toBe(status);
    const after = await sessions();
    if (status === 403) {
      expect(await result.json()).not.toHaveProperty("token");
      expect(result.headers.get("set-cookie")).toBeNull();
      expect(after.page).toEqual(before.page);
    } else {
      expect(await result.json()).toHaveProperty("token");
      expect(result.headers.get("set-cookie")).toBeTruthy();
      expect(before.page).toHaveLength(1);
      expect(after.page).toHaveLength(2);
    }
  },
);
