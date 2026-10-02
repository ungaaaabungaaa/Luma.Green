import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

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
) {
  throw new Error("Responsive fixtures require a loopback HTTP origin.");
}
const output =
  process.env.GUIDE_AUDIT_OUTPUT ??
  (await mkdtemp(path.join(tmpdir(), "luma-responsive-fixtures-")));
const manifest = JSON.parse(
  await readFile(
    path.join(repository, "docs/user-guide/screenshots/fixture-captures.json"),
    "utf8",
  ),
);
const widths = [320, 390, 640, 768, 1024, 1440];
const translatedNames = new Set([
  "kabadiwala-overview",
  "kabadiwala-request",
  "yard-market",
  "yard-sell",
  "yard-invoice",
  "manufacturer-compliance",
  "recycler-impact",
  "saathi-overview",
]);
const coverage = JSON.parse(
  await readFile(path.join(repository, "docs/i18n/coverage.json"), "utf8"),
);
const translatedLocales = coverage.locales
  .map((entry) => entry.locale)
  .filter((locale) => locale !== "en");
const screens = [
  ...manifest.captures.map((capture) => ({ ...capture, locale: "en" })),
  ...translatedLocales.flatMap((locale) =>
    manifest.captures
      .filter((capture) => translatedNames.has(capture.name))
      .map((capture) => ({
        ...capture,
        name: `${capture.name}-${locale}`,
        locale,
        widths: locale === "ar" ? widths : [320, 768],
        route: capture.route.replace(/^\/en\//u, () => `/${locale}/`),
      })),
  ),
].filter(
  (screen) =>
    !process.env.GUIDE_AUDIT_SCREEN ||
    screen.name.includes(process.env.GUIDE_AUDIT_SCREEN),
);
await mkdir(output, { recursive: true });
process.stdout.write(`Audit output: ${output}\n`);
const browser = await chromium.launch();
const results = [];
try {
  for (const screen of screens) {
    const screenWidths = screen.widths ?? widths;
    for (const width of screenWidths) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        colorScheme: screen.theme ?? "light",
      });
      const errors = [];
      const blocked = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.route("**/*", async (route) => {
        if (new URL(route.request().url()).origin === origin) {
          await route.continue();
        } else {
          blocked.push(route.request().url());
          await route.abort();
        }
      });
      await page.clock.setFixedTime(new Date("2026-10-14T06:00:00Z"));
      await page.goto(`${origin}${screen.route}`, {
        waitUntil: "domcontentloaded",
      });
      await page.getByRole("note", { name: "Screenshot provenance" }).waitFor();
      await page.locator("h1").waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode()));
      });
      if (screen.scrollTarget) {
        await page.locator(screen.scrollTarget).evaluate((element) => {
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
      const measure = async () =>
        page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          // Playwright serializes this callback; DOM helpers must remain inside it.
          // eslint-disable-next-line unicorn/consistent-function-scoping
          const describe = (element) => ({
            tag: element.tagName,
            text: (
              element.getAttribute("aria-label") ??
              element.textContent ??
              ""
            )
              .trim()
              .slice(0, 100),
            classes:
              typeof element.className === "string" ? element.className : "",
            width: Math.round(element.getBoundingClientRect().width),
          });
          const scrollContainer = (element) => {
            for (
              let ancestor = element.parentElement;
              ancestor && ancestor !== document.body;
              ancestor = ancestor.parentElement
            ) {
              const style = getComputedStyle(ancestor);
              if (
                /(auto|scroll)/u.test(style.overflowX) &&
                ancestor.scrollWidth > ancestor.clientWidth + 1
              )
                return ancestor;
            }
            return null;
          };
          const visible = [...document.querySelectorAll("body *")].filter(
            (element) => {
              if (!(element instanceof HTMLElement)) return false;
              const bounds = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return (
                bounds.width > 2 &&
                bounds.height > 2 &&
                style.visibility !== "hidden" &&
                style.display !== "none" &&
                !element.classList.contains("sr-only")
              );
            },
          );
          const outside = visible
            .filter((element) => {
              const bounds = element.getBoundingClientRect();
              // Progress fills intentionally translate inside a clipped track.
              const clippedGraphic = element.closest('[role="progressbar"]');
              return (
                (bounds.left < -1 || bounds.right > viewport + 1) &&
                !clippedGraphic &&
                !scrollContainer(element)
              );
            })
            .map((element) => describe(element));
          const clippedControls = visible
            .filter(
              (element) =>
                element.matches("button, a, [role=button], [role=tab]") &&
                // Radix radio/checkbox/switch hit-area pseudo-elements are larger
                // than their visible icon; measure text-bearing controls here.
                element.textContent.trim().length > 0 &&
                !scrollContainer(element) &&
                element.scrollWidth > element.clientWidth + 2,
            )
            .map((element) => describe(element));
          const textOverflow = visible
            .filter((element) => {
              if (
                !element.matches("h1, h2, h3, label") ||
                scrollContainer(element)
              )
                return false;
              const bounds = element.getBoundingClientRect();
              const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
              );
              for (
                let node = walker.nextNode();
                node;
                node = walker.nextNode()
              ) {
                if (
                  !node.textContent.trim() ||
                  node.parentElement?.closest(
                    '.sr-only, [aria-hidden="true"]',
                  ) ||
                  getComputedStyle(node.parentElement).textOverflow ===
                    "ellipsis"
                )
                  continue;
                const range = document.createRange();
                range.selectNodeContents(node);
                if (
                  [...range.getClientRects()].some(
                    (rect) =>
                      rect.left < bounds.left - 2 ||
                      rect.right > bounds.right + 2,
                  )
                )
                  return true;
              }
              return false;
            })
            .map((element) => describe(element));
          const scrollRegions = visible
            .filter((element) => {
              const style = getComputedStyle(element);
              return (
                /(auto|scroll)/u.test(style.overflowX) &&
                element.scrollWidth > element.clientWidth + 1
              );
            })
            .map((element) => describe(element));
          return {
            viewport,
            pageWidth: document.documentElement.scrollWidth,
            direction: document.documentElement.dir,
            outside,
            clippedControls,
            textOverflow,
            scrollRegions,
          };
        });
      const layout = await measure();
      const result = {
        name: screen.name,
        route: screen.route,
        width,
        locale: screen.locale,
        ...layout,
        errors,
        blocked,
      };
      const hasFailed =
        layout.pageWidth > width + 1 ||
        layout.outside.length > 0 ||
        layout.clippedControls.length > 0 ||
        layout.textOverflow.length > 0 ||
        errors.length > 0 ||
        blocked.length > 0;
      if (hasFailed) {
        result.screenshot = path.join(output, `${screen.name}-${width}.png`);
        await page.screenshot({ path: result.screenshot, fullPage: false });
      }
      results.push({ ...result, failed: hasFailed });
      process.stdout.write(
        `${hasFailed ? "FAIL" : "PASS"} ${screen.name} ${width}\n`,
      );
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  path.join(output, "results.json"),
  JSON.stringify(
    {
      origin,
      syntheticOnly: true,
      widths,
      tested: results.length,
      failed: results.filter((result) => result.failed).length,
      results,
    },
    null,
    2,
  ),
);
if (results.some((result) => result.failed)) process.exitCode = 1;
