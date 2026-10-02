/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, it } from "vitest";

import { internal } from "./_generated/api";
import { convexModules } from "./lib/auth.testing";
import { CATALOGUE } from "./lib/catalogue";
import { demoPricePaise } from "./lib/demoPrices";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const asOf = "2026-10-02";
const world = () => convexTest(schema, modules);

// These integration cases create the full 780-row seed and some repeat imports.
// Coverage-instrumented CI exceeded the default 5 seconds. Keep the complete
// catalogue, idempotency and read-budget assertions with a scoped 60-second cap.

it(
  "creates only the bounded catalogue and price set with a complete cleanup manifest",
  { timeout: 60_000 },
  async () => {
    const t = world();
    const result = await t.mutation(internal.demoPrices.seed, { asOf });
    expect(result).toMatchObject({
      materials: 26,
      referencePrices: 26,
      marketPrices: 780,
    });
    expect(result.auditId).not.toBeNull();
    await t.run(async (ctx) => {
      const audits = await ctx.db.query("auditLog").collect();
      expect(audits).toHaveLength(1);
      const audit = audits[0];
      expect(audit).toMatchObject({
        _id: result.auditId,
        action: "demo.prices.seeded",
        metadata: { sampleData: true, asOf, anchor: "2026-09-29", days: 30 },
      });
      for (const table of [
        "materials",
        "referencePrices",
        "marketPrices",
      ] as const) {
        const records = await ctx.db.query(table).collect();
        expect(audit.metadata.inserted[table]).toHaveLength(records.length);
        const manifest = audit.metadata.inserted[table] as {
          id: string;
          value: unknown;
        }[];
        const snapshots = new Map(manifest.map((row) => [row.id, row.value]));
        for (const { _id, _creationTime, ...value } of records) {
          expect(snapshots.get(_id)).toEqual(value);
        }
      }
      const prices = await ctx.db.query("marketPrices").collect();
      expect(
        prices.every(
          (row) => Number.isSafeInteger(row.paisePerKg) && row.paisePerKg > 0,
        ),
      ).toBe(true);
      expect(
        [...new Set(prices.map((row) => row.date))].toSorted((a, b) =>
          a.localeCompare(b),
        ),
      ).toEqual(
        Array.from({ length: 30 }, (_, index) =>
          new Date(Date.UTC(2026, 8, 3 + index)).toISOString().slice(0, 10),
        ),
      );
      for (const table of [
        "profiles",
        "orgs",
        "bookings",
        "rateCards",
        "listings",
        "trades",
        "jobs",
      ] as const) {
        expect(await ctx.db.query(table).first()).toBeNull();
      }
    });
  },
);

it(
  "repeating the same import changes no rows and adds no audit entry",
  { timeout: 60_000 },
  async () => {
    const t = world();
    await t.mutation(internal.demoPrices.seed, { asOf });
    const before = await t.run(async (ctx) => ({
      materials: await ctx.db.query("materials").collect(),
      referencePrices: await ctx.db.query("referencePrices").collect(),
      marketPrices: await ctx.db.query("marketPrices").collect(),
      audit: await ctx.db.query("auditLog").collect(),
    }));
    expect(await t.mutation(internal.demoPrices.seed, { asOf })).toEqual({
      materials: 0,
      referencePrices: 0,
      marketPrices: 0,
      auditId: null,
    });
    expect(
      await t.run(async (ctx) => ({
        materials: await ctx.db.query("materials").collect(),
        referencePrices: await ctx.db.query("referencePrices").collect(),
        marketPrices: await ctx.db.query("marketPrices").collect(),
        audit: await ctx.db.query("auditLog").collect(),
      })),
    ).toEqual(before);
  },
);

