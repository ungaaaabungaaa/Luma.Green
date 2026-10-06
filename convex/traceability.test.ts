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
  const recycler = await signInAs(t, "+919000000103");
  const orgs = await t.run(async (ctx) => {
    const all = await ctx.db.query("orgs").collect();
    return {
      shop: all.find((org) => org.kind === "kabadiwala")!._id,
      yard: all.find((org) => org.kind === "yard")!._id,
      recycler: all.find((org) => org.kind === "recycler")!._id,
    };
  });
  return { t, shop, yard, recycler, orgs };
}

afterEach(() => vi.unstubAllEnvs());

describe("physical lot evidence", () => {
  it("keeps a declared lot separate from authoritative stock and audit-logs it", async () => {
    const { t, shop } = await world();
    const before = await shop.query(api.stock.mine, {});
    const lotId = await shop.mutation(api.traceability.declareLot, {
      materialCode: "PLASTIC-PET",
      state: "PET-BOTTLE-SORTED",
      grams: 10_000,
      sourceReference: "Intake slip 12",
    });
    const after = await shop.query(api.stock.mine, {});
    expect(after.totalGrams).toBe(before.totalGrams);
    const history = await shop.query(api.traceability.history, { lotId });
    expect(history.lot).toMatchObject({
      sourceKind: "self_declared",
      initialGrams: 10_000,
      availableGrams: 10_000,
    });
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_entity", (q) =>
            q.eq("entityTable", "materialLots").eq("entityId", lotId),
          )
          .first(),
      ),
    ).toMatchObject({ action: "material_lot.declared" });
    for (const grams of [0, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(
        shop.mutation(api.traceability.declareLot, {
          materialCode: "PLASTIC-PET",
          state: "PET-BALE",
          grams,
        }),
      ).rejects.toThrow(/INVALID_WEIGHT/);
    }
  });

  it("records exact custody without treating a weight disagreement as receipt", async () => {
    const { shop, yard, recycler, orgs } = await world();
    const lotId = await shop.mutation(api.traceability.declareLot, {
      materialCode: "PLASTIC-PET",
      state: "PET-BALE",
      grams: 10_000,
    });
    await expect(
      recycler.query(api.traceability.history, { lotId }),
    ).rejects.toThrow(/LOT_NOT_FOUND/);
    await expect(
      yard.mutation(api.traceability.dispatch, {
        lotId,
        receiverOrgId: orgs.recycler,
      }),
    ).rejects.toThrow(/LOT_NOT_FOUND/);
    await shop.mutation(api.traceability.dispatch, {
      lotId,
      receiverOrgId: orgs.yard,
    });
    await expect(
      shop.mutation(api.traceability.dispatch, {
        lotId,
        receiverOrgId: orgs.yard,
      }),
    ).rejects.toThrow(/LOT_NOT_AVAILABLE/);
    await expect(
      yard.mutation(api.traceability.receive, { lotId, receivedGrams: 9999 }),
    ).rejects.toThrow(/WEIGHT_DISPUTE/);
    await expect(
      recycler.mutation(api.traceability.receive, {
        lotId,
        receivedGrams: 10_000,
      }),
    ).rejects.toThrow(/LOT_NOT_PENDING_FOR_ORG/);
    await yard.mutation(api.traceability.receive, {
      lotId,
      receivedGrams: 10_000,
    });
    const history = await yard.query(api.traceability.history, { lotId });
    expect(history.custody.map((event) => event.kind)).toEqual([
      "dispatched",
      "received",
    ]);
    expect(history.custody.map((event) => event.grams)).toEqual([
      10_000, 10_000,
    ]);
    await expect(
      shop.query(api.traceability.history, { lotId }),
    ).rejects.toThrow(/LOT_NOT_FOUND/);
  });

  it("creates PET and side-stream child lots with exact mass balance", async () => {
    const { t, shop } = await world();
    const lotId = await shop.mutation(api.traceability.declareLot, {
      materialCode: "PLASTIC-PET",
      state: "PET-BALE",
      grams: 10_000,
    });
    const request = {
      inputLotId: lotId,
      inputGrams: 8000,
      contaminationGrams: 500,
      processLossGrams: 500,
      outputs: [
        {
          materialCode: "RECYCLED-PET-FLAKE",
          state: "PET-FLAKE-HOT-WASHED",
          grams: 6000,
        },
        {
          materialCode: "PLASTIC-PP",
          state: "PP-FLOAT-FRACTION",
          grams: 1000,
        },
      ],
    };
    await expect(
      shop.mutation(api.traceability.transform, {
        ...request,
        outputs: [{ ...request.outputs[0], grams: 6001 }, request.outputs[1]],
      }),
    ).rejects.toThrow(/MASS_BALANCE_MISMATCH/);
    const transformationId = await shop.mutation(
      api.traceability.transform,
      request,
    );
    const history = await shop.query(api.traceability.history, { lotId });
    expect(history.lot.availableGrams).toBe(2000);
    expect(history.transformations[0]).toMatchObject({
      id: transformationId,
      inputGrams: 8000,
      contaminationGrams: 500,
      processLossGrams: 500,
    });
    expect(
      history.transformations[0].outputs.map((output) => output.grams),
    ).toEqual([6000, 1000]);
    const childId = history.transformations[0].outputs[0].id;
    const childHistory = await shop.query(api.traceability.history, {
      lotId: childId,
    });
    expect(childHistory.lot).toMatchObject({
      sourceKind: "transformed",
      initialGrams: 6000,
    });
    await expect(
      shop.mutation(api.traceability.transform, {
        ...request,
        inputGrams: 8000,
      }),
    ).rejects.toThrow(/NOT_ENOUGH_LOT_GRAMS/);
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("lotTransformations")
          .withIndex("by_input_lot_created", (q) => q.eq("inputLotId", lotId))
          .collect(),
      ),
    ).toHaveLength(1);
  });
});
