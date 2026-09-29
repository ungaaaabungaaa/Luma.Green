import { expect, test } from "@playwright/test";

/**
 * The public site: the home page tells the chain's story, every page is
 * reachable from the header or footer, pages keep their locale when
 * navigating or switching language, and lay out right-to-left in /ar.
 *
 * Playwright runs without Convex (playwright.config.ts), so live panels
 * show their "not connected" state; the solar calculator is pure and runs
 * in full.
 */

// Pages other areas own are only checked for a heading and the title suffix,
// so their copy can change without breaking this suite.
const pages = [
  {
    path: "/how-it-works",
    link: "How it works",
    heading: /\S/,
    title: /· Luma\.Green$/,
  },
  {
    path: "/prices",
    link: "Prices",
    heading: "Today's scrap prices",
    title: "Scrap prices in Bengaluru today · Luma.Green",
  },
  { path: "/help", link: "Help", heading: /\S/, title: /· Luma\.Green$/ },
  {
    path: "/join",
    link: "Join",
    heading: "Join Luma.Green",
    title: "Join Luma.Green · Luma.Green",
  },
] as const satisfies readonly {
  path: string;
  link: string;
  heading: string | RegExp;
  title: string | RegExp;
}[];

test("home tells the chain's story, with a way in for everyone", async ({
  page,
}) => {
  await page.goto("/");
  const main = page.getByRole("main");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "India's scrap chain, on one platform",
  );
  await expect(
    main.getByRole("link", { name: "Sell your scrap" }).first(),
  ).toHaveAttribute("href", "/sell");
  await expect(
    main.getByRole("link", { name: "Join as a business" }).first(),
  ).toHaveAttribute("href", "/join");
  await expect(
    main.getByRole("link", { name: "See today's prices" }),
  ).toHaveAttribute("href", "/prices");
  await expect(page).toHaveTitle("Luma.Green — Cleaner Tomorrow in Motion");

  const chain = main.getByRole("region", { name: "How scrap moves" });
  await expect(chain.getByRole("heading", { level: 3 })).toHaveText([
    "Households",
    "Kabadiwalas",
    "Yards",
    "Recyclers",
    "Manufacturers",
  ]);
  await expect(
    main.getByRole("heading", { name: "Why now", level: 2 }),
  ).toBeVisible();
});

test("the home price card still points to the board without live data", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByText("Today's prices will show here soon."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "See all prices" }),
  ).toHaveAttribute("href", "/prices");
});

for (const item of pages) {
  test(`header navigation reaches ${item.path}`, async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: item.link, exact: true }).click();

    await expect(page).toHaveURL(item.path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      item.heading,
    );
    await expect(
      nav.getByRole("link", { name: item.link, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page).toHaveTitle(item.title);
  });
}

test("the header's main button is for selling scrap", async ({ page }) => {
  await page.goto("/prices");

  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sell scrap" }),
  ).toHaveAttribute("href", "/sell");
});

test("the footer leads to the standard, solar and help", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer" });

  await expect(
    footer.getByRole("link", { name: "Industry standards" }),
  ).toHaveAttribute("href", "/standards");
  await expect(
    footer.getByRole("link", { name: "Rooftop solar" }),
  ).toHaveAttribute("href", "/solar");
  await expect(footer.getByRole("link", { name: "Help" })).toHaveAttribute(
    "href",
    "/help",
  );
});

test("the price board explains itself when prices can't load", async ({
  page,
}) => {
  await page.goto("/prices");

  await expect(
    page.getByText("Prices aren't available right now"),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Sell your scrap" }),
  ).toHaveAttribute("href", "/sell");
});

test("the standard lays out every norm, with a jump list", async ({ page }) => {
  await page.goto("/standards");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Luma.Green standard",
  );
  await expect(page).toHaveTitle("The Luma.Green standard · Luma.Green");
  for (const heading of [
    "One code for every material",
    "Grading: dry, sorted, clean",
    "Fair weighing",
    "Receipts and chain of custody",
    "Verification",
    "Escrow between businesses",
  ]) {
    await expect(
      page.getByRole("heading", { name: heading, level: 2 }),
    ).toBeVisible();
  }

  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Escrow" })
    .click();
  await expect(page).toHaveURL(/#escrow$/);
});

test("the solar calculator estimates a home system and cites the scheme", async ({
  page,
}) => {
  await page.goto("/solar");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Rooftop solar for your home or business",
  );
  await page
    .getByRole("textbox", { name: "Monthly electricity bill" })
    .fill("3000");

  await expect(page.getByText("3.5 kW", { exact: true })).toBeVisible();
  await expect(page.getByText("− ₹78,000")).toBeVisible();
  await expect(page.getByText("3.2–4.2 years")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /pmsuryaghar\.gov\.in/ }),
  ).toHaveAttribute("href", "https://pmsuryaghar.gov.in");

  await page.getByRole("radio", { name: "My business" }).click();
  await expect(page.getByText("Not for businesses")).toBeVisible();
});

test("each page canonicalises to its own locale", async ({ page }) => {
  await page.goto("/ta/prices");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/ta\/prices$/,
  );
  await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
    "href",
    /\/prices$/,
  );
});

test("switching language keeps the current page", async ({ page }) => {
  await page.goto("/prices");

  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("menuitemradio", { name: "தமிழ்" }).click();

  await expect(page).toHaveURL("/ta/prices");
  await expect(page.locator("html")).toHaveAttribute("lang", "ta-IN");
});

test("links stay inside the active locale", async ({ page }) => {
  await page.goto("/hi");

  await expect(
    page.getByRole("banner").getByRole("link").first(),
  ).toHaveAttribute("href", "/hi");
  await expect(
    page.getByRole("main").getByRole("link", { name: /./ }).first(),
  ).toHaveAttribute("href", /^\/hi\//);
});

test("Arabic pages lay out right-to-left", async ({ page }) => {
  await page.goto("/ar/prices");

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const header = page.getByRole("banner");
  const logo = await header.getByRole("link").first().boundingBox();
  const viewport = page.viewportSize();

  expect(logo).not.toBeNull();
  expect(viewport).not.toBeNull();
  // The logo sits on the inline start, which is the right edge in RTL.
  expect((logo?.x ?? 0) + (logo?.width ?? 0) / 2).toBeGreaterThan(
    (viewport?.width ?? 0) / 2,
  );
});

test("mobile menu opens, navigates and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Sell scrap" })).toHaveAttribute(
    "href",
    "/sell",
  );

  await menu.getByRole("link", { name: "Prices" }).click();

  await expect(page).toHaveURL("/prices");
  await expect(menu).toBeHidden();
});

test("unknown pages get the localised 404 inside the site shell", async ({
  page,
}) => {
  const response = await page.goto("/ta/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ta-IN");
  await expect(page.getByRole("link", { name: /./ }).last()).toBeVisible();
});

test("the skip link jumps past the header", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
