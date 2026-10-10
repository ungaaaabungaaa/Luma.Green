/** Real UI login and read-only capture runner. No trace/video/session export. */
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import {
  type Browser,
  type BrowserContext,
  chromium,
  expect,
  type Page,
} from "@playwright/test";
import { z } from "zod";

import {
  INVESTOR_DEMO_BATCH,
  INVESTOR_DEMO_ROSTER,
} from "../../convex/lib/investorDemoRoster";
import en from "../../messages/en.json";

const accountSchema = z.object({
  key: z.string(),
  name: z.string(),
  email: z.email(),
  password: z.string().min(24),
});
const privateSchema = z.object({
  batchKey: z.literal(INVESTOR_DEMO_BATCH),
  deployment: z.string(),
  accounts: z.array(accountSchema),
});
type Account = z.infer<typeof accountSchema>;
type Target = "production" | "development";
const deployments = {
  production: "outstanding-buzzard-942",
  development: "glorious-rooster-470",
};
const captures = [
  { page: 1, key: "kabadiwala-1", route: "/", title: "Material journey" },
  {
    page: 2,
    key: "kabadiwala-1",
    route: "/account/workspaces",
    title: "Workspaces and team",
  },
  {
    page: 3,
    key: "kabadiwala-1",
    route: "/app/requests",
    title: "Collection requests",
  },
  {
    page: 4,
    key: "manufacturer-1",
    route: "/app/stock",
    title: "Manufacturer stock",
  },
  {
    page: 5,
    key: "preprocessor-1",
    route: "/app/market",
    title: "Material offers",
  },
  {
    page: 6,
    key: "preprocessor-1",
    route: "/app/lots",
    title: "Material lots",
  },
  {
    page: 7,
    key: "preprocessor-1",
    route: "/app/facility",
    title: "Facilities and processes",
  },
  { page: 8, key: "recycler-1", route: "/app/sourcing", title: "Sourcing" },
  {
    page: 9,
    key: "manufacturer-1",
    route: "/app/production",
    title: "Production",
  },
  {
    page: 10,
    key: "kabadiwala-1",
    route: "/app/logistics",
    title: "Logistics",
  },
  {
    page: 11,
    key: "auditor-1",
    route: "/account/reports",
    title: "Shared reports",
  },
  {
    page: 12,
    key: "kabadiwala-1",
    route: "/account/notifications",
    title: "Account notifications",
  },
] as const;

export function validatedOrigin(value: string, target: Target) {
  const url = new URL(value);
  const isPermitted =
    target === "production"
      ? url.origin === "https://lumagreen.vercel.app"
      : url.origin === "http://localhost:3102" ||
        (url.protocol === "https:" && url.hostname.endsWith(".vercel.app"));
  if (
    !isPermitted ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("INVALID_DEMO_ORIGIN");
  return url.origin;
}

export function validateAccounts(value: unknown, target: Target) {
  const parsed = privateSchema.parse(value);
  if (
    parsed.deployment !== deployments[target] ||
    parsed.accounts.length !== 140
  )
    throw new Error("INVALID_CREDENTIAL_ROSTER");
  const keys = new Set(parsed.accounts.map((account) => account.key));
  if (keys.size !== 140) throw new Error("DUPLICATE_CREDENTIAL_ROSTER");
  for (const persona of INVESTOR_DEMO_ROSTER) {
    const actual = parsed.accounts.find(
      (account) => account.key === persona.key,
    );
    if (actual?.email !== persona.email || actual.name !== persona.name)
      throw new Error("CREDENTIAL_IDENTITY_MISMATCH");
  }
  return parsed.accounts;
}

async function loadAccounts(file: string, target: Target) {
  const resolved = await realpath(file);
  const details = await stat(resolved);
  if (
    !resolved.split(path.sep).includes(".convex") ||
    (details.mode & 0o077) !== 0
  )
    throw new Error("PRIVATE_CREDENTIAL_PATH_REQUIRED");
  return validateAccounts(
    JSON.parse(await readFile(resolved, "utf8")) as unknown,
    target,
  );
}

function wsOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol === "wss:") url.protocol = "https:";
  if (url.protocol === "ws:") url.protocol = "http:";
  return url.origin;
}

