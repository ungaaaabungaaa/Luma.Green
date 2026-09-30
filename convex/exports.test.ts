/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  cleanDocument,
  eprFor,
  FIELDS_BY_SIDE,
  periodRange,
  streamFor,
  taxFor,
} from "./exports";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import { indiaToday } from "./lib/onboarding";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

// Demo logins (convex/lib/demo.ts).
const SHOP = "+919000000101"; // Ramesh Kabadi Store — kabadiwala, no GSTIN
const YARD = "+919000000102"; // Peenya Paper & Plastic Yard — GST-registered
const RECYCLER = "+919000000103"; // GreenLoop Polymers
const MAKER = "+919000000104"; // Deccan Packaging — manufacturer
const SAATHI = "+919000000105";

const RAMESH = "Ramesh Kabadi Store";
const PEENYA = "Peenya Paper & Plastic Yard";
const PEENYA_GSTIN = "29ABCPE1234F1Z5";
const GREENLOOP = "GreenLoop Polymers";
const GREENLOOP_GSTIN = "29AAGCG4321L1Z8";

// Demo trades (DEMO_TRADES): receipt numbers follow the list order.
const PAPER_TRADE = "LG-26-0001"; // Ramesh → Peenya, 400 kg newspaper, delivered
const HDPE_TRADE = "LG-26-0005"; // Peenya → GreenLoop, 800 kg HDPE, delivered
const PET_TRADE = "LG-26-0004"; // Peenya → GreenLoop, 2 t PET, dispatched
const FLAKE_TRADE = "LG-26-0006"; // GreenLoop → Deccan, 5 t flake, in escrow

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

async function tradeByReceipt(
  t: Test,
  receipt: string,
): Promise<Doc<"trades">> {
  return t.run(async (ctx) => {
    const trades = await ctx.db.query("trades").collect();
    const trade = trades.find((candidate) => candidate.invoiceNo === receipt);
    if (!trade) throw new Error(`No trade ${receipt}`);
    return trade;
  });
}

async function orgBySlug(t: Test, slug: string): Promise<Doc<"orgs">> {
  return t.run(async (ctx) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!org) throw new Error(`No org ${slug}`);
    return org;
  });
}

function stepAt(trade: Doc<"trades">, status: Doc<"trades">["status"]) {
  const at = trade.timeline.find((entry) => entry.status === status)?.at;
  if (at === undefined)
    throw new Error(`${trade.invoiceNo ?? ""} never ${status}`);
  return at;
}

/** The calendar month (India time) a moment falls in, as a period. */
function monthOf(at: number): string {
  return indiaToday(at).slice(0, 7);
}

/** The Indian financial-year quarter a moment falls in, as a period. */
function quarterOf(at: number): string {
  const [year, month] = indiaToday(at).split("-").map(Number);
  const fy = month >= 4 ? year : year - 1;
  const quarter = Math.floor(((month + 8) % 12) / 3) + 1;
  return `${String(fy)}-Q${String(quarter)}`;
}

