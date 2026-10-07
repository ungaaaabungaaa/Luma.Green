import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseEnv } from "node:util";

import { type Browser, expect, type Page, test } from "@playwright/test";
import { z } from "zod";

import ar from "../../messages/ar.json" with { type: "json" };
import en from "../../messages/en.json" with { type: "json" };

const accountSchema = z.object({
  key: z.string(),
  name: z.string(),
  email: z.email(),
  password: z.string(),
});
const credentialsSource = JSON.parse(
  readFileSync(".convex/local-acceptance/credentials.json", "utf8"),
) as unknown;
const credentials = z
  .object({ site: z.url(), accounts: z.array(accountSchema) })
  .parse(credentialsSource);
const inbox = z
  .object({
    AUTH_LOCAL_TEST_MODE: z.literal("true"),
    AUTH_LOCAL_EMAIL_INBOX_URL: z.url(),
    AUTH_LOCAL_EMAIL_INBOX_TOKEN: z.string().min(32),
  })
  .parse(
    parseEnv(readFileSync(".convex/local-acceptance/backend.env", "utf8")),
  );
const inboxUrl = new URL(inbox.AUTH_LOCAL_EMAIL_INBOX_URL);
if (
  inboxUrl.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(inboxUrl.hostname)
) {
  throw new Error("Acceptance uses only the protected local email inbox.");
}
const messageSchema = z.object({ kind: z.string(), text: z.string() });
const mailSchema = z.object({ messages: z.array(messageSchema) });
type InvitationRole = "admin" | "member" | "viewer";

