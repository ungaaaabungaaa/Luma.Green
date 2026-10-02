/** Read-only screenshots of the local app using approved development demo prices. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

import en from "../messages/en.json";

const origin = new URL(process.env.GUIDE_BASE_URL ?? "http://localhost:3009");
if (!["localhost", "127.0.0.1"].includes(origin.hostname)) {
  throw new Error("Use the local documentation app, not a hosted frontend.");
}
const backend = "https://glorious-rooster-470.eu-west-1.convex.cloud";
const backendSite = "https://glorious-rooster-470.eu-west-1.convex.site";
const allowed = new Set([origin.origin, backend, backendSite]);
const sourceFiles = [
  "scripts/capture-price-guide.mts",
  "src/app/globals.css",
  "src/lib/fonts.ts",
  "src/app/[locale]/(site)/prices/page.tsx",
  "src/components/site/page-header.tsx",
  "src/components/site/page-banner.tsx",
  "src/components/showcase/role-story-image.tsx",
  "src/components/prices/price-guide.tsx",
  "public/images/showcase/fair-weighing.webp",
  "public/images/showcase/material-sorting.webp",
  "src/components/prices/price-board.tsx",
  "src/components/prices/price-row.tsx",
  "src/components/prices/price-detail.tsx",
  "src/components/prices/price-chart.tsx",
  "src/components/prices/price-change.tsx",
  "src/components/prices/sparkline.tsx",
  "src/components/prices/chart-geometry.ts",
  "src/components/app/format.ts",
  "src/components/app/page-parts.tsx",
  "messages/en.json",
];
const sourceHashes = Object.fromEntries<string>(
  await Promise.all(
    sourceFiles.map(async (file): Promise<[string, string]> => [
      file,
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
    ]),
  ),
);
// eslint-disable-next-line sonarjs/no-os-command-from-path -- developer-installed Git provides read-only capture provenance.
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const browser = await chromium.launch();
const captures = [];
try {
  for (const theme of ["light", "dark"] as const) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
      colorScheme: theme,
      locale: "en-IN",
    });
    const browserErrors: string[] = [];
    const blockedRequests: string[] = [];
    const mutations: string[] = [];
    page.on("pageerror", (error) => {
      browserErrors.push(error.message);
    });
    page.on("websocket", (socket) => {
      socket.on("framesent", (event) => {
        const value: unknown = JSON.parse(String(event.payload));
        if (
          typeof value === "object" &&
          value !== null &&
          "type" in value &&
          (value.type === "Mutation" || value.type === "Action")
        ) {
          mutations.push(value.type);
        }
      });
    });
    await page.route("**/*", async (request) => {
      const requestOrigin = new URL(request.request().url()).origin;
      if (allowed.has(requestOrigin)) await request.continue();
      else {
        blockedRequests.push(requestOrigin);
        await request.abort();
      }
    });
    await page.routeWebSocket("**/*", async (socket) => {
      const url = new URL(socket.url());
      if (`https://${url.host}` === backend) socket.connectToServer();
      else {
        blockedRequests.push(url.origin);
        await socket.close();
      }
    });
    try {
      const response = await page.goto(new URL("/prices", origin).href);
      if (!response?.ok())
        throw new Error("The local price page did not load.");
      const notice = page.getByText(en.prices.demoNote, { exact: true });
      await notice.waitFor({ timeout: 30_000 });
      const rows = page.locator('main section button[aria-haspopup="dialog"]');
      if ((await rows.count()) !== 26)
        throw new Error("Expected all 26 seeded materials.");
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      let name = "public-prices-demo";
      if (theme === "light") {
        await notice.evaluate((node) => {
          window.scrollTo(
            0,
            node.getBoundingClientRect().top + window.scrollY - 120,
          );
        });
      } else {
        name = "public-price-history-demo-dark";
        await rows.first().click();
        const slider = page.getByRole("dialog").getByRole("slider");
        await slider.waitFor();
        if ((await slider.getAttribute("aria-valuemax")) !== "29") {
          throw new Error("Expected the full 30-day demo history.");
        }
        await slider.focus();
        await slider.press("ArrowLeft");
        if ((await slider.getAttribute("aria-valuenow")) !== "28") {
          throw new Error("The price chart must respond to the keyboard.");
        }
        await slider.press("ArrowRight");
        await page.getByRole("dialog").getByRole("heading").click();
      }
      const path = `docs/user-guide/screenshots/${name}.png`;
      await page.screenshot({ path, animations: "disabled", caret: "hide" });
      if (theme === "dark") {
        await page.getByRole("dialog").locator("summary").click();
        if (
          (await page.getByRole("dialog").locator("tbody tr").count()) !== 30
        ) {
          throw new Error(
            "All daily values must be available in the data table.",
          );
        }
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "hidden" });
      }
      if (
        browserErrors.length > 0 ||
        blockedRequests.length > 0 ||
        mutations.length > 0
      ) {
        throw new Error(
          "Price capture had errors, unapproved traffic or a mutation.",
        );
      }
      captures.push({
        name,
        path,
        route: "/prices",
        theme,
        viewport: page.viewportSize(),
        revision,
        sourceHashes,
        capturedAt: new Date().toISOString(),
        kind: "current-local-connected-demo",
        backendDeployment: "glorious-rooster-470",
        sampleData: true,
        productionFrontendTested: false,
        authenticationTested: false,
        mutationsPerformed: false,
        rows: 26,
        browserErrors,
        blockedRequests,
        sha256: createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      });
      process.stdout.write(`Captured ${name}\n`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  "docs/user-guide/price-captures.json",
  `${JSON.stringify(captures, null, 2)}\n`,
);
