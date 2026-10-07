/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";
const modules = convexModules(import.meta.glob("./**/*.*s"));
const spec = "Dry newspaper, sorted and bundled";
const demand = {
  materialCode: "PAPER-NEWS",
  quantityGrams: 100_001,
  area: "Peenya",
  specification: spec,
  neededBy: "2026-10-03",
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-02T06:30:00Z"));
  vi.stubEnv("AUTH_DEV_MODE", "true");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
async function world() {
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const buyer = await signInAs(t, "+919000000102");
  const supplier = await signInAs(t, "+919000000101");
  const other = await signInAs(t, "+919000000103");
  const options = await buyer.query(api.sourcing.options, {
    materialCode: "PAPER-NEWS",
  });
  const seller = options.suppliers.at(0);
  if (!seller) throw new Error("missing supplier");
  return { t, buyer, supplier, other, supplierOrgId: seller.id };
}
async function qualify(
  w: Awaited<ReturnType<typeof world>>,
  decision: "approved" | "rejected" = "approved",
) {
  return w.buyer.mutation(api.sourcing.recordQualification, {
    supplierOrgId: w.supplierOrgId,
    materialCode: "PAPER-NEWS",
    sampleReference: "SAMPLE-001",
    specification: spec,
    decision,
    validUntil: "2026-12-01",
    reason: "Recorded test inspection",
  });
}
const agreement = {
  materialCode: "PAPER-NEWS",
  reference: "AGR-001",
  specification: spec,
  quantityGrams: 100_000,
  paisePerKg: 1234,
  startsOn: "2026-10-02",
  endsOn: "2026-11-02",
};
async function agree(w: Awaited<ReturnType<typeof world>>) {
  await qualify(w);
  const id = await w.buyer.mutation(api.sourcing.propose, {
    ...agreement,
    supplierOrgId: w.supplierOrgId,
  });
  await w.supplier.mutation(api.sourcing.acknowledge, {
    agreementId: id,
    decision: "acknowledged",
    reference: "ACK-001",
  });
  return id;
}
it("publishes each recurring occurrence once without creating trades or stock", async () => {
  const w = await world();
  const before = await w.t.run((ctx) => ctx.db.query("inventory").collect());
  const planId = await w.buyer.mutation(api.sourcing.postPlan, {
    ...demand,
    everyDays: 7,
  });
  const first = await w.buyer.mutation(api.sourcing.publishNext, {
    planId,
    expectedDate: demand.neededBy,
  });
  expect(
    await w.buyer.mutation(api.sourcing.publishNext, {
      planId,
      expectedDate: demand.neededBy,
    }),
  ).toBe(first);
  const plan = await w.t.run((ctx) => ctx.db.get("sourcingPlans", planId));
  expect(plan?.nextNeededBy).toBe("2026-10-10");
  const after = await w.t.run((ctx) => ctx.db.query("inventory").collect());
  expect(after).toEqual(before);
  await w.buyer.mutation(api.sourcing.closePlan, { planId });
  await expect(
    w.buyer.mutation(api.sourcing.publishNext, {
      planId,
      expectedDate: "2026-10-10",
    }),
  ).rejects.toThrow("STALE_PLAN");
  await expect(
    w.other.mutation(api.sourcing.closePlan, { planId }),
  ).rejects.toThrow("NOT_FOUND");
});
it("requires a current exact-specification buyer decision and retains private history", async () => {
  const w = await world();
  await expect(
    w.buyer.mutation(api.sourcing.propose, {
      ...agreement,
      supplierOrgId: w.supplierOrgId,
    }),
  ).rejects.toThrow("QUALIFICATION_REQUIRED");
  await qualify(w);
  await expect(
    w.buyer.mutation(api.sourcing.propose, {
      ...agreement,
      specification: "Different grade",
      supplierOrgId: w.supplierOrgId,
    }),
  ).rejects.toThrow("QUALIFICATION_REQUIRED");
  vi.setSystemTime(Date.now() + 1);
  await qualify(w, "rejected");
  await expect(
    w.buyer.mutation(api.sourcing.propose, {
      ...agreement,
      supplierOrgId: w.supplierOrgId,
    }),
  ).rejects.toThrow("QUALIFICATION_REQUIRED");
  const mine = await w.buyer.query(api.sourcing.qualifications, {
    paginationOpts: { numItems: 20, cursor: null },
  });
  expect(mine.page.map((x) => x.record.decision)).toEqual([
    "rejected",
    "approved",
  ]);
  const foreign = await w.supplier.query(api.sourcing.qualifications, {
    paginationOpts: { numItems: 20, cursor: null },
  });
  expect(foreign.page).toEqual([]);
});
it("separates supplier acknowledgement, limits exact releases and never allocates stock", async () => {
  const w = await world();
  await qualify(w);
  const input = { ...agreement, supplierOrgId: w.supplierOrgId };
  const id = await w.buyer.mutation(api.sourcing.propose, input);
  expect(await w.buyer.mutation(api.sourcing.propose, input)).toBe(id);
  await expect(
    w.buyer.mutation(api.sourcing.acknowledge, {
      agreementId: id,
      decision: "acknowledged",
      reference: "SELF-ACK",
    }),
  ).rejects.toThrow("WRONG_ROLE");
  await expect(
    w.buyer.mutation(api.sourcing.release, {
      agreementId: id,
      reference: "REL-001",
      quantityGrams: 1,
      neededBy: "2026-10-04",
    }),
  ).rejects.toThrow("INVALID_TRANSITION");
  await w.supplier.mutation(api.sourcing.acknowledge, {
    agreementId: id,
    decision: "acknowledged",
    reference: "SUPPLIER-ACK",
  });
  const before = await w.t.run(async (ctx) => ({
    stock: await ctx.db.query("inventory").collect(),
    trades: await ctx.db.query("trades").collect(),
  }));
  const request = {
    agreementId: id,
    reference: "REL-001",
    quantityGrams: 99_999,
    neededBy: "2026-10-04",
  };
  const releaseId = await w.buyer.mutation(api.sourcing.release, request);
  expect(await w.buyer.mutation(api.sourcing.release, request)).toBe(releaseId);
  await expect(
    w.buyer.mutation(api.sourcing.release, { ...request, quantityGrams: 1 }),
  ).rejects.toThrow("REFERENCE_CONFLICT");
  await expect(
    w.buyer.mutation(api.sourcing.release, {
      ...request,
      reference: "REL-002",
      quantityGrams: 2,
    }),
  ).rejects.toThrow("QUANTITY_EXCEEDED");
  await w.supplier.mutation(api.sourcing.acknowledgeRelease, {
    releaseId,
    decision: "acknowledged",
    reference: "REL-ACK",
  });
  const detail = await w.buyer.query(api.sourcing.detail, { agreementId: id });
  expect(detail.releases[0]?.status).toBe("acknowledged");
  expect(detail.events).toHaveLength(4);
  const after = await w.t.run(async (ctx) => ({
    stock: await ctx.db.query("inventory").collect(),
    trades: await ctx.db.query("trades").collect(),
  }));
  expect(after).toEqual(before);
  await expect(
    w.other.query(api.sourcing.detail, { agreementId: id }),
  ).rejects.toThrow("NOT_FOUND");
});
it("holds new releases after classification or supplier-decision revocation", async () => {
  const w = await world();
  const id = await agree(w);
  await w.t.run(async (ctx) => {
    const m = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", "PAPER-NEWS"))
      .unique();
    if (m) await ctx.db.patch("materials", m._id, { active: false });
  });
  await expect(
    w.buyer.mutation(api.sourcing.release, {
      agreementId: id,
      reference: "REL-001",
      quantityGrams: 1,
      neededBy: "2026-10-04",
    }),
  ).rejects.toThrow("MATERIAL_NOT_ALLOWED");
});
it("keeps closed agreements and prior releases auditable", async () => {
  const w = await world();
  const id = await agree(w);
  await w.buyer.mutation(api.sourcing.release, {
    agreementId: id,
    reference: "REL-001",
    quantityGrams: 1,
    neededBy: "2026-10-04",
  });
  await w.buyer.mutation(api.sourcing.closeAgreement, {
    agreementId: id,
    reference: "END-001",
  });
  await expect(
    w.buyer.mutation(api.sourcing.release, {
      agreementId: id,
      reference: "REL-002",
      quantityGrams: 1,
      neededBy: "2026-10-04",
    }),
  ).rejects.toThrow("AGREEMENT_CLOSED");
  const detail = await w.supplier.query(api.sourcing.detail, {
    agreementId: id,
  });
  expect(detail.releases).toHaveLength(1);
  expect(detail.events[0]?.action).toBe("closed");
});
it("denies viewer writes but permits its private workspace history", async () => {
  const w = await world();
  await w.t.run(async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", "+919000000102"))
      .unique();
    if (!profile) throw new Error("profile");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .first();
    if (membership)
      await ctx.db.patch("memberships", membership._id, { role: "viewer" });
  });
  await expect(
    w.buyer.mutation(api.sourcing.postPlan, { ...demand, everyDays: 7 }),
  ).rejects.toThrow("WORKSPACE_PERMISSION_DENIED");
  const rows = await w.buyer.query(api.sourcing.plans, {
    paginationOpts: { numItems: 20, cursor: null },
  });
  expect(rows.page).toEqual([]);
});
it.each([0, 1.2, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid release grams %s",
  async (quantityGrams) => {
    const w = await world();
    const id = await agree(w);
    await expect(
      w.buyer.mutation(api.sourcing.release, {
        agreementId: id,
        reference: "REL-001",
        quantityGrams,
        neededBy: "2026-10-04",
      }),
    ).rejects.toThrow("INVALID_INPUT");
  },
);
it("opens approved manufacturer byproduct sourcing to any matching business buyer", async () => {
  const w = await world();
  const maker = await signInAs(w.t, "+919000000104");
  await w.t.run(async (ctx) => {
    const m = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", "PAPER-NEWS"))
      .unique();
    if (!m) throw new Error("material");
    await ctx.db.patch("materials", m._id, {
      byproductEligibility: {
        hazardStatus: "non_hazardous",
        sourceReference: "Synthetic test eligibility",
        reviewedAt: Date.now(),
      },
    });
  });
  const posted = await w.supplier.mutation(api.demand.post, demand);
  const board = await maker.query(api.demand.board, {});
  expect(board.available.some((row) => row.id === posted)).toBe(true);
  const options = await w.supplier.query(api.sourcing.options, {
    materialCode: "PAPER-NEWS",
  });
  const source = options.suppliers.find(
    (row) => row.name === "Deccan Packaging Pvt Ltd",
  );
  if (!source) throw new Error("manufacturer");
  await w.supplier.mutation(api.sourcing.recordQualification, {
    supplierOrgId: source.id,
    materialCode: "PAPER-NEWS",
    sampleReference: "BYPRODUCT-SAMPLE",
    specification: spec,
    decision: "approved",
    validUntil: "2026-11-01",
    reason: "Synthetic current decision",
  });
  await w.t.run(async (ctx) => {
    const m = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", "PAPER-NEWS"))
      .unique();
    if (m)
      await ctx.db.patch("materials", m._id, {
        byproductEligibility: undefined,
      });
  });
  await expect(
    w.supplier.mutation(api.sourcing.propose, {
      ...agreement,
      supplierOrgId: source.id,
    }),
  ).rejects.toThrow("MATERIAL_NOT_ALLOWED");
});
it("recovers an overdue schedule only through an explicit audited date change", async () => {
  const w = await world();
  const planId = await w.buyer.mutation(api.sourcing.postPlan, {
    ...demand,
    everyDays: 7,
  });
  vi.setSystemTime(new Date("2026-10-09T06:30:00Z"));
  const buyer = await signInAs(w.t, "+919000000102");
  await expect(
    buyer.mutation(api.sourcing.publishNext, {
      planId,
      expectedDate: "2026-10-03",
    }),
  ).rejects.toThrow("INVALID_DEMAND");
  await buyer.mutation(api.sourcing.reschedule, {
    planId,
    expectedDate: "2026-10-03",
    neededBy: "2026-10-11",
  });
  await expect(
    buyer.mutation(api.sourcing.reschedule, {
      planId,
      expectedDate: "2026-10-03",
      neededBy: "2026-10-12",
    }),
  ).rejects.toThrow("STALE_PLAN");
  const before = await w.t.run((ctx) =>
    ctx.db.query("materialDemands").collect(),
  );
  expect(before).toHaveLength(0);
  const id = await buyer.mutation(api.sourcing.publishNext, {
    planId,
    expectedDate: "2026-10-11",
  });
  const row = await w.t.run((ctx) => ctx.db.get("materialDemands", id));
  expect(row?.neededBy).toBe("2026-10-11");
  const events = await w.t.run((ctx) =>
    ctx.db
      .query("auditLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityTable", "sourcingPlans").eq("entityId", planId),
      )
      .collect(),
  );
  expect(
    events.find((e) => e.action === "sourcing.plan_rescheduled")?.metadata,
  ).toEqual({ previousDate: "2026-10-03", nextDate: "2026-10-11" });
});

