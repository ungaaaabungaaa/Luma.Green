// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { components } from "./_generated/api";
import { convexModules, registerAuth } from "./lib/auth.testing";
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
