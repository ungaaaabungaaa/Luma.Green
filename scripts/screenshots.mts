/**
 * `pnpm screenshots`: pictures of the key screens for the README's "See it"
 * gallery, at phone (390 × 844) and desktop (1440 × 900) sizes, saved as
 * docs/screenshots/<name>-<phone|desktop>.png. The list of screens lives in
 * scripts/screenshot-plan.ts.
 *
 * Needs the app running against the seeded dev deployment, and Playwright's
 * Chromium (`pnpm exec playwright install chromium`):
 *
 *   pnpm dev --port 3100                              # one terminal
 *   pnpm screenshots                                  # another
 *   BASE_URL=http://localhost:3000 pnpm screenshots   # a different address
 *   ONLY=yard-market,yard-trades pnpm screenshots     # just these screens
 *
 * Signed-in screens use the demo logins (code 123456, dev deployment only).
 * Each login signs in once and its session is reused at both sizes, because
 * phone sign-in allows 10 requests a minute. The admin console is skipped: it
 * needs an authenticator app. A screen that fails is logged and skipped, and
 * the run then exits with code 1.
 */

import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  chromium,
  type Page,
} from "@playwright/test";

import { DEMO_CODE } from "../convex/lib/demo";
import {
  baseUrlFrom,
  byLogin,
  demoPhone,
  nationalNumber,
  SCREENSHOT_DIR,
  screenshotPath,
  selectShots,
  type Shot,
  type ShotLogin,
  type Viewport,
  VIEWPORTS,
} from "./screenshot-plan";

type Session = Awaited<ReturnType<BrowserContext["storageState"]>>;

const BASE_URL = baseUrlFrom(process.env.BASE_URL);
const SELECTED = selectShots(process.env.ONLY);

/** Next.js's dev-mode badge would otherwise sit in every picture. */
const HIDE_DEV_INDICATOR = "nextjs-portal { display: none !important; }";
/** First visits compile the page in dev mode, which can take a while. */
const NAVIGATION_TIMEOUT_MS = 90_000;
/** Live data comes over Convex's WebSocket, after "network idle". */
const LOADING_TIMEOUT_MS = 15_000;
/** A beat for fonts, images and transitions to finish. */
const SETTLE_MS = 800;
/** Long enough for the sign-in rate limit (10 a minute) to reset. */
const RETRY_SIGN_IN_AFTER_MS = 65_000;

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

/** The first line of an error: Playwright appends a long call log. */
function reason(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const newline = text.indexOf("\n");
  return newline === -1 ? text : text.slice(0, newline);
}

/** Every context alike: light theme, India's language and clock, no motion. */
function contextOptions(
  viewport?: Viewport,
  session?: Session,
): BrowserContextOptions {
  return {
    baseURL: BASE_URL,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    storageState: session,
    ...(viewport && {
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
    }),
  };
}

/** Whether anything answers at the address, so a typo fails fast. */
async function isUp(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(NAVIGATION_TIMEOUT_MS) });
    return true;
  } catch {
    return false;
  }
}

/** One pass through /login: language (first visit only), number, code. */
async function signInOnce(page: Page, login: ShotLogin): Promise<void> {
  await page.goto("/login", { timeout: NAVIGATION_TIMEOUT_MS });
  const phoneField = page.locator("#phone");
  const languageGrid = page.locator("#choose-language");
  await phoneField.or(languageGrid).waitFor({ timeout: LOADING_TIMEOUT_MS });
  if (await languageGrid.isVisible()) {
    await page.locator('button[lang="en"]').click();
  }
  await phoneField.fill(nationalNumber(demoPhone(login)));
  await phoneField.press("Enter");
  await page.waitForURL(/\/login\/verify/);
  // An input-otp field: typing the sixth digit signs in by itself.
  await page.locator("#code").pressSequentially(DEMO_CODE, { delay: 50 });
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: NAVIGATION_TIMEOUT_MS,
  });
}

/** Signs a demo login in and returns its session, or undefined. */
async function signIn(
  browser: Browser,
  login: ShotLogin,
): Promise<Session | undefined> {
  for (const attempt of [1, 2]) {
    const context = await browser.newContext(contextOptions());
    try {
      await signInOnce(await context.newPage(), login);
      say(`Signed in as the ${login} (${demoPhone(login)}).`);
      return await context.storageState();
    } catch (error) {
      console.error(`Couldn't sign in as the ${login}: ${reason(error)}`);
      if (attempt === 1) {
        say("Trying once more in a minute (sign-in allows 10 a minute).");
        await sleep(RETRY_SIGN_IN_AFTER_MS);
      }
    } finally {
      await context.close();
    }
  }
  return undefined;
}

