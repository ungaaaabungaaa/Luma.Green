import { readFileSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";

import en from "../messages/en.json";
import { localeMeta, locales } from "../src/i18n/locales";

const widths = [320, 390, 640, 768, 1024, 1440] as const;
const languages = locales.map((locale) => ({
  locale,
  copy: JSON.parse(
    readFileSync(`messages/${locale}.json`, "utf8"),
  ) as typeof en,
  direction: localeMeta[locale].dir,
}));

for (const width of [640, 768, 1024, 1440]) {
  test(`join role requirements stay beside the image at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/join");
    const recycler = page.getByRole("main").getByRole("link", {
      name: new RegExp(en.join.roles.recycler.title),
    });
    await expect(recycler).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    const description = await recycler
      .getByText(en.join.roles.recycler.body, { exact: true })
      .evaluate(
        (element) =>
          element.getBoundingClientRect().toJSON() as {
            x: number;
            y: number;
            height: number;
          },
      );
    const requirements = await recycler
      .getByText(`${en.join.youNeed}: ${en.join.roles.recycler.needs}`, {
        exact: true,
      })
      .evaluate(
        (element) =>
          element.getBoundingClientRect().toJSON() as {
            x: number;
            y: number;
            height: number;
          },
      );
    expect(
      requirements.y - description.y - description.height,
      "Requirements must follow the description without an image-height gap",
    ).toBeLessThanOrEqual(12);
    expect(
      Math.abs(requirements.x - description.x),
      "Role details must share the same text column",
    ).toBeLessThanOrEqual(1);
  });
}

/** Check actual text bounds: a hidden overflow rule must not hide a regression. */
async function expectFormToFit(page: Page) {
  await page.evaluate(async () => document.fonts.ready);
  const result = await page.getByRole("main").evaluate((main) => {
    function textFits(element: Element, bounds: DOMRect) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        if (
          node.textContent?.trim() &&
          [...range.getClientRects()].some(
            (rect) =>
              rect.width > 0 &&
              (rect.left < bounds.left - 1 || rect.right > bounds.right + 1),
          )
        )
          return false;
        node = walker.nextNode();
      }
      return true;
    }
    const failures: string[] = [];
    const elements = main.querySelectorAll(
      "h1, h2, h3, label, legend, button, [data-slot='button']",
    );
    for (const element of elements) {
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 1 || bounds.height <= 1) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const label = element.textContent.trim();
      if (bounds.left < -1 || bounds.right > innerWidth + 1) {
        failures.push(`Outside viewport: ${label}`);
      }
      if (!textFits(element, bounds)) failures.push(`Clipped text: ${label}`);
    }
    return {
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      failures: [...new Set(failures)],
    };
  });
  expect(
    result.horizontalOverflow,
    "The page must not scroll sideways",
  ).toBeLessThanOrEqual(1);
  expect(
    result.failures,
    "Headings, labels and actions must remain visible",
  ).toEqual([]);
}

// These production-route tests exercise the disconnected build. Protected join
// routes must show their sign-in guard; this does not claim authenticated form
// coverage. The isolated documentation harness covers those actual components.
for (const { locale, copy, direction } of languages) {
  for (const width of widths) {
    test(`${locale} phone and code preview fit at ${String(width)}px without SMS`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const authRequests: string[] = [];
      await page.route("**/api/auth/**", async (route) => {
        authRequests.push(route.request().url());
        await route.abort();
      });
      await page.goto(`/${locale}/login?next=%2Fjoin%2Fsaathi`);
      await expect(page.locator("html")).toHaveAttribute("dir", direction);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        copy.auth.chooseLanguage,
      );
      await expectFormToFit(page);
      await page
        .getByRole("button", { name: copy.auth.continue, exact: true })
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        copy.auth.title,
      );
      await expectFormToFit(page);
      await page
        .getByLabel(copy.auth.mobileLabel, { exact: true })
        .fill("9000000000");
      await page
        .getByRole("button", { name: copy.auth.previewAction, exact: true })
        .click();
      await expect(page).toHaveURL(/\/login\/verify\?next=%2Fjoin%2Fsaathi$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        copy.auth.previewTitle,
      );
      await expect(
        page.getByText(copy.auth.previewBody, { exact: true }),
      ).toBeVisible();
      await page
        .getByLabel(copy.auth.codeLabel, { exact: true })
        .fill("123456");
      await expect(
        page.getByRole("button", { name: copy.auth.verify, exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", { name: copy.auth.resend, exact: true }),
      ).toBeDisabled();
      await expectFormToFit(page);
      expect(
        authRequests,
        "Preview must not request or verify a real SMS code",
      ).toEqual([]);
      expect(page.url()).not.toContain("9000000000");
      await page
        .getByRole("link", { name: copy.auth.changeNumber, exact: true })
        .click();
      await expect(page).toHaveURL(/\/login\?next=%2Fjoin%2Fsaathi$/);
    });

    test(`${locale} household setup states and join guards fit at ${String(width)}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}/join`);
      await expect(
        page.getByRole("main").getByRole("link", {
          name: new RegExp(copy.join.roles.kabadiwala.title),
        }),
      ).toBeVisible();
      await expectFormToFit(page);
      for (const route of ["/sell", "/t/responsive-demo-token"]) {
        await test.step(route, async () => {
          await page.goto(`/${locale}${route}`);
          await expect(page.getByRole("main")).toBeVisible();
          await expect(
            page
              .getByRole("main")
              .getByText(copy.sell.unavailable.title, { exact: true }),
          ).toBeVisible();
          await expectFormToFit(page);
        });
      }
      for (const route of [
        "/join/kabadiwala",
        "/join/yard",
        "/join/yard/documents",
        "/join/saathi",
        "/join/status",
      ]) {
        await test.step(`Protected template ${route}`, async () => {
          await page.goto(`/${locale}${route}`);
          await expect(page).toHaveURL(
            new RegExp(String.raw`/login\?next=${encodeURIComponent(route)}$`),
          );
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            copy.auth.chooseLanguage,
          );
          await expectFormToFit(page);
        });
      }
    });
  }
}
