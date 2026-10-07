import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect } from "@playwright/test";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const origin = process.env.GUIDE_FIXTURE_ORIGIN ?? "http://127.0.0.1:3203";
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
  throw new Error(
    "Financial interface examples require a loopback fixture server.",
  );
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const files = [
  "scripts/guide-preview/capture-finance.mjs",
  "scripts/guide-preview/main.tsx",
  "scripts/guide-preview/finance-fixtures.ts",
  "scripts/guide-preview/fixtures.ts",
  "scripts/guide-preview/queries.ts",
  "scripts/guide-preview/auth.ts",
  "scripts/guide-preview/provider.tsx",
  "scripts/guide-preview/navigation.tsx",
  "scripts/guide-preview/locale.ts",
  "scripts/guide-preview/vite.config.mts",
  "scripts/guide-preview/index.html",
  "src/components/market/financial-lifecycle.tsx",
  "src/components/market/sandbox-checkout.tsx",
  "src/components/app/app-shell.tsx",
  "src/components/app/format.ts",
  "src/components/shop/use-shop.ts",
  "src/components/workspace/permissions.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/label.tsx",
  "src/components/theme/theme-provider.tsx",
  "src/lib/money-format.ts",
  "src/lib/fonts.ts",
  "src/app/globals.css",
  "convex/lib/cashfreeLifecycleContract.ts",
  "messages/en.json",
  "messages/ar.json",
  "messages/kn.json",
];
const sourceHashes = Object.fromEntries(
  await Promise.all(
    files.map(async (file) => [
      file,
      hash(await readFile(path.join(repository, file))),
    ]),
  ),
);
const cssDirectory = path.join(repository, ".next/static/css");
const cssFiles = await readdir(cssDirectory);
const buildStyles = Object.fromEntries(
  await Promise.all(
    cssFiles
      .filter((file) => file.endsWith(".css"))
      .map(async (file) => [
        file,
        hash(await readFile(path.join(cssDirectory, file))),
      ]),
  ),
);
if (Object.keys(buildStyles).length === 0)
  throw new Error("Build current production styles first.");
const output = path.join(repository, "docs/user-guide/screenshots");
await mkdir(output, { recursive: true });
const screenshots = [];
const browser = await chromium.launch();
try {
  for (const locale of ["en", "ar", "kn"]) {
    const messages = JSON.parse(
      await readFile(path.join(repository, `messages/${locale}.json`), "utf8"),
    );
    for (const theme of ["light", "dark"])
      for (const width of [390, 768, 1440])
        for (const scenario of ["authorized-dispatch", "financial-hold"]) {
          const viewport = { width, height: width === 390 ? 1100 : 1024 };
          const context = await browser.newContext({
            viewport,
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          const page = await context.newPage();
          const errors = [];
          let blockedRequests = 0;
          page.on("pageerror", (error) => {
            errors.push(error.message);
          });
          page.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
          });
          await context.route("**/*", async (route) => {
            const request = route.request();
            if (
              new URL(request.url()).origin !== url.origin ||
              !["GET", "HEAD"].includes(request.method())
            ) {
              blockedRequests += 1;
              await route.abort();
            } else await route.continue();
          });
          await page.clock.setFixedTime(new Date("2026-10-14T06:00:00Z"));
          const route = `/${locale}/app/finance-example?scenario=${scenario}&role=manufacturer`;
          await page.goto(`${url.origin}${route}`, {
            waitUntil: "domcontentloaded",
          });
          await expect(
            page.getByRole("note", { name: "Screenshot provenance" }),
          ).toBeVisible();
          await expect(
            page.getByText(/SIMULATED FINANCIAL STATE/),
          ).toBeVisible();
          await expect(
            page.getByRole("heading", {
              name: messages.tradeLifecycle.title,
              exact: true,
            }),
          ).toBeVisible();
          const section = page.getByRole("region", {
            name: messages.tradeLifecycle.title,
            exact: true,
          });
          if (scenario === "authorized-dispatch") {
            await expect(
              section.getByText(messages.tradeLifecycle.state.authorized, {
                exact: true,
              }),
            ).toBeVisible();
            await section
              .getByRole("button", {
                name: messages.tradeLifecycle.action.dispatch,
                exact: true,
              })
              .click();
            await expect(
              section.getByLabel(messages.tradeLifecycle.reference, {
                exact: true,
              }),
            ).toHaveValue("");
            await expect(
              section.getByRole("button", {
                name: messages.tradeLifecycle.confirm,
                exact: true,
              }),
            ).toBeDisabled();
          } else {
            await expect(
              section.getByText(messages.tradeLifecycle.state.hold, {
                exact: true,
              }),
            ).toBeVisible();
            await expect(section.getByRole("alert")).toHaveText(
              messages.tradeLifecycle.reviewRequired,
            );
            await expect(section.getByRole("button")).toHaveCount(0);
          }
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator("html")).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
          if (theme === "dark")
            await expect(page.locator("html")).toHaveClass(/dark/);
          else await expect(page.locator("html")).not.toHaveClass(/dark/);
          const fonts = await page.evaluate(() => ({
            family: getComputedStyle(document.body).fontFamily,
            loaded: [...document.fonts]
              .filter((font) => font.status === "loaded")
              .map((font) => font.family),
            margin: getComputedStyle(document.body).margin,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
          }));
          expect(fonts.loaded.length).toBeGreaterThan(0);
          expect(fonts.margin).toBe("0px");
          expect(fonts.overflow).toBe(false);
          expect(errors).toEqual([]);
          expect(blockedRequests).toBe(0);
          await page.evaluate(() => window.scrollTo(0, 0));
          const file = `finance-fixture-${scenario}-${locale}-${theme}-${String(width)}.png`;
          const bytes = await page.screenshot({
            path: path.join(output, file),
            fullPage: true,
            animations: "disabled",
          });
          screenshots.push({
            file: `screenshots/${file}`,
            sha256: hash(bytes),
            locale,
            theme,
            scenario,
            route,
            viewport,
            fonts,
            blockedRequests,
            browserErrors: errors.length,
            sourceKind: "synthetic-financial-interface-example",
            authenticated: false,
            providerExecutionTested: false,
            writesAttempted: false,
          });
          await context.close();
        }
  }
} finally {
  await browser.close();
}
await writeFile(
  path.join(repository, "docs/user-guide/finance-fixture-captures.json"),
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      origin: url.origin,
      sourceHashes,
      buildStyles,
      screenshots,
      visualReview: {
        status: "pending",
        note: "Inspect all 36 originals; simulated state is not payment or authorization evidence.",
      },
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  `Captured ${String(screenshots.length)} synthetic financial interface examples. Original review pending.\n`,
);
