import { expect, test } from "@playwright/test";

/**
 * Joining: `/join` is a public, indexed page; everything under it is private
 * and needs a sign-in (in these builds without Convex, that's the "opens
 * soon" screen). The forms themselves are checked against the dev deployment
 * — docs/architecture/auth.md#testing.
 */

const roles = [
  { title: "Kabadiwala", href: "/join/kabadiwala" },
  { title: "Yard", href: "/join/yard" },
  { title: "Recycler", href: "/join/recycler" },
  { title: "Manufacturer", href: "/join/manufacturer" },
  { title: "Saathi", href: "/join/saathi" },
] as const;

test("/join lists every role with a way in", async ({ page }) => {
  await page.goto("/join");

  await expect(page).toHaveTitle("Join Luma.Green · Luma.Green");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Join Luma.Green",
  );
  const main = page.getByRole("main");
  for (const { title, href } of roles) {
    await expect(
      main.getByRole("link", { name: new RegExp(title) }),
    ).toHaveAttribute("href", href);
  }
});

test("/join is indexed, per language", async ({ page, request }) => {
  await page.goto("/kn/join");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/kn\/join$/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );

  const response = await request.get("/sitemap.xml");
  const sitemap = await response.text();
  expect(sitemap).toContain("/kn/join</loc>");
});

for (const path of [
  "/join/kabadiwala",
  "/join/yard/documents",
  "/join/status",
]) {
  test(`${path} asks for a sign-in first and comes back after`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Phone sign-in opens soon",
    );
  });
}

test("an unknown business kind is a 404, not a form", async ({ page }) => {
  const response = await page.goto("/join/warehouse");
  expect(response?.status()).toBe(404);
});
