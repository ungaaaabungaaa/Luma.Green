/** Actual browser captures of public role sections. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const origin = new URL(process.env.GUIDE_BASE_URL ?? "http://localhost:3004");
if (!["localhost", "127.0.0.1"].includes(origin.hostname)) {
  throw new Error("Capture only a local preview with no real customer data.");
}
const sources = [
  "src/components/showcase/role-story-image.tsx",
  "src/components/site/page-banner.tsx",
  "src/components/help/help-hero.tsx",
  "src/app/[locale]/(site)/participants/page.tsx",
  "src/app/[locale]/(site)/help/[role]/page.tsx",
  "messages/en.json",
  "messages/ar.json",
  "public/images/showcase/household-sorting.webp",
  "public/images/showcase/material-yard.webp",
  "public/images/showcase/operations-desk.webp",
];
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const sourceHashes = Object.fromEntries(
  await Promise.all(
    sources.map(async (path): Promise<readonly [string, string]> => [
      path,
      hash(await readFile(path)),
    ]),
  ),
);
// Read-only provenance from the developer-installed Git.
// eslint-disable-next-line sonarjs/no-os-command-from-path
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const browser = await chromium.launch();
const captures = [];
try {
  for (const role of ["household", "yard", "admin", "arabic"] as const) {
    const isPhone = role === "arabic";
    const viewport = isPhone
      ? { width: 390, height: 844 }
      : { width: 1280, height: 1000 };
    const page = await browser.newPage({
      viewport,
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    const browserErrors: string[] = [];
    const blockedRequests: string[] = [];
    page.on("pageerror", (error) => {
      browserErrors.push(error.message);
    });
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin === origin.origin) {
        await route.continue();
      } else {
        blockedRequests.push(new URL(route.request().url()).origin);
        await route.abort();
      }
    });
    try {
      const url = new URL(
        isPhone ? "/ar/help/kabadiwala" : "/participants",
        origin,
      ).href;
      const response = await page.goto(url);
      if (!response?.ok()) throw new Error(`Cannot capture ${url}`);
      const target = isPhone
        ? page.getByRole("main").getByRole("figure").first()
        : page.locator(`section[aria-labelledby="participant-${role}"]`);
      await target.scrollIntoViewIfNeeded();
      await page.evaluate(async () => document.fonts.ready);
      await target.locator("img").evaluateAll(async (images) => {
        await Promise.all(
          images.map(async (image) => {
            if (image instanceof HTMLImageElement) await image.decode();
          }),
        );
      });
      const path = `docs/user-guide/screenshots/showcase-${role}.png`;
      await target.screenshot({ path, animations: "disabled" });
      if (browserErrors.length > 0 || blockedRequests.length > 0) {
        throw new Error(
          `Capture ${role} had browser errors or external traffic`,
        );
      }
      captures.push({
        path,
        sha256: hash(await readFile(path)),
        url,
        sourceRevision: revision,
        sourceHashes,
        viewport,
        capturedAt: new Date().toISOString(),
        actualBrowserUI: true,
        kind: "current-public-role-section",
        productionAuthenticationTested: false,
        browserErrors,
        blockedRequests,
        note: "Unmodified browser element screenshot. Public role information and generated decorative imagery; not authenticated operations or a native release.",
      });
      process.stdout.write(`Captured showcase ${role}\n`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  "docs/user-guide/showcase-captures.json",
  `${JSON.stringify({ captures }, null, 2)}\n`,
);