export function redactBrowserError(message: string, accounts: Account[]) {
  let safe = message;
  for (const account of accounts)
    safe = safe
      .replaceAll(account.password, "[redacted]")
      .replaceAll(account.email, "[redacted]");
  safe = safe.replaceAll(/https?:\/\/[^\s)]+/gu, (raw) => {
    try {
      const url = new URL(raw);
      return `${url.origin}${url.pathname}`;
    } catch {
      return "[url]";
    }
  });
  return safe
    .split(/(\s+)/u)
    .map((part) => (part.includes("@") ? "[email]" : part))
    .join("")
    .replaceAll(/[A-Za-z0-9_+=/-]{32,}/gu, "[redacted]")
    .slice(0, 500);
}
export function isDevelopmentDiagnostic(url: URL, method: string) {
  return (
    method === "POST" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    url.pathname === "/__nextjs_original-stack-frames"
  );
}

async function protect(
  context: BrowserContext,
  origins: Set<string>,
  accounts: Account[],
) {
  const metrics = {
    browserErrors: 0,
    pageErrors: [] as { name: string; message: string }[],
    blockedWrites: 0,
    blockedDevelopmentDiagnostics: 0,
    rateLimited: false,
    blockedPaths: [] as string[],
    authResponses: [] as { path: string; status: number }[],
  };
  context.on("page", (page) =>
    page.on("pageerror", (error) => {
      metrics.browserErrors += 1;
      if (metrics.pageErrors.length < 10)
        metrics.pageErrors.push({
          name: error.name,
          message: redactBrowserError(error.message, accounts),
        });
    }),
  );
  context.on("response", (response) => {
    const responsePath = new URL(response.url()).pathname;
    if (responsePath.startsWith("/api/auth/"))
      metrics.authResponses.push({
        path: responsePath,
        status: response.status(),
      });
    if (response.status() === 429) metrics.rateLimited = true;
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isAuth =
      /^\/api\/auth\/(?:sign-in\/email|sign-out|convex\/token|get-session)$/.test(
        url.pathname,
      );
    if (!origins.has(url.origin)) await route.abort();
    else if (!isAuth && !["GET", "HEAD"].includes(request.method())) {
      if (isDevelopmentDiagnostic(url, request.method()))
        metrics.blockedDevelopmentDiagnostics += 1;
      else {
        metrics.blockedWrites += 1;
        metrics.blockedPaths.push(url.pathname);
      }
      await route.abort();
    } else await route.continue();
  });
  await context.routeWebSocket("**/*", (socket) => {
    if (!origins.has(wsOrigin(socket.url()))) {
      void socket.close();
      return;
    }
    const server = socket.connectToServer();
    socket.onMessage((message) => {
      const frame = z
        .object({ type: z.string(), udfPath: z.string().optional() })
        .safeParse(JSON.parse(String(message)) as unknown);
      if (
        frame.success &&
        ["Mutation", "Action"].includes(frame.data.type) &&
        !(
          frame.data.type === "Mutation" &&
          frame.data.udfPath === "identity:ensureProfile"
        )
      ) {
        metrics.blockedWrites += 1;
        metrics.blockedPaths.push(frame.data.udfPath ?? frame.data.type);
        void socket.close();
      } else server.send(message);
    });
  });
  return metrics;
}

async function emailForm(page: Page, origin: string) {
  await page.goto(`${origin}/en/login?next=/account/workspaces`, {
    waitUntil: "domcontentloaded",
  });
  const chooser = page.getByRole("radiogroup", {
    name: en.common.language,
    exact: true,
  });
  const tab = page.getByRole("tab", { name: en.emailAuth.email, exact: true });
  await chooser.or(tab).waitFor({ state: "visible" });
  if (await chooser.isVisible())
    await page
      .getByRole("button", { name: en.auth.continue, exact: true })
      .click();
  await tab.click();
}

async function sessionMatches(
  page: Page,
  origin: string,
  email: string | null,
) {
  const response = await page.request.get(`${origin}/api/auth/get-session`);
  if (!response.ok()) throw new Error("SESSION_READ_FAILED");
  const value: unknown = await response.json();
  if (email === null) {
    if (value !== null) throw new Error("SIGN_OUT_NOT_CONFIRMED");
    return;
  }
  const parsed = z
    .object({ user: z.object({ email: z.string() }) })
    .safeParse(value);
  if (!parsed.success || parsed.data.user.email !== email)
    throw new Error("SESSION_IDENTITY_MISMATCH");
}

