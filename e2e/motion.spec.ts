import { expect, test } from "@playwright/test";

test.describe("home content without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps headings and primary links visible", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: "Sell your scrap", exact: true })
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toHaveCSS(
      "opacity",
      "1",
    );
  });
});

test("reduced motion keeps Arabic content still and controls usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("transform", "none");
  const action = page.getByRole("main").getByRole("link").first();
  await action.focus();
  await expect(action).toBeFocused();
  await expect(action).toHaveCSS("transition-duration", "0s");
  await expect(action).toHaveCSS("min-height", "44px");
});

test("motion leaves no hidden content after navigation and preference changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Observe a real tween, so a broken optional chunk cannot silently pass
  // merely because the server-rendered page is still visible.
  await page.addInitScript(() => {
    const observer = new MutationObserver((records) => {
      for (const { target } of records) {
        if (
          target instanceof HTMLElement &&
          target.tagName === "H1" &&
          target.style.transform
        ) {
          target.dataset.motionObserved = "true";
          observer.disconnect();
          break;
        }
      }
    });
    observer.observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  });
  await page.goto("/en");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveAttribute("data-motion-observed", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(heading).toHaveCSS("transform", "none");
  await expect(heading).toHaveCSS("opacity", "1");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Sell your scrap", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/sell$/u);
  await page.goBack();
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("transform", "none");
});
