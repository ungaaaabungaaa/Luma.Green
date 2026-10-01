/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import { convexModules, registerAuth, signIn } from "./lib/auth.testing";
import { CATALOGUE, catalogueEntry } from "./lib/catalogue";
import { shiftDate } from "./lib/dates";
import { indiaToday } from "./lib/onboarding";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const ADMIN_EMAIL = "admin@luma.test";

afterEach(() => vi.unstubAllEnvs());

function world() {
  vi.stubEnv("ADMIN_EMAIL", ADMIN_EMAIL);
  const t = convexTest(schema, modules);
  registerAuth(t);
  return t;
}

describe("fill missing material names", () => {
  it("requires an authenticated admin with two-factor authentication", async () => {
    const t = world();
    await expect(
      t.mutation(api.catalogue.fillMissingNames, {}),
    ).rejects.toThrow("NOT_SIGNED_IN");
    const member = await signIn(t, {
      email: "member@luma.test",
      twoFactorEnabled: true,
    });
    await expect(
      member.mutation(api.catalogue.fillMissingNames, {}),
    ).rejects.toThrow("NOT_ADMIN");
    const unenrolled = await signIn(t, { email: ADMIN_EMAIL });
    await expect(
      unenrolled.mutation(api.catalogue.fillMissingNames, {}),
    ).rejects.toThrow("TWO_FACTOR_REQUIRED");
    expect(await t.run((ctx) => ctx.db.query("auditLog").collect())).toEqual(
      [],
    );
  });

  it("fills only missing names and audits each changed material once", async () => {
    const t = world();
    const admin = await signIn(t, {
      email: ADMIN_EMAIL,
      twoFactorEnabled: true,
    });
    await admin.mutation(api.identity.ensureProfile, { locale: "en" });
    const ids = await t.run(async (ctx) => {
      const first = await ctx.db.insert("materials", {
        code: "PAPER-NEWS",
        family: "paper",
        stage: "scrap",
        names: {
          en: "Custom newspaper",
          hi: "रद्दी",
          ta: "என் பெயர்",
          fr: "Journal",
        },
        co2eFactor: 7.125,
        sortOrder: 99,
        active: false,
      });
      const second = await ctx.db.insert("materials", {
        code: "METAL-COPPER",
        family: "metal",
        stage: "scrap",
        names: { en: "Copper" },
        co2eFactor: 3,
        sortOrder: 2,
        active: true,
      });
      const custom = await ctx.db.insert("materials", {
        code: "CUSTOM-MATERIAL",
        family: "other",
        stage: "scrap",
        names: { en: "Custom" },
        co2eFactor: 0.25,
        sortOrder: 100,
        active: true,
      });
      const price = await ctx.db.insert("referencePrices", {
        city: "Bengaluru",
        materialCode: "PAPER-NEWS",
        floorPaise: 1234,
        fallbackPaise: 5678,
        updatedAt: 1,
      });
      const market = await ctx.db.insert("marketPrices", {
        city: "Bengaluru",
        materialCode: "PAPER-NEWS",
        date: "2026-10-01",
        paisePerKg: 2345,
      });
      return { first, second, custom, price, market };
    });
    const before = await t.run(async (ctx) => ({
      material: await ctx.db.get(ids.first),
      custom: await ctx.db.get(ids.custom),
      price: await ctx.db.get(ids.price),
      market: await ctx.db.get(ids.market),
    }));
    expect(await admin.mutation(api.catalogue.fillMissingNames, {})).toEqual({
      updated: 2,
    });
    const after = await t.run(async (ctx) => ({
      material: await ctx.db.get(ids.first),
      custom: await ctx.db.get(ids.custom),
      price: await ctx.db.get(ids.price),
      market: await ctx.db.get(ids.market),
      audit: await ctx.db.query("auditLog").collect(),
      materials: await ctx.db.query("materials").collect(),
    }));
    expect(after.material).toEqual({
      ...before.material,
      names: {
        ...catalogueEntry("PAPER-NEWS")?.names,
        ...before.material?.names,
      },
    });
    expect(after.custom).toEqual(before.custom);
    expect(after.price).toEqual(before.price);
    expect(after.market).toEqual(before.market);
    expect(after.materials).toHaveLength(3);
    const audit = after.audit.filter(
      (entry) => entry.action === "material.namesFilled",
    );
    expect(audit).toHaveLength(2);
    expect(audit[0]).toMatchObject({
      entityTable: "materials",
      entityId: ids.first,
      actorProfileId: expect.any(String),
      metadata: {
        code: "PAPER-NEWS",
        from: before.material?.names,
        to: after.material?.names,
      },
    });
    expect(audit[0]?.metadata.addedLocales).not.toContain("ta");
    expect(audit[0]?.metadata.addedLocales).toContain("ar");
    expect(await admin.mutation(api.catalogue.fillMissingNames, {})).toEqual({
      updated: 0,
    });
    expect(await t.run((ctx) => ctx.db.query("materials").collect())).toEqual(
      after.materials,
    );
    expect(await t.run((ctx) => ctx.db.query("auditLog").collect())).toEqual(
      after.audit,
    );
  });
});

