/** Unmodified local browser evidence for the editable team review pack. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

import ar from "../messages/ar.json";
import en from "../messages/en.json";

const origin = new URL(process.env.GUIDE_BASE_URL ?? "http://localhost:3009");
if (!["localhost", "127.0.0.1"].includes(origin.hostname)) {
  throw new Error("Use a disconnected local preview with no customer data.");
}
const directory = "docs/team-review/screenshots";
const shots = [
  { name: "home-light", route: "/", theme: "light" },
  { name: "home-dark", route: "/", theme: "dark" },
  { name: "how-light", route: "/how-it-works", theme: "light" },
  { name: "how-dark", route: "/how-it-works", theme: "dark" },
  { name: "join-light", route: "/join", theme: "light" },
  { name: "join-dark", route: "/join", theme: "dark" },
  { name: "menu-light", route: "/how-it-works", theme: "light", menu: true },
  { name: "menu-dark", route: "/how-it-works", theme: "dark", menu: true },
  { name: "french-join", route: "/fr/join", theme: "light" },
  { name: "kannada-how", route: "/kn/how-it-works", theme: "light" },
  { name: "arabic-menu", route: "/ar/how-it-works", theme: "dark", menu: true },
  { name: "japanese-how", route: "/ja/how-it-works", theme: "dark" },
] as const;
const sources = [
  "scripts/capture-team-review.mts",
  "src/app/globals.css",
  "src/lib/fonts.ts",
  "src/app/[locale]/(site)/how-it-works/page.tsx",
  "src/app/[locale]/(site)/join/page.tsx",
  "src/components/join/role-cards.tsx",
  "src/components/join/join-preparation.tsx",
  "src/components/site/sorting-guide.tsx",
  "src/components/showcase/role-story-image.tsx",
  ...[
    "material-sorting",
    "fair-weighing",
    "recycled-pellets",
    "electronics-sorting",
    "household-preparation",
    "yard-dispatch",
  ].map((name) => `public/images/showcase/${name}.webp`),
  "src/components/site/home/hero.tsx",
  "src/components/site/home/price-teaser.tsx",
  "src/components/site/page-header.tsx",
  "src/components/site/page-banner.tsx",
  "src/components/site/site-header.tsx",
  "src/components/site/site-nav.tsx",
  "src/components/site/mobile-nav.tsx",
  "src/components/site/language-switcher.tsx",
  "src/components/site/public-effects.module.css",
  "src/components/site/action-name.ts",
  "src/components/brand/logo.tsx",
  "src/components/brand/logo.module.css",
  ...["en", "fr", "kn", "ar", "ja"].map((locale) => `messages/${locale}.json`),
];
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const sourceHashes = Object.fromEntries<string>(
  await Promise.all(
    sources.map(async (file): Promise<[string, string]> => [
      file,
      hash(await readFile(file)),
    ]),
  ),
);
// eslint-disable-next-line sonarjs/no-os-command-from-path -- Read-only revision provenance from the developer-installed Git.
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const viewport = { width: 390, height: 844 };
const captures = [];
try {
  for (const shot of shots) {
    const page = await browser.newPage({
      viewport,
      colorScheme: shot.theme,
      reducedMotion: "reduce",
    });
    const browserErrors: string[] = [];
    const blockedRequests: string[] = [];
    page.on("pageerror", (error) => {
      browserErrors.push(error.message);
    });
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin === origin.origin)
        await route.continue();
      else {
        blockedRequests.push(new URL(route.request().url()).origin);
        await route.abort();
      }
    });
    try {
      const response = await page.goto(new URL(shot.route, origin).href);
      if (!response?.ok()) throw new Error(`Cannot capture ${shot.route}`);
      await page.evaluate(async () => document.fonts.ready);
      await page.locator("img").evaluateAll(async (images) => {
        await Promise.all(
          images
            .filter(
              (image) => image.getBoundingClientRect().top < window.innerHeight,
            )
            .map(async (image) => {
              if (image instanceof HTMLImageElement) await image.decode();
            }),
        );
      });
      if ("menu" in shot) {
        await page
          .getByRole("banner")
          .getByRole("button", {
            name: shot.route.startsWith("/ar/")
              ? ar.nav.openMenu
              : en.nav.openMenu,
            exact: true,
          })
          .click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
      }
      const path = `${directory}/${shot.name}.png`;
      await page.screenshot({ path, animations: "disabled" });
      if (browserErrors.length > 0 || blockedRequests.length > 0)
        throw new Error(`Capture failed integrity checks: ${shot.name}`);
      captures.push({
        path,
        sha256: hash(await readFile(path)),
        route: shot.route,
        theme: shot.theme,
        viewport,
        sourceRevision,
        capturedAt: new Date().toISOString(),
        actualBrowserUI: true,
        provenance: "disconnected-local-production-build",
        authenticatedAccessTested: false,
        browserErrors,
        blockedRequests,
      });
      process.stdout.write(`Captured ${shot.name}\n`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  `${directory}/manifest.json`,
  `${JSON.stringify({ sourceHashes, captures }, null, 2)}\n`,
);
