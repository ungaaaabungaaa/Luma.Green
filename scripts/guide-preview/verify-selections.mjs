import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium } from "@playwright/test";

import { localeMeta } from "../../src/i18n/locales.ts";

function localOrigin(value) {
  const url = new URL(value);
  assert.ok(
    url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password,
    "Selection verification requires a loopback HTTP origin.",
  );
  return url.origin;
}

const fixture = localOrigin(
  process.env.GUIDE_FIXTURE_ORIGIN ?? "http://127.0.0.1:3203",
);
const publicOrigin = localOrigin(
  process.env.GUIDE_PUBLIC_ORIGIN ?? "http://localhost:3009",
);
const output =
  process.env.SELECTION_REVIEW_OUTPUT ??
  (await mkdtemp(path.join(tmpdir(), "luma-selections-")));
const scenes = [
  { name: "basket", origin: fixture, route: "/sell/basket" },
  { name: "mode", origin: fixture, route: "/sell/shop" },
  { name: "when", origin: fixture, route: "/sell/when" },
  { name: "join", origin: fixture, route: "/join/kabadiwala" },
  { name: "market", origin: fixture, route: "/app/market?role=yard" },
  { name: "solar", origin: publicOrigin, route: "/solar" },
];
const settings = [
  { locale: "en", width: 390, theme: "light" },
  { locale: "en", width: 768, theme: "dark" },
  { locale: "en", width: 1440, theme: "light" },
  { locale: "ar", width: 320, theme: "dark" },
  { locale: "ta", width: 320, theme: "light" },
  { locale: "ml", width: 390, theme: "dark" },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const scene of scenes) {
    for (const setting of settings) {
      const { locale, width, theme } = setting;
      const name = `${scene.name}-${locale}-${String(width)}-${theme}`;
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      await page.route("**/*", async (route) => {
        if (new URL(route.request().url()).origin !== scene.origin) {
          await route.abort();
          return;
        }
        await route.continue();
      });
      let failure;
      try {
        await page.goto(`${scene.origin}/${locale}${scene.route}`, {
          waitUntil: "domcontentloaded",
        });
        await page.locator("main").waitFor();
        await page
          .locator(
            'main [aria-pressed], main [role="radio"], main [role="checkbox"]',
          )
          .first()
          .waitFor();
        await page.evaluate(async () => document.fonts.ready);
        if (scene.name === "solar") {
          await page
            .locator('[role="radiogroup"]')
            .first()
            .scrollIntoViewIfNeeded();
        } else if (scene.name === "join") {
          await page
            .locator('[role="checkbox"]')
            .first()
            .scrollIntoViewIfNeeded();
        }
        const evidence = await page.locator("main").evaluate((main) => {
          function textFits(element, bounds) {
            const walker = document.createTreeWalker(
              element,
              NodeFilter.SHOW_TEXT,
            );
            let node = walker.nextNode();
            while (node) {
              const range = document.createRange();
              range.selectNodeContents(node);
              if (
                node.textContent?.trim() &&
                [...range.getClientRects()].some(
                  (rect) =>
                    rect.width > 0 &&
                    (rect.left < bounds.left - 1 ||
                      rect.right > bounds.right + 1),
                )
              )
                return false;
              node = walker.nextNode();
            }
            return true;
          }
          const controls = [
            ...main.querySelectorAll(
              '[aria-pressed], [role="radio"], [role="checkbox"]',
            ),
          ]
            .filter((element) => element.getBoundingClientRect().width > 0)
            .map((element) => {
              const target = element.closest("label") ?? element;
              const bounds = target.getBoundingClientRect();
              const style = getComputedStyle(element);
              const compact =
                element.hasAttribute("aria-pressed") ||
                (element.getAttribute("role") === "radio" &&
                  !element.closest("label"));
              return {
                text: target.textContent.trim(),
                height: bounds.height,
                compact,
                textFits: textFits(target, bounds),
                borders: [
                  style.borderTopWidth,
                  style.borderRightWidth,
                  style.borderBottomWidth,
                  style.borderLeftWidth,
                ],
              };
            });
          const isBasketTextFitted = [
            ...main.querySelectorAll(
              ':scope [aria-labelledby="basket-title"] li > div:first-child span',
            ),
          ].every((element) =>
            textFits(element, element.getBoundingClientRect()),
          );
          return {
            width: document.documentElement.scrollWidth,
            dark: document.documentElement.classList.contains("dark"),
            directions: [...main.querySelectorAll('[role="radiogroup"]')].map(
              (element) => element.getAttribute("dir"),
            ),
            controls,
            isBasketTextFitted,
          };
        });
        assert.deepEqual(errors, [], "Browser errors");
        assert.ok(
          evidence.width <= width,
          `Page width ${String(evidence.width)} exceeds ${String(width)}`,
        );
        assert.equal(evidence.dark, theme === "dark");
        assert.ok(
          evidence.isBasketTextFitted,
          "Basket name or estimate paints outside its own text column",
        );
        for (const direction of evidence.directions) {
          assert.equal(
            direction,
            localeMeta[locale].dir,
            "Radio group must follow locale direction",
          );
        }
        assert.ok(evidence.controls.length > 0, "Expected selection controls");
        for (const control of evidence.controls) {
          assert.ok(control.height >= 43.5, `Small target: ${control.text}`);
          assert.ok(control.textFits, `Text outside target: ${control.text}`);
          if (control.compact && control.borders[2] === "2px") {
            assert.deepEqual(
              [control.borders[0], control.borders[1], control.borders[3]],
              ["0px", "0px", "0px"],
              `Underline became a box: ${control.text}`,
            );
          }
        }
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
      }
      await page.screenshot({
        path: path.join(output, `${name}.png`),
        fullPage: ["basket", "mode", "when"].includes(scene.name),
      });
      results.push({ name, passed: !failure, failure });
      const detail = failure ? `: ${failure}` : "";
      process.stdout.write(`${failure ? "FAIL" : "PASS"} ${name}${detail}\n`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  path.join(output, "results.json"),
  JSON.stringify(results, null, 2),
);
if (results.some((result) => !result.passed)) process.exitCode = 1;
process.stdout.write(`Selection review: ${output}\n`);
