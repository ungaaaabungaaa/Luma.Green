import { readFileSync } from "node:fs";

import { expect, type Locator, type Page, test } from "@playwright/test";
import { z } from "zod";

import en from "../../messages/en.json" with { type: "json" };

const accountSchema = z.object({
  key: z.string(),
  name: z.string(),
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
  throw new Error("Lot acceptance requires a local test origin.");
const t = en.lots;
test.setTimeout(90_000);
async function signIn(page: Page, key: string) {
  const account = credentials.accounts.find((row) => row.key === key);
  if (!account) throw new Error(`Missing local acceptance account: ${key}`);
  await page.context().setExtraHTTPHeaders({
    "X-Forwarded-For": `192.0.2.${String(credentials.accounts.indexOf(account) + 1)}`,
  });
  const response = await page.request.post(
    `${site.origin}/api/auth/sign-in/email`,
    {
      headers: {
        Origin: site.origin,
        "X-Forwarded-For": `192.0.2.${String(credentials.accounts.indexOf(account) + 1)}`,
      },
      data: { email: account.email, password: account.password },
    },
  );
  expect(
    response.ok(),
    `Local sign-in for ${key}: HTTP ${String(response.status())}`,
  ).toBe(true);
  await page.goto("/en/app/lots");
  await expect(
    page.getByRole("heading", { level: 1, name: t.title }),
  ).toBeVisible();
}
async function openForm(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  return page.getByRole("dialog", { name, exact: true });
}

test("facility references, classified processing and controlled disposition", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext({ baseURL: site.origin });
  const viewerContext = await browser.newContext({ baseURL: site.origin });
  const owner = await ownerContext.newPage();
  const viewer = await viewerContext.newPage();
  const stamp = String(Date.now());
  const facilityName = `Local industry line ${stamp}`;
  const material = `Local classified PET ${stamp}`;
  try {
    await signIn(owner, "kabadiwala");
    await owner.goto("/en/app/facility");
    const facilityForm = await openForm(owner, en.facility.add);
    await facilityForm.getByLabel(en.facility.name).fill(facilityName);
    await facilityForm
      .getByLabel(en.facility.siteReference)
      .fill("Synthetic test site, no verified approval");
    await facilityForm
      .getByRole("checkbox", {
        name: en.facility.processKinds.washing,
        exact: true,
      })
      .check();
    await facilityForm
      .getByRole("checkbox", {
        name: en.facility.processKinds.granulating,
        exact: true,
      })
      .check();
    await facilityForm
      .getByRole("button", { name: en.industry.select, exact: true })
      .click();
    await facilityForm.getByRole("searchbox").fill("plastic");
    await facilityForm
      .getByRole("button", { name: en.industry.select, exact: true })
      .nth(1)
      .click();
    await facilityForm
      .getByRole("button", { name: t.save, exact: true })
      .click();
    await expect(facilityForm).toHaveCount(0);
    const facilityRow = owner.getByRole("listitem").filter({
      has: owner.getByRole("heading", { name: facilityName, exact: true }),
    });
    await expect(facilityRow).toBeVisible();
    await facilityRow
      .getByRole("button", {
        name: en.facility.registration.title,
        exact: true,
      })
      .click();
    const reference = await openForm(owner, en.facility.registration.add);
    await reference
      .getByLabel(en.facility.registration.reference, { exact: true })
      .fill(`LOCAL-CONSENT-${stamp}`);
    await reference
      .getByLabel(en.facility.registration.issuedAt)
      .fill("2020-01-01");
    await reference
      .getByLabel(en.facility.registration.validUntil)
      .fill("2021-01-01");
    await reference.getByRole("button", { name: t.save, exact: true }).click();
    await expect(reference).toHaveCount(0);
    await expect(
      facilityRow.getByText(en.facility.registration.expired, { exact: true }),
    ).toBeVisible();
    const correction = await openForm(owner, en.facility.registration.correct);
    await correction
      .getByLabel(en.facility.registration.reference, { exact: true })
      .fill(`LOCAL-CORRECTED-${stamp}`);
    await correction
      .getByLabel(en.facility.registration.validUntil)
      .fill("2027-01-01");
    await correction.getByRole("button", { name: t.save, exact: true }).click();
    await expect(correction).toHaveCount(0);
    await expect(
      facilityRow.getByText(`LOCAL-CONSENT-${stamp}`, { exact: true }),
    ).toBeVisible();
    await expect(
      facilityRow.getByText(new RegExp(en.facility.registration.superseded)),
    ).toBeVisible();
    await owner.goto("/en/app/lots");
    const additiveDeclaration = await openForm(owner, t.declare);
    await additiveDeclaration
      .getByLabel(t.material, { exact: true })
      .fill(`${material} additive`);
    await additiveDeclaration
      .getByLabel(t.state, { exact: true })
      .fill("Synthetic measured additive");
    await additiveDeclaration.getByLabel(t.mass, { exact: true }).fill("200");
    await additiveDeclaration
      .getByRole("button", { name: t.save, exact: true })
      .click();
    await expect(owner).toHaveURL(/\/app\/lots\/.+$/);
    const additiveUrl = new URL(owner.url()).pathname;
    await owner.goto("/en/app/lots");
    const declare = await openForm(owner, t.declare);
    await declare.getByLabel(t.material, { exact: true }).fill(material);
    await declare
      .getByLabel(t.state, { exact: true })
      .fill("Synthetic measured bale");
    await declare.getByLabel(t.mass, { exact: true }).fill("1000");
    await select(
      owner,
      declare.getByRole("combobox", { name: t.streamClass }),
      t.streams.main_product,
    );
    await select(
      owner,
      declare.getByRole("combobox", { name: t.handlingClass }),
      t.handling.non_hazardous,
    );
    await declare.getByRole("button", { name: t.save, exact: true }).click();
    await expect(owner).toHaveURL(/\/app\/lots\/.+$/);
    const transformation = await openForm(owner, t.transform);
    await select(
      owner,
      transformation.getByRole("combobox", { name: t.facility, exact: true }),
      facilityName,
    );
    await select(
      owner,
      transformation.getByRole("combobox", {
        name: t.processKind,
        exact: true,
      }),
      en.facility.processKinds.washing,
    );
    await transformation.getByLabel(t.inputMass, { exact: true }).fill("800");
    await transformation
      .getByRole("button", { name: t.addInput, exact: true })
      .click();
    await select(
      owner,
      transformation.getByRole("combobox", {
        name: t.chooseInput,
        exact: true,
      }),
      `${material} additive · Synthetic measured additive`,
    );
    await transformation
      .getByRole("region", { name: t.additionalInputs, exact: true })
      .getByLabel(t.mass, { exact: true })
      .fill("200");
    const streams = [
      "main_product",
      "saleable_byproduct",
      "recoverable_waste",
      "residual_waste",
    ] as const;
    for (const [index, stream] of streams.entries()) {
      if (index > 0)
        await transformation
          .getByRole("button", { name: t.addOutput, exact: true })
          .click();
      const output = transformation.getByRole("group", {
        name: t.outputNumber.replace("{number}", () => String(index + 1)),
        exact: true,
      });
      await output
        .getByLabel(t.material, { exact: true })
        .fill(`${material} ${stream}`);
      await output
        .getByLabel(t.state, { exact: true })
        .fill("Synthetic output");
      await output.getByLabel(t.mass, { exact: true }).fill("250");
      await select(
        owner,
        output.getByRole("combobox", { name: t.streamClass }),
        t.streams[stream],
      );
      await select(
        owner,
        output.getByRole("combobox", { name: t.handlingClass }),
        t.handling[
          stream === "residual_waste" ? "controlled" : "non_hazardous"
        ],
      );
    }
    await transformation
      .getByRole("button", { name: t.save, exact: true })
      .click();
    await expect(transformation).toHaveCount(0);
    await expect(
      owner.getByText(`${facilityName} · ${en.facility.processKinds.washing}`, {
        exact: true,
      }),
    ).toBeVisible();
    await owner
      .getByRole("link", {
        name: `${material} residual_waste · Synthetic output`,
        exact: true,
      })
      .click();
    await expect(
      owner.getByRole("button", { name: t.transform, exact: true }),
    ).toHaveCount(0);
    await expect(owner.getByText(t.controlledBlocked)).toBeVisible();
    const residualUrl = new URL(owner.url()).pathname;
    const disposition = await openForm(owner, t.recordDisposition);
    await disposition.getByLabel(t.mass, { exact: true }).fill("100");
    await disposition
      .getByLabel(t.destinationReference)
      .fill("LOCAL-SYNTHETIC-DESTINATION");
    await disposition
      .getByLabel(t.authorisationReference)
      .fill("LOCAL-REPORTED-AUTHORISATION");
    await disposition
      .getByLabel(t.manifestReference)
      .fill(`LOCAL-MANIFEST-${stamp}`);
    await disposition
      .getByRole("button", { name: t.save, exact: true })
      .click();
    await expect(disposition).toHaveCount(0);
    await expect(
      owner.getByText(`LOCAL-MANIFEST-${stamp}`, { exact: true }),
    ).toBeVisible();
    await expect(owner.getByText("150 g", { exact: true })).toBeVisible();
    await owner.goto(additiveUrl);
    await expect(
      owner.getByText(`${facilityName} · ${en.facility.processKinds.washing}`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      owner
        .getByRole("region", { name: t.inputs, exact: true })
        .getByRole("link"),
    ).toHaveCount(2);
    await expect(
      owner
        .getByText(t.remaining, { exact: true })
        .locator("..")
        .getByText("0 g", { exact: true }),
    ).toBeVisible();
    await signIn(viewer, "team-viewer");
    await viewer.goto(residualUrl);
    await expect(
      viewer.getByRole("button", { name: t.recordDisposition, exact: true }),
    ).toHaveCount(0);
    await viewer.goto("/en/app/facility");
    await expect(
      viewer.getByRole("button", { name: en.facility.add, exact: true }),
    ).toHaveCount(0);
    await expect(
      viewer.getByRole("button", { name: en.facility.edit, exact: true }),
    ).toHaveCount(0);
    await owner.goto("/ar/app/facility");
    await owner.setViewportSize({ width: 390, height: 844 });
    await expect(owner.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(owner.locator("main h1")).toBeVisible();
    expect(
      await owner.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  } finally {
    await ownerContext.close();
    await viewerContext.close();
  }
});

async function select(page: Page, trigger: Locator, label: string) {
  await trigger.click();
  await page.getByRole("option", { name: label, exact: true }).click();
}
