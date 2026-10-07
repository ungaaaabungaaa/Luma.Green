// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { components } from "./_generated/api";
import { convexModules, registerAuth } from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const SETUP_TOKEN = "test-setup-token-0123456789abcdef";
const ADMIN_EMAIL = "admin@luma.test";
const PASSWORD = "Test-password-0123456789";

afterEach(() => {
  vi.unstubAllEnvs();
});

function setup() {
  vi.stubEnv("SITE_URL", "https://luma.test");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
  vi.stubEnv("BETTER_AUTH_SECRET", "0123456789abcdef0123456789abcdef");
  vi.stubEnv("ADMIN_EMAIL", ADMIN_EMAIL);
  vi.stubEnv("ADMIN_SETUP_TOKEN", SETUP_TOKEN);
  const t = convexTest(schema, modules);
  registerAuth(t);
  return t;
}

function signUp(
  t: ReturnType<typeof setup>,
  token?: string,
  email = ADMIN_EMAIL,
) {
  return t.fetch("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://luma.test",
      ...(token && { "x-luma-admin-setup-token": token }),
    },
    body: JSON.stringify({ email, password: PASSWORD, name: "Test Admin" }),
  });
}

it.each([
  [SETUP_TOKEN, undefined],
  [SETUP_TOKEN, "wrong-setup-token-0123456789abcdef"],
  ["", SETUP_TOKEN],
  ["short-token", "short-token"],
  ["x".repeat(513), "x".repeat(513)],
])(
  "requires the configured bootstrap secret before creating any account (case %#)",
  async (configured, provided) => {
    const t = setup();
    vi.stubEnv("ADMIN_SETUP_TOKEN", configured);
    const response = await signUp(t, provided);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "ADMIN_SETUP_REQUIRED",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    const accounts = await t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "user",
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    );
    expect(accounts.page).toEqual([]);
  },
);

it("does not use the admin bootstrap token as normal-user email delivery configuration", async () => {
  const t = setup();
  const response = await signUp(t, SETUP_TOKEN, "other@luma.test");
  expect(response.status).toBe(503);
  expect(response.headers.get("set-cookie")).toBeNull();
});

it("allows authorized setup and retains the TOTP challenge after the secret is removed", async () => {
  const t = setup();
  const response = await signUp(t, SETUP_TOKEN);
  expect(response.status).toBe(200);
  const created = (await response.json()) as {
    user: { id: string };
    token: string;
  };
  expect(created.token).toBeTruthy();
  await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: created.user.id }],
        update: { twoFactorEnabled: true },
      },
    }),
  );
  vi.stubEnv("ADMIN_SETUP_TOKEN", "");
  const login = await t.fetch("/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://luma.test",
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
  });
  expect(login.status).toBe(200);
  expect(await login.json()).toMatchObject({ twoFactorRedirect: true });
  const sessions = await t.run((ctx) =>
    ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "session",
      paginationOpts: { cursor: null, numItems: 10 },
    }),
  );
  // Only the original setup session remains; password sign-in has no session
  // until the independent second-factor challenge has completed.
  expect(sessions.page).toHaveLength(1);
});
