import { expect, test } from "@playwright/test";

import ar from "../messages/ar.json" with { type: "json" };
import en from "../messages/en.json" with { type: "json" };

for (const { locale, copy } of [
  { locale: "en", copy: en },
  { locale: "ar", copy: ar },
]) {
  test(`${locale} email signup shows honest unavailable state in the disconnected app`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/login`);
    await page
      .getByRole("button", { name: copy.auth.continue, exact: true })
      .click();
    await expect(
      page.getByRole("tab", { name: copy.emailAuth.phone, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("tab", { name: copy.emailAuth.email, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: copy.emailAuth.signin, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("tabpanel")).toHaveCSS(
      "direction",
      locale === "ar" ? "rtl" : "ltr",
    );
    await expect(page.getByRole("status")).toHaveText(
      copy.emailAuth.unavailable,
    );
    await page
      .getByRole("button", { name: copy.emailAuth.signup, exact: true })
      .click();
    await expect(
      page.getByLabel(copy.emailAuth.name, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: copy.emailAuth.signup, exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

  test(`${locale} missing email tokens cannot verify or reset`, async ({
    page,
  }) => {
    for (const action of ["verify", "reset"] as const) {
      await page.goto(`/${locale}/login/email/${action}`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
        "content",
        "no-referrer",
      );
      const invalidLinkAlert = page
        .getByRole("alert")
        .and(page.getByText(copy.emailAuth.invalidLink, { exact: true }));
      await expect(invalidLinkAlert).toBeVisible();
      await expect(invalidLinkAlert).toHaveText(copy.emailAuth.invalidLink);
      await expect(
        page.getByRole("button", { name: copy.emailAuth[action], exact: true }),
      ).toBeDisabled();
    }
  });
}
