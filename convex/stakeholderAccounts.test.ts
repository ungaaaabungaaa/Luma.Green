/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import { convexModules, registerAuth, signIn } from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

afterEach(() => {
  vi.unstubAllEnvs();
});

function setup() {
  vi.stubEnv("ADMIN_EMAIL", "admin@luma.test");
  const t = convexTest(schema, modules);
  registerAuth(t);
  return t;
}

type Test = ReturnType<typeof setup>;

async function member(t: Test, phone: string) {
  const signedIn = await signIn(t, {
    email: `${phone.slice(3)}@luma.test`,
    phoneNumber: phone,
  });
  await signedIn.mutation(api.identity.ensureProfile, { locale: "en" });
  return signedIn;
}

describe("stakeholder accounts", () => {
  it("accepts non-household generator sites without granting trade access", async () => {
    const t = setup();
    const apartment = await member(t, "+919000000306");
    await expect(
      apartment.mutation(api.stakeholderAccounts.request, {
        kind: "material_generator",
        organizationName: "Lakeview Community",
      }),
    ).rejects.toThrow();
    await expect(
      apartment.mutation(api.stakeholderAccounts.request, {
        kind: "material_generator",
        siteType: "manufacturing_facility",
        organizationName: "Lakeview Community",
      }),
    ).rejects.toThrow();
    await expect(
      apartment.mutation(api.stakeholderAccounts.request, {
        kind: "city_official",
        siteType: "office",
        organizationName: "Lakeview Community",
      }),
    ).rejects.toThrow();
    const id = await apartment.mutation(api.stakeholderAccounts.request, {
      kind: "material_generator",
      siteType: "apartment_community",
      organizationName: "Lakeview Community",
    });
    expect(
      await apartment.query(api.stakeholderAccounts.mine, {}),
    ).toMatchObject({
      id,
      kind: "material_generator",
      siteType: "apartment_community",
      status: "pending",
    });
    const admin = await signIn(t, {
      email: "admin@luma.test",
      twoFactorEnabled: true,
    });
    await admin.mutation(api.identity.ensureProfile, { locale: "en" });
    expect(
      await admin.query(api.stakeholderAccounts.pending, {}),
    ).toMatchObject([{ id, siteType: "apartment_community" }]);
    await admin.mutation(api.stakeholderAccounts.decide, {
      id,
      decision: "approve",
      reviewNote: "Verified community contact and site",
    });
    await t.run(async (ctx) => {
      expect(await ctx.db.query("orgs").take(1)).toEqual([]);
      expect(await ctx.db.query("memberships").take(1)).toEqual([]);
    });
  });

  it("keeps a request visible only to its owner and out of trading organisations", async () => {
    const t = setup();
    const applicant = await member(t, "+919000000301");
    const stranger = await member(t, "+919000000302");

    const id = await applicant.mutation(api.stakeholderAccounts.request, {
      kind: "city_official",
      organizationName: "  Bengaluru City Office  ",
    });
    expect(
      await applicant.query(api.stakeholderAccounts.mine, {}),
    ).toMatchObject({
      id,
      kind: "city_official",
      organizationName: "Bengaluru City Office",
      status: "pending",
    });
    expect(await stranger.query(api.stakeholderAccounts.mine, {})).toBeNull();
    await expect(
      stranger.query(api.stakeholderAccounts.pending, {}),
    ).rejects.toThrow();

    await t.run(async (ctx) => {
      const orgs = await ctx.db.query("orgs").take(1);
      expect(orgs).toHaveLength(0);
      const logs = await ctx.db.query("auditLog").take(10);
      expect(logs.some((log) => log.action === "stakeholder.requested")).toBe(
        true,
      );
    });
  });

  it("requires the configured admin and TOTP to approve once", async () => {
    const t = setup();
    const applicant = await member(t, "+919000000303");
    const id = await applicant.mutation(api.stakeholderAccounts.request, {
      kind: "independent_auditor",
      organizationName: "Independent Materials Audit",
    });
    const memberWithoutPower = await member(t, "+919000000304");
    await expect(
      memberWithoutPower.mutation(api.stakeholderAccounts.decide, {
        id,
        decision: "approve",
        reviewNote: "Checked identity and appointment",
      }),
    ).rejects.toThrow();

    const admin = await signIn(t, {
      email: "admin@luma.test",
      twoFactorEnabled: true,
    });
    await admin.mutation(api.identity.ensureProfile, { locale: "en" });
    expect(
      await admin.query(api.stakeholderAccounts.pending, {}),
    ).toMatchObject([{ id, kind: "independent_auditor" }]);
    await admin.mutation(api.stakeholderAccounts.decide, {
      id,
      decision: "approve",
      reviewNote: "Checked identity and appointment",
    });
    const approved = await applicant.query(api.stakeholderAccounts.mine, {});
    expect(approved).toMatchObject({
      id,
      status: "approved",
    });
    expect(approved).not.toHaveProperty("reviewNote");
    expect(await admin.query(api.stakeholderAccounts.pending, {})).toEqual([]);
    await t.run(async (ctx) => {
      expect(await ctx.db.query("orgs").take(1)).toEqual([]);
      expect(await ctx.db.query("memberships").take(1)).toEqual([]);
    });
    await expect(
      admin.mutation(api.stakeholderAccounts.decide, {
        id,
        decision: "approve",
        reviewNote: "Checked identity and appointment",
      }),
    ).rejects.toThrow();
  });

  it("keeps the review queue closed before admin TOTP is enabled", async () => {
    const t = setup();
    const adminWithoutTotp = await signIn(t, {
      email: "admin@luma.test",
      twoFactorEnabled: false,
    });
    await expect(
      adminWithoutTotp.query(api.stakeholderAccounts.pending, {}),
    ).rejects.toThrow();
  });

  it("rejects invalid names and exposes a rejection reason only to its owner", async () => {
    const t = setup();
    const applicant = await member(t, "+919000000305");
    await expect(
      applicant.mutation(api.stakeholderAccounts.request, {
        kind: "lender",
        organizationName: " ",
      }),
    ).rejects.toThrow();
    const id = await applicant.mutation(api.stakeholderAccounts.request, {
      kind: "lender",
      organizationName: "Bengaluru Credit Co-op",
    });
    expect(
      await applicant.mutation(api.stakeholderAccounts.request, {
        kind: "lender",
        organizationName: "Bengaluru Credit Co-op",
      }),
    ).toBe(id);
    await expect(
      applicant.mutation(api.stakeholderAccounts.request, {
        kind: "csr_sponsor",
        organizationName: "Bengaluru Credit Co-op",
      }),
    ).rejects.toThrow();

    const admin = await signIn(t, {
      email: "admin@luma.test",
      twoFactorEnabled: true,
    });
    await admin.mutation(api.identity.ensureProfile, { locale: "en" });
    await expect(
      admin.mutation(api.stakeholderAccounts.decide, {
        id,
        decision: "reject",
        reviewNote: "too short",
      }),
    ).rejects.toThrow();
    await admin.mutation(api.stakeholderAccounts.decide, {
      id,
      decision: "reject",
      reviewNote: "Could not verify organization appointment",
    });
    expect(
      await applicant.query(api.stakeholderAccounts.mine, {}),
    ).toMatchObject({
      id,
      status: "rejected",
      reviewNote: "Could not verify organization appointment",
    });
  });
});
