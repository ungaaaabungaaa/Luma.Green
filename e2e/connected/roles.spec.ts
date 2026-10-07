import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import { api } from "../../convex/_generated/api";
import { LOCAL_ACCEPTANCE_PERSONAS } from "../../convex/lib/localAcceptance";
import en from "../../messages/en.json" with { type: "json" };

const accountSchema = z.object({
  key: z.string(),
  email: z.email(),
  password: z.string(),
});
const credentialsSource: unknown = JSON.parse(
  readFileSync(".convex/local-acceptance/credentials.json", "utf8"),
);
const credentials = z
  .object({ accounts: z.array(accountSchema) })
  .parse(credentialsSource);
type Persona = (typeof LOCAL_ACCEPTANCE_PERSONAS)[number];
type OrgKind = "kabadiwala" | "yard" | "recycler" | "manufacturer";
const teamRoles = new Map([
  ["team-admin", "admin"],
  ["team-member", "member"],
  ["team-viewer", "viewer"],
] as const);

test.use({ actionTimeout: 15_000 });

interface AuthRequestStatus {
  path: string;
  status: number;
  elapsedMs: number;
  hasSession?: boolean;
}
const authRequests = new WeakMap<Page, AuthRequestStatus[]>();
const authSocketEvents = new WeakMap<Page, string[]>();
const wireAuthSchema = z.object({
  type: z.enum(["AuthError", "Authenticate"]),
  tokenType: z.enum(["User", "None", "Admin"]).optional(),
  error: z.string().optional(),
});
function socketAuthStatus(payload: string | Buffer): string | undefined {
  let source: unknown;
  try {
    source = JSON.parse(String(payload));
  } catch {
    return;
  }
  const parsed = wireAuthSchema.safeParse(source);
  if (!parsed.success) return;
  if (parsed.data.type === "Authenticate")
    return `Authenticate:${parsed.data.tokenType ?? "unknown"}`;
  const error = parsed.data.error?.toLowerCase() ?? "";
  const categories = [
    "expired",
    "jwks",
    "jwk",
    "fetch",
    "issuer",
    "audience",
    "signature",
    "not yet",
    "rate",
    "connection",
    "timeout",
  ].filter((category) => error.includes(category));
  return `AuthError:${categories.join(",") || "unclassified"}`;
}
const authPaths = new Set([
  "/api/auth/get-session",
  "/api/auth/sign-in/email",
  "/api/auth/convex/token",
  "/api/auth/sign-out",
]);

test.beforeEach(({ page }) => {
  const started = Date.now();
  const requests: AuthRequestStatus[] = [];
  const socketEvents: string[] = [];
  authRequests.set(page, requests);
  authSocketEvents.set(page, socketEvents);
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (!authPaths.has(path)) return;
    const record: AuthRequestStatus = {
      path,
      status: response.status(),
      elapsedMs: Date.now() - started,
    };
    requests.push(record);
    if (path === "/api/auth/get-session") {
      void response
        .json()
        .then((body: unknown) => {
          record.hasSession =
            body !== null && typeof body === "object" && "session" in body;
        })
        .catch(() => {
          // Navigation can dispose the response body; the HTTP status is retained.
        });
    }
  });
  const record = (direction: string, payload: string | Buffer) => {
    const status = socketAuthStatus(payload);
    if (status)
      socketEvents.push(
        `${String(Date.now() - started)}:${direction}:${status}`,
      );
  };
  page.on("websocket", (socket) => {
    socket.on("framereceived", ({ payload }) => {
      record("received", payload);
    });
    socket.on("framesent", ({ payload }) => {
      record("sent", payload);
    });
  });
});

function saveRoleDiagnostic(
  persona: Persona,
  name: "auth-events" | "session-status" | `page-errors-${string}`,
  body: string,
) {
  const directory = ".convex/local-acceptance/role-auth-diagnostics";
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = `${directory}/${persona.key}-${name}.json`;
  writeFileSync(path, body, { mode: 0o600 });
  chmodSync(path, 0o600);
}

