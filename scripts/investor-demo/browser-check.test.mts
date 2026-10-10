import assert from "node:assert/strict";
import test from "node:test";

import {
  INVESTOR_DEMO_BATCH,
  INVESTOR_DEMO_ROSTER,
} from "../../convex/lib/investorDemoRoster";
import {
  isDevelopmentDiagnostic,
  queueFor,
  redactBrowserError,
  rolePlan,
  validateAccounts,
  validatedOrigin,
} from "./browser-check.mjs";

await test("accepts only the named production origin and approved development address shapes", () => {
  assert.equal(
    validatedOrigin("https://lumagreen.vercel.app", "production"),
    "https://lumagreen.vercel.app",
  );
  assert.equal(
    validatedOrigin("http://localhost:3102", "development"),
    "http://localhost:3102",
  );
  const downgraded = new URL("https://lumagreen.vercel.app");
  downgraded.protocol = "http:";
  for (const input of [
    downgraded.href,
    "https://lumagreen.vercel.app.evil.example",
    "https://lumagreen.vercel.app/?token=value",
    "https://user@lumagreen.vercel.app",
  ])
    assert.throws(() => validatedOrigin(input, "production"));
  assert.throws(() => validatedOrigin("http://localhost:3102", "production"));
});

await test("requires all140 exact seeded identities for the selected deployment", () => {
  const fixture = {
    batchKey: INVESTOR_DEMO_BATCH,
    deployment: "glorious-rooster-470",
    accounts: INVESTOR_DEMO_ROSTER.map((persona) => ({
      key: persona.key,
      name: persona.name,
      email: persona.email,
      password: "unit-test-only-not-a-real-password",
    })),
  };
  assert.equal(validateAccounts(fixture, "development").length, 140);
  assert.throws(() => validateAccounts(fixture, "production"));
  assert.throws(() =>
    validateAccounts(
      { ...fixture, accounts: fixture.accounts.slice(1) },
      "development",
    ),
  );
  const first = fixture.accounts[0];
  assert.ok(first);
  assert.throws(() =>
    validateAccounts(
      {
        ...fixture,
        accounts: fixture.accounts.map((account, index) =>
          index === 1 ? first : account,
        ),
      },
      "development",
    ),
  );
  assert.throws(() =>
    validateAccounts(
      {
        ...fixture,
        accounts: fixture.accounts.map((account, index) =>
          index === 0 ? { ...account, email: "real@example.com" } : account,
        ),
      },
      "development",
    ),
  );
});

await test("checks every cohort's assigned workspace role and non-business route", () => {
  for (const cohort of [1, 2, 3, 4, 5]) {
    assert.equal(rolePlan(`kabadiwala-${String(cohort)}`).role, "owner");
    assert.equal(rolePlan(`team-admin-${String(cohort)}`).role, "admin");
    assert.equal(rolePlan(`team-member-${String(cohort)}`).role, "member");
    assert.equal(rolePlan(`team-viewer-${String(cohort)}`).role, "viewer");
    assert.equal(
      rolePlan(`household-coordinator-${String(cohort)}`).kind,
      "personal",
    );
    assert.equal(rolePlan(`applicant-${String(cohort)}`).route, "/join/status");
    assert.equal(rolePlan(`saathi-${String(cohort)}`).route, "/app");
    assert.equal(
      rolePlan(`auditor-${String(cohort)}`).route,
      "/account/reports",
    );
  }
  for (const persona of INVESTOR_DEMO_ROSTER)
    assert.ok(rolePlan(persona.key).route.startsWith("/"));
  assert.throws(() => rolePlan("admin-1"));
});

await test("keeps default140 checks and limits explicit selections to known exact keys", () => {
  const accounts = INVESTOR_DEMO_ROSTER.map((persona) => ({
    ...persona,
    password: "fictional-test-password-only-1234",
  }));
  assert.equal(queueFor("check", accounts, 140).length, 140);
  assert.deepEqual(
    queueFor("check", accounts, 140, "manufacturer-1,auditor-1").map(
      (account) => account.key,
    ),
    ["manufacturer-1", "auditor-1"],
  );
  assert.throws(() => queueFor("check", accounts, 140, "real-user"));
  assert.throws(() =>
    queueFor("check", accounts, 140, "manufacturer-1,manufacturer-1"),
  );
  const safe = redactBrowserError(
    `${accounts[0].password} ${accounts[0].email} https://example.invalid/error?token=very-sensitive#secret`,
    accounts,
  );
  assert.ok(!safe.includes(accounts[0].password));
  assert.ok(!safe.includes(accounts[0].email));
  assert.ok(!safe.includes("very-sensitive"));
});

await test("separates only exact local Next diagnostic POSTs without allowing them", () => {
  const local = new URL("http://localhost:3102/__nextjs_original-stack-frames");
  assert.equal(isDevelopmentDiagnostic(local, "POST"), true);
  assert.equal(isDevelopmentDiagnostic(local, "GET"), false);
  assert.equal(
    isDevelopmentDiagnostic(
      new URL("https://lumagreen.vercel.app/__nextjs_original-stack-frames"),
      "POST",
    ),
    false,
  );
  assert.equal(
    isDevelopmentDiagnostic(
      new URL("http://localhost:3102/api/business"),
      "POST",
    ),
    false,
  );
});
