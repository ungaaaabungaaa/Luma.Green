import { expect, test } from "@playwright/test";

import ar from "../messages/ar.json" with { type: "json" };
import en from "../messages/en.json" with { type: "json" };

// Anonymous checks against the normal disconnected app. Protected UI and
// provider acceptance are tested separately; this spec never bypasses auth.
for (const { locale, messages } of [
  { locale: "en", messages: en },
  { locale: "ar", messages: ar },
]) {
  for (const section of ["security", "notifications"]) {
    test(`${locale} ${section} settings require sign-in and preserve the return destination`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/account/${section}`);
      await expect(page).toHaveURL(
        new RegExp(String.raw`/login\?next=%2Faccount%2F${section}$`),
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        messages.auth.chooseLanguage,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
      await page
        .getByRole("button", { name: messages.auth.continue, exact: true })
        .click();
      await expect(
        page.getByLabel(messages.auth.mobileLabel, { exact: true }),
      ).toBeVisible();
      await expect(page).toHaveURL(
        new RegExp(String.raw`/login\?next=%2Faccount%2F${section}$`),
      );
    });
  }
}

test("admin recovery has clear routes and a missing-token recovery path", async ({
  page,
}) => {
  // Disconnected admin sign-in renders its unavailable state. The connected
  // login component test owns the Forgot password link; this checks its route.
  await page.goto("/admin/forgot-password");
  await expect(page).toHaveURL(/\/admin\/forgot-password$/);
  await expect(page.getByLabel("Admin email", { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await page.goto("/admin/reset-password");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "missing its token",
  );
  await expect(
    page.getByRole("button", { name: "Update password" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Request a new reset link" }).click();
  await expect(page).toHaveURL(/\/admin\/forgot-password$/);
});