/** Waits until the page has stopped loading and drawing. */
async function settle(page: Page, path: string): Promise<void> {
  try {
    // Images and code chunks have no single element to wait for, so a
    // picture waits for the network to go quiet: best effort, with a limit.
    // eslint-disable-next-line sonarjs/no-networkidle-wait -- not a test assertion; see above
    await page.waitForLoadState("networkidle", { timeout: LOADING_TIMEOUT_MS });
  } catch {
    say(`  (${path} kept the network busy; carrying on)`);
  }
  try {
    // Loading skeletons carry aria-busy="true" (src/components/app/page-parts).
    await page
      .locator('[aria-busy="true"]')
      .first()
      .waitFor({ state: "detached", timeout: LOADING_TIMEOUT_MS });
  } catch {
    console.error(`  ${path} still shows a loading placeholder.`);
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(SETTLE_MS);
}

/** Opens a path and fails if the app answered with an error or elsewhere. */
async function open(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { timeout: NAVIGATION_TIMEOUT_MS });
  if (response && response.status() >= 400) {
    throw new Error(`${path} answered ${String(response.status())}`);
  }
  await page.addStyleTag({ content: HIDE_DEV_INDICATOR });
  await settle(page, path);
  const expected = new URL(path, BASE_URL).pathname;
  const landed = new URL(page.url()).pathname;
  if (landed !== expected) {
    throw new Error(`opened ${expected} but landed on ${landed}`);
  }
}

async function capture(
  context: BrowserContext,
  shot: Shot,
  viewport: Viewport,
): Promise<void> {
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    console.error(`  ${shot.name}: the page threw "${reason(error)}"`);
  });
  try {
    await open(page, shot.path);
    if (shot.follow) {
      const href = await page
        .locator(`a[href*="${shot.follow}"]`)
        .first()
        .getAttribute("href", { timeout: LOADING_TIMEOUT_MS });
      if (!href) throw new Error(`no link to ${shot.follow} on ${shot.path}`);
      await open(page, href);
    }
    const file = screenshotPath(shot.name, viewport.name);
    await page.screenshot({
      path: file,
      animations: "disabled",
      caret: "hide",
    });
    say(`  ✓ ${file}`);
  } finally {
    await page.close();
  }
}

/** One login's screens at one size; returns the files that failed. */
async function captureAll(
  browser: Browser,
  shots: readonly Shot[],
  viewport: Viewport,
  session: Session | undefined,
): Promise<string[]> {
  const failed: string[] = [];
  const context = await browser.newContext(contextOptions(viewport, session));
  try {
    for (const shot of shots) {
      try {
        await capture(context, shot, viewport);
      } catch (error) {
        const file = screenshotPath(shot.name, viewport.name);
        failed.push(file);
        console.error(`  ✗ ${file}: ${reason(error)}`);
      }
    }
  } finally {
    await context.close();
  }
  return failed;
}

/** Every selected screen at every size; returns the files that failed. */
async function captureEverything(browser: Browser): Promise<string[]> {
  const failed: string[] = [];
  for (const [login, shots] of byLogin(SELECTED)) {
    const heading = login ? `As the ${login}` : "Public pages";
    say(`\n${heading}`);
    const session = login ? await signIn(browser, login) : undefined;
    if (login && !session) {
      failed.push(
        ...shots.flatMap((shot) =>
          VIEWPORTS.map((viewport) => screenshotPath(shot.name, viewport.name)),
        ),
      );
      continue;
    }
    for (const viewport of VIEWPORTS) {
      failed.push(...(await captureAll(browser, shots, viewport, session)));
    }
  }
  return failed;
}

/** The whole run; resolves to the process's exit code. */
async function main(): Promise<number> {
  if (!(await isUp(BASE_URL))) {
    console.error(
      `Nothing answers at ${BASE_URL}. Start the app (pnpm dev --port 3100) or set BASE_URL.`,
    );
    return 1;
  }
  say(`Screenshots of ${BASE_URL}, saved to ${SCREENSHOT_DIR}/`);
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  let failed: string[];
  try {
    failed = await captureEverything(browser);
  } finally {
    await browser.close();
  }
  const total = SELECTED.length * VIEWPORTS.length;
  say(`\nSaved ${String(total - failed.length)} of ${String(total)}.`);
  if (failed.length === 0) return 0;
  const list = failed.map((file) => `  ${file}`).join("\n");
  console.error(`Not taken:\n${list}`);
  return 1;
}

process.exitCode = await main();
