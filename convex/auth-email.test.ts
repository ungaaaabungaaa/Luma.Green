// @vitest-environment edge-runtime
import { symmetricDecrypt } from "better-auth/crypto";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";

import { isLocalAuthTestMode } from "../src/lib/env";
import { api, components } from "./_generated/api";
import { createAuth } from "./auth";
import { convexModules, registerAuth } from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const origin = "http://localhost:3000";
const password = "Disposable-test-password-1024";
const address = "member@example.test";
const mailSchema = z.object({
  to: z.string(),
  text: z.string(),
  kind: z.string(),
});
const inbox: z.infer<typeof mailSchema>[] = [];

beforeEach(() => {
  vi.stubEnv("SITE_URL", origin);
  vi.stubEnv("CONVEX_SITE_URL", "http://127.0.0.1:3211");
  vi.stubEnv("BETTER_AUTH_SECRET", "0123456789abcdef0123456789abcdef");
  vi.stubEnv("ADMIN_EMAIL", "admin@example.test");
  vi.stubEnv("AUTH_LOCAL_TEST_MODE", "true");
  vi.stubEnv("AUTH_LOCAL_EMAIL_INBOX_URL", "http://127.0.0.1:3215/deliver");
  vi.stubEnv(
    "AUTH_LOCAL_EMAIL_INBOX_TOKEN",
    "private-inbox-token-0123456789abcdef",
  );
  vi.stubEnv("AUTH_FROM_EMAIL", "");
  vi.stubEnv("RESEND_API_KEY", "");
  inbox.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, options: RequestInit) => {
      inbox.push(mailSchema.parse(JSON.parse(z.string().parse(options.body))));
      return Promise.resolve(Response.json({ id: "local-receipt" }));
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setup(clientIp?: string, shared?: TestConvex<typeof schema>) {
  const t = shared ?? convexTest(schema, modules);
  if (!shared) registerAuth(t);
  const cookies = new Map<string, string>();
  let count = 0;
  async function request(path: string, body?: Record<string, unknown>) {
    const response = await t.fetch(`/api/auth${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "X-Forwarded-For": clientIp ?? `192.0.2.${String(++count)}`,
        "x-luma-locale": "ar",
        Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      ...(body && { body: JSON.stringify(body) }),
    });
    for (const item of response.headers.getSetCookie()) {
      const first = item.split(";", 1)[0] ?? "";
      const at = first.indexOf("=");
      const key = first.slice(0, at);
      const value = first.slice(at + 1);
      if (value) cookies.set(key, value);
      else cookies.delete(key);
    }
    return response;
  }
  return { t, request };
}
function token(kind: string) {
  const message = inbox.findLast((item) => item.kind === kind);
  if (!message) throw new Error("Expected delivered message");
  const link = message.text.split("\n").find((line) => line.startsWith(origin));
  if (!link) throw new Error("Expected local verification link");
  const url = new URL(link);
  expect(url.pathname).toContain("/ar/login/email/");
  return url.searchParams.get("token") ?? "";
}
async function signUp(browser: ReturnType<typeof setup>) {
  return browser.request("/sign-up/email", {
    email: address,
    password,
    name: "Disposable Member",
  });
}
async function verify(browser: ReturnType<typeof setup>) {
  expect(
    await responseStatus(
      browser.request(
        `/verify-email?token=${encodeURIComponent(token("verification"))}`,
      ),
    ),
  ).toBe(200);
}

it("requires real email verification before session or JWT and handles duplicate signup neutrally", async () => {
  const browser = setup();
  const signup = await signUp(browser);
  expect(signup.status).toBe(200);
  expect(await signup.json()).toMatchObject({
    token: null,
    user: { emailVerified: false },
  });
  expect(await responseBody(browser.request("/get-session"))).toBeNull();
  expect(await responseStatus(browser.request("/convex/token"))).toBe(401);
  const premature = await browser.request("/sign-in/email", {
    email: address,
    password,
  });
  expect(premature.status).toBe(403);
  expect(await premature.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  expect(await responseStatus(signUp(browser))).toBe(200);
  expect(inbox).toHaveLength(1);
  await verify(browser);
  expect(await responseBody(browser.request("/get-session"))).toBeNull();
  expect(
    await responseStatus(
      browser.request("/sign-in/email", {
        email: address,
        password: "wrong-password-123",
      }),
    ),
  ).toBe(401);
  expect(
    await responseStatus(
      browser.request("/sign-in/email", { email: address, password }),
    ),
  ).toBe(200);
  expect(await responseBody(browser.request("/get-session"))).toMatchObject({
    user: { email: address, emailVerified: true },
  });
});

it("resets a verified credential once, revokes sessions, and keeps email verification", async () => {
  const browser = setup();
  await signUp(browser);
  await verify(browser);
  await browser.request("/sign-in/email", { email: address, password });
  expect(
    await responseStatus(
      browser.request("/request-password-reset", { email: address }),
    ),
  ).toBe(200);
  const reset = token("password-reset");
  const nextPassword = "New-disposable-password-5678";
  expect(
    await responseStatus(
      browser.request("/reset-password", {
        token: reset,
        newPassword: nextPassword,
      }),
    ),
  ).toBe(200);
  expect(await responseBody(browser.request("/get-session"))).toBeNull();
  expect(
    await responseStatus(
      browser.request("/reset-password", {
        token: reset,
        newPassword: nextPassword,
      }),
    ),
  ).toBe(400);
  expect(
    await responseStatus(
      browser.request("/sign-in/email", { email: address, password }),
    ),
  ).toBe(401);
  expect(
    await responseStatus(
      browser.request("/sign-in/email", {
        email: address,
        password: nextPassword,
      }),
    ),
  ).toBe(200);
});

it("preserves a real enrolled second factor across normal-user recovery", async () => {
  const browser = setup();
  await signUp(browser);
  await verify(browser);
  await browser.request("/sign-in/email", { email: address, password });
  const enrollment = await browser.request("/two-factor/enable", { password });
  expect(enrollment.status).toBe(200);
  const data = z
    .object({ totpURI: z.string(), backupCodes: z.array(z.string()) })
    .parse(await enrollment.json());
  // The library's own TOTP endpoint generates a code from the returned setup secret.
  expect(new URL(data.totpURI).searchParams.get("secret")).toBeTruthy();
  const factor = z.object({ secret: z.string() }).parse(
    await browser.t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "twoFactor",
      }),
    ),
  );
  const secret = await symmetricDecrypt({
    key: "0123456789abcdef0123456789abcdef",
    data: factor.secret,
  });
  const code = await browser.t.run(async (ctx) => {
    const generated = await createAuth(ctx).api.generateTOTP({
      body: { secret },
    });
    return generated.code;
  });
  expect(
    await responseStatus(browser.request("/two-factor/verify-totp", { code })),
  ).toBe(200);
  await browser.request("/request-password-reset", { email: address });
  await browser.request("/reset-password", {
    token: token("password-reset"),
    newPassword: password,
  });
  const login = await browser.request("/sign-in/email", {
    email: address,
    password,
  });
  expect(await login.json()).toMatchObject({ twoFactorRedirect: true });
  expect(await responseStatus(browser.request("/convex/token"))).toBe(401);
  expect(
    await responseStatus(
      browser.request("/two-factor/verify-backup-code", {
        code: data.backupCodes[0],
      }),
    ),
  ).toBe(200);
});

it("rejects expired verification links", async () => {
  const browser = setup();
  await signUp(browser);
  const old = token("verification");
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 901_000);
  expect(
    await responseStatus(
      browser.request(`/verify-email?token=${encodeURIComponent(old)}`),
    ),
  ).toBe(401);
});

it.each([
  "https://production.convex.site",
  "https://development.convex.site",
  "https://127.0.0.1.evil.test:3211",
  "",
])("disables local delivery on non-local backend %s", async (url) => {
  vi.stubEnv("CONVEX_SITE_URL", url);
  expect(isLocalAuthTestMode()).toBe(false);
  const browser = setup();
  expect(await responseStatus(signUp(browser))).toBe(503);
  expect(inbox).toEqual([]);
  const users = await browser.t.run((ctx) =>
    ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 10 },
    }),
  );
  expect(users.page).toEqual([]);
});
it("disables local delivery for a public site, even on a local backend", () => {
  vi.stubEnv("SITE_URL", "https://luma.green");
  expect(isLocalAuthTestMode()).toBe(false);
});
it("reports delivery failure and permits verification resend after signup", async () => {
  const browser = setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(Response.json({ error: "offline" }, { status: 503 })),
    ),
  );
  expect(await responseStatus(signUp(browser))).toBe(503);
  expect(await responseBody(browser.request("/get-session"))).toBeNull();
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, options: RequestInit) => {
      inbox.push(mailSchema.parse(JSON.parse(z.string().parse(options.body))));
      return Promise.resolve(Response.json({ id: "local-receipt" }));
    }),
  );
  expect(
    await responseStatus(
      browser.request("/send-verification-email", { email: address }),
    ),
  ).toBe(200);
  await verify(browser);
  expect(
    await responseStatus(
      browser.request("/sign-in/email", { email: address, password }),
    ),
  ).toBe(200);
});
it("does not send recovery to unknown or unverified users and rejects reserved phone emails", async () => {
  const browser = setup();
  await signUp(browser);
  inbox.length = 0;
  for (const email of [
    address,
    "unknown@example.test",
    "919000000000@phone.luma.green",
  ])
    expect(
      await responseStatus(
        browser.request("/request-password-reset", { email }),
      ),
    ).toBe(200);
  expect(inbox).toEqual([]);
  expect(
    await responseStatus(
      browser.request("/sign-up/email", {
        email: "919000000000@phone.luma.green",
        password,
        name: "Reserved",
      }),
    ),
  ).toBe(403);
});

it("uses a generated local phone code through the real handler and keeps phone accounts passwordless", async () => {
  const browser = setup();
  const phone = "+919000000231";
  expect(
    await responseStatus(
      browser.request("/phone-number/send-otp", { phoneNumber: phone }),
    ),
  ).toBe(200);
  const message = inbox.find((item) => item.kind === "phone-code");
  expect(message?.to).toBe(phone);
  expect(message?.text).toMatch(/^\d{6}$/);
  expect(
    await responseStatus(
      browser.request("/phone-number/verify", {
        phoneNumber: phone,
        code: message?.text,
      }),
    ),
  ).toBe(200);
  const reset = await browser.request("/request-password-reset", {
    email: "919000000231@phone.luma.green",
  });
  expect(reset.status).toBe(200);
  const accounts = await browser.t.run((ctx) =>
    ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "account",
      paginationOpts: { cursor: null, numItems: 100 },
    }),
  );
  expect(accounts.page).toEqual([]);
});
it("cannot enable a demo phone login on a hosted backend with either test flag", async () => {
  vi.stubEnv("CONVEX_SITE_URL", "https://production.convex.site");
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const browser = setup();
  expect(
    await responseStatus(
      browser.request("/phone-number/send-otp", {
        phoneNumber: "+919000000101",
      }),
    ),
  ).toBe(503);
  expect(inbox).toEqual([]);
});

async function responseStatus(request: Promise<Response>) {
  const response = await request;
  return response.status;
}
async function responseBody(request: Promise<Response>): Promise<unknown> {
  const response = await request;
  return response.json();
}

it("rejects an expired normal-user reset link without changing the password", async () => {
  const browser = setup();
  await signUp(browser);
  await verify(browser);
  await browser.request("/request-password-reset", { email: address });
  const reset = token("password-reset");
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 901_000);
  expect(
    await responseStatus(
      browser.request("/reset-password", {
        token: reset,
        newPassword: "Expired-link-password-123",
      }),
    ),
  ).toBe(400);
  vi.useRealTimers();
  expect(
    await responseStatus(
      browser.request("/sign-in/email", { email: address, password }),
    ),
  ).toBe(200);
});

it("requires the current password for email-user authenticator management", async () => {
  const browser = setup();
  await signUp(browser);
  await verify(browser);
  await browser.request("/sign-in/email", { email: address, password });
  for (const path of [
    "/two-factor/enable",
    "/two-factor/generate-backup-codes",
    "/two-factor/disable",
  ]) {
    expect(
      await responseStatus(browser.request(path, {})),
    ).toBeGreaterThanOrEqual(400);
    expect(
      await responseStatus(
        browser.request(path, { password: "Wrong-password-12345" }),
      ),
    ).toBeGreaterThanOrEqual(400);
  }
  expect(
    await responseStatus(browser.request("/two-factor/enable", { password })),
  ).toBe(200);
});

it("keeps a verified email member outside the configured admin identity", async () => {
  const browser = setup();
  await signUp(browser);
  await verify(browser);
  await browser.request("/sign-in/email", { email: address, password });
  const session = z
    .object({
      user: z.object({ id: z.string(), email: z.string() }),
      session: z.object({ id: z.string() }),
    })
    .parse(await responseBody(browser.request("/get-session")));
  const member = browser.t.withIdentity({
    subject: session.user.id,
    sessionId: session.session.id,
  });
  await expect(member.query(api.admin.overview, {})).rejects.toThrow(
    "NOT_ADMIN",
  );
  const change = await browser.request("/change-email", {
    newEmail: "admin@example.test",
  });
  expect(change.status).toBeGreaterThanOrEqual(400);
  await browser.request("/update-user", {
    email: "admin@example.test",
    emailVerified: true,
  });
  expect(await responseBody(browser.request("/get-session"))).toMatchObject({
    user: { email: address },
  });
  expect(
    await responseStatus(
      browser.request("/sign-up/email", {
        email: "admin@example.test",
        password,
        name: "Unauthorized admin",
      }),
    ),
  ).toBe(403);
});

it("limits repeated signup from the same client without disabling local test quotas", async () => {
  const browser = setup("192.0.2.55");
  for (let attempt = 0; attempt < 5; attempt++)
    expect(await responseStatus(signUp(browser))).toBe(200);
  expect(await responseStatus(signUp(browser))).toBe(429);
  expect(inbox).toHaveLength(1);
});

it("keeps public JWKS available to repeated shared verifier requests without creating a session", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const browser = setup("192.0.2.56");
  const publicKeys = z.object({
    keys: z.array(z.record(z.string(), z.unknown())).min(1),
  });
  for (let attempt = 0; attempt < 105; attempt++) {
    const response = await browser.request("/convex/jwks");
    expect(response.status).toBe(200);
    const jwks = publicKeys.parse(await response.json());
    for (const key of jwks.keys) {
      expect(typeof key.kid).toBe("string");
      for (const secret of ["d", "p", "q", "dp", "dq", "qi", "oth", "k"])
        expect(key).not.toHaveProperty(secret);
    }
  }
  expect(await responseBody(browser.request("/get-session"))).toBeNull();
  expect(await responseStatus(browser.request("/convex/token"))).toBe(401);
  expect(await responseStatus(browser.request("/convex/latest-jwks"))).toBe(
    404,
  );
  expect(await responseStatus(browser.request("/convex/latest-jwks", {}))).toBe(
    404,
  );
});

it.each([
  { path: "/convex/jwks", body: {}, status: 404 },
  { path: "/convex/token", body: undefined, status: 401 },
])(
  "keeps the non-public-key quota on $path",
  async ({ path, body, status }) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const browser = setup("192.0.2.58");
    for (let attempt = 0; attempt < 100; attempt++)
      expect(await responseStatus(browser.request(path, body))).toBe(status);
    expect(await responseStatus(browser.request(path, body))).toBe(429);
  },
);

it.each([
  {
    path: "/sign-in/email",
    body: { email: address, password },
    allowed: 3,
    status: 401,
  },
  {
    path: "/request-password-reset",
    body: { email: address },
    allowed: 3,
    status: 200,
  },
  {
    path: "/send-verification-email",
    body: { email: address },
    allowed: 3,
    status: 200,
  },
  {
    path: "/reset-password",
    body: { token: "invalid-reset", newPassword: password },
    allowed: 5,
    status: 400,
  },
])(
  "retains the credential quota for $path",
  async ({ path, body, allowed, status }) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const browser = setup("192.0.2.57");
    for (let attempt = 0; attempt < allowed; attempt++)
      expect(await responseStatus(browser.request(path, body))).toBe(status);
    expect(await responseStatus(browser.request(path, body))).toBe(429);
  },
);

it("audits email account creation and verification without credential content", async () => {
  const browser = setup();
  await signUp(browser);
  await verify(browser);
  const audit = await browser.t.run((ctx) =>
    ctx.db.query("auditLog").collect(),
  );
  expect(audit.map((row) => row.action)).toEqual(
    expect.arrayContaining(["auth.identity.created", "auth.email.verified"]),
  );
  const recorded = JSON.stringify(audit);
  expect(recorded.includes(address)).toBe(false);
  expect(recorded.includes(password)).toBe(false);
  expect(recorded.includes(token("verification"))).toBe(false);
});

it.each([
  { phoneNumber: "+919000000232" },
  { phoneNumber: null },
  { phoneNumberVerified: false },
])("rejects phone fields at email signup: %j", async (phoneFields) => {
  const browser = setup();
  const response = await browser.request("/sign-up/email", {
    email: address,
    password,
    name: "Disposable Member",
    ...phoneFields,
  });
  expect(response.status).toBe(403);
  expect(inbox).toEqual([]);
  const users = await browser.t.run((ctx) =>
    ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 10 },
    }),
  );
  expect(users.page).toEqual([]);
  expect(await responseBody(browser.request("/get-session"))).toBeNull();
});

it("rejects phone fields on generic email account updates", async () => {
  const browser = setup();
  await signUp(browser);
  await verify(browser);
  await browser.request("/sign-in/email", { email: address, password });
  for (const phoneFields of [
    { phoneNumber: "+919000000232" },
    { phoneNumber: null },
    { phoneNumberVerified: false },
  ])
    expect(
      await responseStatus(browser.request("/update-user", phoneFields)),
    ).toBe(403);
  const user = z.object({ phoneNumber: z.nullish(z.string()) }).parse(
    await browser.t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", value: address }],
      }),
    ),
  );
  expect(user.phoneNumber ?? null).toBeNull();
});

it("keeps the verified number when a phone-only user submits a generic update", async () => {
  const browser = setup();
  const phone = "+919000000233";
  await browser.request("/phone-number/send-otp", { phoneNumber: phone });
  const code = inbox.findLast((item) => item.kind === "phone-code")?.text;
  expect(
    await responseStatus(
      browser.request("/phone-number/verify", { phoneNumber: phone, code }),
    ),
  ).toBe(200);
  expect(
    await responseStatus(
      browser.request("/update-user", { phoneNumber: "+919000000234" }),
    ),
  ).toBe(403);
  expect(await responseBody(browser.request("/get-session"))).toMatchObject({
    user: { phoneNumber: phone, phoneNumberVerified: true },
  });
});

it.each([
  { emailVerified: false, phoneNumberVerified: false },
  { emailVerified: true, phoneNumberVerified: false },
  { emailVerified: false, phoneNumberVerified: true },
  { emailVerified: true, phoneNumberVerified: true },
])(
  "does not use a phone code to sign into an existing email identity: %j",
  async ({ emailVerified, phoneNumberVerified }) => {
    const browser = setup();
    await signUp(browser);
    if (emailVerified) await verify(browser);
    const phone = "+919000000235";
    // Simulate an old or imported binding. HTTP requests cannot
    // create this state after the request-boundary fix.
    await browser.t.run((ctx) =>
      ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "email", value: address }],
          update: { phoneNumber: phone, phoneNumberVerified },
        },
      }),
    );
    await browser.request("/phone-number/send-otp", { phoneNumber: phone });
    const code = inbox.findLast((item) => item.kind === "phone-code")?.text;
    expect(
      await responseStatus(
        browser.request("/phone-number/verify", { phoneNumber: phone, code }),
      ),
    ).toBe(403);
    expect(await responseBody(browser.request("/get-session"))).toBeNull();
    expect(await responseStatus(browser.request("/convex/token"))).toBe(401);
    const user = await browser.t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", value: address }],
      }),
    );
    expect(user).toMatchObject({ emailVerified, phoneNumberVerified });
    expect(
      await responseStatus(
        browser.request("/sign-in/email", { email: address, password }),
      ),
    ).toBe(emailVerified ? 200 : 403);
  },
);

const bindingSessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    twoFactorEnabled: z.boolean().optional(),
  }),
  session: z.object({ id: z.string() }),
});
async function bindingAccount() {
  const browser = setup();
  await signUp(browser);
  await verify(browser);
  await browser.request("/sign-in/email", { email: address, password });
  const session = bindingSessionSchema.parse(
    await responseBody(browser.request("/get-session")),
  );
  const member = browser.t.withIdentity({
    subject: session.user.id,
    sessionId: session.session.id,
  });
  await member.mutation(api.identity.ensureProfile, { locale: "en" });
  return { browser, session, member };
}
async function bindingCode(browser: ReturnType<typeof setup>, phone: string) {
  expect(
    await responseStatus(
      browser.request("/phone-number/send-otp", { phoneNumber: phone }),
    ),
  ).toBe(200);
  return z
    .string()
    .parse(inbox.findLast((item) => item.kind === "phone-code")?.text);
}

it("binds an unused verified phone to the same email user and session with a private audit and matching profile", async () => {
  const { browser, session, member } = await bindingAccount();
  const phone = "+919000000241";
  const code = await bindingCode(browser, phone);
  const response = await browser.request("/phone-number/verify", {
    phoneNumber: phone,
    code,
    updatePhoneNumber: true,
    disableSession: true,
  });
  expect(response.status).toBe(200);
  expect(await responseBody(browser.request("/get-session"))).toMatchObject({
    user: {
      id: session.user.id,
      email: address,
      phoneNumber: phone,
      phoneNumberVerified: true,
    },
    session: { id: session.session.id },
  });
  expect(await member.query(api.identity.me, {})).toMatchObject({ phone });
  const stored = await browser.t.run(async (ctx) => ({
    profile: await ctx.db.query("profiles").first(),
    audit: await ctx.db
      .query("auditLog")
      .filter((q) => q.eq(q.field("action"), "auth.phone.verified"))
      .collect(),
  }));
  expect(stored.profile?.phone).toBe(phone);
  expect(stored.audit).toHaveLength(1);
  expect(JSON.stringify(stored.audit)).not.toContain(phone);
  expect(
    await responseStatus(
      browser.request("/phone-number/verify", {
        phoneNumber: phone,
        code,
        updatePhoneNumber: true,
      }),
    ),
  ).toBe(403);
  await browser.request("/sign-out", {});
  expect(
    await responseStatus(
      browser.request("/phone-number/verify", { phoneNumber: phone, code }),
    ),
  ).toBe(403);
  expect(await responseBody(browser.request("/get-session"))).toBeNull();
});

it("requires recent full authentication before phone binding and leaves the code unused on denial", async () => {
  const { browser } = await bindingAccount();
  const phone = "+919000000242";
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 301_000);
  const code = await bindingCode(browser, phone);
  const denied = await browser.request("/phone-number/verify", {
    phoneNumber: phone,
    code,
    updatePhoneNumber: true,
  });
  expect(denied.status).toBe(403);
  expect(await denied.json()).toMatchObject({
    code: "SECURITY_REAUTH_REQUIRED",
  });
  await browser.request("/sign-out", {});
  await browser.request("/sign-in/email", { email: address, password });
  expect(
    await responseStatus(
      browser.request("/phone-number/verify", {
        phoneNumber: phone,
        code,
        updatePhoneNumber: true,
      }),
    ),
  ).toBe(200);
});

it("rejects a phone owned by another account and invalid codes without changing the signed-in identity", async () => {
  const { browser, session } = await bindingAccount();
  const phone = "+919000000243";
  const code = await bindingCode(browser, phone);
  expect(
    await responseStatus(
      browser.request("/phone-number/verify", {
        phoneNumber: phone,
        code: "bad-code",
        updatePhoneNumber: true,
      }),
    ),
  ).toBe(400);
  await browser.t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: "Other",
          email: "919000000243@phone.luma.green",
          emailVerified: false,
          phoneNumber: phone,
          phoneNumberVerified: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    }),
  );
  const denied = await browser.request("/phone-number/verify", {
    phoneNumber: phone,
    code,
    updatePhoneNumber: true,
  });
  expect(denied.status).toBe(400);
  expect(await denied.json()).toMatchObject({ code: "PHONE_NUMBER_EXIST" });
  expect(await responseBody(browser.request("/get-session"))).toMatchObject({
    user: { id: session.user.id },
    session: { id: session.session.id },
  });
  expect(
    await browser.t.run((ctx) => ctx.db.query("profiles").first()),
  ).not.toHaveProperty("phone");
});

it.each(["anonymous", "unverified", "admin", "phone-only"])(
  "rejects phone binding for %s identities",
  async (kind) => {
    const { browser, session } = await bindingAccount();
    if (kind === "anonymous") await browser.request("/sign-out", {});
    else
      await browser.t.run((ctx) =>
        ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "user",
            where: [{ field: "_id", value: session.user.id }],
            update:
              kind === "unverified"
                ? { emailVerified: false }
                : {
                    email:
                      kind === "admin"
                        ? "admin@example.test"
                        : "919000000244@phone.luma.green",
                  },
          },
        }),
      );
    const phone = "+919000000244";
    const code = await bindingCode(browser, phone);
    expect(
      await responseStatus(
        browser.request("/phone-number/verify", {
          phoneNumber: phone,
          code,
          updatePhoneNumber: true,
        }),
      ),
    ).toBe(403);
    expect(
      await browser.t.run((ctx) => ctx.db.query("profiles").first()),
    ).not.toHaveProperty("phone");
  },
);

it("keeps enrolled TOTP and its existing session while binding the verified phone", async () => {
  const { browser } = await bindingAccount();
  const enrollment = await browser.request("/two-factor/enable", { password });
  expect(enrollment.status).toBe(200);
  const factor = z.object({ secret: z.string() }).parse(
    await browser.t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "twoFactor",
      }),
    ),
  );
  const secret = await symmetricDecrypt({
    key: "0123456789abcdef0123456789abcdef",
    data: factor.secret,
  });
  const { code: totp } = await browser.t.run((ctx) =>
    createAuth(ctx).api.generateTOTP({ body: { secret } }),
  );
  expect(
    await responseStatus(
      browser.request("/two-factor/verify-totp", { code: totp }),
    ),
  ).toBe(200);
  const before = bindingSessionSchema.parse(
    await responseBody(browser.request("/get-session")),
  );
  const phone = "+919000000245";
  const code = await bindingCode(browser, phone);
  expect(
    await responseStatus(
      browser.request("/phone-number/verify", {
        phoneNumber: phone,
        code,
        updatePhoneNumber: true,
      }),
    ),
  ).toBe(200);
  expect(await responseBody(browser.request("/get-session"))).toMatchObject({
    user: { id: before.user.id, twoFactorEnabled: true },
    session: { id: before.session.id },
  });
  await browser.request("/sign-out", {});
  expect(
    await responseBody(
      browser.request("/sign-in/email", { email: address, password }),
    ),
  ).toMatchObject({ twoFactorRedirect: true });
  expect(await responseStatus(browser.request("/convex/token"))).toBe(401);
});

it("allows at most one concurrent email identity to claim the same verified phone", async () => {
  const { browser } = await bindingAccount();
  const second = setup(undefined, browser.t);
  const email = "second-binding@example.test";
  await second.request("/sign-up/email", { email, password, name: "Second" });
  await verify(second);
  await second.request("/sign-in/email", { email, password });
  const phone = "+919000000246";
  const code = await bindingCode(browser, phone);
  const results = await Promise.all(
    [browser, second].map(async (client) => {
      const response = await client.request("/phone-number/verify", {
        phoneNumber: phone,
        code,
        updatePhoneNumber: true,
      });
      return response.status;
    }),
  );
  expect(results.filter((status) => status === 200)).toHaveLength(1);
  const owners = await browser.t.run((ctx) =>
    ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      where: [{ field: "phoneNumber", value: phone }],
      paginationOpts: { cursor: null, numItems: 10 },
    }),
  );
  expect(owners.page).toHaveLength(1);
});