function rowsOf(report: {
  columns: string[];
  rows: (string | number | null)[][];
}): Record<string, string | number | null>[] {
  return report.rows.map((row) =>
    Object.fromEntries(
      report.columns.map((column, index) => [column, row[index]]),
    ),
  );
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

// --- Pure rules -------------------------------------------------------------------

describe("periodRange", () => {
  it("reads a calendar month in India time", () => {
    const range = periodRange("2026-09");
    expect(range).toMatchObject({ kind: "month", label: "2026-09" });
    expect(range?.start).toBe(Date.parse("2026-09-01T00:00:00+05:30"));
    expect(range?.end).toBe(Date.parse("2026-10-01T00:00:00+05:30"));
  });

  it("reads a financial-year quarter, so Q4 of 2026 is January to March 2027", () => {
    const range = periodRange("2026-Q4");
    expect(range).toMatchObject({ kind: "quarter", label: "FY 2026-27 Q4" });
    expect(range?.start).toBe(Date.parse("2027-01-01T00:00:00+05:30"));
    expect(range?.end).toBe(Date.parse("2027-04-01T00:00:00+05:30"));
    expect(periodRange("2026-Q1")?.start).toBe(
      Date.parse("2026-04-01T00:00:00+05:30"),
    );
  });

  it("rejects anything that isn't a period", () => {
    expect(periodRange("2026-13")).toBeNull();
    expect(periodRange("2026-Q5")).toBeNull();
    expect(periodRange("26-09")).toBeNull();
    expect(periodRange("")).toBeNull();
  });
});

describe("cleanDocument", () => {
  it("normalises what people type", () => {
    expect(cleanDocument("ewayBillNo", " 1234-5678 9012 ")).toBe(
      "123456789012",
    );
    expect(cleanDocument("vehicleNo", "ka-05 mj 4477")).toBe("KA05MJ4477");
    expect(cleanDocument("vehicleNo", "22BH1234AB")).toBe("22BH1234AB");
    expect(cleanDocument("driverPhone", "98450 00301")).toBe("+919845000301");
    expect(cleanDocument("irn", "A".repeat(64))).toBe("a".repeat(64));
    expect(cleanDocument("poNumber", "  PO/PPPY/26-27/003 ")).toBe(
      "PO/PPPY/26-27/003",
    );
  });

  it("treats a blank as clearing the field", () => {
    expect(cleanDocument("poNumber", " ".repeat(3))).toBeUndefined();
    expect(cleanDocument("notes", "")).toBeUndefined();
  });

  it("refuses shapes the portals would reject", () => {
    expect(() => cleanDocument("ewayBillNo", "12345")).toThrow(
      /INVALID_EWAY_BILL/,
    );
    expect(() => cleanDocument("irn", "not-hex")).toThrow(/INVALID_IRN/);
    expect(() => cleanDocument("vehicleNo", "1234")).toThrow(/INVALID_VEHICLE/);
    expect(() => cleanDocument("driverPhone", "12345")).toThrow(
      /INVALID_PHONE/,
    );
    expect(() => cleanDocument("notes", "x".repeat(281))).toThrow(/TOO_LONG/);
    expect(() => cleanDocument("grnNumber", "x".repeat(41))).toThrow(
      /TOO_LONG/,
    );
  });
});

describe("tax and EPR reference data", () => {
  it("knows the indicative heading and rate for each material", async () => {
    expect(taxFor(undefined, "METAL-COPPER")).toEqual({
      hsn: "7404",
      gstRate: 18,
    });
    expect(taxFor(undefined, "PAPER-NEWS")).toEqual({
      hsn: "6310",
      gstRate: 5,
    });
    const t = await demoWorld();
    const newspaper = await t.run(async (ctx) => {
      const material = await ctx.db
        .query("materials")
        .withIndex("by_code", (q) => q.eq("code", "PAPER-NEWS"))
        .unique();
      if (!material) throw new Error("No newspaper");
      return material;
    });
    expect(taxFor(newspaper, "PAPER-NEWS")).toEqual({
      hsn: "4707",
      gstRate: 5,
    });
    // A heading the catalogue supplies wins, and sets the rate by chapter.
    expect(taxFor({ ...newspaper, hsn: "39011010" }, "PAPER-NEWS")).toEqual({
      hsn: "39011010",
      gstRate: 18,
    });
    expect(eprFor(newspaper, "PAPER-NEWS").regime).toBe("Not an EPR stream");
    expect(
      eprFor({ ...newspaper, eprCategory: "Cat III" }, "PAPER-NEWS"),
    ).toEqual({ regime: "Not an EPR stream", category: "Cat III" });
  });

  it("maps plastics to the packaging regime and e-waste to its own", () => {
    expect(eprFor(undefined, "PLASTIC-PET")).toEqual({
      regime: "Plastic packaging",
      category: "Cat I (rigid)",
    });
    expect(eprFor(undefined, "PLASTIC-LDPE").category).toBe(
      "Cat II (flexible)",
    );
    expect(streamFor("ewaste")).toMatch(/Special care/);
    expect(streamFor("paper")).toBe("Dry");
  });

  it("gives each side its own fields, with the e-way bill on both", () => {
    expect(FIELDS_BY_SIDE.buyer).toContain("poNumber");
    expect(FIELDS_BY_SIDE.buyer).not.toContain("irn");
    expect(FIELDS_BY_SIDE.seller).toContain("vehicleNo");
    expect(FIELDS_BY_SIDE.seller).not.toContain("grnNumber");
    expect(FIELDS_BY_SIDE.buyer).toContain("ewayBillNo");
    expect(FIELDS_BY_SIDE.seller).toContain("ewayBillNo");
  });
});

// --- Document packs -----------------------------------------------------------------

describe("documents", () => {
  it("shows each side the pack with its own fields marked editable", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);

    const yard = await signInAs(t, YARD);
    const asBuyer = await yard.query(api.exports.documents, {
      tradeId: trade._id,
    });
    expect(asBuyer).not.toBeNull();
    expect(asBuyer?.side).toBe("buyer");
    expect(asBuyer?.seller.name).toBe(RAMESH);
    expect(asBuyer?.buyer.gstin).toBe(PEENYA_GSTIN);
    // Ramesh has no GSTIN, so the yard raises any e-way bill.
    expect(asBuyer?.ewayBillBy).toBe("buyer");
    expect(asBuyer?.trade).toMatchObject({
      status: "completed",
      grams: 400_000,
      invoiceNo: PAPER_TRADE,
      needsEwayBill: false,
    });
    expect(asBuyer?.editable).toEqual([...FIELDS_BY_SIDE.buyer]);
    expect(asBuyer?.mine.poNumber).toMatch(/^PO\/PPPY\/\d\d-\d\d\/\d{3}$/);
    expect(asBuyer?.mine.grnNumber).toMatch(/^GRN\/PPPY\//);
    expect(asBuyer?.theirs.vehicleNo).toMatch(/^KA\d\d[A-Z]{2}\d{4}$/);
    expect(asBuyer?.theirs.irn).toBeUndefined();

    const shop = await signInAs(t, SHOP);
    const asSeller = await shop.query(api.exports.documents, {
      tradeId: trade._id,
    });
    expect(asSeller?.side).toBe("seller");
    expect(asSeller?.editable).toEqual([...FIELDS_BY_SIDE.seller]);
    expect(asSeller?.mine.vehicleNo).toBe(asBuyer?.theirs.vehicleNo);
    expect(asSeller?.theirs.poNumber).toBe(asBuyer?.mine.poNumber);
  });

  it("is null for a trade that isn't mine or doesn't exist", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const maker = await signInAs(t, MAKER);
    expect(
      await maker.query(api.exports.documents, { tradeId: trade._id }),
    ).toBeNull();
    expect(
      await maker.query(api.exports.documents, { tradeId: "not-an-id" }),
    ).toBeNull();
  });

  it("is for businesses, signed in", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    await expect(
      t.query(api.exports.documents, { tradeId: trade._id }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
    const saathi = await signInAs(t, SAATHI);
    await expect(
      saathi.query(api.exports.documents, { tradeId: trade._id }),
    ).rejects.toThrow(/NO_BUSINESS/);
    await expect(saathi.query(api.exports.packs, {})).rejects.toThrow(
      /NO_BUSINESS/,
    );
  });
});

