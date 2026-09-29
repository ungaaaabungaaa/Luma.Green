/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import { paiseFor } from "./lib/chain";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

// Demo logins (convex/lib/demo.ts).
const SHOP = "+919000000101"; // Ramesh Kabadi Store — kabadiwala
const YARD = "+919000000102"; // Peenya Paper & Plastic Yard
const RECYCLER = "+919000000103"; // GreenLoop Polymers
const MAKER = "+919000000104"; // Deccan Packaging — manufacturer
const SAATHI = "+919000000105";

const RAMESH = "Ramesh Kabadi Store";
const PEENYA = "Peenya Paper & Plastic Yard";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function demoWorld() {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  return t;
}

type Test = Awaited<ReturnType<typeof demoWorld>>;
type Session = Awaited<ReturnType<typeof signInAs>>;

/** Sets a business's stock of one material, as if it sold some elsewhere. */
async function setStock(t: Test, slug: string, code: string, grams: number) {
  await t.run(async (ctx) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!org) throw new Error(`No org ${slug}`);
    const row = await ctx.db
      .query("inventory")
      .withIndex("by_org_material", (q) =>
        q.eq("orgId", org._id).eq("materialCode", code),
      )
      .first();
    if (!row) throw new Error(`No ${code} stock for ${slug}`);
    await ctx.db.patch("inventory", row._id, { grams });
  });
}

async function stockOf(t: Test, slug: string, code: string) {
  return t.run(async (ctx) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!org) throw new Error(`No org ${slug}`);
    const row = await ctx.db
      .query("inventory")
      .withIndex("by_org_material", (q) =>
        q.eq("orgId", org._id).eq("materialCode", code),
      )
      .first();
    return row?.grams ?? 0;
  });
}

async function lotOf(as: Session, seller: string, code: string) {
  const lots = await as.query(api.market.browse, { materialCode: code });
  const lot = lots.find((candidate) => candidate.seller.name === seller);
  if (!lot) throw new Error(`No ${code} lot from ${seller}`);
  return lot;
}

async function lotIds(as: Session, materialCode?: string) {
  const lots = await as.query(api.market.browse, { materialCode });
  return lots.map((lot) => lot.id);
}

async function tradeOf(
  as: Session,
  side: "buying" | "selling",
  id: Id<"trades">,
) {
  const trades = await as.query(api.market.trades, {});
  const trade = trades[side].find((candidate) => candidate.id === id);
  if (!trade) throw new Error(`Trade ${id} not in ${side}`);
  return trade;
}

async function auditActions(t: Test, entityTable: string, id: string) {
  return t.run(async (ctx) => {
    const rows = await ctx.db
      .query("auditLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityTable", entityTable).eq("entityId", id),
      )
      .collect();
    return rows.map((row) => row.action);
  });
}

