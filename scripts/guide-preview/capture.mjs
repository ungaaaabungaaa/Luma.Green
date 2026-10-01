import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, "../..");
const output = path.resolve(repository, "docs/user-guide/screenshots");
const origin = "http://127.0.0.1:3202";
const screens = [
  {
    name: "admin-overview",
    route: "/admin",
    component: "src/components/admin/console-home.tsx",
    heading: "Welcome, Demo",
  },
  {
    name: "admin-verification",
    route: "/admin/verification",
    component: "src/components/admin/verification/queue.tsx",
    heading: "Verification",
  },
  {
    name: "admin-review",
    route: "/admin/verification/guide-shop",
    component: "src/components/admin/verification/application-review.tsx",
    heading: "Demo neighbourhood shop",
  },
  {
    name: "admin-support",
    route: "/admin/support",
    component: "src/components/admin/support/support-inbox.tsx",
    heading: "Support",
  },
  {
    name: "admin-prices",
    route: "/admin/prices",
    component: "src/components/admin/prices/price-tables.tsx",
    heading: "Prices",
  },
  {
    name: "admin-pilot",
    route: "/admin/pilot",
    component: "src/components/admin/pilot/pilot-numbers.tsx",
    heading: "Pilot numbers",
  },
  {
    name: "kabadiwala-overview",
    route: "/en/app",
    component: "src/components/shop/kabadiwala-home.tsx",
    heading: "Demo neighbourhood shop",
  },
  {
    name: "kabadiwala-request",
    route: "/en/app/requests/guide-booking",
    component: "src/components/shop/request-detail.tsx",
    heading: "Demo household",
  },
  {
    name: "kabadiwala-request-overview",
    route: "/en/app/requests/guide-booking",
    component: "src/components/shop/request-detail.tsx",
    heading: "Demo household",
    viewportOnly: true,
  },
  {
    name: "kabadiwala-weigh",
    route: "/en/app/requests/guide-booking",
    component: "src/components/shop/weigh-and-pay.tsx",
    heading: "Demo household",
    viewportOnly: true,
    scrollTarget: "#weigh",
  },
  {
    name: "kabadiwala-ratecard",
    route: "/en/app/prices",
    component: "src/components/shop/rate-card-page.tsx",
    heading: "My prices",
    viewportOnly: true,
  },
  {
    name: "household-tracking",
    route: "/en/t/guide-demo-token",
    component: "src/components/track/track-view.tsx",
    heading: "Demo neighbourhood shop accepted your pickup",
    width: 480,
    height: 1200,
  },
  {
    name: "kabadiwala-requests",
    route: "/en/app/requests",
    component: "src/components/shop/requests-page.tsx",
    heading: "Requests",
    viewportOnly: true,
  },
  {
    name: "yard-market",
    route: "/en/app/market?role=yard",
    component: "src/components/market/market-page.tsx",
    heading: "Buy",
    viewportOnly: true,
  },
  {
    name: "yard-trades",
    route: "/en/app/trades?role=yard",
    component: "src/components/market/trades-page.tsx",
    heading: "Trades",
    viewportOnly: true,
  },
  {
    name: "manufacturer-compliance",
    route: "/en/app/compliance?role=manufacturer",
    component: "src/components/insights/compliance-page.tsx",
    heading: "Compliance",
  },
  ...["yard", "recycler", "manufacturer"].map((role) => ({
    name: `${role}-overview`,
    route: `/en/app?role=${role}`,
    component: "src/components/market/business-home.tsx",
    heading: `Namaste, Demo ${role}`,
  })),
  {
    name: "saathi-overview",
    route: "/en/app?role=saathi",
    component: "src/components/saathi/saathi-home.tsx",
    heading: "Hello, Demo Saathi",
  },
];
const roleHomeNames = new Set([
  "admin-overview",
  "kabadiwala-overview",
  "yard-overview",
  "recycler-overview",
  "manufacturer-overview",
  "saathi-overview",
]);
screens.push(
  ...screens
    .filter((screen) => roleHomeNames.has(screen.name))
    .map((screen) => ({
      ...screen,
      name: `${screen.name}-phone`,
      width: 390,
      height: 844,
    })),
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sharedSources = [
  "src/components/showcase/role-story-image.tsx",
  "scripts/guide-preview/image.tsx",
  "scripts/guide-preview/vite.config.mts",
  "messages/en.json",
  "public/images/showcase/household-sorting.webp",
  "public/images/showcase/collection-partners.webp",
  "public/images/showcase/material-yard.webp",
  "public/images/showcase/circular-workshop.webp",
  "public/images/showcase/kabadiwala-weighing.webp",
  "public/images/showcase/recycling-line.webp",
  "public/images/showcase/operations-desk.webp",
  "public/images/showcase/solar-rooftop.webp",
];
const sharedSourceHashes = Object.fromEntries(
  await Promise.all(
    sharedSources.map(async (file) => [
      file,
      hash(await readFile(path.resolve(repository, file))),
    ]),
  ),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const metadata = [];
try {
  for (const screen of screens) {
    const viewport = {
      width: screen.width ?? 1440,
      height: screen.height ?? 1000,
    };
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const errors = [];
    const blocked = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        blocked.push(route.request().url());
        await route.abort();
        return;
      }
      await route.continue();
    });
    await page.clock.setFixedTime(new Date("2026-10-14T06:00:00Z"));
    await page.goto(`${origin}${screen.route}`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("note", { name: "Screenshot provenance" })
      .waitFor({ state: "visible" });
    await page
      .getByRole("heading", { level: 1, name: screen.heading })
      .waitFor({ state: "visible" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    if (errors.length > 0 || blocked.length > 0)
      throw new Error(`${screen.name}: ${JSON.stringify({ errors, blocked })}`);
    if (screen.scrollTarget) {
      await page.locator(screen.scrollTarget).evaluate((element) => {
        const banner = document.querySelector(
          '[aria-label="Screenshot provenance"]',
        );
        const offset = (banner?.getBoundingClientRect().height ?? 0) + 20;
        window.scrollTo(
          0,
          element.getBoundingClientRect().top + window.scrollY - offset,
        );
      });
    }
    const bannerBounds = await page
      .getByRole("note", { name: "Screenshot provenance" })
      .boundingBox();
    if (!bannerBounds || bannerBounds.y < 0)
      throw new Error("Screenshot provenance must remain inside the viewport.");
    const isFullPage = !screen.viewportOnly;
    const capturePath = path.resolve(output, `${screen.name}.png`);
    const componentPath = path.resolve(repository, screen.component);
    const componentSource = await readFile(componentPath);
    await page.screenshot({ path: capturePath, fullPage: isFullPage });
    metadata.push({
      ...screen,
      file: `${screen.name}.png`,
      sourceKind: "isolated-current-components-synthetic-fixtures",
      productionAuthenticationTested: false,
      capturedAt: new Date().toISOString(),
      fixtureClock: "2026-10-14T06:00:00Z",
      viewport,
      fullPage: isFullPage,
      applicationRoute: screen.route.split("?", 1)[0],
      previewUrl: `${origin}${screen.route}`,
      componentSha256: hash(componentSource),
      screenshotSha256: hash(await readFile(capturePath)),
      browserErrors: errors,
      blockedExternalRequests: blocked,
    });
    process.stdout.write(`Captured ${screen.name}\n`);
    await page.close();
  }
} finally {
  await browser.close();
}
const styleDirectory = path.resolve(repository, ".next/static/css");
const styleEntries = await readdir(styleDirectory);
const styleFiles = styleEntries.filter((file) => file.endsWith(".css"));
const styles = await Promise.all(
  styleFiles.map(async (file) => ({
    file,
    sha256: hash(
      await readFile(path.resolve(repository, ".next/static/css", file)),
    ),
  })),
);
const fixturePath = path.resolve(directory, "fixtures.ts");
const fixtureSource = await readFile(fixturePath);
await writeFile(
  path.resolve(output, "fixture-captures.json"),
  JSON.stringify(
    {
      sourceCommit: execFileSync("/usr/bin/git", ["rev-parse", "HEAD"], {
        cwd: repository,
        encoding: "utf8",
      }).trim(),
      note: "Real browser renders of current application components. Synthetic data and isolated local query/auth/navigation adapters. Not evidence of sign-in, authorization, live records, provider calls or production deployment. Build styles and Noto fonts are reused without restyling the app. The visible provenance banner belongs only to this harness.",
      fixtureSha256: hash(fixtureSource),
      sharedSourceHashes,
      styles,
      captures: metadata,
    },
    null,
    2,
  ) + "\n",
);
