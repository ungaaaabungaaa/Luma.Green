import { expect, type Locator, type Page, test } from "@playwright/test";

import arabic from "../messages/ar.json";
import english from "../messages/en.json";
import urdu from "../messages/ur.json";

const roles = [
  "household",
  "kabadiwala",
  "yard",
  "recycler",
  "manufacturer",
  "saathi",
  "admin",
] as const;

const helpRoles = roles.filter((role) => role !== "admin");
const participantTitles = {
  household: english.participants.householdHeading,
  kabadiwala: english.participants.kabadiwala.name,
  yard: english.participants.yard.name,
  recycler: english.participants.recycler.name,
  manufacturer: english.participants.manufacturer.name,
  saathi: english.participants.saathi.name,
  admin: english.showcase.preview.roles.admin.title,
};

async function expectStoryImages(region: Locator, count: number) {
  const images = region.locator("img");
  await expect(images).toHaveCount(count);
  const imageElements = await images.all();
  for (const image of imageElements) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(async () =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
}

async function expectReadablePreviews(
  page: Page,
  count: number,
  label = english.showcase.preview.label,
) {
  const previews = page
    .getByRole("main")
    .getByRole("figure")
    .filter({ has: page.getByText(label, { exact: true }) });
  await expect(previews).toHaveCount(count);
  await page.evaluate(async () => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  const previewElements = await previews.all();
  for (const preview of previewElements) {
    await expect(preview).toBeVisible();
    // Illustrations must not add fake form controls or extra keyboard stops.
    await expect(
      preview.locator("button, input, select, textarea, a, [tabindex]"),
    ).toHaveCount(0);
    const bounds = await preview.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error("A preview must have visible bounds");
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      (page.viewportSize()?.width ?? 0) + 1,
    );
    expect(
      await preview.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
}

test("each participant has a labelled app preview and its own material story", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/en/participants");
  await expectReadablePreviews(page, 7);
  for (const role of roles) {
    await expect(
      page.getByRole("figure", {
        name: english.showcase.preview.roles[role].title,
        exact: true,
      }),
    ).toBeVisible();
    const section = page.getByRole("region", {
      name: participantTitles[role],
      exact: true,
    });
    const image = section.locator("img");
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(async () =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
});

test("home role photos load on a 360px phone and the household action works", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/en");
  const roleSection = page.getByRole("region", {
    name: english.home.roles.heading,
  });
  await expectStoryImages(roleSection, 6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await roleSection
    .getByRole("link", { name: english.home.roles.household.cta, exact: true })
    .click();
  await expect(page).toHaveURL(/\/sell$/u);
});

test("Arabic participant previews fit a phone and retain clear illustration labels", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/participants");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expectReadablePreviews(page, 7, arabic.showcase.preview.label);
  for (const role of roles) {
    const preview = page.getByRole("figure", {
      name: arabic.showcase.preview.roles[role].title,
      exact: true,
    });
    await expect(preview).toContainText(arabic.showcase.preview.label);
  }
});

test("Urdu join photos fit a phone and cards lead to the selected role", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ur/join");
  const roleLink = page.getByRole("link").filter({
    has: page.getByText(urdu.join.roles.kabadiwala.title, { exact: true }),
  });
  const roleList = page
    .getByRole("main")
    .getByRole("list")
    .filter({ has: roleLink });
  await expectStoryImages(roleList, 5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await roleLink.focus();
  await expect(roleLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ur\/join\/kabadiwala$/u);
});

test("each role help page keeps guides reachable past the workspace preview", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const role of helpRoles) {
    await page.goto(`/en/help/${role}`);
    await expectReadablePreviews(page, 1);
    await page
      .getByRole("link", { name: english.help.role.guidesHeading, exact: true })
      .click();
    await expect(page).toHaveURL(/#guides$/u);
    await expect(
      page.getByRole("heading", {
        name: english.help.role.guidesHeading,
        exact: true,
      }),
    ).toBeInViewport();
  }
});

test("public information scenes load without adding controls or overflowing a phone", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["solar", "prices", "standards", "contact"]) {
    await page.goto(`/en/${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const scene = page
      .getByRole("main")
      .getByRole("figure")
      .filter({ has: page.getByText(english.showcase.scene, { exact: true }) })
      .first();
    await expectStoryImages(scene, 1);
    await expect(scene.locator("img")).toHaveAttribute("alt", "");
    await expect(scene.locator("button, a, input, [tabindex]")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
});

test("Arabic sign-in and household booking keep their content before the scene on phones", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, position] of [
    ["login", "50% 25%"],
    ["sell", "50% 50%"],
  ] as const) {
    await page.goto(`/ar/${route}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const scene = page
      .getByRole("figure")
      .filter({ has: page.getByText(arabic.showcase.scene, { exact: true }) })
      .first();
    await expectStoryImages(scene, 1);
    // A fresh production stylesheet must retain the intended phone crop.
    await expect(scene.locator("img")).toHaveCSS("object-position", position);
    const headingBottom = await heading.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    );
    const sceneTop = await scene.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    expect(headingBottom).toBeLessThanOrEqual(sceneTop);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
});