describe("browse", () => {
  it("shows each buyer the tier below it, never its own lots", async () => {
    const t = await demoWorld();

    const yard = await signInAs(t, YARD);
    const forYard = await yard.query(api.market.browse, {});
    expect(forYard.length).toBeGreaterThan(0);
    expect(new Set(forYard.map((lot) => lot.seller.kind))).toEqual(
      new Set(["kabadiwala"]),
    );
    expect(forYard.some((lot) => lot.isMine)).toBe(false);
    expect(forYard.map((lot) => lot.seller.name)).toContain(RAMESH);

    const recycler = await signInAs(t, RECYCLER);
    const forRecycler = await recycler.query(api.market.browse, {});
    expect(new Set(forRecycler.map((lot) => lot.seller.kind))).toEqual(
      new Set(["yard"]),
    );
    expect(forRecycler.map((lot) => lot.seller.name)).toContain(PEENYA);

    const maker = await signInAs(t, MAKER);
    const forMaker = await maker.query(api.market.browse, {});
    expect(new Set(forMaker.map((lot) => lot.seller.kind))).toEqual(
      new Set(["recycler"]),
    );
    expect(forMaker.map((lot) => lot.material.code)).toContain(
      "RECYCLED-PET-FLAKE",
    );
  });

  it("filters by material", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const paper = await yard.query(api.market.browse, {
      materialCode: "PAPER-NEWS",
    });
    expect(paper.length).toBeGreaterThan(0);
    expect(paper.every((lot) => lot.material.code === "PAPER-NEWS")).toBe(true);
    expect(paper.find((lot) => lot.seller.name === RAMESH)).toMatchObject({
      grams: 150_000,
      note: "Dry, bundled",
      status: "open",
    });
  });

  it("leaves out lots in other cities", async () => {
    const t = await demoWorld();
    await t.run(async (ctx) => {
      const now = Date.now();
      const orgId = await ctx.db.insert("orgs", {
        kind: "kabadiwala",
        name: "Mysuru Scrap",
        slug: "mysuru-scrap",
        status: "active",
        city: "Mysuru",
        area: "Vijayanagar",
        address: "Vijayanagar, Mysuru",
        phones: [],
        weeklyOff: [],
        families: ["paper"],
        offersPickup: false,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("listings", {
        orgId,
        sellerKind: "kabadiwala",
        materialCode: "PAPER-NEWS",
        grams: 50_000,
        askPaisePerKg: 1700,
        city: "Mysuru",
        status: "open",
        createdAt: now,
        updatedAt: now,
      });
    });
    const yard = await signInAs(t, YARD);
    const lots = await yard.query(api.market.browse, {});
    expect(lots.map((lot) => lot.seller.name)).not.toContain("Mysuru Scrap");
  });

  it("is for businesses that buy, signed in", async () => {
    const t = await demoWorld();
    await expect(t.query(api.market.browse, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const shop = await signInAs(t, SHOP);
    await expect(shop.query(api.market.browse, {})).rejects.toThrow(
      /WRONG_ROLE/,
    );
    const saathi = await signInAs(t, SAATHI);
    await expect(saathi.query(api.market.browse, {})).rejects.toThrow(
      /NO_BUSINESS/,
    );
  });
});

describe("a trade from request to delivery", () => {
  it("moves a lot from a kabadiwala to a yard, step by step", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const shop = await signInAs(t, SHOP);
    const lot = await lotOf(yard, RAMESH, "PAPER-NEWS");
    const shopStock = await stockOf(t, "ramesh-kabadi-store", "PAPER-NEWS");
    const yardStock = await stockOf(
      t,
      "peenya-paper-plastic-yard",
      "PAPER-NEWS",
    );

    // 1. The yard asks for 100 kg at the asking price.
    const tradeId = await yard.mutation(api.market.requestTrade, {
      listingId: lot.id,
      grams: 100_000,
    });
    const requested = await tradeOf(shop, "selling", tradeId);
    expect(requested).toMatchObject({
      status: "requested",
      grams: 100_000,
      paisePerKg: lot.askPaisePerKg,
      totalPaise: paiseFor(100_000, lot.askPaisePerKg),
      counterparty: { name: PEENYA, kind: "yard" },
      actions: ["accept", "decline"],
      inEscrow: false,
    });
    const asked = await tradeOf(yard, "buying", tradeId);
    expect(asked).toMatchObject({
      counterparty: { name: RAMESH, kind: "kabadiwala" },
      actions: [],
    });

    // 2. The kabadiwala accepts: the lot shrinks, nothing is paid yet.
    await shop.mutation(api.market.act, { tradeId, action: "accept" });
    const shrunk = await lotOf(yard, RAMESH, "PAPER-NEWS");
    expect(shrunk.grams).toBe(50_000);
    const accepted = await tradeOf(yard, "buying", tradeId);
    expect(accepted.actions).toEqual(["pay"]);

    // 3. The yard pays into escrow, which issues the receipt number.
    const paid = await yard.mutation(api.market.act, {
      tradeId,
      action: "pay",
    });
    expect(paid.status).toBe("paid_to_escrow");
    expect(paid.invoiceNo).toMatch(/^LG-\d{2}-\d{4}$/);
    const seededNumbers = await t.run(async (ctx) => {
      const trades = await ctx.db.query("trades").collect();
      return trades.flatMap((trade) =>
        trade._id !== tradeId && trade.invoiceNo ? [trade.invoiceNo] : [],
      );
    });
    expect(seededNumbers.length).toBeGreaterThan(0);
    expect(seededNumbers).not.toContain(paid.invoiceNo);
    expect(await tradeOf(shop, "selling", tradeId)).toMatchObject({
      inEscrow: true,
      invoiceNo: paid.invoiceNo,
      actions: ["dispatch"],
    });

    // 4. The kabadiwala dispatches: the load leaves the shop's stock.
    await shop.mutation(api.market.act, { tradeId, action: "dispatch" });
    expect(await stockOf(t, "ramesh-kabadi-store", "PAPER-NEWS")).toBe(
      shopStock - 100_000,
    );
    expect(await stockOf(t, "peenya-paper-plastic-yard", "PAPER-NEWS")).toBe(
      yardStock,
    );

    // 5. The yard confirms delivery: stock arrives, escrow is released.
    const done = await yard.mutation(api.market.act, {
      tradeId,
      action: "confirm",
    });
    expect(done).toEqual({ status: "completed", invoiceNo: paid.invoiceNo });
    expect(await stockOf(t, "peenya-paper-plastic-yard", "PAPER-NEWS")).toBe(
      yardStock + 100_000,
    );
    const completed = await tradeOf(yard, "buying", tradeId);
    expect(completed).toMatchObject({ inEscrow: false, actions: [] });
    expect(completed.timeline.map((entry) => entry.status)).toEqual([
      "requested",
      "accepted",
      "paid_to_escrow",
      "dispatched",
      "completed",
    ]);

    expect(await auditActions(t, "trades", tradeId)).toEqual([
      "trade.requested",
      "trade.accepted",
      "trade.paid_to_escrow",
      "trade.dispatched",
      "trade.completed",
    ]);
  });

  it("sells a lot out, then declines the requests still waiting", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const shop = await signInAs(t, SHOP);
    const lot = await lotOf(yard, RAMESH, "PAPER-NEWS"); // 150 kg

    const request = (grams: number) =>
      yard.mutation(api.market.requestTrade, { listingId: lot.id, grams });
    const first = await request(100_000);
    const tooBig = await request(100_000);
    const small = await request(30_000);

    await shop.mutation(api.market.act, { tradeId: first, action: "accept" });
    // Only 50 kg left: the second 100 kg can't be accepted.
    await expect(
      shop.mutation(api.market.act, { tradeId: tooBig, action: "accept" }),
    ).rejects.toThrow(/NOT_ENOUGH_LEFT/);

    const rest = await request(50_000);
    await shop.mutation(api.market.act, { tradeId: rest, action: "accept" });

    const mine = await shop.query(api.market.myListings, {});
    expect(mine.find((listing) => listing.id === lot.id)).toMatchObject({
      status: "sold",
      grams: 0,
    });
    const { selling } = await shop.query(api.market.trades, {});
    for (const id of [tooBig, small]) {
      expect(selling.find((trade) => trade.id === id)?.status).toBe("declined");
      expect(await auditActions(t, "trades", id)).toEqual([
        "trade.requested",
        "trade.declined",
      ]);
    }
    // The request that sold the lot out is accepted, and only accepted.
    expect(selling.find((trade) => trade.id === rest)?.status).toBe("accepted");
    expect(await auditActions(t, "trades", rest)).toEqual([
      "trade.requested",
      "trade.accepted",
    ]);
    expect(await lotIds(yard, "PAPER-NEWS")).not.toContain(lot.id);
  });

  it("lets a seller decline a request", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const shop = await signInAs(t, SHOP);
    const lot = await lotOf(yard, RAMESH, "METAL-IRON");
    const tradeId = await yard.mutation(api.market.requestTrade, {
      listingId: lot.id,
      grams: 20_000,
    });
    await shop.mutation(api.market.act, { tradeId, action: "decline" });
    expect(await tradeOf(yard, "buying", tradeId)).toMatchObject({
      status: "declined",
      actions: [],
    });
    // Declining leaves the lot as it was.
    const after = await lotOf(yard, RAMESH, "METAL-IRON");
    expect(after.grams).toBe(lot.grams);
  });
});

