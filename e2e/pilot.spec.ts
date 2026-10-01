import { expect, test } from "@playwright/test";

/** Signed-in pilot report is covered locally with Convex and component tests. */
test("pilot numbers stay private when the backend is unavailable", async ({
  page,
}) => {
  const response = await page.goto("/admin/pilot");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page).toHaveURL(/\/admin\/pilot$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByText("The admin console isn't switched on here"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "13–20 October" })).toHaveCount(
    0,
  );
});
