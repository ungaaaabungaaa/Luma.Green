import { expect, test } from "@playwright/test";

/**
 * Smoke suite: the app boots, serves every locale, and gets the direction and
 * language attributes right. Feature suites go in their own files.
 */

test("English root renders the brand and tagline", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner").getByText("Luma.Green")).toBeVisible();
  await expect(page.getByText("Cleaner Tomorrow in Motion")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("Tamil locale serves translated copy", async ({ page }) => {
  await page.goto("/ta");

  await expect(page.locator("html")).toHaveAttribute("lang", "ta-IN");
  await expect(page.getByText("தூய்மையான நாளை நோக்கி நகர்வு")).toBeVisible();
});

test("Arabic locale renders right-to-left", async ({ page }) => {
  await page.goto("/ar");

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

test("unknown locale prefixes 404 instead of rendering English", async ({
  page,
}) => {
  const response = await page.goto("/zz-not-a-locale");
  expect(response?.status()).toBe(404);
});

test("sitemap and robots are served", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("<urlset");
  for (const path of ["/prices", "/standards", "/solar"]) {
    expect(xml).toContain(`${path}</loc>`);
  }

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
});