it(
  "overlapping date windows keep the legacy anchor and produce the same logical price rows",
  { timeout: 60_000 },
  async () => {
    const development = world();
    const production = world();
    await development.mutation(internal.demoPrices.seed, {
      asOf: "2026-09-29",
    });
    const before = await development.run((ctx) =>
      ctx.db.query("marketPrices").collect(),
    );
    expect(
      await development.mutation(internal.demoPrices.seed, { asOf }),
    ).toMatchObject({
      materials: 0,
      referencePrices: 0,
      marketPrices: 78,
    });
    await production.mutation(internal.demoPrices.seed, { asOf });
    const rows = await development.run((ctx) =>
      ctx.db.query("marketPrices").collect(),
    );
    const rowsById = new Map(rows.map((row) => [row._id, row]));
    for (const row of before) expect(rowsById.get(row._id)).toEqual(row);
    const freshRows = await production.run((ctx) =>
      ctx.db.query("marketPrices").collect(),
    );
    const logicalRows = new Map(
      rows.map(({ _id, _creationTime, ...value }) => [
        `${value.materialCode}:${value.date}`,
        value,
      ]),
    );
    for (const { _id, _creationTime, ...value } of freshRows) {
      expect(logicalRows.get(`${value.materialCode}:${value.date}`)).toEqual(
        value,
      );
    }
    expect(demoPricePaise("PAPER-NEWS", "2026-09-29")).toBe(1450);
  },
);

it(
  "preserves existing custom and unrelated records byte-for-byte",
  { timeout: 60_000 },
  async () => {
    const t = world();
    const before = await t.run(async (ctx) => {
      const material = await ctx.db.insert("materials", {
        code: "PAPER-NEWS",
        family: "paper",
        stage: "scrap",
        names: { en: "Custom name" },
        active: false,
        sortOrder: 99,
        co2eFactor: 5,
      });
      const reference = await ctx.db.insert("referencePrices", {
        city: "Bengaluru",
        materialCode: "PAPER-NEWS",
        floorPaise: 111,
        fallbackPaise: 333,
        updatedAt: 123,
      });
      const price = await ctx.db.insert("marketPrices", {
        city: "Bengaluru",
        materialCode: "PAPER-NEWS",
        date: asOf,
        paisePerKg: 777,
      });
      const unrelated = await ctx.db.insert("marketPrices", {
        city: "Chennai",
        materialCode: "CUSTOM",
        date: asOf,
        paisePerKg: 555,
      });
      return Promise.all([
        ctx.db.get(material),
        ctx.db.get(reference),
        ctx.db.get(price),
        ctx.db.get(unrelated),
      ]);
    });
    const result = await t.mutation(internal.demoPrices.seed, { asOf });
    expect(result).toMatchObject({
      materials: 25,
      referencePrices: 25,
      marketPrices: 779,
    });
    for (const row of before) {
      if (!row) throw new Error("Missing fixture");
      expect(await t.run((ctx) => ctx.db.get(row._id))).toEqual(row);
      const audit = await t.run((ctx) => ctx.db.query("auditLog").first());
      expect(JSON.stringify(audit?.metadata.inserted)).not.toContain(row._id);
    }
  },
);

it(
  "uses bounded indexed lookups even when unrelated history exists",
  { timeout: 60_000 },
  async () => {
    const t = convexTest({
      schema,
      modules,
      transactionLimits: { documentsRead: 832 },
    });
    await t.run(async (ctx) => {
      for (let index = 0; index < 20; index += 1) {
        await ctx.db.insert("marketPrices", {
          city: "Other city",
          materialCode: `OTHER-${String(index)}`,
          date: asOf,
          paisePerKg: 100,
        });
      }
    });
    await t.mutation(internal.demoPrices.seed, { asOf });
    expect(await t.mutation(internal.demoPrices.seed, { asOf })).toMatchObject({
      materials: 0,
      referencePrices: 0,
      marketPrices: 0,
    });
    expect(CATALOGUE).toHaveLength(26);
  },
);

it.each(["not-a-date", "2026-02-30", "2026-2-03", "2026-10-02T00:00:00Z"])(
  "rejects invalid asOf %s before writing",
  async (date) => {
    const t = world();
    await expect(
      t.mutation(internal.demoPrices.seed, { asOf: date }),
    ).rejects.toThrow("INVALID_DEMO_PRICE_DATE");
    await t.run(async (ctx) => {
      for (const table of [
        "materials",
        "referencePrices",
        "marketPrices",
        "auditLog",
      ] as const) {
        expect(await ctx.db.query(table).first()).toBeNull();
      }
    });
  },
);
