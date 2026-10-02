import { expect, test } from "@playwright/test";

import arabic from "../messages/ar.json";

// Full document navigation to admin exercises the second root layout.
test("theme choice survives reload and the admin boundary", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/admin/login");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("system mode responds to the device and a fixed choice overrides it", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Light", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("Arabic mobile controls fit and the menu reaches sign-in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/ar");
  await page
    .getByRole("button", { name: arabic.nav.openMenu, exact: true })
    .click();
  const menu = page.getByRole("dialog");
  await menu
    .getByRole("button", { name: arabic.theme.label, exact: true })
    .click();
  await page
    .getByRole("menuitemradio", { name: arabic.theme.dark, exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    menu.getByRole("link", { name: arabic.auth.metaTitle, exact: true }),
  ).toHaveAttribute("href", "/ar/login");
  await expect(
    menu.getByRole("link", { name: arabic.nav.sellScrap, exact: true }),
  ).toHaveAttribute("href", "/ar/sell");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("blocked browser storage does not prevent a theme change", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("long translated navigation stays separate from header controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ["en", "ta", "ml", "ar"]) {
      await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(async () => document.fonts.ready);
      const header = page.getByRole("banner");
      const boxes = await header
        .locator("a:visible, button:visible")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          }),
        );
      for (let index = 0; index < boxes.length; index++) {
        const box = boxes[index];
        const otherBoxes = boxes.slice(index + 1);
        for (const other of otherBoxes) {
          const overlapWidth =
            Math.min(box.x + box.width, other.x + other.width) -
            Math.max(box.x, other.x);
          const overlapHeight =
            Math.min(box.y + box.height, other.y + other.height) -
            Math.max(box.y, other.y);
          expect(
            overlapWidth > 1 && overlapHeight > 1,
            `${locale} header controls overlap at ${String(width)}px`,
          ).toBe(false);
        }
      }
    }
  }
});
