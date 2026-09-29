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
import { paiseFor } from "./lib/chain";
import { indiaToday } from "./lib/onboarding";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

async function demoWorld() {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  return t;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("stock.mine", () => {
  it("values a shop's stock at today's market price, and adds it up", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, "+919000000101");

    const stock = await shop.query(api.stock.mine, {});

    expect(stock.kind).toBe("kabadiwala");
    expect(stock.buyerKind).toBe("yard");
    expect(
      Object.fromEntries(
        stock.rows.map((row) => [row.material.code, row.grams]),
      ),
    ).toEqual({
      "PAPER-NEWS": 180_000,
      "PAPER-CARTON": 300_000,
      "PLASTIC-PET": 42_000,
      "METAL-IRON": 260_000,
      "METAL-ALU-CAN": 12_000,
    });
    const today = indiaToday();
    const todays = await t.run(async (ctx) => {
      const rows = await ctx.db.query("marketPrices").collect();
      return rows
        .filter((row) => row.date === today && row.city === "Bengaluru")
        .map((row) => ({ code: row.materialCode, paise: row.paisePerKg }));
    });
    const prices = new Map(todays.map((price) => [price.code, price.paise]));
    for (const row of stock.rows) {
      expect(row.marketPaise).toBe(prices.get(row.material.code));
      expect(row.valuePaise).toBe(
        paiseFor(row.grams, prices.get(row.material.code) ?? 0),
      );
    }
    expect(stock.totalGrams).toBe(794_000);
    expect(stock.totalValuePaise).toBe(
      stock.rows.reduce((sum, row) => sum + (row.valuePaise ?? 0), 0),
    );
    // Most valuable first.
    const values = stock.rows.map((row) => row.valuePaise ?? 0);
    expect(values).toEqual(values.toSorted((a, b) => b - a));
  });

  it("works for every kind of business, each seeing only its own", async () => {
    const t = await demoWorld();

    const farida = await signInAs(t, "+919000000102");
    const yard = await farida.query(api.stock.mine, {});
    expect(yard.buyerKind).toBe("recycler");
    expect(yard.totalGrams).toBe(13_400_000);

    const suresh = await signInAs(t, "+919000000103");
    const recycler = await suresh.query(api.stock.mine, {});
    expect(recycler.buyerKind).toBe("manufacturer");
    expect(new Set(recycler.rows.map((row) => row.stage))).toEqual(
      new Set(["scrap", "recycled"]),
    );

    const anita = await signInAs(t, "+919000000104");
    const factory = await anita.query(api.stock.mine, {});
    expect(factory.kind).toBe("manufacturer");
    expect(factory.buyerKind).toBeNull();
    const codes = factory.rows.map((row) => row.material.code);
    expect(codes.toSorted((a, b) => a.localeCompare(b))).toEqual([
      "RECYCLED-KRAFT",
      "RECYCLED-PET-FLAKE",
    ]);
  });

  it("leaves out what has run out", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, "+919000000101");
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("inventory").collect();
      const cans = rows.find((row) => row.materialCode === "METAL-ALU-CAN");
      if (cans) await ctx.db.patch("inventory", cans._id, { grams: 0 });
    });

    const stock = await shop.query(api.stock.mine, {});

    expect(stock.rows.map((row) => row.material.code)).not.toContain(
      "METAL-ALU-CAN",
    );
    expect(stock.totalGrams).toBe(782_000);
  });

  it("refuses people without a business", async () => {
    const t = await demoWorld();
    await expect(t.query(api.stock.mine, {})).rejects.toThrow(/NOT_SIGNED_IN/);
    for (const phone of ["+919000000105", "+919000000107", "+919000000109"]) {
      const person = await signInAs(t, phone);
      await expect(person.query(api.stock.mine, {})).rejects.toThrow(
        /NO_BUSINESS/,
      );
    }
  });
});
