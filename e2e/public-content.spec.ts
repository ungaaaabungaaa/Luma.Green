import { expect, test } from "@playwright/test";

test("the chain page leads from preparation details to the complete guide", async ({
  page,
}) => {
  await page.goto("/how-it-works");
  const guide = page.getByRole("region", { name: "Get your scrap ready" });
  await expect(
    guide.getByText("Set gadgets and batteries aside"),
  ).toBeVisible();
  await guide.getByRole("link").click();
  await expect(page).toHaveURL("/help/household/get-ready");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Get your scrap ready",
  );
});

test("the price explanation stays usable when live prices cannot load", async ({
  page,
}) => {
  await page.goto("/prices");
  await expect(
    page.getByText("Prices aren't available right now"),
  ).toBeVisible();
  const guide = page.getByRole("region", {
    name: "Weighing and payment at your door",
  });
  await guide.getByRole("link").click();
  await expect(page).toHaveURL("/help/household/weighing-at-door");
});

test("Arabic help topics preserve the locale on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/help");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const guide = page.locator('main a[href="/ar/help/yard/verify-business"]');
  await guide.click();
  await expect(page).toHaveURL("/ar/help/yard/verify-business");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

for (const [route, selector] of [
  ["/how-it-works", 'section[aria-labelledby="sorting-guide-heading"] img'],
  ["/prices", 'section[aria-labelledby="price-guide-heading"] img'],
  ["/join", 'section[aria-labelledby="join-preparation-heading"] img'],
  ["/participants", 'section[aria-labelledby="participant-yard"] img'],
] as const) {
  test(`tablet detail artwork has enough pixels at ${route}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(route);
    const image = page.locator(selector);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => {
          if (!element.currentSrc) return false;
          const selectedWidth = Number(
            new URL(element.currentSrc).searchParams.get("w"),
          );
          return (
            element.complete &&
            element.naturalWidth > 0 &&
            selectedWidth >= element.getBoundingClientRect().width
          );
        }),
      )
      .toBe(true);
  });
}

for (const [locale, width, prefix] of [
  ["en", 768, ""],
  ["ta", 320, "/ta"],
  ["ml", 320, "/ml"],
] as const) {
  test(`the join action fits one line in ${locale} at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto(`${prefix}/join`);
    const link = page.locator(`aside a[href="${prefix}/how-it-works"]`);
    await link.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const lines = await link.locator("span:visible").evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    });
    expect(lines).toBe(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const bounds = await link.boundingBox();
    expect(bounds).not.toBeNull();
    expect((bounds?.x ?? width) + (bounds?.width ?? width)).toBeLessThanOrEqual(
      width,
    );
  });
}