async function login(
  page: Page,
  origin: string,
  account: Account,
  progress: { stage: string },
) {
  const state = progress;
  state.stage = "login-form";
  await emailForm(page, origin);
  state.stage = "login-submit";
  await page
    .getByRole("textbox", { name: en.emailAuth.email, exact: true })
    .fill(account.email);
  await page
    .getByLabel(en.emailAuth.password, { exact: true })
    .fill(account.password);
  await page
    .getByRole("button", { name: en.emailAuth.signin, exact: true })
    .click();
  state.stage = "login-redirect";
  await page.waitForURL(/\/account\/workspaces$/, { timeout: 30_000 });
  state.stage = "workspace-heading";
  await page
    .getByRole("heading", { level: 1, name: en.workspace.title, exact: true })
    .waitFor();
  state.stage = "session-identity";
  await page
    .locator('[data-slot="skeleton"]')
    .first()
    .waitFor({ state: "hidden" });
  await sessionMatches(page, origin, account.email);
}

export function rolePlan(key: string) {
  const persona = INVESTOR_DEMO_ROSTER.find((row) => row.key === key);
  if (!persona) throw new Error("UNKNOWN_DEMO_PERSONA");
  const collaboratorRoles = new Map<string, "admin" | "member" | "viewer">([
    ["team-admin", "admin"],
    ["team-member", "member"],
    ["team-viewer", "viewer"],
  ]);
  const template = persona.templateKey;
  const collaborator = collaboratorRoles.get(template) ?? null;
  if (collaborator || persona.access.kind === "org") {
    const org = collaborator
      ? INVESTOR_DEMO_ROSTER.find(
          (row) =>
            row.templateKey === "kabadiwala" && row.cohort === persona.cohort,
        )
      : persona;
    if (!org) throw new Error("UNKNOWN_DEMO_WORKSPACE");
    return {
      kind: "workspace" as const,
      role: collaborator ?? ("owner" as const),
      orgName: org.name,
      route: "/app/stock",
    };
  }
  if (persona.access.kind === "stakeholder")
    return {
      kind: "stakeholder" as const,
      role: persona.access.stakeholderKind,
      route: "/account/reports",
    };
  if (persona.access.kind === "saathi")
    return {
      kind: "saathi" as const,
      role: "saathi",
      route: "/app",
      name: persona.name,
    };
  return {
    kind: "personal" as const,
    role: template,
    route: "/join/status",
    draft: template === "applicant",
  };
}

