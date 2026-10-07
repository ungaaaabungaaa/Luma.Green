/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const args = {
  intakeReference: "BATCH-INTAKE-1",
  materialCode: "PAPER-NEWS",
  grams: 2000,
  producedOn: "2026-01-01",
  sourceReference: "PRODUCTION-1",
  weighingReference: "WEIGH-1",
  ownProductionConfirmed: true as const,
};
async function world() {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const maker = await signInAs(t, "+919000000103");
  const shop = await signInAs(t, "+919000000101");
  const setup = await t.run(async (ctx) => {
    const allOrgs = await ctx.db.query("orgs").collect();
    const org = allOrgs.find((row) => row.kind === "recycler");
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", args.materialCode))
      .unique();
    if (!org || !material) throw new Error("Missing test fixture");
    await ctx.db.patch("orgs", org._id, {
      kind: "manufacturer",
      families: ["paper"],
    });
    await ctx.db.patch("materials", material._id, {
      byproductEligibility: {
        hazardStatus: "non_hazardous",
        sourceReference: "Synthetic review only",
        reviewedAt: 1,
      },
    });
    const stock = await ctx.db
      .query("inventory")
      .withIndex("by_org_material", (q) =>
        q.eq("orgId", org._id).eq("materialCode", args.materialCode),
      )
      .unique();
    if (stock) await ctx.db.delete("inventory", stock._id);
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .first();
    if (!membership) throw new Error("Missing member");
    return {
      orgId: org._id,
      materialId: material._id,
      membershipId: membership._id,
    };
  });
  return { t, maker, shop, ...setup };
}
afterEach(() => vi.unstubAllEnvs());
it("adds exact stock once with immutable evidence and idempotent concurrent retry", async () => {
  const { t, maker, orgId } = await world();
  const [first, second] = await Promise.all([
    maker.mutation(api.stockIntake.record, args),
    maker.mutation(api.stockIntake.record, args),
  ]);
  expect(first).toBe(second);
  const stock = await maker.query(api.stock.mine, {});
  expect(
    stock.rows.find((row) => row.material.code === args.materialCode)?.grams,
  ).toBe(2000);
  const records = await maker.query(api.stockIntake.mine, {
    paginationOpts: { numItems: 20, cursor: null },
  });
  expect(records.page).toHaveLength(1);
  expect(records.page[0]).toMatchObject({
    id: first,
    intakeReference: args.intakeReference,
    materialCode: args.materialCode,
    grams: args.grams,
    sourceReference: args.sourceReference,
    weighingReference: args.weighingReference,
  });
  const audit = await t.run((ctx) =>
    ctx.db
      .query("auditLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityTable", "manufacturerStockIntakes").eq("entityId", first),
      )
      .collect(),
  );
  expect(audit).toHaveLength(1);
  expect(audit[0]).toMatchObject({
    orgId,
    metadata: { previousGrams: 0, intakeGrams: 2000, grams: 2000 },
  });
  expect(await t.run((ctx) => ctx.db.query("materialLots").collect())).toEqual(
    [],
  );
});
it("rejects a changed retry without altering stock or evidence", async () => {
  const { maker } = await world();
  await maker.mutation(api.stockIntake.record, args);
  await expect(
    maker.mutation(api.stockIntake.record, { ...args, grams: 3000 }),
  ).rejects.toThrow("INTAKE_REFERENCE_CONFLICT");
  const stock = await maker.query(api.stock.mine, {});
  expect(
    stock.rows.find((row) => row.material.code === args.materialCode)?.grams,
  ).toBe(2000);
});
it("requires an active manufacturer operator and keeps viewer history read-only", async () => {
  const { t, maker, shop, membershipId, orgId } = await world();
  await expect(shop.mutation(api.stockIntake.record, args)).rejects.toThrow(
    "WRONG_ROLE",
  );
  await expect(t.mutation(api.stockIntake.record, args)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await t.run((ctx) =>
    ctx.db.patch("memberships", membershipId, { role: "viewer" }),
  );
  const history = await maker.query(api.stockIntake.mine, {
    paginationOpts: { numItems: 20, cursor: null },
  });
  expect(history.page).toEqual([]);
  await expect(maker.mutation(api.stockIntake.record, args)).rejects.toThrow(
    "WORKSPACE_PERMISSION_DENIED",
  );
  await t.run((ctx) =>
    ctx.db.patch("memberships", membershipId, { role: "member" }),
  );
  await maker.mutation(api.stockIntake.record, args);
  await t.run((ctx) => ctx.db.patch("orgs", orgId, { status: "suspended" }));
  await expect(
    maker.mutation(api.stockIntake.record, {
      ...args,
      intakeReference: "NEXT",
    }),
  ).rejects.toThrow("NO_BUSINESS");
});
it("fails closed for missing, hazardous, inactive and wrong-family material approval", async () => {
  const { t, maker, materialId, orgId } = await world();
  await t.run((ctx) =>
    ctx.db.patch("materials", materialId, { byproductEligibility: undefined }),
  );
  await expect(maker.mutation(api.stockIntake.record, args)).rejects.toThrow(
    "BYPRODUCT_NOT_ELIGIBLE",
  );
  await t.run((ctx) =>
    ctx.db.patch("materials", materialId, {
      byproductEligibility: {
        hazardStatus: "hazardous",
        sourceReference: "test",
        reviewedAt: 1,
      },
    }),
  );
  await expect(maker.mutation(api.stockIntake.record, args)).rejects.toThrow(
    "BYPRODUCT_NOT_ELIGIBLE",
  );
  await t.run((ctx) =>
    ctx.db.patch("materials", materialId, {
      active: false,
      byproductEligibility: {
        hazardStatus: "non_hazardous",
        sourceReference: "test",
        reviewedAt: 1,
      },
    }),
  );
  await expect(maker.mutation(api.stockIntake.record, args)).rejects.toThrow(
    "BYPRODUCT_NOT_ELIGIBLE",
  );
  await t.run(async (ctx) => {
    await ctx.db.patch("materials", materialId, { active: true });
    await ctx.db.patch("orgs", orgId, { families: ["plastic"] });
  });
  expect(await maker.query(api.stockIntake.materials, {})).toEqual([]);
  await expect(maker.mutation(api.stockIntake.record, args)).rejects.toThrow(
    "BYPRODUCT_NOT_ELIGIBLE",
  );
  expect(
    await t.run((ctx) => ctx.db.query("manufacturerStockIntakes").collect()),
  ).toEqual([]);
});
it.each([0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid grams %s",
  async (grams) => {
    const { maker } = await world();
    await expect(
      maker.mutation(api.stockIntake.record, { ...args, grams }),
    ).rejects.toThrow("INVALID_WEIGHT");
  },
);
it("rejects future/invalid dates, empty references and overflowing stock atomically", async () => {
  const { t, maker, orgId } = await world();
  for (const producedOn of ["2099-01-01", "2026-02-30", "invalid"])
    await expect(
      maker.mutation(api.stockIntake.record, { ...args, producedOn }),
    ).rejects.toThrow("INVALID_PRODUCTION_DATE");
  await expect(
    maker.mutation(api.stockIntake.record, { ...args, weighingReference: " " }),
  ).rejects.toThrow("INVALID_REFERENCE");
  await t.run((ctx) =>
    ctx.db.insert("inventory", {
      orgId,
      materialCode: args.materialCode,
      grams: Number.MAX_SAFE_INTEGER,
      updatedAt: 1,
    }),
  );
  await expect(maker.mutation(api.stockIntake.record, args)).rejects.toThrow(
    "INVALID_WEIGHT",
  );
  expect(
    await t.run((ctx) => ctx.db.query("manufacturerStockIntakes").collect()),
  ).toEqual([]);
});
