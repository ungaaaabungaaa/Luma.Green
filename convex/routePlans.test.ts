/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
async function world() {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const shop = await signInAs(t, "+919000000101");
  const yard = await signInAs(t, "+919000000102");
  const materials = await shop.query(api.routePlans.options, {});
  const material = materials[0];
  const input = {
    title: "Local plan",
    reference: "LOCAL-PLAN-1",
    vehicleReference: "Local vehicle",
    capacityGrams: 1000,
    origin: { siteReference: "Local start", latitude: 0, longitude: 179.9 },
    stops: [
      {
        siteReference: "Local stop",
        latitude: 0,
        longitude: -179.9,
        materialId: material.id,
        grams: 1000,
      },
    ],
    ordering: "geometric" as const,
    reason: "Local declared plan",
  };
  return { t, shop, yard, input };
}
afterEach(() => vi.unstubAllEnvs());
describe("private route plan lifecycle", () => {
  it("saves exact consolidation, preserves immutable revisions and has no inventory effects", async () => {
    const { t, shop, input } = await world();
    const before = await shop.query(api.stock.mine, {});
    const id = await shop.mutation(api.routePlans.save, input);
    expect(await shop.mutation(api.routePlans.save, input)).toBe(id);
    const detail = await shop.query(api.routePlans.detail, { planId: id });
    expect(detail.latest).toMatchObject({
      totalGrams: 1000,
      revision: 1,
      capacityGrams: 1000,
    });
    expect(detail.latest.straightLineMeters).toBeLessThan(23_000);
    await shop.mutation(api.routePlans.save, {
      ...input,
      title: "Correction",
      planId: id,
      expectedRevision: 1,
      reason: "Corrected title",
    });
    await expect(
      shop.mutation(api.routePlans.save, {
        ...input,
        planId: id,
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/ROUTE_REVISION_CONFLICT/);
    const history = await shop.query(api.routePlans.history, {
      planId: id,
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(history.page.map((row) => row.title)).toEqual([
      "Correction",
      "Local plan",
    ]);
    const after = await shop.query(api.stock.mine, {});
    expect(after.totalGrams).toBe(before.totalGrams);
    const audits = await t.run((ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entityTable", "routePlans").eq("entityId", id),
        )
        .collect(),
    );
    expect(audits).toHaveLength(2);
  });
  it("rejects invalid, over-capacity and conflicting references without adding plans", async () => {
    const { shop, input } = await world();
    await expect(
      shop.mutation(api.routePlans.save, { ...input, capacityGrams: 999 }),
    ).rejects.toThrow(/INVALID_ROUTE/);
    await expect(
      shop.mutation(api.routePlans.save, {
        ...input,
        origin: { ...input.origin, latitude: 100 },
      }),
    ).rejects.toThrow(/INVALID_ROUTE/);
    const plans = await shop.query(api.routePlans.mine, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(plans.page).toHaveLength(0);
    await shop.mutation(api.routePlans.save, input);
    await expect(
      shop.mutation(api.routePlans.save, { ...input, title: "Other payload" }),
    ).rejects.toThrow(/ROUTE_REFERENCE_EXISTS/);
  });
  it("denies cross-workspace access and viewer writes; managers archive without erasing history", async () => {
    const { t, shop, yard, input } = await world();
    const id = await shop.mutation(api.routePlans.save, input);
    await expect(
      yard.query(api.routePlans.detail, { planId: id }),
    ).rejects.toThrow(/ROUTE_NOT_FOUND/);
    await expect(
      yard.query(api.routePlans.history, {
        planId: id,
        paginationOpts: { numItems: 20, cursor: null },
      }),
    ).rejects.toThrow(/ROUTE_NOT_FOUND/);
    await expect(
      yard.mutation(api.routePlans.save, {
        ...input,
        planId: id,
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/ROUTE_NOT_FOUND/);
    const detail = await shop.query(api.routePlans.detail, { planId: id });
    const membership = await t.run((ctx) =>
      ctx.db
        .query("memberships")
        .withIndex("by_org", (q) => q.eq("orgId", detail.plan.orgId))
        .first(),
    );
    if (!membership) throw new Error("No fixture membership");
    await t.run((ctx) =>
      ctx.db.patch("memberships", membership._id, { role: "viewer" }),
    );
    const viewerDetail = await shop.query(api.routePlans.detail, {
      planId: id,
    });
    expect(viewerDetail.plan._id).toBe(id);
    await expect(
      shop.mutation(api.routePlans.save, { ...input, reference: "VIEWER-NEW" }),
    ).rejects.toThrow(/WORKSPACE_PERMISSION_DENIED/);
    await t.run((ctx) =>
      ctx.db.patch("memberships", membership._id, { role: "member" }),
    );
    await expect(
      shop.mutation(api.routePlans.archive, {
        planId: id,
        expectedRevision: 1,
        reason: "Archive test",
      }),
    ).rejects.toThrow(/WORKSPACE_PERMISSION_DENIED/);
    await t.run((ctx) =>
      ctx.db.patch("memberships", membership._id, { role: "owner" }),
    );
    await shop.mutation(api.routePlans.archive, {
      planId: id,
      expectedRevision: 1,
      reason: "Archive test",
    });
    await expect(
      shop.mutation(api.routePlans.save, {
        ...input,
        planId: id,
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/ROUTE_ARCHIVED/);
    const archivedHistory = await shop.query(api.routePlans.history, {
      planId: id,
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(archivedHistory.page).toHaveLength(1);
  });
  it("serializes competing corrections and preserves the original revision", async () => {
    const { shop, input } = await world();
    const id = await shop.mutation(api.routePlans.save, input);
    const outcomes = await Promise.allSettled(
      ["Correction A", "Correction B"].map((title) =>
        shop.mutation(api.routePlans.save, {
          ...input,
          title,
          planId: id,
          expectedRevision: 1,
        }),
      ),
    );
    expect(
      outcomes.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const history = await shop.query(api.routePlans.history, {
      planId: id,
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(history.page.map((row) => row.revision)).toEqual([2, 1]);
    expect(history.page[1].title).toBe(input.title);
  });
  it("rechecks material-family scope when recording a revision", async () => {
    const { t, shop, input } = await world();
    const id = await shop.mutation(api.routePlans.save, input);
    const detail = await shop.query(api.routePlans.detail, { planId: id });
    await t.run((ctx) =>
      ctx.db.patch("orgs", detail.plan.orgId, { families: [] }),
    );
    await expect(
      shop.mutation(api.routePlans.save, {
        ...input,
        planId: id,
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/ROUTE_MATERIAL_UNAVAILABLE/);
    const history = await shop.query(api.routePlans.history, {
      planId: id,
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(history.page).toHaveLength(1);
  });
  it("rechecks active material and rejects anonymous reads", async () => {
    const { t, shop, input } = await world();
    await t.run((ctx) =>
      ctx.db.patch("materials", input.stops[0].materialId, { active: false }),
    );
    await expect(shop.mutation(api.routePlans.save, input)).rejects.toThrow(
      /ROUTE_MATERIAL_UNAVAILABLE/,
    );
    await expect(
      t.query(api.routePlans.mine, {
        paginationOpts: { numItems: 20, cursor: null },
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });
});