describe("saveDocuments", () => {
  it("lets the buyer record its paperwork, normalised, and audits it", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const yard = await signInAs(t, YARD);

    await yard.mutation(api.exports.saveDocuments, {
      tradeId: trade._id,
      fields: { poNumber: "  PO-2026-77 ", ewayBillNo: "1234 5678 9012" },
    });
    const pack = await yard.query(api.exports.documents, {
      tradeId: trade._id,
    });
    expect(pack?.mine.poNumber).toBe("PO-2026-77");
    expect(pack?.mine.ewayBillNo).toBe("123456789012");
    // Untouched fields stay.
    expect(pack?.mine.grnNumber).toMatch(/^GRN\//);
    expect(await auditActions(t, "trades", trade._id)).toContain(
      "tradeDocuments.updated",
    );
  });

  it("clears a field when it's saved blank", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const yard = await signInAs(t, YARD);
    await yard.mutation(api.exports.saveDocuments, {
      tradeId: trade._id,
      fields: { grnNumber: "" },
    });
    const pack = await yard.query(api.exports.documents, {
      tradeId: trade._id,
    });
    expect(pack?.mine.grnNumber).toBeUndefined();
  });

  it("lets the seller record the vehicle, driver and IRN", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, FLAKE_TRADE);
    const recycler = await signInAs(t, RECYCLER);
    const irn = "B".repeat(64);
    await recycler.mutation(api.exports.saveDocuments, {
      tradeId: trade._id,
      fields: {
        vehicleNo: "ka 51 ae 9021",
        driverPhone: "98450 00399",
        irn,
        notes: "Two pallets, shrink-wrapped.",
      },
    });
    const pack = await recycler.query(api.exports.documents, {
      tradeId: trade._id,
    });
    expect(pack?.side).toBe("seller");
    expect(pack?.mine).toMatchObject({
      vehicleNo: "KA51AE9021",
      driverPhone: "+919845000399",
      irn: irn.toLowerCase(),
      notes: "Two pallets, shrink-wrapped.",
    });
    // A trade with nothing recorded yet gets a row on first save.
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("tradeDocuments")
        .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
        .collect(),
    );
    expect(rows).toHaveLength(2);
  });

  it("refuses the other side's fields", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const yard = await signInAs(t, YARD);
    await expect(
      yard.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { vehicleNo: "KA01AB1234" },
      }),
    ).rejects.toThrow(/NOT_YOUR_FIELD/);
    await expect(
      yard.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { irn: "a".repeat(64) },
      }),
    ).rejects.toThrow(/NOT_YOUR_FIELD/);
    const shop = await signInAs(t, SHOP);
    await expect(
      shop.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { poNumber: "PO-1" },
      }),
    ).rejects.toThrow(/NOT_YOUR_FIELD/);
    await expect(
      shop.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { grnNumber: "GRN-1" },
      }),
    ).rejects.toThrow(/NOT_YOUR_FIELD/);
  });

  it("refuses values the portals would reject, keeping the record as it was", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const yard = await signInAs(t, YARD);
    const before = await yard.query(api.exports.documents, {
      tradeId: trade._id,
    });
    await expect(
      yard.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { poNumber: "PO-OK", ewayBillNo: "12" },
      }),
    ).rejects.toThrow(/INVALID_EWAY_BILL/);
    await expect(
      yard.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { notes: "x".repeat(300) },
      }),
    ).rejects.toThrow(/TOO_LONG/);
    const shop = await signInAs(t, SHOP);
    await expect(
      shop.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { vehicleNo: "TRUCK" },
      }),
    ).rejects.toThrow(/INVALID_VEHICLE/);
    await expect(
      shop.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { driverPhone: "12345" },
      }),
    ).rejects.toThrow(/INVALID_PHONE/);
    const after = await yard.query(api.exports.documents, {
      tradeId: trade._id,
    });
    expect(after?.mine).toEqual(before?.mine);
  });

  it("refuses someone else's trade, a Saathi and a signed-out caller", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const maker = await signInAs(t, MAKER);
    await expect(
      maker.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { poNumber: "PO-1" },
      }),
    ).rejects.toThrow(/NOT_FOUND/);
    const saathi = await signInAs(t, SAATHI);
    await expect(
      saathi.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { notes: "hi" },
      }),
    ).rejects.toThrow(/NO_BUSINESS/);
    await expect(
      t.mutation(api.exports.saveDocuments, {
        tradeId: trade._id,
        fields: { notes: "hi" },
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });
});

