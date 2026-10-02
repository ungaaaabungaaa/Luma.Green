import { expect, test } from "@playwright/test";

import arabic from "../messages/ar.json";
import french from "../messages/fr.json";

test("French decimal input produces a localised solar estimate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fr/solar");
  const bill = page.getByRole("textbox", { name: french.solar.form.bill });
  await bill.fill("3 000,50");
  await expect(page.getByText("3,5 kW", { exact: true })).toBeVisible();
  await bill.fill("3,000,50");
  await bill.blur();
  await expect(bill).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("3,5 kW", { exact: true })).toHaveCount(0);
});

test("Arabic keyboard digits work in the RTL calculator", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/solar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page
    .getByRole("textbox", { name: arabic.solar.form.bill })
    .fill("٣٠٠٠٫٥٠");
  await expect(
    page.getByRole("heading", { name: arabic.solar.result.heading }),
  ).toBeVisible();
  await expect(
    page.getByText(arabic.solar.result.prompt, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(arabic.solar.result.size, { exact: true }),
  ).toBeVisible();
});