it("discloses the combined supplier limit across eligible kinds", async () => {
  const w = await world();
  await w.t.run(async (ctx) => {
    const source = await ctx.db.get("orgs", w.supplierOrgId);
    if (!source) throw new Error("missing source");
    const fields = {
      kind: source.kind,
      name: source.name,
      slug: source.slug,
      status: source.status,
      city: source.city,
      area: source.area,
      address: source.address,
      phones: [],
      weeklyOff: source.weeklyOff,
      families: source.families,
      offersPickup: false,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", "PAPER-NEWS"))
      .unique();
    if (!material) throw new Error("missing material");
    await ctx.db.patch("materials", material._id, {
      byproductEligibility: {
        hazardStatus: "non_hazardous",
        sourceReference: "Synthetic test eligibility",
        reviewedAt: Date.now(),
      },
    });
    for (const kind of ["kabadiwala", "manufacturer"] as const) {
      for (let index = 0; index < 60; index++)
        await ctx.db.insert("orgs", {
          ...fields,
          kind,
          name: `Supplier ${kind} ${String(index)}`,
        });
    }
  });
  const result = await w.buyer.query(api.sourcing.options, {
    materialCode: "PAPER-NEWS",
  });
  expect(result.suppliers).toHaveLength(100);
  expect(result.truncated).toBe(true);
});
it("records late release acknowledgement as history without changing its due date or stock", async () => {
  const w = await world();
  const agreementId = await agree(w);
  const releaseId = await w.buyer.mutation(api.sourcing.release, {
    agreementId,
    reference: "LATE-001",
    quantityGrams: 1000,
    neededBy: "2026-10-03",
  });
  const before = await w.t.run((ctx) => ctx.db.query("inventory").collect());
  vi.setSystemTime(new Date("2026-10-05T06:30:00Z"));
  const supplier = await signInAs(w.t, "+919000000101");
  const buyer = await signInAs(w.t, "+919000000102");
  await supplier.mutation(api.sourcing.acknowledgeRelease, {
    releaseId,
    decision: "acknowledged",
    reference: "LATE-ACK-001",
  });
  const detail = await buyer.query(api.sourcing.detail, { agreementId });
  expect(detail.releases[0]).toMatchObject({
    neededBy: "2026-10-03",
    status: "acknowledged",
  });
  const after = await w.t.run((ctx) => ctx.db.query("inventory").collect());
  expect(after).toEqual(before);
});