describe("packs", () => {
  it("lists my trades on both sides with how much paperwork each holds", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const packs = await yard.query(api.exports.packs, {});
    expect(packs.length).toBeGreaterThanOrEqual(5);
    expect(new Set(packs.map((pack) => pack.side))).toEqual(
      new Set(["buyer", "seller"]),
    );
    const paper = packs.find((pack) => pack.invoiceNo === PAPER_TRADE);
    // Buyer: PO and GRN. Seller: vehicle and driver. No e-way bill under ₹50,000.
    expect(paper).toMatchObject({
      side: "buyer",
      status: "completed",
      documentsFilled: 4,
      counterparty: { name: RAMESH, kind: "kabadiwala" },
    });
    const requested = packs.find((pack) => pack.status === "requested");
    expect(requested?.documentsFilled).toBe(0);
    // Newest first.
    const times = packs.map((pack) => pack.updatedAt);
    expect(times).toEqual([...times].toSorted((a, b) => b - a));
  });
});

describe("evidencePack", () => {
  it("puts the trade, both parties, documents, receipt and origin in one file", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const yard = await signInAs(t, YARD);
    const pack = await yard.query(api.exports.evidencePack, {
      tradeId: trade._id,
    });
    expect(pack).not.toBeNull();
    expect(pack?.format).toBe("luma-green/evidence-pack@1");
    expect(pack?.generatedBy).toEqual({ org: PEENYA, side: "buyer" });
    expect(pack?.trade).toMatchObject({
      receiptNo: PAPER_TRADE,
      status: "completed",
      material: { code: "PAPER-NEWS", name: "Newspaper", hsn: "4707" },
      grams: 400_000,
      kg: 400,
      totalPaise: 700_000,
      totalRupees: 7000,
      ewayBillBy: "buyer",
    });
    expect(pack?.timeline.map((entry) => entry.status)).toEqual([
      "requested",
      "accepted",
      "paid_to_escrow",
      "dispatched",
      "completed",
    ]);
    expect(pack?.timeline[0]?.date).toMatch(/^\d{4}-\d\d-\d\d$/);
    expect(pack?.parties.seller).toMatchObject({ name: RAMESH, gstin: null });
    expect(pack?.parties.buyer).toMatchObject({
      name: PEENYA,
      gstin: PEENYA_GSTIN,
    });
    expect(pack?.documents.buyer.poNumber).toMatch(/^PO\//);
    expect(pack?.documents.seller.vehicleNo).toMatch(/^KA/);
    expect(pack?.receipts.trade).toMatchObject({
      number: PAPER_TRADE,
      escrow: "released",
    });
    // Priya's newspaper pickup, nine days ago, is where the paper came from:
    // 18 kg estimated, weighed at 97%.
    expect(pack?.receipts.origin).toEqual([
      {
        date: expect.stringMatching(/^\d{4}-\d\d-\d\d$/),
        pickups: 1,
        grams: 17_460,
      },
    ]);
    expect(Array.isArray(pack?.audit)).toBe(true);
  });

  it("is null for a trade that isn't mine", async () => {
    const t = await demoWorld();
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const maker = await signInAs(t, MAKER);
    expect(
      await maker.query(api.exports.evidencePack, { tradeId: trade._id }),
    ).toBeNull();
    await expect(
      t.query(api.exports.evidencePack, { tradeId: trade._id }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });
});

// --- Reports ---------------------------------------------------------------------------

describe("tally", () => {
  it("lays vouchers out in TallyPrime's import columns", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const report = await yard.query(api.exports.tally, {
      period: monthOf(stepAt(trade, "paid_to_escrow")),
    });
    expect(report.kind).toBe("tally");
    expect(report.columns).toEqual([
      "Voucher Date",
      "Voucher Type",
      "Voucher Number",
      "Tracking Number",
      "Party Ledger Name",
      "Party GSTIN",
      "Registration Type",
      "Item Name",
      "Item Code",
      "HSN/SAC",
      "Quantity",
      "Unit",
      "Rate",
      "Item Amount",
      "GST Rate (%)",
      "Reverse Charge",
      "E-Way Bill Number",
      "Narration",
    ]);
    for (const row of report.rows) {
      expect(row).toHaveLength(report.columns.length);
    }
  });

  it("gives the buyer a Purchase voucher and a Receipt Note per delivered trade", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const report = await yard.query(api.exports.tally, {
      period: monthOf(stepAt(trade, "paid_to_escrow")),
    });
    const mine = rowsOf(report).filter(
      (row) => row["Tracking Number"] === PAPER_TRADE,
    );
    expect(mine.map((row) => row["Voucher Type"])).toEqual([
      "Purchase",
      "Receipt Note",
    ]);
    expect(mine[0]).toMatchObject({
      "Voucher Date": indiaToday(stepAt(trade, "paid_to_escrow")),
      "Voucher Number": PAPER_TRADE,
      "Party Ledger Name": RAMESH,
      "Party GSTIN": "",
      "Registration Type": "Unregistered",
      "Item Name": "Newspaper",
      "Item Code": "PAPER-NEWS",
      "HSN/SAC": "4707",
      Quantity: 400,
      Unit: "KGS",
      Rate: 17.5,
      "Item Amount": 7000,
      "GST Rate (%)": 5,
      "Reverse Charge": "No",
      "E-Way Bill Number": "",
    });
    expect(mine[0]?.Narration).toContain(`${RAMESH} to ${PEENYA}`);
    expect(mine[1]).toMatchObject({
      "Voucher Date": indiaToday(stepAt(trade, "completed")),
      "Voucher Number": expect.stringMatching(/^GRN\//),
      Quantity: 400,
    });
    // Rows are in date order.
    const dates = report.rows.map((row) => String(row[0]));
    expect(dates).toEqual([...dates].toSorted((a, b) => a.localeCompare(b)));
  });

  it("gives the seller a Sales voucher and no Receipt Note", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const report = await shop.query(api.exports.tally, {
      period: monthOf(stepAt(trade, "paid_to_escrow")),
    });
    const mine = rowsOf(report).filter(
      (row) => row["Tracking Number"] === PAPER_TRADE,
    );
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      "Voucher Type": "Sales",
      "Party Ledger Name": PEENYA,
      "Party GSTIN": PEENYA_GSTIN,
      "Registration Type": "Regular",
      "Item Amount": 7000,
    });
  });

  it("marks metal scrap bought from an unregistered seller as reverse charge", async () => {
    const t = await demoWorld();
    const seller = await orgBySlug(t, "sri-lakshmi-scrap");
    const buyer = await orgBySlug(t, "peenya-paper-plastic-yard");
    const now = Date.now();
    await t.run(async (ctx) => {
      const listingId = await ctx.db.insert("listings", {
        orgId: seller._id,
        sellerKind: "kabadiwala",
        materialCode: "METAL-IRON",
        grams: 0,
        askPaisePerKg: 3000,
        city: "Bengaluru",
        status: "sold",
        createdAt: now - 3000,
        updatedAt: now - 3000,
      });
      await ctx.db.insert("trades", {
        listingId,
        sellerOrgId: seller._id,
        buyerOrgId: buyer._id,
        materialCode: "METAL-IRON",
        grams: 250_000,
        paisePerKg: 3000,
        totalPaise: 750_000,
        status: "paid_to_escrow",
        timeline: [
          { status: "requested", at: now - 3000 },
          { status: "accepted", at: now - 2000 },
          { status: "paid_to_escrow", at: now - 1000 },
        ],
        invoiceNo: "LG-26-9001",
        createdAt: now - 3000,
        updatedAt: now - 1000,
      });
    });
    const yard = await signInAs(t, YARD);
    const report = await yard.query(api.exports.tally, {
      period: monthOf(now - 1000),
    });
    const metal = rowsOf(report).find(
      (row) => row["Tracking Number"] === "LG-26-9001",
    );
    expect(metal).toMatchObject({
      "Voucher Type": "Purchase",
      "Registration Type": "Unregistered",
      "HSN/SAC": "7204",
      "GST Rate (%)": 18,
      "Reverse Charge": "Yes",
      Quantity: 250,
      Rate: 30,
      "Item Amount": 7500,
    });
  });

  it("wants a month, and a business signed in", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    await expect(
      yard.query(api.exports.tally, { period: "2026-Q2" }),
    ).rejects.toThrow(/INVALID_PERIOD/);
    await expect(
      yard.query(api.exports.tally, { period: "september" }),
    ).rejects.toThrow(/INVALID_PERIOD/);
    await expect(
      t.query(api.exports.tally, { period: "2026-09" }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
    const saathi = await signInAs(t, SAATHI);
    await expect(
      saathi.query(api.exports.tally, { period: "2026-09" }),
    ).rejects.toThrow(/NO_BUSINESS/);
  });

  it("is empty for a month with nothing in it", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const report = await yard.query(api.exports.tally, { period: "2020-01" });
    expect(report.rows).toEqual([]);
    expect(report.columns.length).toBeGreaterThan(0);
  });
});