describe("act refuses", () => {
  it("steps out of turn, by the wrong side", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const shop = await signInAs(t, SHOP);
    const lot = await lotOf(yard, RAMESH, "PAPER-NEWS");
    const tradeId = await yard.mutation(api.market.requestTrade, {
      listingId: lot.id,
      grams: 10_000,
    });

    // The buyer can't accept their own request, nor pay before acceptance.
    await expect(
      yard.mutation(api.market.act, { tradeId, action: "accept" }),
    ).rejects.toThrow(/WRONG_STEP/);
    await expect(
      yard.mutation(api.market.act, { tradeId, action: "pay" }),
    ).rejects.toThrow(/WRONG_STEP/);

    await shop.mutation(api.market.act, { tradeId, action: "accept" });
    // The seller can't pay, and can't dispatch before the money is in.
    await expect(
      shop.mutation(api.market.act, { tradeId, action: "pay" }),
    ).rejects.toThrow(/WRONG_STEP/);
    await expect(
      shop.mutation(api.market.act, { tradeId, action: "dispatch" }),
    ).rejects.toThrow(/WRONG_STEP/);

    await yard.mutation(api.market.act, { tradeId, action: "pay" });
    // No paying twice, and no confirming before dispatch.
    await expect(
      yard.mutation(api.market.act, { tradeId, action: "pay" }),
    ).rejects.toThrow(/WRONG_STEP/);
    await expect(
      yard.mutation(api.market.act, { tradeId, action: "confirm" }),
    ).rejects.toThrow(/WRONG_STEP/);
    const trade = await tradeOf(yard, "buying", tradeId);
    expect(trade.status).toBe("paid_to_escrow");
  });

  it("someone else's trade, and anyone signed out", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { buying } = await yard.query(api.market.trades, {});
    const tradeId = buying[0].id;

    const maker = await signInAs(t, MAKER);
    await expect(
      maker.mutation(api.market.act, { tradeId, action: "confirm" }),
    ).rejects.toThrow(/NOT_FOUND/);
    await expect(
      t.mutation(api.market.act, { tradeId, action: "confirm" }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });

  it("a dispatch bigger than the seller's stock", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    // Seeded: 180 kg of cartons paid into escrow. The shop then sold most
    // of its cartons elsewhere and holds only 95 kg.
    await setStock(t, "ramesh-kabadi-store", "PAPER-CARTON", 95_000);
    const { selling } = await shop.query(api.market.trades, {});
    const cartons = selling.find(
      (trade) =>
        trade.material.code === "PAPER-CARTON" &&
        trade.status === "paid_to_escrow",
    );
    expect(cartons?.actions).toEqual(["dispatch"]);
    const before = await stockOf(t, "ramesh-kabadi-store", "PAPER-CARTON");
    expect(before).toBeLessThan(cartons?.grams ?? 0);

    await expect(
      shop.mutation(api.market.act, {
        tradeId: cartons?.id as Id<"trades">,
        action: "dispatch",
      }),
    ).rejects.toThrow(/NOT_ENOUGH_STOCK/);
    expect(await stockOf(t, "ramesh-kabadi-store", "PAPER-CARTON")).toBe(
      before,
    );
  });
});

