import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { accountScreens } from "./account-screens.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, "../..");
const output = path.resolve(repository, "docs/user-guide/screenshots");
const origin = process.env.GUIDE_FIXTURE_ORIGIN ?? "http://127.0.0.1:3202";
const previewUrl = new URL(origin);
if (
  previewUrl.protocol !== "http:" ||
  previewUrl.hostname !== "127.0.0.1" ||
  previewUrl.pathname !== "/" ||
  previewUrl.search ||
  previewUrl.hash ||
  previewUrl.username ||
  previewUrl.password
) {
  throw new Error(
    "Documentation preview must use a loopback HTTP origin only.",
  );
}
const screens = [
  {
    name: "household-basket-phone",
    route: "/en/sell/basket",
    component: "src/components/sell/basket-step.tsx",
    heading: "What are you recycling?",
    headingLevel: 2,
    width: 390,
    height: 844,
    viewportOnly: true,
  },
  {
    name: "household-mode-phone",
    route: "/en/sell/shop",
    component: "src/components/sell/mode-choice.tsx",
    heading: "Who buys it?",
    headingLevel: 2,
    width: 390,
    height: 844,
    viewportOnly: true,
  },
  {
    name: "household-when-phone",
    route: "/en/sell/when",
    component: "src/components/sell/when-step.tsx",
    heading: "When should they come?",
    headingLevel: 2,
    width: 390,
    height: 844,
    viewportOnly: true,
  },
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

  {
    name: "kabadiwala-stock-phone",
    viewportOnly: true,
    route: "/en/app/stock",
    component: "src/components/shop/stock-page.tsx",
    heading: "Stock",
    width: 390,
    height: 844,
  },
  {
    name: "yard-sell",
    route: "/en/app/sell?role=yard",
    component: "src/components/market/sell-page.tsx",
    heading: "Sell",
  },
  {
    name: "yard-invoice",
    route: "/en/app/trades/guide-receipt/invoice?role=yard",
    component: "src/components/market/invoice-page.tsx",
    heading: "Trade receipt",
  },
  {
    name: "recycler-impact",
    route: "/en/app/impact?role=recycler",
    component: "src/components/insights/impact-page.tsx",
    heading: "Your impact",
  },
  {
    name: "recycler-impact-phone",
    viewportOnly: true,
    route: "/en/app/impact?role=recycler",
    component: "src/components/insights/impact-page.tsx",
    heading: "Your impact",
    width: 390,
    height: 844,
  },
  {
    name: "join-kabadiwala-phone",
    viewportOnly: true,
    route: "/en/join/kabadiwala",
    component: "src/components/join/kabadiwala-form.tsx",
    heading: "Your shop",
    width: 390,
    height: 844,
  },
  {
    name: "join-yard",
    viewportOnly: true,
    route: "/en/join/yard",
    component: "src/components/join/business-form.tsx",
    heading: "Your preprocessing business",
  },
  {
    name: "join-status-phone",
    route: "/en/join/status",
    component: "src/components/join/status-view.tsx",
    heading: "Under review",
    width: 390,
    height: 844,
  },
];
// Additional changed screens, using current components and isolated fixture adapters.
// Capture loaded charts at a readable viewport scale as well as the full report.
for (const [name, heading] of [
  ["admin-pilot-outcomes", "Booking outcomes"],
  ["admin-pilot-materials", "Estimate and weighed material"],
]) {
  screens.push({
    name,
    route: "/admin/pilot",
    component: "src/components/admin/pilot/pilot-charts.tsx",
    heading: "Pilot numbers",
    viewportOnly: true,
    scrollTarget: `section:has(> header > h2:text-is("${heading}"))`,
  });
}
screens.push(
  {
    name: "admin-pilot-dark",
    route: "/admin/pilot",
    component: "src/components/admin/pilot/pilot-charts.tsx",
    heading: "Pilot numbers",
    theme: "dark",
  },
  {
    name: "admin-pilot-phone",
    route: "/admin/pilot",
    component: "src/components/admin/pilot/pilot-charts.tsx",
    heading: "Pilot numbers",
    width: 390,
    height: 844,
  },
);
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
      viewportOnly: screen.name !== "admin-overview",
      width: 390,
      height: 844,
    })),
  {
    name: "admin-overview-dark",
    route: "/admin",
    component: "src/components/admin/console-home.tsx",
    heading: "Welcome, Demo",
    theme: "dark",
    viewportOnly: true,
  },
  {
    name: "kabadiwala-overview-dark",
    route: "/en/app",
    component: "src/components/shop/kabadiwala-home.tsx",
    heading: "Demo neighbourhood shop",
    theme: "dark",
    width: 390,
    height: 844,
    viewportOnly: true,
  },
);
for (const locale of ["en", "ar", "kn"]) {
  const catalogue = JSON.parse(
    await readFile(path.join(repository, `messages/${locale}.json`), "utf8"),
  );
  for (const theme of ["light", "dark"]) {
    for (const width of [390, 768, 1440]) {
      for (const state of ["blank", "verified"]) {
        screens.push({
          name: `account-phone-${state}-${locale}-${width}-${theme}`,
          route: `/${locale}/account/security?phone=${state}`,
          component: "src/components/account/account-phone.tsx",
          heading: catalogue.accountSecurity.title,
          expectedText:
            state === "verified"
              ? catalogue.accountPhone.verified
              : catalogue.accountPhone.title,
          scrollText: catalogue.accountPhone.title,
          theme,
          width,
          height:
            new Map([
              [390, 844],
              [768, 1024],
            ]).get(width) ?? 1000,
          viewportOnly: true,
        });
      }
      screens.push({
        name: `impact-unknown-${locale}-${width}-${theme}`,
        route: `/${locale}/app/impact?role=recycler&scenario=unknown-factor`,
        component: "src/components/insights/org-impact.tsx",
        heading: catalogue.impact.title,
        expectedText: catalogue.impact.factorUnavailable,
        theme,
        width,
        height:
          new Map([
            [390, 844],
            [768, 1024],
          ]).get(width) ?? 1000,
        viewportOnly: true,
      });
    }
  }
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
screens.push(...accountScreens());
const sharedSources = [
  "scripts/guide-preview/account-screens.mjs",
  "scripts/guide-preview/account-fixtures.ts",
  "scripts/guide-preview/auth.ts",
  "scripts/guide-preview/provider.tsx",
  "src/app/[locale]/(account)/account/layout.tsx",
  "src/components/account/account-security.tsx",
  "src/components/account/account-phone.tsx",
  "src/lib/phone-auth.ts",
  "src/components/account/account-menu.tsx",
  "src/components/account/account-links.tsx",
  "src/components/account/use-sign-out.ts",
  "src/components/admin/use-admin-sign-out.ts",
  "src/lib/sign-out.ts",
  "src/components/auth/factor-challenge.tsx",
  "src/components/admin/auth-shell.tsx",
  "src/components/admin/password-recovery.tsx",
  "src/components/admin/password-input.tsx",
  "src/app/admin/forgot-password/page.tsx",
  "src/app/admin/reset-password/page.tsx",
  "src/components/notifications/notifications-page.tsx",
  "src/components/notifications/notification-error-boundary.tsx",
  "src/components/notifications/device-provider.tsx",
  "src/components/showcase/role-story-image.tsx",
  "src/app/globals.css",
  "src/components/theme/theme-provider.tsx",
  "src/components/theme/theme-toggle.tsx",
  "src/components/app/app-shell.tsx",
  "src/components/app/page-parts.tsx",
  "src/components/shop/home-cards.tsx",
  "src/components/track/status-hero.tsx",
  "src/components/track/booking-cards.tsx",
  "src/components/track/shop-card.tsx",
  "src/components/sell/money-card.tsx",
  "src/components/sell/shop-option.tsx",
  "src/components/sell/family.tsx",
  "src/components/shop/request-cards.tsx",
  "src/components/saathi/job-actions.tsx",
  "src/components/saathi/job-card.tsx",
  "src/components/saathi/week-earnings.tsx",
  "src/components/admin/console-shell.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/tabs.tsx",
  "src/components/ui/chart.tsx",
  "src/components/ui/switch.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/label.tsx",
  "src/components/ui/checkbox.tsx",
  "src/components/ui/radio-group.tsx",
  "src/components/admin/pilot/pilot-charts.tsx",
  "src/lib/fonts.ts",
  "src/lib/money-format.ts",
  "src/components/app/format.ts",
  "src/components/admin/format.ts",
  "src/lib/number-input.ts",
  "src/components/market/logic.ts",
  "src/components/market/material-filter.tsx",
  "src/components/market/listing-card.tsx",
  "src/components/market/trade-card.tsx",
  "src/components/market/financial-lifecycle.tsx",
  "src/components/market/sandbox-checkout.tsx",
  "convex/lib/cashfreeLifecycleContract.ts",
  "src/components/shop/weigh.ts",
  "scripts/guide-preview/main.tsx",
  "scripts/guide-preview/navigation.tsx",
  "scripts/guide-preview/translations.ts",
  "scripts/guide-preview/locale.ts",
  "convex/lib/catalogue.ts",
  "scripts/guide-preview/queries.ts",
  "scripts/guide-preview/finance-fixtures.ts",
  "scripts/guide-preview/selection-fixtures.tsx",
  "src/components/sell/basket-step.tsx",
  "src/components/sell/shop-step.tsx",
  "src/components/sell/material-tile.tsx",
  "src/components/sell/kg-stepper.tsx",
  "src/components/sell/mode-choice.tsx",
  "src/components/sell/when-step.tsx",
  "src/components/sell/draft.ts",
  "src/components/sell/step-frame.tsx",
  "src/components/sell/step-indicator.tsx",
  "src/app/[locale]/(household)/layout.tsx",
  "src/app/[locale]/(join)/layout.tsx",
  "src/components/join/join-pages.tsx",
  "src/components/join/join-gate.tsx",
  "src/components/join/fields.tsx",
  "src/components/join/form-parts.tsx",
  "src/components/join/use-autosave.ts",
  "src/components/market/new-listing-form.tsx",
  "src/components/market/listing-fields.tsx",
  "src/components/market/field.tsx",
  "src/components/market/my-listings.tsx",
  "src/components/insights/org-impact.tsx",
  "src/components/insights/bar-list.tsx",
  "src/components/insights/ledger-explainer.tsx",
  "src/components/admin/prices/catalogue-setup.tsx",
  "scripts/guide-preview/image.tsx",
  "scripts/guide-preview/vite.config.mts",
  "messages/en.json",
  "messages/ar.json",
  "messages/ta.json",
  "messages/kn.json",
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
      colorScheme: screen.theme ?? "light",
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
      .getByRole("note", { name: "Screenshot provenance", includeHidden: true })
      .waitFor({ state: "visible" });
    await page
      .getByRole("heading", {
        level: screen.headingLevel ?? 1,
        name: screen.heading,
      })
      .waitFor({ state: "visible" });
    if (screen.expectedText)
      await page
        .getByText(screen.expectedText, { exact: true })
        .first()
        .waitFor({ state: "visible" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    if (screen.openMenuLabel) {
      await page
        .getByRole("button", { name: screen.openMenuLabel, exact: true })
        .first()
        .click();
      await page.getByRole("dialog").waitFor({ state: "visible" });
      // Only the harness note moves. The application's sheet and controls keep
      // their real styles and geometry, and the menu header stays visible.
      await page
        .getByRole("note", {
          name: "Screenshot provenance",
          includeHidden: true,
        })
        .evaluate((note) => {
          Object.assign(note.style, {
            position: "fixed",
            top: "auto",
            bottom: "0",
            left: "0",
            right: "0",
          });
        });
      const note = await page
        .getByRole("note", {
          name: "Screenshot provenance",
          includeHidden: true,
        })
        .boundingBox();
      const controls = await page
        .getByRole("dialog")
        .locator("a, button")
        .all();
      for (const control of controls) {
        const box = await control.boundingBox();
        if (
          box &&
          note &&
          box.y + box.height > note.y &&
          box.y < viewport.height
        )
          throw new Error(
            `${screen.name}: the fixture note overlaps a menu control.`,
          );
      }
    }
    if (screen.rejectedActionLabel) {
      await page
        .getByRole("button", { name: screen.rejectedActionLabel, exact: true })
        .click();
      await page.getByRole("alert").waitFor({ state: "visible" });
    }
    if (screen.switchModeLabel)
      await page
        .getByRole("button", { name: screen.switchModeLabel, exact: true })
        .click();
    if (
      await page.evaluate(
        () => getComputedStyle(document.body).margin !== "0px",
      )
    ) {
      throw new Error(
        "Build styles did not load. Restart the fixture server after each Next build.",
      );
    }
    if (screen.route === "/admin/pilot") {
      const charts = page.locator("[data-chart] .recharts-surface");
      if ((await charts.count()) !== 2) {
        throw new Error(
          "The loaded pilot fixture must show both report charts.",
        );
      }
      const renderedCharts = await charts.all();
      for (const chart of renderedCharts) {
        await chart.waitFor({ state: "visible" });
        const bounds = await chart.boundingBox();
        if (!bounds || bounds.width < 200 || bounds.height < 200) {
          throw new Error("Pilot chart has no usable rendered dimensions.");
        }
      }
      await page
        .locator(".recharts-bar-rectangle")
        .first()
        .waitFor({ state: "visible" });
      if (screen.theme === "dark") {
        const tickColors = await page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.color = "var(--muted-foreground)";
          document.body.append(probe);
          const expected = getComputedStyle(probe).color;
          probe.remove();
          return {
            expected,
            actual: [
              ...document.querySelectorAll(
                ".recharts-cartesian-axis-tick-value",
              ),
            ].map((tick) => getComputedStyle(tick).fill),
          };
        });
        if (
          tickColors.actual.length === 0 ||
          tickColors.actual.some(
            (color) =>
              color !== tickColors.expected || color === "rgb(102, 102, 102)",
          )
        ) {
          throw new Error(
            `Dark chart labels must use the semantic muted foreground: ${JSON.stringify(tickColors)}`,
          );
        }
      }
    }
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
    if (screen.scrollText) {
      await page
        .getByRole("heading", { name: screen.scrollText, exact: true })
        .evaluate((element) => {
          const banner = document.querySelector(
            '[aria-label="Screenshot provenance"]',
          );
          window.scrollTo(
            0,
            element.getBoundingClientRect().top +
              window.scrollY -
              (banner?.getBoundingClientRect().height ?? 0) -
              20,
          );
        });
    }
    const bannerBounds = await page
      .getByRole("note", { name: "Screenshot provenance", includeHidden: true })
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
      note: "Real browser renders of current application components. Synthetic data and isolated local query/auth/navigation adapters. Not evidence of sign-in, authorization, live records, provider calls or production deployment. Build styles and Geist/Noto fonts are reused without restyling the app. The visible provenance banner belongs only to this harness.",
      fixtureSha256: hash(fixtureSource),
      sharedSourceHashes,
      styles,
      captures: metadata,
    },
    null,
    2,
  ) + "\n",
);
