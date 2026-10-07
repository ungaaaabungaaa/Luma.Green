/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signIn,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";
const modules = convexModules(import.meta.glob("./**/*.*s"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
async function world() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T00:00:00Z"));
  vi.stubEnv("AUTH_DEV_MODE", "true");
  vi.stubEnv("ADMIN_EMAIL", "admin@luma.test");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const admin = await signIn(t, {
    email: "admin@luma.test",
    twoFactorEnabled: true,
  });
  const owner = await signInAs(t, "+919000000102");
  const foreign = await signInAs(t, "+919000000103");
  const facilityId = await owner.mutation(api.industrialProfiles.save, {
    name: "Local test plant",
    siteReference: "Site test reference",
    capabilities: ["washing"],
  });
  const registrationId = await owner.mutation(
    api.industrialProfiles.recordRegistration,
    {
      facilityId,
      kind: "consent_to_operate",
      reference: "Supplied consent TEST-1",
      issuedAt: "2026-01-01",
      validUntil: "2027-01-01",
    },
  );
  return { t, admin, owner, foreign, facilityId, registrationId };
}
it("invalidates scoped review after a facility edit in the same clock tick", async () => {
  const { admin, owner, foreign, facilityId, registrationId } = await world();
  await expect(owner.query(api.complianceReview.queue, {})).rejects.toThrow(
    /NOT_ADMIN/,
  );
  await admin.mutation(api.complianceReview.reviewFacility, {
    facilityId,
    registrationId,
    materialCodes: ["PLASTIC-PET"],
    processes: ["washing"],
    decision: "approved",
    evidenceReference: "Checked issuer document TEST-1",
    validUntil: "2026-12-31",
  });
  const review0 = await owner.query(api.complianceReview.myReviews, {});
  expect(review0[0]?.reviews[0]?.current).toBe(true);
  expect(await foreign.query(api.complianceReview.myReviews, {})).toHaveLength(
    0,
  );
  await owner.mutation(api.industrialProfiles.save, {
    facilityId,
    name: "Changed plant",
    siteReference: "Other declared site",
    capabilities: ["washing"],
  });
  const review1 = await owner.query(api.complianceReview.myReviews, {});
  expect(review1[0]?.reviews[0]?.current).toBe(false);
});
it("rejects stale registrations, expiry beyond consent and undeclared processing scope", async () => {
  const { admin, owner, facilityId, registrationId } = await world();
  const args = {
    facilityId,
    registrationId,
    materialCodes: ["PLASTIC-PET"],
    processes: ["washing" as const],
    decision: "approved" as const,
    evidenceReference: "Checked source TEST-1",
    validUntil: "2027-02-01",
  };
  await expect(
    admin.mutation(api.complianceReview.reviewFacility, args),
  ).rejects.toThrow(/REGISTRATION_NOT_CURRENT/);
  await expect(
    admin.mutation(api.complianceReview.reviewFacility, {
      ...args,
      validUntil: "2026-12-31",
      processes: ["compounding"],
    }),
  ).rejects.toThrow(/INVALID_REVIEW_SCOPE/);
  await owner.mutation(api.industrialProfiles.recordRegistration, {
    facilityId,
    kind: "consent_to_operate",
    reference: "Corrected TEST-1",
    issuedAt: "2026-01-01",
    validUntil: "2027-01-01",
    supersedesId: registrationId,
  });
  await expect(
    admin.mutation(api.complianceReview.reviewFacility, {
      ...args,
      validUntil: "2026-12-31",
    }),
  ).rejects.toThrow(/REGISTRATION_NOT_CURRENT/);
});
it("withdraws a reviewed destination without claiming any completed disposal", async () => {
  const { admin, owner, t } = await world();
  const id = await admin.mutation(api.complianceReview.recordDestination, {
    name: "Test authorised facility",
    siteReference: "Test site reference",
    materialCodes: ["RESIDUAL-TEST"],
    processes: ["residual_handling"],
    authorisationReference: "Checked authorisation TEST-4",
    validUntil: "2026-12-31",
  });
  const destinations = await owner.query(api.complianceReview.destinations, {});
  expect(destinations[0]).toMatchObject({ id, effective: true });
  await admin.mutation(api.complianceReview.changeDestinationStatus, {
    id,
    active: false,
    reason: "Source authorisation withdrawn",
  });
  expect(await owner.query(api.complianceReview.destinations, {})).toHaveLength(
    0,
  );
  expect(
    await t.run((ctx) => ctx.db.query("lotControlledDispositions").collect()),
  ).toHaveLength(0);
});

it("rechecks reviewed destination scope and references before reducing a controlled lot", async () => {
  const { t, admin, owner } = await world();
  const lotId = await owner.mutation(api.traceability.declareLot, {
    materialCode: "RESIDUAL-TEST",
    state: "Segregated residual",
    grams: 100,
    streamClass: "residual_waste",
    handlingClass: "unassessed",
  });
  const id = await admin.mutation(api.complianceReview.recordDestination, {
    name: "Test receiver",
    siteReference: "Test site",
    materialCodes: ["RESIDUAL-TEST"],
    processes: ["residual_handling"],
    authorisationReference: "Checked TEST-9",
    validUntil: "2026-12-31",
  });
  const args = {
    lotId,
    grams: 40,
    reviewedDestinationId: id,
    destinationReference: "Test receiver · Test site",
    authorisationReference: "Checked TEST-9",
    manifestReference: "Manifest TEST-9",
  };
  await expect(
    owner.mutation(api.traceability.recordControlledDisposition, {
      ...args,
      authorisationReference: "Different authorisation",
    }),
  ).rejects.toThrow(/DESTINATION_REFERENCE_MISMATCH/);
  const disposition = await owner.mutation(
    api.traceability.recordControlledDisposition,
    args,
  );
  expect(
    await t.run((ctx) => ctx.db.get("lotControlledDispositions", disposition)),
  ).toMatchObject({ reviewedDestinationId: id, grams: 40 });
  await admin.mutation(api.complianceReview.changeDestinationStatus, {
    id,
    active: false,
    reason: "Approval withdrawn",
  });
  await expect(
    owner.mutation(api.traceability.recordControlledDisposition, args),
  ).rejects.toThrow(/DESTINATION_SCOPE_INVALID/);
  expect(await t.run((ctx) => ctx.db.get("materialLots", lotId))).toMatchObject(
    { availableGrams: 60 },
  );
});