describe("household preview prices", () => {
  it("keeps the fallback distinct from today's market quote and the floor", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("materials", {
        code: "PAPER-NEWS",
        family: "paper",
        stage: "scrap",
        names: { en: "Newspaper" },
        co2eFactor: 1,
        active: true,
        sortOrder: 1,
      });
      await ctx.db.insert("referencePrices", {
        city: "Bengaluru",
        materialCode: "PAPER-NEWS",
        floorPaise: 1000,
        fallbackPaise: 1400,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("marketPrices", {
        city: "Bengaluru",
        materialCode: "PAPER-NEWS",
        date: indiaToday(),
        paisePerKg: 2200,
      });
    });
    const board = await t.query(api.catalogue.priceBoard, {
      city: "Bengaluru",
    });
    expect(board.rows[0]).toMatchObject({
      todayPaise: 2200,
      floorPaise: 1000,
      fallbackPaise: 1400,
    });
    const missing = await t.query(api.catalogue.priceBoard, {
      city: "Chennai",
    });
    expect(missing.rows[0]?.fallbackPaise).toBeNull();
  });
});

async function seedQuoteHistory(t: ReturnType<typeof world>) {
  await t.run(async (ctx) => {
    for (const [index, entry] of CATALOGUE.entries()) {
      await ctx.db.insert("materials", {
        code: entry.code,
        family: entry.family,
        stage: entry.stage,
        names: entry.names,
        co2eFactor: entry.co2eFactor,
        active: true,
        sortOrder: index,
      });
      await ctx.db.insert("referencePrices", {
        city: "Bengaluru",
        materialCode: entry.code,
        floorPaise: 1000,
        fallbackPaise: 1400,
        updatedAt: Date.now(),
      });
      for (let day = -29; day <= 0; day += 1) {
        await ctx.db.insert("marketPrices", {
          city: "Bengaluru",
          materialCode: entry.code,
          date: shiftDate(indiaToday(), day),
          paisePerKg: 2200 + day,
        });
      }
    }
  });
}

describe("compact form quotes", () => {
  it("reads at most two documents per material even with a full month of history", async () => {
    const t = convexTest({
      schema,
      modules,
      transactionLimits: { documentsRead: CATALOGUE.length * 2 },
    });
    await seedQuoteHistory(t);
    for (const source of ["fallback", "market"] as const) {
      const result = await t.query(api.catalogue.priceQuotes, {
        city: "Bengaluru",
        source,
      });
      expect(result.rows).toHaveLength(CATALOGUE.length);
      expect(result.rows[0]).toEqual({
        code: CATALOGUE[0].code,
        paisePerKg: source === "fallback" ? 1400 : 2200,
      });
    }
    // A chart query needs the month; forms must stay within the lower budget.
    await expect(
      t.query(api.catalogue.priceBoard, { city: "Bengaluru" }),
    ).rejects.toThrow("Scanned too many documents");
  });

  it("matches full-board values with under a tenth of its JSON payload", async () => {
    const t = convexTest(schema, modules);
    await seedQuoteHistory(t);
    const board = await t.query(api.catalogue.priceBoard, {
      city: "Bengaluru",
    });
    expect(board.rows.every((row) => row.series.length === 30)).toBe(true);
    for (const source of ["fallback", "market"] as const) {
      const compact = await t.query(api.catalogue.priceQuotes, {
        city: "Bengaluru",
        source,
      });
      expect(compact.rows).toEqual(
        board.rows.map((row) => ({
          code: row.code,
          paisePerKg:
            source === "fallback" ? row.fallbackPaise : row.todayPaise,
        })),
      );
      expect(
        new TextEncoder().encode(JSON.stringify(compact)).length,
      ).toBeLessThan(
        new TextEncoder().encode(JSON.stringify(board)).length / 10,
      );
    }
  });

  it("keeps missing and stale quotes null and reads fresh admin changes", async () => {
    const t = convexTest(schema, modules);
    const referenceId = await t.run(async (ctx) => {
      for (const [code, active] of [
        ["PAPER-NEWS", true],
        ["CUSTOM-MATERIAL", true],
        ["INACTIVE", false],
      ] as const) {
        await ctx.db.insert("materials", {
          code,
          family: "paper",
          stage: "scrap",
          names: { en: code },
          co2eFactor: 1,
          active,
          sortOrder: 1,
        });
      }
      await ctx.db.insert("marketPrices", {
        city: "Bengaluru",
        materialCode: "PAPER-NEWS",
        date: shiftDate(indiaToday(), -30),
        paisePerKg: 2200,
      });
      return ctx.db.insert("referencePrices", {
        city: "Bengaluru",
        materialCode: "PAPER-NEWS",
        floorPaise: 1000,
        fallbackPaise: 1400,
        updatedAt: Date.now(),
      });
    });
    const args = { city: "Bengaluru", source: "fallback" } as const;
    const before = await t.query(api.catalogue.priceQuotes, args);
    expect(before.rows).toEqual([
      { code: "PAPER-NEWS", paisePerKg: 1400 },
      { code: "CUSTOM-MATERIAL", paisePerKg: null },
    ]);
    await t.run((ctx) => ctx.db.patch(referenceId, { fallbackPaise: 1700 }));
    const after = await t.query(api.catalogue.priceQuotes, args);
    expect(after.rows[0]).toEqual({
      code: "PAPER-NEWS",
      paisePerKg: 1700,
    });
    for (const request of [
      { city: "Bengaluru", source: "market" },
      { city: "Chennai", source: "fallback" },
    ] as const) {
      const missing = await t.query(api.catalogue.priceQuotes, request);
      expect(missing.rows.every((row) => row.paisePerKg === null)).toBe(true);
    }
  });
});
