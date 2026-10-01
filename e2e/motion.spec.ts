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

test("hero artwork follows scroll within a bounded distance and stops on request", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en");
  const artwork = page.locator("[data-parallax]").first();
  await expect(artwork).toHaveAttribute("style", /transform/u);
  const start = await artwork.evaluate(
    (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
  );
  await page.evaluate(() => {
    window.scrollTo(0, 450);
  });
  await expect
    .poll(async () =>
      artwork.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
      ),
    )
    .not.toBe(start);
  const end = await artwork.evaluate(
    (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
  );
  expect(Math.abs(end - start)).toBeGreaterThan(2);
  expect(Math.abs(end)).toBeLessThanOrEqual(64);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Preserve the artwork's static CSS crop scale; only scroll motion is removed.
  await expect
    .poll(async () =>
      artwork.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
      ),
    )
    .toBe(0);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect
    .poll(async () =>
      artwork.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
      ),
    )
    .toBe(0);

  await page.locator('a[href="#chain-heading"]').click();
  await expect(page).toHaveURL(/#chain-heading$/u);
  const chainHeading = page.locator("#chain-heading");
  await expect(chainHeading).toBeInViewport({ ratio: 1 });
  // Anchor navigation must leave the full title below the sticky site header.
  await expect
    .poll(async () => {
      const headingBounds = await chainHeading.boundingBox();
      const headerBounds = await page.getByRole("banner").boundingBox();
      return !headingBounds || !headerBounds
        ? -1
        : headingBounds.y - (headerBounds.y + headerBounds.height);
    })
    .toBeGreaterThanOrEqual(0);
});

for (const locale of ["en", "ar"]) {
  test(`small-screen artwork and public pages stay within the ${locale} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of [
      "",
      "/how-it-works",
      "/participants",
      "/prices",
      "/sell",
      "/join",
    ]) {
      await page.goto(`/${locale}${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(
        overflow,
        `${locale}${route} must not scroll horizontally`,
      ).toBeLessThanOrEqual(1);
    }
  });
}