function account(key: string) {
  const found = credentials.accounts.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Missing local acceptance account: ${key}`);
  return found;
}

async function signIn(page: Page, key: string) {
  const person = account(key);
  // Use the real Better Auth handler; browser cookies come from its response.
  const response = await page.request.post(
    `${credentials.site}/api/auth/sign-in/email`,
    {
      headers: {
        Origin: credentials.site,
      },
      data: { email: person.email, password: person.password },
    },
  );
  expect(response.ok(), `Local sign-in for ${key}`).toBe(true);
  await page.goto("/en/account/workspaces");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.workspace.title,
  );
}

async function inboxMessages(page: Page, key: string) {
  const url = new URL("/messages", inboxUrl.origin);
  url.searchParams.set("to", account(key).email);
  const response = await page.request.get(url.href, {
    headers: { Authorization: `Bearer ${inbox.AUTH_LOCAL_EMAIL_INBOX_TOKEN}` },
  });
  if (!response.ok()) throw new Error("Local inbox request failed");
  return mailSchema.parse(await response.json()).messages;
}

async function removeCandidate(page: Page, key: string) {
  const team = page.getByRole("region", { name: en.workspace.team });
  await expect(team).toBeVisible();
  const row = team.getByRole("listitem").filter({ hasText: account(key).name });
  if (await row.count()) {
    await row
      .getByRole("button", { name: en.workspace.remove, exact: true })
      .click();
    await row
      .getByRole("button", { name: en.workspace.remove, exact: true })
      .last()
      .click();
    await expect(row).toHaveCount(0);
  }
  const pending = page
    .getByRole("region", { name: en.workspace.pending })
    .getByRole("listitem")
    .filter({ hasText: account(key).email });
  const pendingInvites = await pending.all();
  for (const invite of pendingInvites) {
    await invite
      .getByRole("button", { name: en.workspace.revoke, exact: true })
      .click();
  }
  await expect(pending).toHaveCount(0);
}

async function checkRoleControls(page: Page, role: InvitationRole) {
  const inviteButton = page.getByRole("button", { name: en.workspace.invite });
  if (role === "admin") {
    await expect(inviteButton).toBeVisible();
    const form = page.getByRole("region", { name: en.workspace.invite });
    await form.getByRole("combobox").click();
    await expect(
      page.getByRole("option", { name: en.workspace.admin, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("option", { name: en.workspace.owner, exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
  } else {
    await expect(inviteButton).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
  }
}

async function sendInvite(page: Page, key: string, role: InvitationRole) {
  const earlierMessages = await inboxMessages(page, key);
  const previousMessages = new Set(earlierMessages.map(({ text }) => text));
  const form = page.getByRole("region", { name: en.workspace.invite });
  await form
    .getByRole("textbox", { name: en.workspace.email })
    .fill(account(key).email);
  await form.getByRole("combobox").click();
  await page
    .getByRole("option", { name: en.workspace[role], exact: true })
    .click();
  await form.getByRole("button", { name: en.workspace.invite }).click();
  await expect(form.getByRole("textbox")).toHaveValue("");
  const pending = page.getByRole("region", { name: en.workspace.pending });
  await expect(
    pending.getByText(account(key).email, { exact: true }),
  ).toBeVisible();
  let result: string | undefined;
  await expect
    .poll(
      async () => {
        const messages = await inboxMessages(page, key);
        result = messages
          .findLast(
            ({ kind, text }) =>
              kind === "workspace-invitation" && !previousMessages.has(text),
          )
          ?.text.match(/https?:\/\/[^\s<>]+/)?.[0];
        return result !== undefined;
      },
      { message: "The local inbox receives the workspace invitation" },
    )
    .toBe(true);
  if (!result) throw new Error("Missing workspace invitation");
  const url = new URL(result);
  if (
    url.origin !== credentials.site ||
    !url.pathname.endsWith("/account/workspaces/invite")
  ) {
    throw new Error("Invitation does not belong to this local app");
  }
  return url.href;
}

const invitationAuthStatuses = new WeakMap<
  Page,
  { path: string; status: number }[]
>();
async function expectWrongRecipient(page: Page, role: InvitationRole) {
  try {
    await expect(
      page.getByRole("alert").filter({ hasText: en.workspace.unavailable }),
    ).toHaveText(en.workspace.unavailable);
  } catch (error) {
    const responses = [];
    for (const path of ["/api/auth/get-session", "/api/auth/convex/token"]) {
      const response = await page.request.get(path);
      const body: unknown = await response.json();
      responses.push({
        path,
        status: response.status(),
        hasSession:
          body !== null && typeof body === "object" && "session" in body,
        hasToken: body !== null && typeof body === "object" && "token" in body,
      });
    }
    const location = new URL(page.url());
    const diagnostic = JSON.stringify({
      role,
      responses,
      browserStatuses: invitationAuthStatuses.get(page),
      loading: await page.getByText(en.common.loading, { exact: true }).count(),
      hasQuery: Boolean(location.search),
      pathname: location.pathname,
    });
    const directory = mkdtempSync(
      path.join(tmpdir(), "luma-invitation-status-"),
    );
    const diagnosticPath = path.join(directory, "status.json");
    writeFileSync(diagnosticPath, diagnostic, { mode: 0o600, flag: "wx" });
    console.warn(`Redacted invitation diagnostic: ${diagnosticPath}`);
    await test.info().attach("wrong-recipient-auth-status", {
      contentType: "application/json",
      body: diagnostic,
    });
    throw error;
  }
}
async function openInvitation(page: Page, url: string) {
  if (!invitationAuthStatuses.has(page)) {
    const statuses: { path: string; status: number }[] = [];
    invitationAuthStatuses.set(page, statuses);
    page.on("response", (response) => {
      const path = new URL(response.url()).pathname;
      if (["/api/auth/get-session", "/api/auth/convex/token"].includes(path))
        statuses.push({ path, status: response.status() });
    });
  }
  try {
    await page.goto(url);
  } catch {
    // Navigation errors contain the raw URL. Keep invitation tokens out of test logs.
    throw new Error("The local invitation page could not be opened");
  }
}

async function acceptInvite(page: Page, url: string) {
  await openInvitation(page, url);
  await expect(
    page.getByRole("button", { name: en.workspace.accept }),
  ).toBeVisible();
  await expect.poll(() => new URL(page.url()).search === "").toBe(true);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    "content",
    "no-referrer",
  );
  await page.getByRole("button", { name: en.workspace.accept }).click();
  await expect(page).toHaveURL(/\/account\/workspaces$/);
  await expect(
    page.getByRole("region", { name: en.workspace.team }),
  ).toBeVisible();
}

async function switchInvitedAccount(page: Page, url: string, key: string) {
  await signIn(page, "unrelated-owner");
  await openInvitation(page, url);
  await expect(
    page.getByRole("alert").filter({ hasText: en.workspace.unavailable }),
  ).toHaveText(en.workspace.unavailable);
  await expect.poll(() => new URL(page.url()).search === "").toBe(true);
  await page.getByRole("button", { name: en.workspace.switchAccount }).click();
  // Assert only the path: the return query contains the invitation token.
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    "content",
    "no-referrer",
  );
  await page
    .getByRole("button", { name: en.auth.continue, exact: true })
    .click();
  await page
    .getByRole("tab", { name: en.emailAuth.email, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: en.emailAuth.email, exact: true })
    .fill(account(key).email);
  await page
    .getByLabel(en.emailAuth.password, { exact: true })
    .fill(account(key).password);
  await page
    .getByRole("button", { name: en.emailAuth.signin, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: en.workspace.accept }),
  ).toBeVisible();
  await expect.poll(() => new URL(page.url()).search === "").toBe(true);
}

async function checkAccountRecovery(
  browser: Browser,
  url: string,
  key: string,
  browserErrors: string[],
) {
  // One representative invitation is enough to exercise the shared sign-in handoff.
  if (key !== "team-admin") return;
  const context = await browser.newContext({
    baseURL: credentials.site,
    extraHTTPHeaders: { "X-Forwarded-For": "192.0.2.224" },
  });
  try {
    const page = await context.newPage();
    page.on("pageerror", (error) => {
      browserErrors.push(error.name);
    });
    const authStatuses: { path: string; status: number }[] = [];
    page.on("response", (response) => {
      const path = new URL(response.url()).pathname;
      if (
        [
          "/api/auth/sign-out",
          "/api/auth/get-session",
          "/api/auth/convex/token",
        ].includes(path)
      )
        authStatuses.push({ path, status: response.status() });
    });
    try {
      await switchInvitedAccount(page, url, key);
    } catch (error) {
      const response = await page.request.get("/api/auth/get-session");
      const body: unknown = await response.json();
      const location = new URL(page.url());
      const errorCopy = page.getByText(en.common.error, { exact: true });
      const loadingCopy = page.getByText(en.common.loading, { exact: true });
      const switchButton = page.getByRole("button", {
        name: en.workspace.switchAccount,
      });
      const diagnostic = {
        pathname: location.pathname,
        hasQuery: Boolean(location.search),
        sessionStatus: response.status(),
        hasSession:
          body !== null && typeof body === "object" && "session" in body,
        hasErrorCopy: (await errorCopy.count()) > 0,
        hasLoadingCopy: (await loadingCopy.count()) > 0,
        hasSwitchButton: await switchButton.isVisible(),
        browserErrors,
        authStatuses,
      };
      await test.info().attach("invitation-switch-status", {
        body: JSON.stringify(diagnostic),
        contentType: "application/json",
      });
      throw error;
    }
  } finally {
    await context.close();
  }
}

test("real invitations enforce team roles, isolation, workspace switching and removal recovery", async ({
  browser,
}) => {
  // Each simulated browser keeps one client address for both HTTP API calls and navigation.
  // Do not change identity limits or rotate the address when a teammate switches accounts.
  const ownerContext = await browser.newContext({
    baseURL: credentials.site,
    extraHTTPHeaders: { "X-Forwarded-For": "192.0.2.221" },
  });
  const otherContext = await browser.newContext({
    baseURL: credentials.site,
    extraHTTPHeaders: { "X-Forwarded-For": "192.0.2.222" },
  });
  const teammateContext = await browser.newContext({
    baseURL: credentials.site,
    extraHTTPHeaders: { "X-Forwarded-For": "192.0.2.223" },
  });
  const owner = await ownerContext.newPage();
  const other = await otherContext.newPage();
  const teammate = await teammateContext.newPage();
  const browserErrors: string[] = [];
  for (const page of [owner, other, teammate]) {
    page.on("pageerror", (error) => {
      browserErrors.push(error.name);
    });
  }
  try {
    await signIn(owner, "kabadiwala");
    await signIn(other, "unrelated-owner");
    await removeCandidate(other, "team-viewer");
    for (const role of ["admin", "member", "viewer"] as const) {
      const key = `team-${role}`;
      await removeCandidate(owner, key);
      await teammateContext.clearCookies();
      await signIn(teammate, key);
      const url = await sendInvite(owner, key, role);
      // A different verified email cannot consume the link or see the workspace name.
      if (role === "admin") {
        await other.route("**/api/auth/convex/token", (route) =>
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: '{"error":"unavailable"}',
          }),
        );
        await openInvitation(other, url);
        await expect(
          other.getByRole("alert").filter({ hasText: en.common.error }),
        ).toHaveText(en.common.error);
        await expect(
          other.getByText(en.common.loading, { exact: true }),
        ).toHaveCount(0);
        await expect.poll(() => new URL(other.url()).search === "").toBe(true);
        await other.unroute("**/api/auth/convex/token");
        let wasRestored = false;
        other.once("request", (request) => {
          const requested = new URL(request.url());
          wasRestored =
            requested.pathname.endsWith("/account/workspaces/invite") &&
            requested.searchParams.get("token") ===
              new URL(url).searchParams.get("token");
        });
        await other
          .getByRole("button", { name: en.common.retry, exact: true })
          .click();
        await expect.poll(() => wasRestored).toBe(true);
      } else {
        await openInvitation(other, url);
      }
      await expectWrongRecipient(other, role);
      await checkAccountRecovery(browser, url, key, browserErrors);
      await acceptInvite(teammate, url);
      await checkRoleControls(teammate, role);
      await openInvitation(teammate, url);
      await expect(
        teammate
          .getByRole("alert")
          .filter({ hasText: en.workspace.unavailable }),
      ).toHaveText(en.workspace.unavailable);
    }

    // The viewer joins a second workspace, then chooses explicitly between them.
    await other.goto("/en/account/workspaces");
    await acceptInvite(
      teammate,
      await sendInvite(other, "team-viewer", "viewer"),
    );
    const choices = teammate
      .getByRole("region", { name: en.workspace.choose })
      .getByRole("button");
    await expect(choices).toHaveCount(2);
    await choices.filter({ hasText: en.workspace.choose }).first().click();
    await expect(choices.first()).toBeDisabled();
    await teammate.reload();
    await expect(choices.first()).toBeDisabled();

    await teammate.setViewportSize({ width: 390, height: 844 });
    await teammate.emulateMedia({ colorScheme: "dark" });
    await teammate.goto("/ar/account/workspaces");
    await expect(teammate.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(teammate.getByRole("heading", { level: 1 })).toHaveText(
      ar.workspace.title,
    );
    await expect(
      teammate.getByText(ar.workspace.readOnly, { exact: true }),
    ).toBeVisible();
    expect(
      await teammate.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    // Keep the former member's business tab open while the owner removes access.
    await teammate.goto("/en/app/stock");
    const team = owner.getByRole("region", { name: en.workspace.team });
    const row = team
      .getByRole("listitem")
      .filter({ hasText: account("team-viewer").name });
    await row
      .getByRole("button", { name: en.workspace.remove, exact: true })
      .click();
    await expect(row.getByText(en.workspace.confirmRemove)).toBeVisible();
    await row
      .getByRole("button", { name: en.workspace.remove, exact: true })
      .last()
      .click();
    await expect(teammate).toHaveURL(/\/account\/workspaces$/);
    await expect(
      teammate
        .getByRole("region", { name: en.workspace.choose })
        .getByRole("button"),
    ).toHaveCount(1);
    // Restore the primary viewer membership for the guide and subsequent local checks.
    await acceptInvite(
      teammate,
      await sendInvite(owner, "team-viewer", "viewer"),
    );
    await owner.goto("/en/account/workspaces");
    expect(
      browserErrors,
      "No uncaught exception during switching or access removal",
    ).toEqual([]);
  } finally {
    await ownerContext.close();
    await otherContext.close();
    await teammateContext.close();
  }
});
