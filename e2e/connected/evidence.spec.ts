import { readFileSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import { api } from "../../convex/_generated/api";
import ar from "../../messages/ar.json" with { type: "json" };
import en from "../../messages/en.json" with { type: "json" };

const accountSchema = z.object({
  key: z.string(),
  email: z.email(),
  password: z.string(),
});
const credentialsSchema = z.object({
  site: z.url(),
  accounts: z.array(accountSchema),
});
const credentials = credentialsSchema.parse(
  JSON.parse(
    readFileSync(".convex/local-acceptance/credentials.json", "utf8"),
  ) as unknown,
);
const site = new URL(credentials.site);
if (
  site.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)
)
  throw new Error("Evidence acceptance requires a loopback app.");
const tokenSchema = z.object({ token: z.string() });
const firstPage = { numItems: 100, cursor: null };

async function signIn(page: Page, key: string) {
  const account = credentials.accounts.find(
    (candidate) => candidate.key === key,
  );
  if (!account) throw new Error("Missing disposable account");
  const result = await page.request.post(
    `${credentials.site}/api/auth/sign-in/email`,
    {
      headers: {
        Origin: credentials.site,
        "X-Forwarded-For": `192.0.2.${String(credentials.accounts.indexOf(account) + 1)}`,
      },
      data: { email: account.email, password: account.password },
    },
  );
  expect(result.ok()).toBe(true);
  await page.goto("/en/app/evidence");
  await expect(
    page.getByRole("heading", { name: en.evidence.title, exact: true }),
  ).toBeVisible();
  const response = await page.request.get("/api/auth/convex/token");
  expect(response.ok()).toBe(true);
  const { token } = tokenSchema.parse(await response.json());
  return new ConvexHttpClient("http://127.0.0.1:3210", {
    auth: token,
    logger: false,
  });
}

test("business document references remain unverified, append-only and private to their workspace", async ({
  browser,
}) => {
  const context = await browser.newContext({ baseURL: credentials.site });
  const otherContext = await browser.newContext({ baseURL: credentials.site });
  const page = await context.newPage();
  const other = await otherContext.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.name);
  });
  const reference = `LOCAL-EVIDENCE-${String(Date.now())}`;
  const corrected = `${reference}-R1`;
  try {
    const client = await signIn(page, "manufacturer");
    const outsider = await signIn(other, "unrelated-owner");
    await page
      .getByRole("button", { name: en.evidence.record, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: en.evidence.issuerName, exact: true })
      .fill("Local synthetic issuer");
    await dialog
      .getByRole("textbox", { name: en.evidence.reference, exact: true })
      .fill(reference);
    await dialog.getByRole("button", { name: en.lots.save }).click();
    await expect(dialog).toHaveCount(0);
    const row = page.getByRole("listitem").filter({ hasText: reference });
    await expect(
      row.getByRole("heading", { name: reference, exact: true }),
    ).toBeVisible();
    await expect(
      row.getByText(en.evidence.unverified, { exact: false }),
    ).toBeVisible();
    const saved = await client.query(api.commercialEvidence.mine, {
      paginationOpts: firstPage,
    });
    const original = saved.page.find((item) => item.reference === reference);
    if (!original) throw new Error("The new local reference was not returned");
    const otherRows = await outsider.query(api.commercialEvidence.mine, {
      paginationOpts: firstPage,
    });
    expect(otherRows.page.some((item) => item.id === original.id)).toBe(false);
    await expect(
      outsider.mutation(api.commercialEvidence.recordExternal, {
        kind: "gst_invoice",
        reference: "LOCAL-FORGED-CORRECTION",
        issuerKind: "external_organization",
        issuerName: "Local synthetic outsider",
        supersedesId: original.id,
      }),
    ).rejects.toThrow(/INVALID_CORRECTION/);
    await row.getByRole("button", { name: en.evidence.correct }).click();
    await expect(
      dialog.getByRole("combobox", { name: en.evidence.kind }),
    ).toBeDisabled();
    await dialog
      .getByRole("textbox", { name: en.evidence.reference, exact: true })
      .fill(corrected);
    await dialog.getByRole("button", { name: en.lots.save }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: reference, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: corrected, exact: true }),
    ).toBeVisible();
    const history = await client.query(api.commercialEvidence.mine, {
      paginationOpts: firstPage,
    });
    expect(
      history.page.find((item) => item.reference === corrected)?.supersedesId,
    ).toBe(original.id);
    expect(
      history.page.find((item) => item.id === original.id)?.reference,
    ).toBe(reference);
    await page.goto("/ar/app/evidence");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", { name: ar.evidence.title, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: ar.evidence.record, exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await otherContext.close();
  }
});
