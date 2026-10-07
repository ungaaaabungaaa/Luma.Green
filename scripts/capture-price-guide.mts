/** Read-only screenshots of the local app using approved development demo prices. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";

import { chromium } from "@playwright/test";

import { CATALOGUE } from "../convex/lib/catalogue";
import en from "../messages/en.json";

const localFixtureMaterials = [
  { code: "LOCAL-PAPER-BYPRODUCT", name: "Local test paper offcuts" },
  { code: "LOCAL-PAPER-UNCLASSIFIED", name: "Local test unclassified paper" },
];

function isLoopbackOrigin(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.origin === value
    );
  } catch {
    return false;
  }
}

async function configuration() {
  const isLocalMode = process.env.GUIDE_PRICE_LOCAL === "true";
  if (!isLocalMode && process.env.GUIDE_PRICE_LOCAL)
    throw new Error("GUIDE_PRICE_LOCAL must be true or unset.");
  const origin = process.env.GUIDE_BASE_URL ?? "http://localhost:3009";
  if (!isLoopbackOrigin(origin))
    throw new Error("Use a loopback HTTP origin for the documentation app.");
  if (!isLocalMode)
    return {
      origin,
      backend: "https://glorious-rooster-470.eu-west-1.convex.cloud",
      backendSite: "https://glorious-rooster-470.eu-west-1.convex.site",
      backendDeployment: "glorious-rooster-470",
      environment: "approved-cloud-development" as const,
      siteAgreement: false,
    };
  const local = parseEnv(await readFile(".env.local", "utf8"));
  const privatePath = ".convex/local-acceptance/backend.env";
  const details = await stat(privatePath);
  if ((details.mode & 0o077) !== 0)
    throw new Error("Local backend settings must be private.");
  const server = parseEnv(await readFile(privatePath, "utf8"));
  const backend = local.NEXT_PUBLIC_CONVEX_URL;
  const backendSite = local.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (
    !isLoopbackOrigin(backend) ||
    !isLoopbackOrigin(backendSite) ||
    new URL(backend).port !== "3210" ||
    new URL(backendSite).port !== "3211" ||
    new URL(backend).hostname !== new URL(backendSite).hostname ||
    local.NEXT_PUBLIC_SITE_URL !== origin ||
    server.SITE_URL !== origin ||
    server.AUTH_LOCAL_TEST_MODE !== "true"
  )
    throw new Error("Approved local frontend and backend settings must agree.");
  return {
    origin,
    backend,
    backendSite,
    backendDeployment: "isolated-anonymous-local",
    environment: "isolated-local" as const,
    siteAgreement: true,
  };
}

// Explicit local mode never permits a hosted backend or silently falls back to one.
const config = await configuration();
if (process.argv.includes("--check-config")) {
  process.stdout.write(`${JSON.stringify(config)}\n`);
  // eslint-disable-next-line unicorn/no-process-exit -- This CLI validation mode must stop before browser startup.
  process.exit(0);
}
const origin = new URL(config.origin);
const { backend, backendSite } = config;
const allowed = new Set([origin.origin, backend, backendSite]);
const sourceFiles = [
  "scripts/capture-price-guide.mts",
  "convex/lib/catalogue.ts",
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
    await page.route("**/*", async (request) => {
      const requestOrigin = new URL(request.request().url()).origin;
      if (allowed.has(requestOrigin)) {
        if (["GET", "HEAD"].includes(request.request().method()))
          await request.continue();
        else {
          mutations.push("HTTP write");
          await request.abort();
        }
      } else {
        blockedRequests.push(requestOrigin);
        await request.abort();
      }
    });
    await page.routeWebSocket("**/*", async (socket) => {
      const url = new URL(socket.url());
      const httpOrigin = `${url.protocol === "ws:" ? "http:" : "https:"}//${url.host}`;
      // Next 16's local development channel is not a Convex data connection.
      if (httpOrigin === origin.origin && url.pathname === "/_next/hmr") {
        socket.connectToServer();
        return;
      }
      if (httpOrigin !== backend) {
        blockedRequests.push(url.origin);
        await socket.close();
        return;
      }
      const server = socket.connectToServer();
      socket.onMessage((message) => {
        let value: unknown;
        try {
          value = JSON.parse(String(message)) as unknown;
        } catch {
          mutations.push("Unrecognized frame");
          return;
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "type" in value &&
          (value.type === "Mutation" || value.type === "Action")
        ) {
          mutations.push(value.type);
          return;
        }
        server.send(message);
      });
    });
    try {
      const response = await page.goto(new URL("/prices", origin).href);
      if (!response?.ok())
        throw new Error("The local price page did not load.");
      const notice = page.getByText(en.prices.demoNote, { exact: true });
      await notice.waitFor({ timeout: 30_000 });
      const rows = page.locator('main section button[aria-haspopup="dialog"]');
      const observedMaterials = await rows.evaluateAll((buttons) =>
        buttons.map((button) => ({
          code: button.querySelector(".font-mono")?.textContent.trim() ?? "",
          name: button.querySelector(".font-medium")?.textContent.trim() ?? "",
        })),
      );
      const expectedMaterials = CATALOGUE.map(({ code, names }) => ({
        code,
        name: names.en,
      }));
      const optionalMaterials =
        config.environment === "isolated-local" ? localFixtureMaterials : [];
      const permittedMaterials = [...expectedMaterials, ...optionalMaterials];
      if (
        expectedMaterials.length !== 26 ||
        new Set(observedMaterials.map(({ code }) => code)).size !==
          observedMaterials.length ||
        expectedMaterials.some((expected) =>
          observedMaterials.every(
            (actual) =>
              actual.code !== expected.code || actual.name !== expected.name,
          ),
        ) ||
        observedMaterials.some((actual) =>
          permittedMaterials.every(
            (expected) =>
              actual.code !== expected.code || actual.name !== expected.name,
          ),
        )
      )
        throw new Error(
          "Expected all 26 approved catalogue rows and only the two named optional local test materials.",
        );
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      let name = "public-prices-demo";
      let historyPoints: number | null = null;
      if (theme === "light") {
        await notice.evaluate((node) => {
          window.scrollTo(
            0,
            node.getBoundingClientRect().top + window.scrollY - 120,
          );
        });
      } else {
        name = "public-price-history-demo-dark";
        await rows
          .filter({ has: page.getByText("PAPER-NEWS", { exact: true }) })
          .click();
        const slider = page.getByRole("dialog").getByRole("slider");
        await slider.waitFor();
        const lastPoint = Number(await slider.getAttribute("aria-valuemax"));
        historyPoints = lastPoint + 1;
        if (
          !Number.isSafeInteger(lastPoint) ||
          lastPoint < 1 ||
          lastPoint > 29
        ) {
          throw new Error(
            "Expected available daily samples within the 30-day window.",
          );
        }
        await slider.focus();
        await slider.press("ArrowLeft");
        if (
          (await slider.getAttribute("aria-valuenow")) !== String(lastPoint - 1)
        ) {
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
          (await page.getByRole("dialog").locator("tbody tr").count()) !==
          historyPoints
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
        backendDeployment: config.backendDeployment,
        environment: config.environment,
        frontendOrigin: origin.origin,
        backendOrigin: backend,
        backendSiteOrigin: backendSite,
        siteAgreement: config.siteAgreement,
        writesBlocked: true,
        sampleData: true,
        productionFrontendTested: false,
        authenticationTested: false,
        mutationsPerformed: false,
        rows: observedMaterials.length,
        materials: observedMaterials,
        originalCatalogueRows: 26,
        localFixtureRows: observedMaterials.filter(({ code }) =>
          localFixtureMaterials.some((material) => material.code === code),
        ).length,
        historyPoints,
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
