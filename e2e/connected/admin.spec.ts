import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { expect, type Page, test } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import { api } from "../../convex/_generated/api";
import { currentCode } from "./totp";

const directory = ".convex/local-acceptance";
const accountPath = `${directory}/admin.json`;
const settings = z
  .object({
    SITE_URL: z.literal("http://localhost:3100"),
    ADMIN_EMAIL: z.literal("admin@luma.test"),
    ADMIN_SETUP_TOKEN: z.string().min(32),
    AUTH_LOCAL_TEST_MODE: z.literal("true"),
  })
  .parse(parseEnv(readFileSync(`${directory}/backend.env`, "utf8")));
const accountSchema = z.object({
  email: z.literal("admin@luma.test"),
  name: z.literal("Local Admin"),
  password: z.string().min(12),
  secret: z.string().optional(),
  backupCodes: z.array(z.string()).optional(),
});
type Account = z.infer<typeof accountSchema>;

// This file is private and ignored. Never put secrets in test attachments,
// screenshots, traces, console messages or the shared user guide.
function saveAccount(account: Account) {
  writeFileSync(accountPath, `${JSON.stringify(account, null, 2)}\n`, {
    mode: 0o600,
  });
}

function loadAccount(): Account {
  if (existsSync(accountPath)) {
    const source: unknown = JSON.parse(readFileSync(accountPath, "utf8"));
    return accountSchema.parse(source);
  }
  const account: Account = {
    email: settings.ADMIN_EMAIL,
    name: "Local Admin",
    password: randomBytes(24).toString("base64url"),
  };
  saveAccount(account);
  return account;
}

async function signIn(page: Page, account: Account) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByLabel("Code from your authenticator app"),
  ).toBeVisible();
  // A successful password alone must not grant a Convex token.
  const pending = await page.request.get("/api/auth/convex/token");
  expect(pending.status()).toBe(401);
  if (!account.secret) throw new Error("Local admin has no enrollment key");
  await page
    .getByLabel("Code from your authenticator app")
    .fill(currentCode(account.secret));
  await expect(
    page.getByRole("heading", { name: "Welcome, Local", exact: true }),
  ).toBeVisible();
}

