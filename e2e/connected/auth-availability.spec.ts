import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

import { expect, type Page, test } from "@playwright/test";
import { z } from "zod";

import en from "../../messages/en.json";

const raw: unknown = JSON.parse(
  readFileSync(".convex/local-acceptance/credentials.json", "utf8"),
);
const accountSchema = z.object({
  key: z.string(),
  email: z.email(),
  password: z.string(),
});
const roster = z
  .object({ site: z.url(), accounts: z.array(accountSchema) })
  .parse(raw);
// Workspace membership tests deliberately remove team-role access. Keep this
// transport regression on an identity whose workspace remains stable.
const account = accountSchema.parse(
  roster.accounts.find(({ key }) => key === "preprocessor"),
);
const site = new URL(roster.site);
if (
  site.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)
)
  throw new Error("Auth availability acceptance requires the local site.");

async function exhaustTokenQuota(page: Page) {
  for (let index = 0; index < 105; index++) {
    const response = await page.request.get("/api/auth/convex/token");
    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["x-retry-after"]);
      if (
        !Number.isSafeInteger(retryAfter) ||
        retryAfter < 1 ||
        retryAfter > 10
      )
        throw new Error("Token quota returned an invalid retry interval.");
      return retryAfter;
    }
    expect(response.status()).toBe(200);
  }
  throw new Error("The existing token quota did not reject the bounded probe.");
}

test.use({ trace: "off", screenshot: "off", video: "off" });

test("a rate-limited token check preserves the session and offers explicit recovery", async ({
  page,
  context,
}) => {
  const responses: { path: string; status: number }[] = [];
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (path === "/api/auth/get-session" || path === "/api/auth/convex/token")
      responses.push({ path, status: response.status() });
  });
  await context.setExtraHTTPHeaders({ "X-Forwarded-For": "192.0.2.242" });
  const login = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: site.origin },
    data: { email: account.email, password: account.password },
  });
  expect(login.status()).toBe(200);
  await page.goto("/en/account/security");
  await expect(
    page.getByRole("heading", { name: en.accountSecurity.title, exact: true }),
  ).toBeVisible();
  const retryAfter = await exhaustTokenQuota(page);
  const sessionResponse = await page.request.get("/api/auth/get-session");
  const session: unknown = await sessionResponse.json();
  expect(sessionResponse.status()).toBe(200);
  expect(
    session !== null,
    "The existing session is still valid at the token quota",
  ).toBe(true);
  await page.goto("/en/account/security");
  await expect(
    page.getByRole("heading", { name: en.common.error, exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname.endsWith("/account/security")).toBe(true);
  await expect(
    page.getByRole("heading", { name: en.accountSecurity.title, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel(en.emailAuth.password, { exact: true }),
  ).toHaveCount(0);
  // Honour the real server's quiet window. No quota reset, relogin or blind retry.
  await delay((retryAfter + 1) * 1000);
  await page
    .getByRole("button", { name: en.common.retry, exact: true })
    .click();
  try {
    await expect(
      page.getByRole("heading", {
        name: en.accountSecurity.title,
        exact: true,
      }),
    ).toBeVisible();
  } catch {
    const currentSession = await page.request.get("/api/auth/get-session");
    const body: unknown = await currentSession.json();
    const tokenResponse = await page.request.get("/api/auth/convex/token");
    const tokenStatus = tokenResponse.status();
    const diagnostic = {
      path: new URL(page.url()).pathname,
      hasSession: body !== null,
      tokenStatus,
      signInAgain: await page
        .getByRole("link", {
          name: en.accountSecurity.signInAgain,
          exact: true,
        })
        .count(),
      recovery: await page
        .getByRole("button", { name: en.common.retry, exact: true })
        .count(),
      responses,
    };
    throw new Error(`Recovery failed: ${JSON.stringify(diagnostic)}`);
  }
  await expect(
    page.getByLabel(en.emailAuth.password, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: en.nav.openMenu }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: en.app.signOut, exact: true })
    .click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.goto("/en/account/security");
  await expect(page).toHaveURL(/\/login\?next=/);
});

// Deliberate client-only fault: the server guard and session remain real.
// This complements the real quota test above without weakening its limits.
test("a client token transport failure preserves the signed-in route until manual recovery", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await context.setExtraHTTPHeaders({ "X-Forwarded-For": "192.0.2.245" });
  const login = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: site.origin },
    data: { email: account.email, password: account.password },
  });
  expect(login.status()).toBe(200);
  let faults = 0;
  await page.route("**/api/auth/convex/token", async (route) => {
    faults++;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "SERVICE_UNAVAILABLE" }),
    });
  });
  await page.goto("/en/app/trades");
  await expect(
    page.getByRole("heading", { name: en.common.error, exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname.endsWith("/app/trades")).toBe(true);
  expect(faults).toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: en.market.trades.title, exact: true }),
  ).toHaveCount(0);
  const sessionResponse = await page.request.get("/api/auth/get-session");
  const session: unknown = await sessionResponse.json();
  expect(sessionResponse.status()).toBe(200);
  expect(session !== null, "The cookie session remains valid").toBe(true);
  const token = await page.request.get("/api/auth/convex/token");
  expect(token.status()).toBe(200);
  await page.unroute("**/api/auth/convex/token");
  await page
    .getByRole("button", { name: en.common.retry, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: en.market.trades.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(en.market.trades.gatewayPending, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: en.app.more, exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: en.app.signOut, exact: true })
    .click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  const signedOut = await page.request.get("/api/auth/convex/token");
  expect(signedOut.status()).toBe(401);
});

for (const [index, entry] of [
  { path: "/account/security", heading: en.accountSecurity.title },
  { path: "/account/notifications", heading: en.notifications.title },
  {
    path: "/login/email/complete?next=/account/security",
    heading: en.accountSecurity.title,
  },
].entries()) {
  test(`client token failure has manual recovery at ${entry.path}`, async ({
    page,
    context,
  }) => {
    await context.setExtraHTTPHeaders({
      "X-Forwarded-For": `192.0.2.${String(246 + index)}`,
    });
    const login = await page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: site.origin },
      data: { email: account.email, password: account.password },
    });
    expect(login.status()).toBe(200);
    await page.route("**/api/auth/convex/token", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "SERVICE_UNAVAILABLE" }),
      });
    });
    await page.goto(`/en${entry.path}`);
    await expect(
      page.getByRole("button", { name: en.common.retry, exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname.replace(/^\/en(?=\/)/, "")).toBe(
      entry.path.split("?", 1)[0],
    );
    const session = await page.request.get("/api/auth/get-session");
    expect(session.status()).toBe(200);
    expect(await session.json()).not.toBeNull();
    await page.unroute("**/api/auth/convex/token");
    await page
      .getByRole("button", { name: en.common.retry, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: entry.heading, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: en.common.retry, exact: true }),
    ).toHaveCount(0);
    const logout = await page.request.post("/api/auth/sign-out", {
      headers: { Origin: site.origin },
      data: {},
    });
    expect(logout.status()).toBe(200);
    await page.goto("/en/account/security");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
}