describe("requestTrade refuses", () => {
  it("the wrong tier, too much, too little, and closed lots", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const shop = await signInAs(t, SHOP);
    const lot = await lotOf(yard, RAMESH, "PAPER-NEWS");

    // A recycler buys from yards, not straight from a kabadiwala.
    const recycler = await signInAs(t, RECYCLER);
    await expect(
      recycler.mutation(api.market.requestTrade, {
        listingId: lot.id,
        grams: 10_000,
      }),
    ).rejects.toThrow(/WRONG_ROLE/);
    // Kabadiwalas sell on the market; they don't buy there.
    await expect(
      shop.mutation(api.market.requestTrade, {
        listingId: lot.id,
        grams: 10_000,
      }),
    ).rejects.toThrow(/WRONG_ROLE/);

    await expect(
      yard.mutation(api.market.requestTrade, {
        listingId: lot.id,
        grams: lot.grams + 1,
      }),
    ).rejects.toThrow(/NOT_ENOUGH_LEFT/);
    for (const grams of [0, -1000, 1.5]) {
      await expect(
        yard.mutation(api.market.requestTrade, { listingId: lot.id, grams }),
      ).rejects.toThrow(/INVALID_WEIGHT/);
    }

    await shop.mutation(api.market.withdraw, { listingId: lot.id });
    await expect(
      yard.mutation(api.market.requestTrade, {
        listingId: lot.id,
        grams: 10_000,
      }),
    ).rejects.toThrow(/LISTING_NOT_OPEN/);

    await expect(
      t.mutation(api.market.requestTrade, {
        listingId: lot.id,
        grams: 10_000,
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });
});

describe("selling", () => {
  it("offers only stock that isn't already listed or sold", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    const sellable = await shop.query(api.market.sellable, {});
    const byCode = new Map(sellable.map((item) => [item.material.code, item]));
    // 180 kg of newspaper, 150 kg of it already on the market.
    expect(byCode.get("PAPER-NEWS")).toMatchObject({
      stage: "scrap",
      stockGrams: 180_000,
      availableGrams: 30_000,
    });
    // 300 kg of cartons, 180 kg of them promised to a paid trade.
    expect(byCode.get("PAPER-CARTON")?.availableGrams).toBe(120_000);
    expect(byCode.get("PLASTIC-PET")?.availableGrams).toBe(42_000);

    await expect(
      shop.mutation(api.market.createListing, {
        materialCode: "PAPER-NEWS",
        grams: 30_001,
        askPaisePerKg: 1800,
      }),
    ).rejects.toThrow(/NOT_ENOUGH_STOCK/);

    const listingId = await shop.mutation(api.market.createListing, {
      materialCode: "PAPER-NEWS",
      grams: 30_000,
      askPaisePerKg: 1800,
      note: "  Fresh bundles  ",
    });
    const [newest] = await shop.query(api.market.myListings, {});
    expect(newest).toMatchObject({
      id: listingId,
      status: "open",
      grams: 30_000,
      askPaisePerKg: 1800,
      note: "Fresh bundles",
      isMine: true,
    });
    const after = await shop.query(api.market.sellable, {});
    const newspaper = after.find((item) => item.material.code === "PAPER-NEWS");
    expect(newspaper?.availableGrams).toBe(0);
    expect(await auditActions(t, "listings", listingId)).toEqual([
      "listing.created",
    ]);

    // Yards see it straight away.
    const yard = await signInAs(t, YARD);
    expect(await lotIds(yard, "PAPER-NEWS")).toContain(listingId);
  });

  it("lists open lots first", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    const mine = await shop.query(api.market.myListings, {});
    const firstClosed = mine.findIndex((listing) => listing.status !== "open");
    expect(firstClosed).toBeGreaterThan(0);
    expect(
      mine.slice(firstClosed).every((listing) => listing.status !== "open"),
    ).toBe(true);
  });

  it("checks every field", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    const lot = {
      materialCode: "PLASTIC-PET",
      grams: 10_000,
      askPaisePerKg: 2500,
    };
    const cases = [
      [{ ...lot, grams: 0 }, /INVALID_WEIGHT/],
      [{ ...lot, grams: 10.5 }, /INVALID_WEIGHT/],
      [{ ...lot, askPaisePerKg: 0 }, /INVALID_PRICE/],
      [{ ...lot, askPaisePerKg: 2500.5 }, /INVALID_PRICE/],
      [{ ...lot, note: "x".repeat(141) }, /NOTE_TOO_LONG/],
      [{ ...lot, materialCode: "GOLD" }, /UNKNOWN_MATERIAL/],
      // Glass is a real material, but none is in stock here.
      [{ ...lot, materialCode: "GLASS-BOTTLE" }, /NOT_ENOUGH_STOCK/],
    ] as const;
    for (const [args, error] of cases) {
      await expect(
        shop.mutation(api.market.createListing, args),
      ).rejects.toThrow(error);
    }
    const id = await shop.mutation(api.market.createListing, {
      ...lot,
      note: "x".repeat(140),
    });
    expect(id).toBeTruthy();
  });

  it("is for businesses someone buys from", async () => {
    const t = await demoWorld();
    const maker = await signInAs(t, MAKER);
    await expect(
      maker.mutation(api.market.createListing, {
        materialCode: "RECYCLED-KRAFT",
        grams: 1000,
        askPaisePerKg: 3800,
      }),
    ).rejects.toThrow(/WRONG_ROLE/);
    await expect(maker.query(api.market.myListings, {})).rejects.toThrow(
      /WRONG_ROLE/,
    );
    await expect(maker.query(api.market.sellable, {})).rejects.toThrow(
      /WRONG_ROLE/,
    );
    await expect(
      t.mutation(api.market.createListing, {
        materialCode: "PAPER-NEWS",
        grams: 1000,
        askPaisePerKg: 1800,
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });

  it("withdraws only my own open lots, declining waiting requests", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const shop = await signInAs(t, SHOP);
    const lot = await lotOf(yard, RAMESH, "METAL-IRON");
    const tradeId = await yard.mutation(api.market.requestTrade, {
      listingId: lot.id,
      grams: 50_000,
    });

    await expect(
      yard.mutation(api.market.withdraw, { listingId: lot.id }),
    ).rejects.toThrow(/NOT_FOUND/);

    await shop.mutation(api.market.withdraw, { listingId: lot.id });
    const declined = await tradeOf(yard, "buying", tradeId);
    expect(declined.status).toBe("declined");
    expect(await lotIds(yard)).not.toContain(lot.id);

    await expect(
      shop.mutation(api.market.withdraw, { listingId: lot.id }),
    ).rejects.toThrow(/LISTING_NOT_OPEN/);
    expect(await auditActions(t, "listings", lot.id)).toEqual([
      "listing.withdrawn",
    ]);
  });
});

describe("trades", () => {
  it("shows each side its own trades with the steps open to it", async () => {
    const t = await demoWorld();
    const recycler = await signInAs(t, RECYCLER);
    const { buying, selling } = await recycler.query(api.market.trades, {});
    // Seeded: 2,000 kg of PET dispatched by the yard, waiting for delivery.
    const pet = buying.find((trade) => trade.status === "dispatched");
    expect(pet).toMatchObject({
      material: { code: "PLASTIC-PET", family: "plastic" },
      counterparty: { name: PEENYA, kind: "yard" },
      actions: ["confirm"],
      inEscrow: true,
      needsEwayBill: true,
    });
    // Seeded: 5,000 kg of flakes paid for by the manufacturer.
    expect(
      selling.find((trade) => trade.status === "paid_to_escrow"),
    ).toMatchObject({
      material: { code: "RECYCLED-PET-FLAKE" },
      actions: ["dispatch"],
    });

    const maker = await signInAs(t, MAKER);
    const forMaker = await maker.query(api.market.trades, {});
    expect(forMaker.selling).toEqual([]);
    expect(forMaker.buying.length).toBeGreaterThan(0);

    const saathi = await signInAs(t, SAATHI);
    await expect(saathi.query(api.market.trades, {})).rejects.toThrow(
      /NO_BUSINESS/,
    );
    await expect(t.query(api.market.trades, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
  });
});

describe("receipt", () => {
  it("shows both businesses to either side, and nobody else", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { buying } = await yard.query(api.market.trades, {});
    const completed = buying.find((trade) => trade.status === "completed");
    const tradeId = completed?.id as Id<"trades">;

    const receipt = await yard.query(api.market.receipt, { tradeId });
    expect(receipt).toMatchObject({
      number: completed?.invoiceNo,
      side: "buyer",
      status: "completed",
      seller: { name: RAMESH, kind: "kabadiwala" },
      buyer: { name: PEENYA, kind: "yard", gstin: "29ABCPE1234F1Z5" },
      line: {
        material: { code: "PAPER-NEWS" },
        grams: 400_000,
        paise: completed?.totalPaise,
      },
      totalPaise: completed?.totalPaise,
      inEscrow: false,
    });
    expect(receipt?.issuedAt).toBeTypeOf("number");
    expect(receipt?.releasedAt).toBeTypeOf("number");
    expect(receipt?.seller.address).toContain("Yeshwanthpur");

    const shop = await signInAs(t, SHOP);
    expect(await shop.query(api.market.receipt, { tradeId })).toMatchObject({
      side: "seller",
      number: completed?.invoiceNo,
    });

    const maker = await signInAs(t, MAKER);
    expect(await maker.query(api.market.receipt, { tradeId })).toBeNull();
    expect(
      await yard.query(api.market.receipt, { tradeId: "not-an-id" }),
    ).toBeNull();
    await expect(t.query(api.market.receipt, { tradeId })).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
  });

  it("has no number until the buyer pays", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { buying } = await yard.query(api.market.trades, {});
    const requested = buying.find((trade) => trade.status === "requested");
    const receipt = await yard.query(api.market.receipt, {
      tradeId: requested?.id as Id<"trades">,
    });
    expect(receipt).toMatchObject({ number: null, issuedAt: null });
  });
});