test.afterEach(async ({ page }, info) => {
  const persona = LOCAL_ACCEPTANCE_PERSONAS.find(({ key }) =>
    info.title.startsWith(`${key}:`),
  );
  if (!persona) throw new Error("Missing local role diagnostic owner");
  const events = JSON.stringify({
    authRequests: authRequests.get(page),
    authSocketEvents: authSocketEvents.get(page),
  });
  saveRoleDiagnostic(persona, "auth-events", events);
  await info.attach("auth-events", {
    body: events,
    contentType: "application/json",
  });
  if (info.status === info.expectedStatus) return;
  const response = await page.request.get("/api/auth/get-session");
  const body: unknown = await response.json();
  const tokenResponse = await page.request.get("/api/auth/convex/token");
  const pathname = new URL(page.url()).pathname;
  const session = JSON.stringify({
    status: response.status(),
    tokenStatus: tokenResponse.status(),
    hasSession: body !== null && typeof body === "object" && "session" in body,
    pathname,
    authRequests: authRequests.get(page),
    authSocketEvents: authSocketEvents.get(page),
  });
  saveRoleDiagnostic(persona, "session-status", session);
  await info.attach("session-status", {
    body: session,
    contentType: "application/json",
  });
});

function teamRole(key: string) {
  for (const [candidate, role] of teamRoles) {
    if (candidate === key) return role;
  }
}

