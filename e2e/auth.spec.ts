import { expect, test } from "@playwright/test";

import kn from "../messages/kn.json" with { type: "json" };

/**
 * Sign-in as it ships before a Convex deployment is connected (see the
 * webServer env in playwright.config.ts): private pages that say plainly that
 * sign-in isn't open yet. The signed-in flows need a deployment and are
 * checked against the dev one — docs/architecture/auth.md#testing.
 */

test("/login is private and says phone sign-in opens soon", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(page).toHaveTitle("Log in · Luma.Green");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Phone sign-in opens soon",
  );
});

test("sign-in speaks the visitor's language", async ({ page }) => {
  await page.goto("/kn/login");

  await expect(page.locator("html")).toHaveAttribute("lang", "kn-IN");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    kn.auth.unavailableTitle,
  );
});

test("admin sign-in is English, never indexed, and off without Convex", async ({
  page,
}) => {
  const response = await page.goto("/admin/login");

  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("Sign in · Luma.Green admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Admin sign-in",
  );
  await expect(
    page.getByText("The admin console isn't switched on here"),
  ).toBeVisible();
});

test("/admin stays outside the locale segment", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Admin console",
  );
});
