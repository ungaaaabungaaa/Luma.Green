import { readFileSync } from "node:fs";

import { expect, type Locator, type Page, test } from "@playwright/test";
import { z } from "zod";

import en from "../../messages/en.json" with { type: "json" };

const source: unknown = JSON.parse(
  readFileSync(".convex/local-acceptance/credentials.json", "utf8"),
);
const accountSchema = z.object({
  key: z.string(),
  email: z.email(),
  password: z.string(),
});
const credentialsSchema = z.object({
  site: z.url(),
  accounts: z.array(accountSchema),
});
const credentials = credentialsSchema.parse(source);
const site = new URL(credentials.site);
if (
  site.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)
)
  throw new Error("Route acceptance requires a local test origin.");
async function signIn(page: Page, key: string) {
  const account = credentials.accounts.find((row) => row.key === key);
  if (!account) throw new Error("Missing local route test account");
  const response = await page.request.post(
    `${site.origin}/api/auth/sign-in/email`,
    {
      headers: { Origin: site.origin },
      data: { email: account.email, password: account.password },
    },
  );
  expect(response.ok()).toBe(true);
  await page.goto("/en/app/logistics");
  await expect(
    page.getByRole("heading", { name: en.logistics.title, exact: true }),
  ).toBeVisible();
}
async function fillSite(group: Locator, name: string, longitude: string) {
  await group.getByLabel(en.facility.siteReference).fill(name);
  await group.getByLabel(en.logistics.latitude).fill("0");
  await group.getByLabel(en.logistics.longitude).fill(longitude);
}

test("manual capacity plan, immutable correction, viewer access and archive", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext({ baseURL: site.origin });
  const viewerContext = await browser.newContext({ baseURL: site.origin });
  const owner = await ownerContext.newPage();
  const viewer = await viewerContext.newPage();
  const title = `Local route ${String(Date.now())}`;
  try {
    await signIn(owner, "kabadiwala");
    await owner
      .getByRole("button", { name: en.logistics.add, exact: true })
      .click();
    const form = owner.getByRole("dialog", {
      name: en.logistics.add,
      exact: true,
    });
    await form.getByLabel(en.logistics.titleLabel).fill(title);
    await form.getByLabel(en.logistics.reference).fill(title);
    await form.getByLabel(en.logistics.vehicle).fill("Synthetic vehicle");
    await form.getByLabel(en.logistics.capacity).fill("999");
    await fillSite(
      form.getByRole("group", { name: en.logistics.origin, exact: true }),
      "Synthetic origin",
      "179.9",
    );
    const stop = form.getByRole("group", {
      name: en.logistics.stop.replace("{number}", "1"),
      exact: true,
    });
    await fillSite(stop, "Synthetic dateline stop", "-179.9");
    await stop.getByRole("combobox", { name: en.lots.material }).click();
    await owner.getByRole("option").first().click();
    await stop.getByLabel(en.lots.mass).fill("1000");
    await form.getByLabel(en.logistics.reason).fill("Local planning test only");
    await form.getByRole("button", { name: en.lots.save, exact: true }).click();
    await expect(form.getByRole("alert")).toHaveText(en.logistics.invalid);
    await form.getByLabel(en.logistics.capacity).fill("1000");
    await form.getByRole("button", { name: en.lots.save, exact: true }).click();
    await expect(form).toBeHidden();
    await owner
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: en.logistics.history })
      .click();
    await owner
      .getByRole("button", { name: en.logistics.correct, exact: true })
      .click();
    const correction = owner.getByRole("dialog", {
      name: en.logistics.correct,
      exact: true,
    });
    await correction
      .getByLabel(en.logistics.titleLabel)
      .fill(`${title} revised`);
    await correction
      .getByLabel(en.logistics.reason)
      .fill("Corrected local title");
    await correction
      .getByRole("button", { name: en.lots.save, exact: true })
      .click();
    await expect(correction).toBeHidden();
    await expect(
      owner.getByRole("heading", {
        name: `Revision 1 · ${title}`,
        exact: true,
      }),
    ).toBeVisible();
    await signIn(viewer, "team-viewer");
    await expect(
      viewer.getByRole("button", { name: en.logistics.add, exact: true }),
    ).toHaveCount(0);
    await viewer
      .getByRole("listitem")
      .filter({ hasText: `${title} revised` })
      .getByRole("button", { name: en.logistics.history })
      .click();
    await expect(
      viewer.getByRole("button", { name: en.logistics.correct, exact: true }),
    ).toHaveCount(0);
    await owner
      .getByRole("button", { name: en.logistics.archive, exact: true })
      .click();
    const archive = owner.getByRole("dialog", {
      name: en.logistics.archive,
      exact: true,
    });
    await archive.getByLabel(en.logistics.reason).fill("Local plan complete");
    await archive
      .getByRole("button", { name: en.logistics.archive, exact: true })
      .click();
    await expect(archive).toBeHidden();
    await owner.reload();
    await expect(
      owner.getByRole("listitem").filter({ hasText: `${title} revised` }),
    ).toContainText(en.logistics.archived);
  } finally {
    await ownerContext.close();
    await viewerContext.close();
  }
});