async function signIn(page: Page, persona: Persona, index: number) {
  const account = credentials.accounts.find(({ key }) => key === persona.key);
  if (!account) throw new Error(`Missing local account: ${persona.key}`);
  await page.setExtraHTTPHeaders({
    "X-Forwarded-For": `192.0.2.${String(index + 1)}`,
  });
  await page.goto("/en/login?next=/account/workspaces");
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await page
    .getByRole("button", { name: en.auth.continue, exact: true })
    .click();
  await page
    .getByRole("tab", { name: en.emailAuth.email, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: en.emailAuth.email, exact: true })
    .fill(account.email);
  await page
    .getByLabel(en.emailAuth.password, { exact: true })
    .fill(account.password);
  await page
    .getByRole("button", { name: en.emailAuth.signin, exact: true })
    .click();
  // Wait beyond EmailComplete's 20-second recovery deadline so failures show their state.
  await expect(page).toHaveURL(/\/account\/workspaces$/, { timeout: 25_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.workspace.title,
  );
  const role = teamRole(persona.key);
  if (role || persona.access.kind === "org") {
    const name = role ? "Local test kabadiwala owner" : persona.name;
    const workspace = page
      .getByRole("region", { name: en.workspace.choose })
      .getByRole("listitem")
      .filter({ hasText: name });
    await expect(
      workspace.getByText(role ? en.workspace[role] : en.workspace.owner, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(workspace.getByRole("button")).toBeDisabled();
    await expect(
      page.getByRole("region", { name: en.workspace.team }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByText(en.workspace.empty, { exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
}

async function checkAccountScreens(page: Page) {
  await page.goto("/en/account/security");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.accountSecurity.title,
  );
  await expect(
    page.getByText(en.accountSecurity.disabled, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(en.emailAuth.password, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);

  await page.goto("/en/account/notifications");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.notifications.title,
  );
  const inbox = page.getByRole("region", { name: en.notifications.inboxTitle });
  // The title renders before the query. Require a resolved inbox state.
  await expect(
    inbox
      .getByRole("heading", { name: en.notifications.emptyTitle })
      .or(inbox.getByRole("listitem").first()),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: en.notifications.deviceTitle })
      .getByRole("status"),
  ).toHaveText(en.notifications.disabled);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
}

async function checkOrgScreens(page: Page, kind: OrgKind) {
  await page.goto("/en/app/stock");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.shop.stock.title,
  );
  await expect(
    page.getByText(en.shop.stock.totalWeight, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(en.shop.stock.worth, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);

  await page.goto("/en/app/trades");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.market.trades.title,
  );
  await expect(
    page.getByText(en.market.trades.gatewayPending, { exact: true }),
  ).toBeVisible();
  const tab = kind === "kabadiwala" ? "selling" : "buying";
  const empty =
    tab === "selling"
      ? en.market.trades.emptySellingTitle
      : en.market.trades.emptyBuyingTitle;
  await expect(
    page
      .getByText(empty, { exact: true })
      .or(
        page.getByRole("region", { name: en.market.trades[tab], exact: true }),
      ),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);

  await page.goto("/en/app/compliance");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.compliance.title,
  );
  await expect(
    page.getByRole("heading", { name: en.compliance.checklist.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: en.compliance.receipts.title }),
  ).toBeVisible();
  const alerts = page.getByRole("main").getByRole("alert");
  // Local fixtures intentionally contain no fabricated regulatory consent.
  if (kind === "kabadiwala") await expect(alerts).toHaveCount(0);
  else {
    await expect(alerts).toHaveCount(1);
    await expect(alerts).toContainText(en.compliance.consent.missingTitle);
    await expect(alerts).toContainText(en.compliance.consent.missingBody);
  }
}

async function checkProtectedAccess(page: Page, persona: Persona) {
  await page.goto("/en/app");
  const role = teamRole(persona.key);
  if (role || persona.access.kind === "org") {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      role ? "Local test kabadiwala owner" : persona.name,
    );
    const kind =
      persona.access.kind === "org" ? persona.access.orgKind : "kabadiwala";
    await checkOrgScreens(page, kind);
  } else if (persona.access.kind === "saathi") {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      persona.name,
    );
    await page.goto("/en/app/impact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en.impact.saathi.title,
    );
    await expect(
      page
        .getByText(en.impact.saathi.empty, { exact: true })
        .or(page.getByRole("heading", { name: en.impact.saathi.history })),
    ).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  } else {
    // Stakeholder approval and a personal account grant no business membership.
    await expect(page).toHaveURL(/\/join\/status$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en.join.status.none.title,
    );
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  }
}

async function signOutAndCheckAccess(page: Page) {
  // Retain a real issued JWT in memory to prove session revocation at the backend.
  const tokenResponse = await page.request.get("/api/auth/convex/token");
  const token = z
    .object({ token: z.string() })
    .safeParse(await tokenResponse.json());
  if (!tokenResponse.ok() || !token.success)
    throw new Error("Signed-in session has no Convex token");
  const client = new ConvexHttpClient("http://127.0.0.1:3210", {
    auth: token.data.token,
    logger: false,
  });
  await client.query(api.workspace.list, {});
  await page.goto("/en/account/security");
  await expect(
    page.getByLabel(en.emailAuth.password, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: en.nav.openMenu }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: en.app.signOut, exact: true })
    .click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  const sessionResponse = await page.request.get("/api/auth/get-session");
  expect(sessionResponse.ok()).toBe(true);
  const session: unknown = await sessionResponse.json();
  expect(session === null, "The signed-out browser has no session").toBe(true);
  const signedOutToken = await page.request.get("/api/auth/convex/token");
  expect(signedOutToken.status()).toBe(401);
  await expect(client.query(api.workspace.list, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await page.goto("/en/account/security");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(
    page.getByRole("tab", { name: en.emailAuth.email, exact: true }),
  ).toBeVisible();
}

// Actual browser sign-in and sign-out with the real Better Auth/Convex backend.
// No route mocks, auth-table insertion, fixed OTP or injected browser session.
for (const [index, persona] of LOCAL_ACCEPTANCE_PERSONAS.entries()) {
  test(`${persona.key}: email sign-in, account screens and protected access`, async ({
    page,
  }) => {
    const errors: string[] = [];
    const privateErrors: {
      name: string;
      message: string;
      stack: string | undefined;
      location: string;
      phase: string;
      elapsedMs: number;
    }[] = [];
    const started = Date.now();
    const diagnosticName = `page-errors-${String(started)}` as const;
    let phase = "sign-in";
    // Full exceptions can contain account or invitation URLs. Retain them only
    // in the ignored, restricted local diagnostics; never attach them to reports.
    saveRoleDiagnostic(persona, diagnosticName, JSON.stringify(privateErrors));
    page.on("pageerror", (error) => {
      const category = [
        "TypeError",
        "ReferenceError",
        "SyntaxError",
        "RangeError",
      ].includes(error.name)
        ? error.name
        : "UncaughtBrowserError";
      errors.push(`${phase}:${category}`);
      privateErrors.push({
        name: error.name,
        message: error.message,
        stack: error.stack,
        location: page.url(),
        phase,
        elapsedMs: Date.now() - started,
      });
      saveRoleDiagnostic(
        persona,
        diagnosticName,
        JSON.stringify(privateErrors, null, 2),
      );
    });
    await signIn(page, persona, index);
    phase = "account-screens";
    await checkAccountScreens(page);
    phase = "protected-access";
    await checkProtectedAccess(page, persona);
    phase = "sign-out-and-revocation";
    await signOutAndCheckAccess(page);
    expect(errors, "No uncaught browser exception").toEqual([]);
  });
}