describe("eprPurchaseRegister", () => {
  it("lists a recycler's delivered purchases with supplier, GSTIN, category and kilos", async () => {
    const t = await demoWorld();
    const recycler = await signInAs(t, RECYCLER);
    const trade = await tradeByReceipt(t, HDPE_TRADE);
    const report = await recycler.query(api.exports.eprPurchaseRegister, {
      period: monthOf(stepAt(trade, "completed")),
    });
    expect(report.kind).toBe("eprPurchaseRegister");
    expect(report.columns.slice(0, 5)).toEqual([
      "Date of Receipt",
      "Supplier Name",
      "Supplier Address",
      "Supplier GSTIN / PAN",
      "Supplier Registration",
    ]);
    const rows = rowsOf(report);
    const hdpe = rows.find(
      (row) => row["Invoice / Receipt No."] === HDPE_TRADE,
    );
    expect(hdpe).toMatchObject({
      "Date of Receipt": indiaToday(stepAt(trade, "completed")),
      "Supplier Name": PEENYA,
      "Supplier GSTIN / PAN": PEENYA_GSTIN,
      "Supplier Registration": "GST-registered",
      Material: "Hard plastic (HDPE)",
      "Material Code": "PLASTIC-HDPE",
      "EPR Regime": "Plastic packaging",
      "EPR Category": "Cat I (rigid)",
      "Quantity (kg)": 800,
      "Quantity (t)": 0.8,
      "Invoice Date": indiaToday(stepAt(trade, "paid_to_escrow")),
    });
    expect(hdpe?.["Vehicle No."]).toMatch(/^KA/);
    // Only purchases: what GreenLoop sold to Deccan is not on its register,
    // and the PET load still on the road isn't received yet.
    expect(rows.map((row) => row["Supplier Name"])).not.toContain(GREENLOOP);
    expect(rows.map((row) => row["Invoice / Receipt No."])).not.toContain(
      PET_TRADE,
    );
  });

  it("wants a month", async () => {
    const t = await demoWorld();
    const recycler = await signInAs(t, RECYCLER);
    await expect(
      recycler.query(api.exports.eprPurchaseRegister, { period: "2026-Q1" }),
    ).rejects.toThrow(/INVALID_PERIOD/);
  });
});

