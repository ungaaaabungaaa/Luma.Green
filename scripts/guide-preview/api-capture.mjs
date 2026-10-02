import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, "../..");
const output = path.resolve(repository, "docs/user-guide/screenshots");
const origin = process.env.GUIDE_API_FIXTURE_ORIGIN ?? "http://127.0.0.1:3213";
const url = new URL(origin);
if (
  url.protocol !== "http:" ||
  url.hostname !== "127.0.0.1" ||
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  url.username ||
  url.password
)
  throw new Error("Use a loopback HTTP origin only.");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const localeSource = await readFile(
  path.resolve(repository, "src/i18n/locales.ts"),
  "utf8",
);
const registry = localeSource.match(
  /export const locales = \[([\s\S]*?)\] as const/u,
)?.[1];
if (!registry)
  throw new Error("Cannot read the authoritative locale registry.");
const locales = Array.from(
  registry.matchAll(/"([^"\n]+)"/gu),
  (match) => match[1],
);
const cases = locales.flatMap((locale) =>
  (locale === "en" || locale === "ar"
    ? [360, 390, 768, 1024, 1440]
    : [390]
  ).flatMap((width) =>
    ["light", "dark"].map((theme) => ({ locale, width, theme })),
  ),
);
const sourceFiles = [
  "src/components/integrations/api-access.tsx",
  "src/components/app/app-shell.tsx",
  "src/components/app/page-parts.tsx",
  "src/components/theme/theme-provider.tsx",
  "src/components/theme/theme-toggle.tsx",
  "src/components/site/language-switcher.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/select.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/checkbox.tsx",
  "src/app/globals.css",
  "src/lib/fonts.ts",
  "src/i18n/locales.ts",
  "scripts/guide-preview/api-main.tsx",
  "scripts/guide-preview/api-vite.config.mts",
  "scripts/guide-preview/api-capture.mjs",
  "scripts/guide-preview/vite.config.mts",
  "scripts/guide-preview/queries.ts",
  "scripts/guide-preview/account-fixtures.ts",
  "scripts/guide-preview/auth.ts",
  "scripts/guide-preview/provider.tsx",
  "src/components/account/account-links.tsx",
  "src/components/account/use-sign-out.ts",
  "src/components/notifications/device-provider.tsx",
  "scripts/guide-preview/fixtures.ts",
  ...locales.map((locale) => `messages/${locale}.json`),
];
const sourceHashes = Object.fromEntries(
  await Promise.all(
    sourceFiles.map(async (file) => [
      file,
      hash(await readFile(path.resolve(repository, file))),
    ]),
  ),
);
await mkdir(output, { recursive: true });
const captures = [];
const controlCaptures = [];
const browser = await chromium.launch();
try {
  for (const entry of cases) {
    const name = `api-access-${entry.locale}-${entry.width}-${entry.theme}`;
    const viewport = {
      width: entry.width,
      height: entry.width < 768 ? 844 : 1000,
    };
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      colorScheme: entry.theme,
    });
    const browserErrors = [];
    const blockedExternalRequests = [];
    page.on("pageerror", (error) => {
      browserErrors.push(error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin === origin) {
        await route.continue();
      } else {
        blockedExternalRequests.push(route.request().url());
        await route.abort();
      }
    });
    await page.clock.setFixedTime(new Date("2026-10-14T06:00:00Z"));
    const route = `/${entry.locale}/app/integrations?role=manufacturer`;
    await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("note", { name: "Screenshot provenance" })
      .waitFor({ state: "visible" });
    const catalogue = JSON.parse(
      await readFile(
        path.resolve(repository, `messages/${entry.locale}.json`),
        "utf8",
      ),
    );
    await page
      .getByRole("heading", { level: 1, name: catalogue.integrations.title })
      .waitFor({ state: "visible" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      direction: document.documentElement.dir,
      lang: document.documentElement.lang,
      bodyFont: getComputedStyle(document.body).fontFamily,
      loadedFonts: [...document.fonts]
        .filter((font) => font.status === "loaded")
        .map((font) => font.family),
      dark: document.documentElement.classList.contains("dark"),
      margin: getComputedStyle(document.body).margin,
    }));
    const isExpectsDark = entry.theme === "dark";
    if (
      layout.scrollWidth > layout.width ||
      layout.margin !== "0px" ||
      layout.dark !== isExpectsDark
    )
      throw new Error(
        `${name}: layout or theme failed ${JSON.stringify(layout)}`,
      );
    if (browserErrors.length > 0 || blockedExternalRequests.length > 0)
      throw new Error(
        `${name}: ${JSON.stringify({ browserErrors, blockedExternalRequests })}`,
      );
    const file = `${name}.png`;
    await page.screenshot({
      path: path.resolve(output, file),
      animations: "disabled",
      fullPage: entry.width >= 768,
    });
    await page.locator("#api-key-label").focus();
    await page.keyboard.press("Tab");
    const keyboardFieldTab = await page.evaluate(
      () => document.activeElement?.id === "api-key-expiry",
    );
    if (!keyboardFieldTab)
      throw new Error(`${name}: keyboard did not reach the expiry control.`);
    const screenshotBytes = await readFile(path.resolve(output, file));
    captures.push({
      name,
      file,
      route,
      viewport,
      theme: entry.theme,
      locale: entry.locale,
      capturedAt: new Date().toISOString(),
      fixtureClock: "2026-10-14T06:00:00Z",
      sourceKind: "isolated-current-components-synthetic-fixtures",
      productionAuthenticationTested: false,
      providerExecutionTested: false,
      writesDisabled: true,
      realCredentialCaptured: false,
      fullPage: entry.width >= 768,
      screenshotSha256: hash(screenshotBytes),
      keyboardFieldTab,
      layout,
      browserErrors,
      blockedExternalRequests,
    });
    if (
      (entry.locale === "en" || entry.locale === "ar") &&
      entry.width === 390
    ) {
      await page.locator("#api-key-label").fill("Demo ERP connection");
      await page.locator("#api-key-label").focus();
      const scopeIds = await page
        .locator('fieldset [role="checkbox"]')
        .evaluateAll((elements) => elements.map((element) => element.id));
      const focusOrder = [];
      for (const expectedId of ["api-key-expiry", ...scopeIds]) {
        await page.keyboard.press("Tab");
        const focused = await page.evaluate(() => document.activeElement?.id);
        if (focused !== expectedId)
          throw new Error(`${name}: keyboard focus skipped ${expectedId}.`);
        focusOrder.push(focused);
      }
      await page.keyboard.press("Tab");
      const createFocused = await page.evaluate(
        () => document.activeElement?.getAttribute("type") === "submit",
      );
      if (!createFocused)
        throw new Error(`${name}: Create key is not keyboard reachable.`);
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      const revokeVisibleAboveNavigation = await page.evaluate(() => {
        const button = document.querySelector(
          '[aria-labelledby="api-keys-title"] button',
        );
        const navigation = [...document.querySelectorAll("nav")].find(
          (element) => getComputedStyle(element).position === "fixed",
        );
        const banner = document.querySelector(
          '[aria-label="Screenshot provenance"]',
        );
        if (!button || !navigation || !banner) return false;
        const bounds = button.getBoundingClientRect();
        return (
          bounds.bottom <= navigation.getBoundingClientRect().top &&
          bounds.top >= banner.getBoundingClientRect().bottom
        );
      });
      if (!revokeVisibleAboveNavigation)
        throw new Error(
          `${name}: bottom navigation obscures the Revoke control.`,
        );
      const lowerFile = `api-controls-${entry.locale}-390-${entry.theme}.png`;
      const lowerPath = path.resolve(output, lowerFile);
      await page.screenshot({
        path: lowerPath,
        animations: "disabled",
        fullPage: false,
      });
      const lowerBytes = await readFile(lowerPath);
      controlCaptures.push({
        file: lowerFile,
        locale: entry.locale,
        theme: entry.theme,
        kind: "lower-controls",
        viewport,
        screenshotSha256: hash(lowerBytes),
        keyboardFocusOrder: focusOrder,
        createFocused,
        revokeVisibleAboveNavigation,
        writesDisabled: true,
        realCredentialCaptured: false,
      });
      await page.keyboard.press("Tab");
      const revokeName = catalogue.integrations.revokeLabel.replace(
        "{label}",
        "Demo factory ERP",
      );
      const revokeFocused = await page.evaluate(
        (expectedName) =>
          document.activeElement?.getAttribute("aria-label") === expectedName,
        revokeName,
      );
      if (!revokeFocused)
        throw new Error(`${name}: Revoke key is not keyboard reachable.`);
      await page.keyboard.press("Space");
      await page.getByRole("dialog").waitFor({ state: "visible" });
      const modalFile = `api-revoke-${entry.locale}-390-${entry.theme}.png`;
      const modalPath = path.resolve(output, modalFile);
      await page.screenshot({
        path: modalPath,
        animations: "disabled",
        fullPage: false,
      });
      const modalBytes = await readFile(modalPath);
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.waitForFunction(
        (expectedName) =>
          document.activeElement?.getAttribute("aria-label") === expectedName,
        revokeName,
      );
      const escapeReturnsFocus = await page.evaluate(
        (expectedName) =>
          document.activeElement?.getAttribute("aria-label") === expectedName,
        revokeName,
      );
      if (!escapeReturnsFocus)
        throw new Error(`${name}: Escape did not restore Revoke focus.`);
      controlCaptures.push({
        file: modalFile,
        locale: entry.locale,
        theme: entry.theme,
        kind: "revoke-dialog",
        viewport,
        screenshotSha256: hash(modalBytes),
        revokeFocused,
        escapeClosesDialog: true,
        escapeReturnsFocus,
        writesDisabled: true,
        realCredentialCaptured: false,
      });
    }
    process.stdout.write(`Captured ${name}\n`);
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  path.resolve(output, "industry-api-captures.json"),
  JSON.stringify(
    {
      sourceCommit: execFileSync("/usr/bin/git", ["rev-parse", "HEAD"], {
        cwd: repository,
        encoding: "utf8",
      }).trim(),
      note: "Actual application components in the isolated documentation harness. Synthetic key metadata only; no raw key. This proves visual rendering, not authorization, provider access or a deployed API. All write adapters reject.",
      sourceHashes,
      captures,
      controlCaptures,
    },
    null,
    2,
  ) + "\n",
);
