import { expect, type Locator, test } from "@playwright/test";

async function pauseLogoAtMidSpin(mark: Locator) {
  await expect
    .poll(async () =>
      mark.evaluate((element) => element.getAnimations().length),
    )
    .toBe(1);
  const spin = await mark.evaluate((element) => {
    const animation = element.getAnimations().at(0);
    const timing = animation?.effect?.getTiming();
    if (!animation || !timing || typeof timing.duration !== "number")
      return null;
    animation.pause();
    animation.currentTime = timing.duration / 2;
    return {
      iterations: timing.iterations,
      rotated: !new DOMMatrixReadOnly(getComputedStyle(element).transform)
        .isIdentity,
    };
  });
  expect(spin).toEqual({ iterations: 1, rotated: true });
}

async function finishLogoSpin(mark: Locator) {
  await mark.evaluate((element) => {
    for (const animation of element.getAnimations()) animation.finish();
  });
  await expect(mark).toHaveCSS("transform", "none");
}

test("the logo mark spins once on hover and keyboard focus while its name stays still", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  const header = page.getByRole("banner");
  const mark = header.getByRole("img", { name: "Luma.Green", exact: true });
  const wordmark = header.getByText("Luma.Green", { exact: true });
  const homeLink = header.getByRole("link", { name: "Home", exact: true });
  await expect(mark).toHaveCSS("transform", "none");
  await mark.hover();
  await pauseLogoAtMidSpin(mark);
  await expect(wordmark).toHaveCSS("transform", "none");
  await finishLogoSpin(mark);

  await page.mouse.move(1400, 850);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(homeLink).toBeFocused();
  expect(
    await homeLink.evaluate((element) => element.matches(":focus-visible")),
  ).toBe(true);
  await pauseLogoAtMidSpin(mark);
  await expect(wordmark).toHaveCSS("transform", "none");
  await finishLogoSpin(mark);
});

test("reduced motion prevents logo spins and cancels one already in progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  const header = page.getByRole("banner");
  const mark = header.getByRole("img", { name: "Luma.Green", exact: true });
  const homeLink = header.getByRole("link", { name: "Home", exact: true });
  await mark.hover();
  await expect(mark).toHaveCSS("animation-name", "none");
  await expect(mark).toHaveCSS("transform", "none");
  expect(await mark.evaluate((element) => element.getAnimations().length)).toBe(
    0,
  );

  await page.mouse.move(1400, 850);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mark.hover();
  await pauseLogoAtMidSpin(mark);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mark).toHaveCSS("transform", "none");
  expect(await mark.evaluate((element) => element.getAnimations().length)).toBe(
    0,
  );

  await page.mouse.move(1400, 850);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(homeLink).toBeFocused();
  await expect(mark).toHaveCSS("animation-name", "none");
  await expect(mark).toHaveCSS("transform", "none");
});

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
  expect(
    await action.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
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
