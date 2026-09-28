import { expect, test } from "@playwright/test";

/**
 * The public site: every page is reachable from the header, keeps its locale
 * when navigating or switching language, and lays out right-to-left in /ar.
 */

const pages = [
  {
    path: "/how-it-works",
    link: "How it works",
    heading: "How Luma.Green works",
  },
  {
    path: "/participants",
    link: "Who it's for",
    heading: "Who Luma.Green is for",
  },
  { path: "/contact", link: "Contact", heading: "Talk to us" },
] as const;

test("home leads with the product promise and a way in", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One ledger for everything your sector recovers",
  );
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: "Request early access" })
      .first(),
  ).toHaveAttribute("href", "/contact");
  await expect(page).toHaveTitle("Luma.Green — Cleaner Tomorrow in Motion");
});

for (const { path, link, heading } of pages) {
  test(`header navigation reaches ${path}`, async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: link })
      .click();

    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: link }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page).toHaveTitle(`${link} · Luma.Green`);
  });
}

test("each page canonicalises to its own locale", async ({ page }) => {
  await page.goto("/ta/how-it-works");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/ta\/how-it-works$/,
  );
  await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
    "href",
    /\/how-it-works$/,
  );
});

test("switching language keeps the current page", async ({ page }) => {
  await page.goto("/how-it-works");

  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("menuitemradio", { name: "தமிழ்" }).click();

  await expect(page).toHaveURL("/ta/how-it-works");
  await expect(page.locator("html")).toHaveAttribute("lang", "ta-IN");
});

test("links stay inside the active locale", async ({ page }) => {
  await page.goto("/hi");

  await expect(
    page.getByRole("banner").getByRole("link").first(),
  ).toHaveAttribute("href", "/hi");
  await expect(
    page.getByRole("main").getByRole("link", { name: /./ }).first(),
  ).toHaveAttribute("href", /^\/hi\//);
});

test("Arabic pages lay out right-to-left", async ({ page }) => {
  await page.goto("/ar/participants");

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const header = page.getByRole("banner");
  const logo = await header.getByRole("link").first().boundingBox();
  const viewport = page.viewportSize();

  expect(logo).not.toBeNull();
  expect(viewport).not.toBeNull();
  // The logo sits on the inline start, which is the right edge in RTL.
  expect((logo?.x ?? 0) + (logo?.width ?? 0) / 2).toBeGreaterThan(
    (viewport?.width ?? 0) / 2,
  );
});

test("mobile menu opens, navigates and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog");
  await expect(menu).toBeVisible();

  await menu.getByRole("link", { name: "Contact" }).click();

  await expect(page).toHaveURL("/contact");
  await expect(menu).toBeHidden();
});

test("unknown pages get the localised 404 inside the site shell", async ({
  page,
}) => {
  const response = await page.goto("/ta/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ta-IN");
  await expect(page.getByRole("link", { name: /./ }).last()).toBeVisible();
});

test("the skip link jumps past the header", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