async function setUpIfNeeded(page: Page, previous: Account) {
  const account = { ...previous };
  if (account.secret) {
    return account;
  }

  await page.goto("/admin/setup");
  const create = page.getByRole("button", {
    name: "Create the admin account",
    exact: true,
  });
  const resume = page.getByRole("link", { name: "Go to sign-in", exact: true });
  await expect(create.or(resume)).toBeVisible();
  if (await resume.isVisible()) {
    // A previous interrupted local run can leave the account awaiting TOTP.
    // Resume through the ordinary password login; never replace auth records.
    await resume.click();
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/setup$/);
  } else {
    await page.getByLabel("Full name", { exact: true }).fill(account.name);
    await page.getByLabel("Mobile number", { exact: true }).fill("9000000999");
    await page.getByLabel("Date of birth", { exact: true }).fill("1990-01-01");
    await page
      .getByLabel("Last four digits of your Aadhaar", { exact: true })
      .fill("0000");
    await page
      .getByLabel("Setup token", { exact: true })
      .fill(settings.ADMIN_SETUP_TOKEN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page
      .getByLabel("Password again", { exact: true })
      .fill(account.password);
    await page
      .getByRole("button", { name: "Create the admin account", exact: true })
      .click();
  }
  const enrollmentCode = page.getByLabel("Code from the app", { exact: true });
  const continueEnrollment = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  await expect(enrollmentCode.or(continueEnrollment)).toBeVisible();
  if (await continueEnrollment.isVisible()) {
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await continueEnrollment.click();
  }
  await expect(
    page.getByLabel("Code from the app", { exact: true }),
  ).toBeVisible();
  const displayedKey = await page.locator("code").textContent();
  const secret = displayedKey?.replaceAll(/\s/g, "");
  if (!secret) throw new Error("Manual authenticator enrollment key missing");
  account.secret = secret;
  saveAccount(account);
  await page
    .getByLabel("Code from the app", { exact: true })
    .fill(currentCode(secret));
  const codes = page.getByRole("list", { name: "Backup codes" });
  await expect(codes).toBeVisible();
  account.backupCodes = await codes.getByRole("listitem").allTextContents();
  saveAccount(account);
  await page
    .getByRole("checkbox", {
      name: "I've stored these codes somewhere safe.",
    })
    .check();
  await page
    .getByRole("button", { name: "Go to the console", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Local", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  return account;
}

test("local admin setup requires TOTP and revoked sessions lose console access", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "192.0.2.230" });
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.name);
  });
  const account = await setUpIfNeeded(page, loadAccount());
  await signIn(page, account);
  const tokenResponse = await page.request.get("/api/auth/convex/token");
  const token = z
    .object({ token: z.string() })
    .parse(await tokenResponse.json()).token;
  const client = new ConvexHttpClient("http://127.0.0.1:3210", {
    auth: token,
    logger: false,
  });
  const result = await client.query(api.admin.overview, {});
  expect(Array.isArray(result.recentSignIns)).toBe(true);
  const materialsBefore = await client.query(api.catalogue.materials, {});
  await page.goto("/admin/prices");
  await page
    .getByRole("button", { name: "Add catalogue definitions", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "All catalogue definitions are already present." }),
  ).toBeVisible();
  expect(await client.query(api.catalogue.materials, {})).toEqual(
    materialsBefore,
  );
  await page
    .getByRole("combobox", { name: "Material to review", exact: true })
    .click();
  await page.getByRole("option", { name: /PLASTIC-PET$/ }).click();
  await page
    .getByRole("combobox", { name: "New classification", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Non-hazardous", exact: true })
    .click();
  await page
    .getByRole("textbox", {
      name: "Review rationale / evidence reference",
      exact: true,
    })
    .fill("Local acceptance material review; test data only");
  await page
    .getByRole("button", { name: "Save classification", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Classification saved. The audit log records this review.",
    }),
  ).toBeVisible();
  const classifications = await client.query(
    api.byproductClassification.list,
    {},
  );
  expect(
    classifications.find((row) => row.code === "PLASTIC-PET")?.review,
  ).toMatchObject({
    hazardStatus: "non_hazardous",
    sourceReference: "Local acceptance material review; test data only",
  });
  await page.goto("/admin/payments");
  await expect(
    page.getByRole("heading", { name: "Payment setup", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Provider credentials are not configured.", { exact: true }),
  ).toBeVisible();
  const shop = page.getByRole("listitem").filter({
    has: page.getByRole("heading", {
      name: "Local test kabadiwala owner",
      exact: true,
    }),
  });
  await expect(shop).toBeVisible();
  const vendorAddButton = shop.getByRole("button", {
    name: "Add vendor reference",
    exact: true,
  });
  const checkVendor = shop.getByRole("button", {
    name: "Check with Cashfree",
    exact: true,
  });
  await expect(vendorAddButton.or(checkVendor)).toBeVisible();
  // A later run reads the same local setup record rather than overwriting it.
  if (await vendorAddButton.isVisible()) {
    await vendorAddButton.click();
    await page
      .getByRole("textbox", { name: "Cashfree vendor reference", exact: true })
      .fill("local_test_shop_vendor");
    await page
      .getByRole("button", { name: "Save fixed reference", exact: true })
      .click();
  }
  await expect(
    shop.getByText("Vendor reference: local_test_shop_vendor", { exact: true }),
  ).toBeVisible();
  await expect(shop.getByText("UNVERIFIED", { exact: true })).toBeVisible();
  await expect(checkVendor).toBeDisabled();
  await expect(
    page.getByRole("heading", {
      name: "Payment activation requires approved setup",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Record approved policy", exact: true })
    .click();
  const policyDialog = page.getByRole("dialog", {
    name: "Record approved payment policy",
  });
  const policyVersion = `LOCAL_TEST_ONLY_${String(Date.now())}`;
  await policyDialog
    .getByLabel("Policy version", { exact: true })
    .fill(policyVersion);
  await policyDialog
    .getByLabel("Who bears gateway fees?", { exact: true })
    .click();
  await page.getByRole("option", { name: "Luma", exact: true }).click();
  await policyDialog.getByLabel("Who funds refunds?", { exact: true }).click();
  await page.getByRole("option", { name: "Seller", exact: true }).click();
  await policyDialog
    .getByLabel("Approved settlement terms reference", { exact: true })
    .fill("LOCAL TEST ONLY - NOT APPROVED FOR LIVE USE");
  await policyDialog
    .getByLabel("Provider acceptance test reference", { exact: true })
    .fill("SYNTHETIC LOCAL FORM TEST - NO PROVIDER EXECUTION");
  await policyDialog
    .getByRole("button", { name: "Save approved version", exact: true })
    .click();
  await expect(policyDialog).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: "Approved policy recorded." }),
  ).toBeVisible();
  const policyState = await client.query(
    api.cashfreeLifecycle.policyForAdmin,
    {},
  );
  expect(policyState.liveEnabled).toBe(false);
  expect(policyState.configuredVersion).toBeNull();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  const signedOutToken = await page.request.get("/api/auth/convex/token");
  expect(signedOutToken.status()).toBe(401);
  await expect(client.query(api.admin.overview, {})).rejects.toThrow();
  await page.goto("/admin");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
