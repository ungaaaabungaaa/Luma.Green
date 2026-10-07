import { readFileSync, writeFileSync } from "node:fs";

import { expect, type Locator, type Page, test } from "@playwright/test";
import { z } from "zod";

import en from "../../messages/en.json";
import { currentCode } from "./totp";

const directory = ".convex/local-acceptance";
const factorPath = `${directory}/applicant-factor.json`;
const source: unknown = JSON.parse(
  readFileSync(`${directory}/credentials.json`, "utf8"),
);
const accountSchema = z.object({
  key: z.string(),
  email: z.email(),
  password: z.string(),
});
const roster = z.object({ accounts: z.array(accountSchema) }).parse(source);
const account = accountSchema.parse(
  roster.accounts.find(({ key }) => key === "applicant"),
);
const factorSchema = z.object({ secret: z.string(), enabled: z.boolean() });

async function signIn(page: Page) {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "192.0.2.231" });
  await page.goto("/en/login?next=/account/security");
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await page
    .getByRole("button", { name: en.auth.continue, exact: true })
    .click();
  await page
    .getByRole("tab", { name: en.emailAuth.email, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: en.emailAuth.email, exact: true })
    .fill(account.email);
  await page
    .getByLabel(en.emailAuth.password, { exact: true })
    .fill(account.password);
  await page
    .getByRole("button", { name: en.emailAuth.signin, exact: true })
    .click();
  const challenge = page.getByRole("heading", {
    name: en.auth.twoFactorTitle,
    exact: true,
  });
  await expect(
    challenge.or(
      page.getByRole("heading", {
        name: en.accountSecurity.title,
        exact: true,
      }),
    ),
  ).toBeVisible();
  if (await challenge.isVisible()) {
    const saved: unknown = JSON.parse(readFileSync(factorPath, "utf8"));
    const factor = factorSchema.parse(saved);
    await page
      .getByLabel(en.auth.codeLabel, { exact: true })
      .fill(currentCode(factor.secret));
    await page
      .getByRole("button", { name: en.auth.verify, exact: true })
      .click();
  }
  await expect(page).toHaveURL(/\/account\/security$/);
}

async function disableProtection(page: Page) {
  await page
    .getByRole("button", { name: en.accountSecurity.disable, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel(en.emailAuth.password, { exact: true })
    .fill(account.password);
  await dialog
    .getByRole("button", { name: en.accountSecurity.disable, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: en.accountSecurity.enable, exact: true }),
  ).toBeVisible();
}

async function prepareEnrollment(page: Page) {
  const enable = page.getByRole("button", {
    name: en.accountSecurity.enable,
    exact: true,
  });
  const disable = page.getByRole("button", {
    name: en.accountSecurity.disable,
    exact: true,
  });
  await expect(enable.or(disable)).toBeVisible();
  if (await disable.isVisible()) {
    await disableProtection(page);
  }
  await page
    .getByLabel(en.emailAuth.password, { exact: true })
    .fill(account.password);
  await enable.click();
}

async function readKey(key: Locator) {
  const displayed = await key.textContent();
  const secret = displayed?.trim();
  if (!secret) throw new Error("Enrollment key missing");
  return secret;
}

test.use({ actionTimeout: 15_000 });

test("email account keeps recovery codes through TOTP session rotation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.name);
  });
  await signIn(page);
  await prepareEnrollment(page);
  const key = page.locator("main code");
  await expect(key).toBeVisible();
  const secret = await readKey(key);
  // Private recovery for an interrupted local run; never attach or render it.
  writeFileSync(factorPath, JSON.stringify({ secret, enabled: true }), {
    mode: 0o600,
  });
  await page
    .getByLabel(en.auth.codeLabel, { exact: true })
    .fill(currentCode(secret));
  await page.getByRole("button", { name: en.auth.verify, exact: true }).click();
  const recovery = page.getByRole("region", {
    name: en.accountSecurity.backupTitle,
  });
  await expect(recovery).toBeVisible();
  await expect(recovery.getByRole("listitem")).toHaveCount(10);
  await recovery
    .getByRole("button", { name: en.accountSecurity.savedCodes })
    .click();
  await disableProtection(page);
  writeFileSync(
    factorPath,
    JSON.stringify({ secret: "retired", enabled: false }),
    { mode: 0o600 },
  );
  expect(errors).toEqual([]);
});