describe("swmQuarterly", () => {
  it("returns received, sorted and sent on by stream and material, with a total", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const bought = await tradeByReceipt(t, PAPER_TRADE);
    const received = rowsOf(
      await yard.query(api.exports.swmQuarterly, {
        period: quarterOf(stepAt(bought, "completed")),
      }),
    );
    const paper = received.find((row) => row["Material Code"] === "PAPER-NEWS");
    expect(paper).toMatchObject({
      Quarter: expect.stringMatching(/^FY \d{4}-\d\d Q[1-4]$/),
      Stream: "Dry",
      Material: "Newspaper",
      HSN: "4707",
      "Received (kg)": 400,
      "Sorted (kg)": 400,
    });
    expect(received.at(-1)?.Material).toBe("Total");
    expect(received.at(-1)?.["Received (kg)"]).toBeGreaterThanOrEqual(400);

    const sold = await tradeByReceipt(t, PET_TRADE);
    const sent = rowsOf(
      await yard.query(api.exports.swmQuarterly, {
        period: quarterOf(stepAt(sold, "dispatched")),
      }),
    );
    const pet = sent.find((row) => row["Material Code"] === "PLASTIC-PET");
    expect(pet?.["Sent to registered processors (kg)"]).toBe(2000);
    expect(pet?.["Sent to"]).toBe(`${GREENLOOP} (GSTIN ${GREENLOOP_GSTIN})`);
  });

  it("wants a financial-year quarter, not a month", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    await expect(
      yard.query(api.exports.swmQuarterly, { period: "2026-09" }),
    ).rejects.toThrow(/INVALID_PERIOD/);
    const empty = await yard.query(api.exports.swmQuarterly, {
      period: "2019-Q1",
    });
    expect(empty.rows).toEqual([]);
  });
});

