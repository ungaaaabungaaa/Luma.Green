import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/participants",
  "/how-it-works",
  "/standards",
  "/prices",
  "/solar",
  "/help",
  "/help/household",
  "/help/contact",
  "/contact",
  "/join",
  "/login",
  "/sell",
  "/admin/login",
  "/admin/setup",
] as const;

for (const mode of [
  { width: 360, colorScheme: "dark" },
  { width: 1440, colorScheme: "light" },
] as const) {
  for (const route of routes) {
    test(`${route} remains readable at ${String(mode.width)}px in ${mode.colorScheme}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      await page.setViewportSize({ width: mode.width, height: 900 });
      await page.emulateMedia({
        colorScheme: mode.colorScheme,
        reducedMotion: "reduce",
      });
      await page.goto(route);
      await page.evaluate(async () => document.fonts.ready);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
        "The page must fit without horizontal scrolling",
      ).toBeLessThanOrEqual(1);
      const headings = page.getByRole("main").getByRole("heading");
      const clipped = await headings.evaluateAll((elements) =>
        elements
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => element.textContent),
      );
      expect(
        clipped,
        "Headings must not clip translated or large text",
      ).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

for (const width of [360, 390, 768, 1024]) {
  for (const locale of ["ar", "kn", "ta", "ml"]) {
    test(`${locale} home and help fit at ${String(width)}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const route of ["", "/help", "/join"]) {
        await page.goto(`/${locale}${route}`);
        await page.evaluate(async () => document.fonts.ready);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
      }
    });
  }
}
