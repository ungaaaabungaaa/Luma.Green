import { readFileSync } from "node:fs";

import { expect, type Locator, type Page, test } from "@playwright/test";
import { z } from "zod";

import en from "../../messages/en.json" with { type: "json" };
import { currentCode } from "./totp";

const accountSchema = z.object({
  key: z.string(),
  email: z.email(),
  password: z.string(),
});
const credentialsSchema = z.object({
  site: z.url(),
  accounts: z.array(accountSchema),
});
const credentialsSource: unknown = JSON.parse(
  readFileSync(".convex/local-acceptance/credentials.json", "utf8"),
);
const credentials = credentialsSchema.parse(credentialsSource);
const site = new URL(credentials.site);
if (
  site.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)
)
  throw new Error("Operations acceptance requires a local origin");
const lots = en.lots;
const copy = en.operations;
async function signIn(page: Page, key: string) {
  const account = credentials.accounts.find((row) => row.key === key);
  if (!account) throw new Error("Missing disposable account");
  await page.context().setExtraHTTPHeaders({
    "X-Forwarded-For": `192.0.2.${String(credentials.accounts.indexOf(account) + 1)}`,
  });
  const response = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: site.origin },
    data: { email: account.email, password: account.password },
  });
  expect(response.ok()).toBe(true);
}
async function adminSignIn(page: Page) {
  const source: unknown = JSON.parse(
    readFileSync(".convex/local-acceptance/admin.json", "utf8"),
  );
  const account = z
    .object({
      email: z.literal("admin@luma.test"),
      password: z.string(),
      secret: z.string(),
    })
    .parse(source);
  await page
    .context()
    .setExtraHTTPHeaders({ "X-Forwarded-For": "192.0.2.230" });
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByLabel("Code from your authenticator app"),
  ).toBeVisible();
  await page
    .getByLabel("Code from your authenticator app")
    .fill(currentCode(account.secret));
  await expect(
    page.getByRole("heading", { name: "Welcome, Local", exact: true }),
  ).toBeVisible();
}
async function openForm(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  return page.getByRole("dialog", { name, exact: true });
}
async function fill(scope: Page | Locator, name: string, value: string) {
  await scope.getByLabel(name, { exact: true }).fill(value);
}
async function choose(
  page: Page,
  scope: Locator,
  label: string,
  option: string,
) {
  await scope.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("reviewed definitions and destinations stay separate from production declarations", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const contexts = await Promise.all(
    Array.from({ length: 3 }, () =>
      browser.newContext({ baseURL: site.origin }),
    ),
  );
  const [admin, owner, viewer] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );
  const errors: string[] = [];
  for (const context of contexts) context.setDefaultTimeout(15_000);
  for (const page of [admin, owner, viewer])
    page.on("pageerror", (error) => {
      errors.push(error.name);
    });
  const stamp = String(Date.now());
  const name = `Local PET definition ${stamp}`;
  const version = `test-${stamp}`;
  const destination = `Local test destination ${stamp}`;
  const material = `Production source ${stamp}`;
  const output = `Production output ${stamp}`;
  const recipe = `Local recipe ${stamp}`;
  const batch = `Local batch ${stamp}`;
  const inspection = `Output inspection ${stamp}`;
  try {
    await adminSignIn(admin);
    await signIn(owner, "kabadiwala");
    await signIn(viewer, "team-viewer");
    await admin.goto("/admin/operations");
    await fill(admin, "Material code", "PLASTIC-PET");
    await fill(admin, "Material name", name);
    await fill(admin, "Processing state", "Sorted bottles");
    await fill(admin, "Grade", "Synthetic test grade");
    await fill(admin, "Definition version", version);
    await fill(
      admin,
      "Source evidence reference",
      "LOCAL_TEST_ONLY source definition",
    );
    await fill(
      admin,
      "Written quality specification and units",
      "Synthetic specification: moisture percent <= 2",
    );
    await admin
      .getByRole("button", { name: "Record draft", exact: true })
      .click();
    const definition = admin.getByRole("listitem").filter({
      has: admin.getByRole("heading", {
        name: `${name} · Synthetic test grade`,
        exact: true,
      }),
    });
    await expect(definition).toBeVisible();
    await owner.goto("/en/app/material-standards");
    await fill(owner, copy.search, name);
    await expect(owner.getByRole("heading", { name, exact: true })).toHaveCount(
      0,
    );
    await fill(
      admin,
      "Review evidence reference",
      "LOCAL_TEST_ONLY reviewed definition",
    );
    await definition
      .getByRole("button", { name: "Activate definition", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await fill(
      admin,
      "Review evidence reference",
      "LOCAL_TEST_ONLY retire test definition",
    );
    await definition
      .getByRole("button", { name: "Retire definition", exact: true })
      .click();
    await expect(owner.getByRole("heading", { name, exact: true })).toHaveCount(
      0,
    );
    await admin.getByRole("tab", { name: "Destinations", exact: true }).click();
    await fill(admin, "Destination name", destination);
    await fill(
      admin,
      "Site / address reference",
      "Synthetic local site, not operational approval",
    );
    await fill(admin, "Material codes, separated by commas", "PLASTIC-PET");
    await fill(
      admin,
      "Reviewed authorisation reference",
      "LOCAL_TEST_ONLY no real authorisation",
    );
    await fill(admin, "Authorisation valid until", "2030-01-01");
    await admin
      .getByRole("checkbox", { name: "residual handling", exact: true })
      .check();
    await admin
      .getByRole("button", { name: "Record reviewed destination", exact: true })
      .click();
    await owner
      .getByRole("tab", { name: copy.destinations, exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: destination, exact: true }),
    ).toBeVisible();
    const destinationRow = admin.getByRole("listitem").filter({
      has: admin.getByRole("heading", { name: destination, exact: true }),
    });
    await fill(
      admin,
      "Status change reason",
      "LOCAL_TEST_ONLY close test destination",
    );
    await destinationRow
      .getByRole("button", { name: "Deactivate destination", exact: true })
      .click();
    await expect(
      destinationRow.getByRole("button", {
        name: "Reactivate destination",
        exact: true,
      }),
    ).toBeVisible();

    await owner.goto("/en/app/lots");
    const declaration = await openForm(owner, lots.declare);
    await fill(declaration, lots.material, material);
    await fill(declaration, lots.state, "Measured source");
    await fill(declaration, lots.mass, "12347");
    await declaration
      .getByRole("button", { name: lots.save, exact: true })
      .click();
    await expect(owner).toHaveURL(/\/app\/lots\/.+$/);
    const transformation = await openForm(owner, lots.transform);
    await fill(transformation, lots.inputMass, "12347");
    await fill(transformation, lots.contamination, "347");
    await fill(transformation, lots.processLoss, "0");
    await fill(transformation, lots.material, output);
    await fill(transformation, lots.state, "Measured output");
    await fill(transformation, lots.mass, "12000");
    await transformation
      .getByRole("button", { name: lots.save, exact: true })
      .click();
    await expect(transformation).toHaveCount(0);
    await owner
      .getByRole("link", { name: `${output} · Measured output`, exact: true })
      .click();
    const qc = await openForm(owner, lots.inspection);
    await fill(qc, lots.specification, inspection);
    await fill(qc, lots.version, "v1");
    await fill(qc, lots.sampleMethod, "Synthetic composite sample");
    await fill(qc, lots.parameter, "Moisture");
    await fill(qc, lots.unit, "%");
    await fill(qc, lots.value, "1");
    await choose(owner, qc, lots.decision, lots.accepted);
    await qc.getByRole("button", { name: lots.save, exact: true }).click();
    await expect(qc).toHaveCount(0);
    await owner.goto("/en/app/production");
    const recipeForm = await openForm(owner, copy.newRecipe);
    await fill(recipeForm, copy.reference, recipe);
    await fill(recipeForm, copy.version, "v1");
    await fill(recipeForm, copy.name, recipe);
    await fill(
      recipeForm,
      copy.instructions,
      "Synthetic production instructions",
    );
    await fill(recipeForm, copy.ingredient, "Declared recovered PET");
    await recipeForm
      .getByRole("button", { name: copy.save, exact: true })
      .click();
    await expect(recipeForm).toHaveCount(0);
    await expect(
      owner.getByRole("heading", { name: `${recipe} · v1`, exact: true }),
    ).toBeVisible();
    await owner.getByRole("tab", { name: copy.batches, exact: true }).click();
    const batchForm = await openForm(owner, copy.newBatch);
    await fill(batchForm, copy.reference, batch);
    await choose(owner, batchForm, copy.recipe, `${recipe} · v1`);
    await batchForm
      .getByRole("combobox", { name: copy.transformation, exact: true })
      .click();
    await owner
      .getByRole("option")
      .filter({ hasText: "12,347" })
      .first()
      .click();
    await choose(owner, batchForm, copy.inspection, inspection);
    await fill(batchForm, copy.recycledGrams, "10000");
    await fill(
      batchForm,
      copy.inputEvidence,
      "LOCAL_TEST_ONLY recycled input evidence",
    );
    await fill(
      batchForm,
      copy.batchEvidence,
      "LOCAL_TEST_ONLY output batch evidence",
    );
    await batchForm
      .getByRole("button", { name: copy.save, exact: true })
      .click();
    await expect(batchForm).toHaveCount(0);
    await expect(
      owner.getByRole("heading", { name: batch, exact: true }),
    ).toBeVisible();
    await viewer.goto("/en/app/production");
    await expect(
      viewer.getByRole("heading", { name: copy.production, exact: true }),
    ).toBeVisible();
    await expect(
      viewer.getByRole("button", { name: copy.newRecipe, exact: true }),
    ).toHaveCount(0);
    await viewer.getByRole("tab", { name: copy.batches, exact: true }).click();
    await expect(
      viewer.getByRole("heading", { name: batch, exact: true }),
    ).toBeVisible();
    await expect(
      viewer.getByRole("button", { name: copy.newBatch, exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    const cleanup = await Promise.allSettled(
      contexts.map(async (context) => {
        try {
          await context.request.post("/api/auth/sign-out", {
            headers: { Origin: site.origin },
            data: {},
            timeout: 5000,
          });
        } finally {
          await context.close();
        }
      }),
    );
    if (cleanup.some((result) => result.status === "rejected"))
      test.info().annotations.push({
        type: "cleanup",
        description:
          "A browser context had already closed before sign-out cleanup.",
      });
  }
});