describe("monthlyRecyclables", () => {
  it("counts a kabadiwala's household pickups and sales to yards by material", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    const booking = await t.run(async (ctx) => {
      const bookings = await ctx.db.query("bookings").collect();
      const found = bookings.find(
        (candidate) =>
          candidate.phone === "+919845000015" &&
          candidate.receipt !== undefined,
      );
      if (!found?.receipt) throw new Error("No completed pickup for Vikram");
      return { ...found, receipt: found.receipt };
    });
    const fromHomes = rowsOf(
      await shop.query(api.exports.monthlyRecyclables, {
        period: monthOf(booking.receipt.paidAt),
      }),
    );
    const books = fromHomes.find(
      (row) => row["Material Code"] === "PAPER-BOOKS",
    );
    // 25 kg estimated, weighed at 97%.
    expect(books).toMatchObject({
      Material: "Books and notebooks",
      "From households (kg)": 24.25,
      "From businesses (kg)": 0,
      "Received (kg)": 24.25,
    });
    expect(fromHomes.at(-1)?.Material).toBe("Total");

    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const sold = rowsOf(
      await shop.query(api.exports.monthlyRecyclables, {
        period: monthOf(stepAt(trade, "dispatched")),
      }),
    );
    const paper = sold.find((row) => row["Material Code"] === "PAPER-NEWS");
    expect(paper).toMatchObject({
      "Sold (kg)": 400,
      "Sale value (INR)": 7000,
      "Average rate (INR/kg)": 17.5,
      "Sold to": `${PEENYA} (GSTIN ${PEENYA_GSTIN})`,
    });
    expect(typeof paper?.["Stock now (kg)"]).toBe("number");
  });

  it("wants a month", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    await expect(
      shop.query(api.exports.monthlyRecyclables, { period: "2026-Q2" }),
    ).rejects.toThrow(/INVALID_PERIOD/);
  });
});

