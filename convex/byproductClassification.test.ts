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
} from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
afterEach(() => {
  vi.unstubAllEnvs();
});
async function world(isTwoFactorEnabled = true) {
  vi.stubEnv("ADMIN_EMAIL", "admin@luma.test");
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const admin = await signIn(t, {
    email: "admin@luma.test",
    twoFactorEnabled: isTwoFactorEnabled,
  });
  return { t, admin };
}
it("keeps review references behind the full admin guard", async () => {
  const { t } = await world();
  await expect(t.query(api.byproductClassification.list, {})).rejects.toThrow(
    /NOT_SIGNED_IN/,
  );
  const ordinary = await signIn(t, { email: "other@luma.test" });
  await expect(
    ordinary.query(api.byproductClassification.list, {}),
  ).rejects.toThrow(/NOT_ADMIN/);
});
it("requires completed administrator two-factor setup", async () => {
  const { admin } = await world(false);
  await expect(
    admin.query(api.byproductClassification.list, {}),
  ).rejects.toThrow(/TWO_FACTOR_REQUIRED/);
});
it("returns active scrap with review evidence but no reviewer identity", async () => {
  const { t, admin } = await world();
  await admin.mutation(api.byproductClassification.reviewMaterial, {
    materialCode: "PLASTIC-PET",
    hazardStatus: "non_hazardous",
    sourceReference: "Category review 42",
  });
  await t.run(async (ctx) => {
    const paper = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", "PAPER-NEWS"))
      .unique();
    if (!paper) throw new Error("Missing fixture");
    await ctx.db.patch("materials", paper._id, { active: false });
  });
  const rows = await admin.query(api.byproductClassification.list, {});
  expect(
    rows.some(
      (row) => row.code === "PAPER-NEWS" || row.code === "RECYCLED-PET-FLAKE",
    ),
  ).toBe(false);
  const pet = rows.find((row) => row.code === "PLASTIC-PET");
  expect(pet?.review).toEqual({
    hazardStatus: "non_hazardous",
    sourceReference: "Category review 42",
    reviewedAt: expect.any(Number),
  });
  expect(pet?.review).not.toHaveProperty("reviewedByProfileId");
});