async function checkRole(page: Page, origin: string, key: string) {
  const plan = rolePlan(key);
  if (plan.kind === "workspace") {
    const region = page.getByRole("region", {
      name: en.workspace.choose,
      exact: true,
    });
    await region.getByText(plan.orgName, { exact: true }).waitFor();
    await region.getByText(en.workspace[plan.role], { exact: true }).waitFor();
    const invite = page.getByRole("button", {
      name: en.workspace.invite,
      exact: true,
    });
    if (plan.role === "owner" || plan.role === "admin") await invite.waitFor();
    else await expect(invite).toHaveCount(0);
    if (plan.role === "viewer")
      await page.getByText(en.workspace.readOnly, { exact: true }).waitFor();
  } else await page.getByText(en.workspace.empty, { exact: true }).waitFor();
  await page.goto(`${origin}/en${plan.route}`, {
    waitUntil: "domcontentloaded",
  });
  switch (plan.kind) {
    case "workspace": {
      await page
        .getByRole("heading", {
          level: 1,
          name: en.shop.stock.title,
          exact: true,
        })
        .waitFor();
      await page.getByText("DEMO PET bottles", { exact: true }).waitFor();
      break;
    }
    case "stakeholder": {
      await page
        .getByRole("heading", {
          level: 1,
          name: en.auditReports.title,
          exact: true,
        })
        .waitFor();
      await expect(
        page.getByRole("button", { name: en.auditReports.create, exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: en.auditReports.open, exact: true })
        .click();
      await page.getByText(en.auditReports.snapshot, { exact: true }).waitFor();
      break;
    }
    case "saathi": {
      await page
        .getByRole("heading", {
          level: 1,
          name: en.saathi.greeting.replace("{name}", () => plan.name),
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("heading", { name: en.saathi.open.title, exact: true })
        .waitFor();
      await page
        .getByText("DEMO assigned sorting shift", { exact: true })
        .waitFor();
      break;
    }
    case "personal": {
      await page
        .getByRole("heading", {
          level: 1,
          name: plan.draft
            ? en.join.status.draft.title
            : en.join.status.none.title,
          exact: true,
        })
        .waitFor();
      break;
    }
  }
  if (![plan.route, `/en${plan.route}`].includes(new URL(page.url()).pathname))
    throw new Error("ROLE_ROUTE_MISMATCH");
  return {
    kind: plan.kind,
    role: plan.role,
    route: plan.route,
    verified: true,
  };
}

async function logout(page: Page, origin: string) {
  await page.goto(`${origin}/en/account/security`);
  await page
    .getByRole("button", { name: en.nav.openMenu, exact: true })
    .click();
  await page.getByRole("button", { name: en.app.signOut, exact: true }).click();
  await page.waitForURL(/\/login$/);
  await sessionMatches(page, origin, null);
}

async function capturePage(
  page: Page,
  origin: string,
  target: Target,
  item: (typeof captures)[number],
  accounts: Account[],
) {
  await page.goto(`${origin}/en${item.route === "/" ? "" : item.route}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { level: 1 }).waitFor();
  const actual = new URL(page.url()).pathname.replace(/^\/en/, "") || "/";
  if (actual !== item.route) throw new Error("CAPTURE_ROUTE_MISMATCH");
  if (item.route !== "/")
    await page
      .locator('[data-slot="skeleton"]')
      .first()
      .waitFor({ state: "hidden" });
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator('input[type="password"]').count())
    throw new Error("PASSWORD_CONTROL_ON_CAPTURE");
  const text = await page.locator("body").innerText();
  if (
    accounts.some((account) => text.includes(account.password)) ||
    text.includes("@investor.luma.invalid")
  )
    throw new Error("CREDENTIAL_TEXT_ON_CAPTURE");
  const filename = `investor-${target}-${String(item.page).padStart(2, "0")}.png`;
  const output = path.resolve("docs/investor-demo/screenshots", filename);
  await mkdir(path.dirname(output), { recursive: true });
  const bytes =
    item.route === "/"
      ? await page
          .locator('[aria-labelledby="hero-heading"] > div')
          .first()
          .screenshot({ path: output, animations: "disabled" })
      : await page.screenshot({
          path: output,
          fullPage: false,
          animations: "disabled",
        });
  return {
    page: item.page,
    path: `screenshots/${filename}`,
    caption: `Actual ${target} demo browser view of ${item.title}. Imported sample records; no real payment or SMS verification.`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    environment: `${target}_demo`,
    release: process.env.INVESTOR_DEMO_RELEASE,
    dataset: INVESTOR_DEMO_BATCH,
    captured_at: new Date().toISOString(),
    actual_browser_capture: true,
    reviewed: false,
    viewport: { width: 1440, height: 1000 },
  };
}

export function queueFor(
  mode: string,
  accounts: Account[],
  limit: number,
  selection?: string,
) {
  let selected = accounts;
  if (selection !== undefined) {
    const keys = selection.split(",");
    if (
      new Set(keys).size !== keys.length ||
      keys.some((key) => accounts.every((account) => account.key !== key))
    )
      throw new Error("INVALID_SELECTED_KEYS");
    selected = accounts.filter((account) => keys.includes(account.key));
  }
  return mode === "capture"
    ? selected.filter((account) =>
        captures.some((item) => item.key === account.key),
      )
    : selected.slice(0, limit);
}

function hasDiagnostics(metrics: {
  browserErrors: number;
  blockedWrites: number;
  rateLimited: boolean;
}) {
  return (
    metrics.browserErrors > 0 ||
    metrics.blockedWrites > 0 ||
    metrics.rateLimited
  );
}

async function runAccount(
  browser: Browser,
  mode: string,
  origin: string,
  target: Target,
  origins: Set<string>,
  account: Account,
  accounts: Account[],
) {
  const images = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "en-IN",
    colorScheme: "light",
    serviceWorkers: "block",
  });
  const metrics = await protect(context, origins, accounts);
  const progress = {
    stage: "login",
    lastPath: "",
    headings: [] as string[],
    errorKind: "",
  };
  const page = await context.newPage();
  let status = "passed";
  let roleEvidence: Awaited<ReturnType<typeof checkRole>> | null = null;
  try {
    page.setDefaultTimeout(20_000);
    await login(page, origin, account, progress);
    if (mode === "check") {
      progress.stage = "role-access";
      roleEvidence = await checkRole(page, origin, account.key);
    } else if (mode === "capture") {
      progress.stage = "capture";
      const selectedCaptures = captures.filter(
        (item) => item.key === account.key,
      );
      for (const item of selectedCaptures)
        images.push(await capturePage(page, origin, target, item, accounts));
    }
    progress.stage = "sign-out";
    await logout(page, origin);
    if (hasDiagnostics(metrics)) throw new Error("BROWSER_DIAGNOSTIC_FAILURE");
    progress.stage = "complete";
  } catch (error) {
    status = "failed";
    progress.errorKind = error instanceof Error ? error.name : "unknown";
    progress.lastPath = new URL(page.url()).pathname;
    progress.headings = await page.getByRole("heading").allTextContents();
  } finally {
    await context.close();
  }
  return {
    result: { key: account.key, status, roleEvidence, ...progress, ...metrics },
    images,
  };
}

async function run() {
  const target = z.enum(["production", "development"]).parse(process.argv[2]);
  const mode = z
    .enum(["plan", "check", "capture"])
    .parse(process.argv[3] ?? "plan");
  const origin = validatedOrigin(
    process.env.INVESTOR_DEMO_URL ??
      (target === "production"
        ? "https://lumagreen.vercel.app"
        : "http://localhost:3102"),
    target,
  );
  if (mode === "plan") {
    process.stdout.write(
      `Prepared ${String(INVESTOR_DEMO_ROSTER.length)} UI login checks and ${String(captures.length)} capture pages for ${origin}. No credentials read or login attempted.\n`,
    );
    return;
  }
  if (mode === "capture" && !process.env.INVESTOR_DEMO_RELEASE)
    throw new Error("CAPTURE_RELEASE_REQUIRED");
  const directory = path.resolve(".convex/investor-demo", target);
  const accounts = await loadAccounts(
    process.env.INVESTOR_DEMO_CREDENTIALS ??
      path.join(directory, "credentials.json"),
    target,
  );
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(140)
    .parse(process.env.INVESTOR_DEMO_LIMIT ?? "140");
  const queue = queueFor(mode, accounts, limit, process.env.INVESTOR_DEMO_KEYS);
  if (queue.length === 0) throw new Error("NO_SELECTED_CHECKS");
  const origins = new Set([
    origin,
    `https://${deployments[target]}.eu-west-1.convex.cloud`,
    `https://${deployments[target]}.eu-west-1.convex.site`,
  ]);
  const concurrency =
    mode === "check"
      ? z.coerce
          .number()
          .int()
          .min(1)
          .max(2)
          .parse(process.env.INVESTOR_DEMO_CONCURRENCY ?? "1")
      : 1;
  const results: {
    key: string;
    status: string;
    stage: string;
    browserErrors: number;
    blockedWrites: number;
    rateLimited: boolean;
  }[] = [];
  const images = [];
  const browser = await chromium.launch({ channel: "chrome" });
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    for (let offset = 0; offset < queue.length; offset += concurrency) {
      const batch = queue.slice(offset, offset + concurrency);
      const checkedBatch = await Promise.all(
        batch.map(async (account, index) => {
          // The second independent context starts later; this is not a retry.
          if (index > 0) await delay(2000);
          return runAccount(
            browser,
            mode,
            origin,
            target,
            origins,
            account,
            accounts,
          );
        }),
      );
      for (const checked of checkedBatch) {
        results.push(checked.result);
        images.push(...checked.images);
        await writeFile(
          path.join(directory, `browser-${mode}.json`),
          JSON.stringify(
            {
              origin,
              target,
              dataset: INVESTOR_DEMO_BATCH,
              expected: queue.length,
              concurrency,
              checked: results.length,
              results,
              images,
              providersExecuted: false,
              visualReview: "pending",
            },
            null,
            2,
          ) + "\n",
          { mode: 0o600 },
        );
        process.stdout.write(
          `${String(results.length)}/${String(queue.length)} ${checked.result.key}: ${checked.result.status} (${checked.result.stage})\n`,
        );
      }
      if (checkedBatch.some((checked) => checked.result.status === "failed"))
        throw new Error("UI_CHECK_STOPPED_SEE_PRIVATE_REPORT");
      // Better Auth resets its rolling bucket after ten quiet seconds. Leave
      // twelve seconds with no account requests between pairs; never retry 429.
      await delay(mode === "check" ? 12_000 : 2000);
    }
  } finally {
    await browser.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    await run();
  } catch {
    process.stderr.write(
      "Investor browser check stopped. Inspect the private progress record; no credential details are logged.\n",
    );
    process.exitCode = 1;
  }
}