// --- Download history ---------------------------------------------------------------------

describe("runs and recordRun", () => {
  it("shows my downloads newest first and records new ones with an audit row", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const seeded = await yard.query(api.exports.runs, {});
    expect(seeded.map((run) => run.kind)).toEqual(["tally", "swmQuarterly"]);

    const period = monthOf(Date.now());
    const runId = await yard.mutation(api.exports.recordRun, {
      kind: "tally",
      period,
      rows: 3,
    });
    const runs = await yard.query(api.exports.runs, {});
    expect(runs[0]).toMatchObject({
      id: runId,
      kind: "tally",
      period,
      reference: null,
      rows: 3,
    });
    expect(await auditActions(t, "exportRuns", runId)).toEqual([
      "export.downloaded",
    ]);
  });

  it("labels a document pack with its trade's receipt number", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    await yard.mutation(api.exports.recordRun, {
      kind: "evidencePack",
      period: trade._id,
      rows: 1,
    });
    const runs = await yard.query(api.exports.runs, {});
    expect(runs[0]).toMatchObject({
      kind: "evidencePack",
      reference: PAPER_TRADE,
    });
  });

  it("refuses bad periods, someone else's trade and other businesses' history", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    await expect(
      yard.mutation(api.exports.recordRun, {
        kind: "tally",
        period: "last month",
        rows: 1,
      }),
    ).rejects.toThrow(/INVALID_PERIOD/);
    await expect(
      yard.mutation(api.exports.recordRun, {
        kind: "tally",
        period: "2026-09",
        rows: -1,
      }),
    ).rejects.toThrow(/INVALID_ROWS/);
    const trade = await tradeByReceipt(t, PAPER_TRADE);
    const maker = await signInAs(t, MAKER);
    await expect(
      maker.mutation(api.exports.recordRun, {
        kind: "evidencePack",
        period: trade._id,
        rows: 1,
      }),
    ).rejects.toThrow(/NOT_FOUND/);
    // Deccan sees only its own downloads.
    const theirs = await maker.query(api.exports.runs, {});
    expect(theirs.every((run) => run.kind === "tally")).toBe(true);
    expect(theirs).toHaveLength(1);
    await expect(t.query(api.exports.runs, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
  });
});
