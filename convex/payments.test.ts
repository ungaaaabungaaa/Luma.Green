/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import { paiseFor } from "./lib/chain";
import { indiaToday } from "./lib/onboarding";
import { TAX_RULES } from "./lib/tax";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

// Demo logins (convex/lib/demo.ts).
const SHOP = "+919000000101"; // Ramesh Kabadi Store — kabadiwala, no GSTIN
const YARD = "+919000000102"; // Peenya Paper & Plastic Yard
const RECYCLER = "+919000000103"; // GreenLoop Polymers
const MAKER = "+919000000104"; // Deccan Packaging — manufacturer
const SAATHI = "+919000000105";

const RUPEE = 100;
const DAY = 24 * 60 * 60 * 1000;

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

/** The caller's khata entry for one material, by direction. */
async function entryFor(
  as: Session,
  direction: "receivable" | "payable",
  materialCode: string,
) {
  const entries = await as.query(api.payments.khataEntries, { direction });
  const entry = entries.find((row) => row.material.code === materialCode);
  if (!entry) throw new Error(`No ${direction} entry for ${materialCode}`);
  return entry;
}

async function ledgerRows(t: Test, tradeId: Id<"trades">) {
  return t.run(async (ctx) =>
    ctx.db
      .query("ledgerEntries")
      .withIndex("by_trade", (q) => q.eq("tradeId", tradeId))
      .collect(),
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

/**
 * A metal trade the seed doesn't have: Ramesh (no GSTIN) sold 500 kg of
 * iron to the Peenya yard (registered), delivered `daysAgo` days ago. This
 * is the reverse-charge case: the yard pays the GST and self-invoices.
 */
async function metalTrade(t: Test, daysAgo = 3): Promise<Id<"trades">> {
  const seller = await orgBySlug(t, "ramesh-kabadi-store");
  const buyer = await orgBySlug(t, "peenya-paper-plastic-yard");
  return t.run(async (ctx) => {
    const listing = await ctx.db
      .query("listings")
      .withIndex("by_org", (q) => q.eq("orgId", seller._id))
      .filter((q) => q.eq(q.field("materialCode"), "METAL-IRON"))
      .first();
    if (!listing) throw new Error("No iron listing for Ramesh");
    const grams = 500_000;
    const paisePerKg = 3350;
    const completedAt = Date.now() - daysAgo * DAY;
    const steps = [
      "requested",
      "accepted",
      "paid_to_escrow",
      "dispatched",
      "completed",
    ] as const;
    return ctx.db.insert("trades", {
      listingId: listing._id,
      sellerOrgId: seller._id,
      buyerOrgId: buyer._id,
      materialCode: "METAL-IRON",
      grams,
      paisePerKg,
      totalPaise: paiseFor(grams, paisePerKg),
      status: "completed",
      timeline: steps.map((status, index) => ({
        status,
        at: completedAt - (steps.length - 1 - index) * 60 * 60 * 1000,
      })),
      invoiceNo: "LG-26-0099",
      createdAt: completedAt - DAY,
      updatedAt: completedAt,
    });
  });
}

// --- The khata -------------------------------------------------------------------

describe("khataSummary and khataEntries", () => {
  it("shows the yard what it is owed and what it owes, per counterparty", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const summary = await yard.query(api.payments.khataSummary, {});

    // GreenLoop part-paid the HDPE bales (800 kg × ₹42 = ₹33,600, 60% by NEFT).
    expect(summary.receivablePaise).toBe(13_440 * RUPEE);
    // The yard paid Ramesh half of ₹7,000 in cash at pickup.
    expect(summary.payablePaise).toBe(3500 * RUPEE);
    expect(summary.overduePaise).toBe(0);
    expect(summary.overdueCount).toBe(0);
    expect(summary.openCount).toBe(2);

    const names = summary.counterparties.map((party) => party.org.name);
    expect(names).toEqual(
      expect.arrayContaining(["GreenLoop Polymers", "Ramesh Kabadi Store"]),
    );
    const ramesh = summary.counterparties.find(
      (party) => party.org.name === "Ramesh Kabadi Store",
    );
    expect(ramesh?.payablePaise).toBe(3500 * RUPEE);
    expect(ramesh?.receivablePaise).toBe(0);
    // Ramesh is a micro business: the MSMED 45-day clock runs from delivery.
    expect(ramesh?.msmeDaysLeft).toBeGreaterThan(30);
    expect(ramesh?.msmeDaysLeft).toBeLessThanOrEqual(45);
  });

  it("lists every trade from acceptance on, settled ones included, urgent first", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const entries = await yard.query(api.payments.khataEntries, {});
    expect(entries.length).toBe(4);
    expect(entries.every((entry) => entry.tradeStatus !== "requested")).toBe(
      true,
    );

    const hdpe = await entryFor(yard, "receivable", "PLASTIC-HDPE");
    expect(hdpe).toMatchObject({
      direction: "receivable",
      duePaise: 33_600 * RUPEE,
      paidPaise: 20_160 * RUPEE,
      balancePaise: 13_440 * RUPEE,
      status: "part",
      invoiceNo: "LG-26-0005",
      inEscrow: false,
      msme: null,
    });
    expect(hdpe.daysLeft).toBeGreaterThan(0);

    // The PET load is in the prototype's escrow: paid, as the trade says.
    const pet = await entryFor(yard, "receivable", "PLASTIC-PET");
    expect(pet).toMatchObject({
      status: "settled",
      balancePaise: 0,
      inEscrow: true,
    });

    const newspaper = await entryFor(yard, "payable", "PAPER-NEWS");
    expect(newspaper.status).toBe("part");
    expect(newspaper.msme?.category).toBe("micro");

    // Open entries before settled ones.
    const statuses = entries.map((entry) => entry.status);
    expect(statuses.indexOf("settled")).toBeGreaterThan(
      statuses.lastIndexOf("part"),
    );
  });

  it("marks the manufacturer's late payment to GreenLoop overdue", async () => {
    const t = await demoWorld();
    const maker = await signInAs(t, MAKER);
    const summary = await maker.query(api.payments.khataSummary, {});
    // 2,500 kg of granules at ₹70 = ₹1,75,000; half paid by RTGS, 15-day terms.
    expect(summary.overdueCount).toBe(1);
    expect(summary.overduePaise).toBe(87_500 * RUPEE);
    expect(summary.payablePaise).toBe(87_500 * RUPEE);
    expect(summary.receivablePaise).toBe(0);
    const greenloop = summary.counterparties.find(
      (party) => party.org.name === "GreenLoop Polymers",
    );
    expect(greenloop?.overdue).toBe(true);
    // GreenLoop declared "small", so the 45-day clock shows too.
    expect(greenloop?.msmeDaysLeft).not.toBeNull();

    const granules = await entryFor(maker, "payable", "RECYCLED-HDPE-GRANULE");
    expect(granules.status).toBe("overdue");
    expect(granules.daysLeft).toBeLessThan(0);
    expect(granules.msme?.category).toBe("small");
  });

  it("counts a trade paid into escrow as settled even before the khata rows exist", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const pet = await entryFor(yard, "receivable", "PLASTIC-PET");
    // Drop the seeded rows: the market's own steps don't write any yet.
    await t.run(async (ctx) => {
      for (const row of await ledgerRows(t, pet.tradeId)) {
        await ctx.db.delete("ledgerEntries", row._id);
      }
    });
    const again = await entryFor(yard, "receivable", "PLASTIC-PET");
    expect(again.id).toBeNull();
    expect(again.status).toBe("settled");
    expect(again.paidPaise).toBe(again.duePaise);
  });

  it("is only for businesses", async () => {
    const t = await demoWorld();
    await expect(t.query(api.payments.khataSummary, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const saathi = await signInAs(t, SAATHI);
    await expect(
      saathi.query(api.payments.khataEntries, {}),
    ).rejects.toThrow(/NO_BUSINESS/);
  });
});

// --- Recording payments ---------------------------------------------------------------

describe("record", () => {
  it("takes a part payment, then the balance, and settles both sides' khata", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const owed = await entryFor(yard, "payable", "PAPER-NEWS");
    expect(owed.balancePaise).toBe(3500 * RUPEE);

    const first = await yard.mutation(api.payments.record, {
      tradeId: owed.tradeId,
      method: "upi",
      reference: "426512345678",
      amountPaise: 1000 * RUPEE,
    });
    expect(first.status).toBe("part");
    expect(first.balancePaise).toBe(2500 * RUPEE);

    const rows = await ledgerRows(t, owed.tradeId);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.paidPaise).toBe(4500 * RUPEE);
      expect(row.status).toBe("part");
    }
    expect(await auditActions(t, "payments", first.paymentId)).toEqual([
      "payment.recorded",
    ]);

    // The seller sees the same payment on their side.
    const shop = await signInAs(t, SHOP);
    const theirs = await entryFor(shop, "receivable", "PAPER-NEWS");
    expect(theirs.balancePaise).toBe(2500 * RUPEE);

    // The seller records the cash balance they received.
    const second = await shop.mutation(api.payments.record, {
      tradeId: owed.tradeId,
      method: "cash",
      amountPaise: 2500 * RUPEE,
      note: "Balance collected at the yard",
    });
    expect(second.status).toBe("settled");
    expect(second.balancePaise).toBe(0);

    const payments = await yard.query(api.payments.forSubject, {
      subject: "trade",
      subjectId: owed.tradeId,
    });
    expect(payments.map((payment) => payment.method)).toEqual([
      "cash",
      "upi",
      "cash",
    ]);
    expect(payments[1]).toMatchObject({
      reference: "426512345678",
      amountPaise: 1000 * RUPEE,
      direction: "out",
      counterparty: "Ramesh Kabadi Store",
    });

    const summary = await yard.query(api.payments.khataSummary, {});
    expect(summary.payablePaise).toBe(0);
  });

  it("refuses more than the balance, a missing reference, escrow by hand and bad input", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const owed = await entryFor(yard, "payable", "PAPER-NEWS");
    const base = { tradeId: owed.tradeId, amountPaise: 100 * RUPEE };

    await expect(
      yard.mutation(api.payments.record, {
        ...base,
        method: "neft",
        reference: "HDFCN52026001",
        amountPaise: owed.balancePaise + 1,
      }),
    ).rejects.toThrow(/OVERPAYMENT/);
    await expect(
      yard.mutation(api.payments.record, { ...base, method: "upi" }),
    ).rejects.toThrow(/REFERENCE_REQUIRED/);
    await expect(
      yard.mutation(api.payments.record, {
        ...base,
        method: "upi",
        reference: ' '.repeat(3),
      }),
    ).rejects.toThrow(/REFERENCE_REQUIRED/);
    await expect(
      yard.mutation(api.payments.record, {
        ...base,
        method: "upi",
        reference: "x".repeat(41),
      }),
    ).rejects.toThrow(/REFERENCE_TOO_LONG/);
    await expect(
      yard.mutation(api.payments.record, {
        ...base,
        method: "escrow",
        reference: "ESC-1",
      }),
    ).rejects.toThrow(/INVALID_METHOD/);
    await expect(
      yard.mutation(api.payments.record, {
        ...base,
        method: "cash",
        amountPaise: 0,
      }),
    ).rejects.toThrow(/INVALID_AMOUNT/);
    await expect(
      yard.mutation(api.payments.record, {
        ...base,
        method: "cash",
        amountPaise: 10.5,
      }),
    ).rejects.toThrow(/INVALID_AMOUNT/);
    await expect(
      yard.mutation(api.payments.record, {
        ...base,
        method: "cash",
        paidAt: Date.now() + DAY,
      }),
    ).rejects.toThrow(/INVALID_DATE/);
    await expect(
      yard.mutation(api.payments.record, {
        ...base,
        method: "cash",
        note: "n".repeat(141),
      }),
    ).rejects.toThrow(/NOTE_TOO_LONG/);

    // Nothing was written.
    expect(
      await yard.query(api.payments.forSubject, {
        subject: "trade",
        subjectId: owed.tradeId,
      }),
    ).toHaveLength(1);
  });

  it("refuses a trade that isn't owed yet, and a trade that isn't mine", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const requested = await t.run(async (ctx) => {
      const trade = await ctx.db
        .query("trades")
        .filter((q) => q.eq(q.field("status"), "requested"))
        .first();
      if (!trade) throw new Error("No requested trade");
      return trade._id;
    });
    await expect(
      yard.mutation(api.payments.record, {
        tradeId: requested,
        method: "cash",
        amountPaise: 100,
      }),
    ).rejects.toThrow(/WRONG_STEP/);

    const owed = await entryFor(yard, "payable", "PAPER-NEWS");
    const maker = await signInAs(t, MAKER);
    await expect(
      maker.mutation(api.payments.record, {
        tradeId: owed.tradeId,
        method: "cash",
        amountPaise: 100,
      }),
    ).rejects.toThrow(/NOT_FOUND/);
    await expect(
      maker.query(api.payments.forSubject, {
        subject: "trade",
        subjectId: owed.tradeId,
      }),
    ).rejects.toThrow(/NOT_FOUND/);
    await expect(
      t.mutation(api.payments.record, {
        tradeId: owed.tradeId,
        method: "cash",
        amountPaise: 100,
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });

  it("records the escrow hold first when the market's steps left no khata rows", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const pet = await entryFor(yard, "receivable", "PLASTIC-PET");
    await t.run(async (ctx) => {
      for (const row of await ledgerRows(t, pet.tradeId)) {
        await ctx.db.delete("ledgerEntries", row._id);
      }
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_subject", (q) =>
          q.eq("subject", "trade").eq("subjectId", pet.tradeId),
        )
        .collect();
      for (const row of payments) await ctx.db.delete("payments", row._id);
    });
    // Escrow already holds the whole amount, so nothing more can be recorded.
    await expect(
      yard.mutation(api.payments.record, {
        tradeId: pet.tradeId,
        method: "cash",
        amountPaise: 100,
      }),
    ).rejects.toThrow(/OVERPAYMENT/);
    const payments = await yard.query(api.payments.forSubject, {
      subject: "trade",
      subjectId: pet.tradeId,
    });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      method: "escrow",
      reference: "ESC-LG-26-0004",
      amountPaise: 76_000 * RUPEE,
    });
    const rows = await ledgerRows(t, pet.tradeId);
    expect(rows.map((row) => row.status)).toEqual(["settled", "settled"]);
  });
});

describe("history and forSubject", () => {
  it("shows a business every payment in and out, newest first", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const history = await yard.query(api.payments.history, {});
    expect(history.length).toBeGreaterThanOrEqual(4);
    for (let index = 1; index < history.length; index += 1) {
      expect(history[index - 1].paidAt).toBeGreaterThanOrEqual(
        history[index].paidAt,
      );
    }
    const escrowIn = history.find(
      (payment) =>
        payment.direction === "in" && payment.reference === "ESC-LG-26-0004",
    );
    expect(escrowIn).toMatchObject({
      method: "escrow",
      counterparty: "GreenLoop Polymers",
      amountPaise: 76_000 * RUPEE,
    });
    const cashOut = history.find(
      (payment) => payment.direction === "out" && payment.method === "cash",
    );
    expect(cashOut).toMatchObject({
      counterparty: "Ramesh Kabadi Store",
      amountPaise: 3500 * RUPEE,
    });
  });

  it("shows a kabadiwala what it paid households and Saathis", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    const history = await shop.query(api.payments.history, {});
    const pickups = history.filter((payment) => payment.subject === "booking");
    expect(pickups.length).toBeGreaterThanOrEqual(3);
    expect(pickups.map((payment) => payment.counterparty)).toContain(
      "Priya Sharma",
    );
    const jobs = history.filter((payment) => payment.subject === "job");
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0]?.title).toMatch(/Home pickups/);
    expect(jobs[0]?.counterparty).toBe("Lakshmi Devi");

    const booking = pickups[0];
    const forBooking = await shop.query(api.payments.forSubject, {
      subject: "booking",
      subjectId: booking.subjectId as Id<"bookings">,
    });
    expect(forBooking).toHaveLength(1);
    const yard = await signInAs(t, YARD);
    await expect(
      yard.query(api.payments.forSubject, {
        subject: "booking",
        subjectId: booking.subjectId as Id<"bookings">,
      }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

// --- Fees and taxes ----------------------------------------------------------------------

describe("breakdown", () => {
  it("works the research's example: 2,000 kg PET at ₹38 = ₹76,000 + 18% GST = ₹89,680", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const pet = await entryFor(yard, "receivable", "PLASTIC-PET");
    const result = await yard.query(api.payments.breakdown, {
      tradeId: pet.tradeId,
    });
    expect(result.side).toBe("seller");
    expect(result.grams).toBe(2_000_000);
    expect(result.paisePerKg).toBe(38 * RUPEE);
    expect(result.seller).toMatchObject({
      name: "Peenya Paper & Plastic Yard",
      registered: true,
      gstin: "29ABCPE1234F1Z5",
    });
    expect(result.buyer.registered).toBe(true);
    expect(result.buyerManufacturingDeclaration).toBe(true);
    expect(result.breakdown).toMatchObject({
      hsn: "39159029",
      taxableValuePaise: 76_000 * RUPEE,
      gstRateBp: 1800,
      gstPaise: 13_680 * RUPEE,
      invoiceTotalPaise: 89_680 * RUPEE,
      reverseCharge: false,
      gstTdsPaise: 0,
      tcsPaise: 0,
      tcsWaived: true,
      platformFeePaise: 0,
      buyerPaysSellerPaise: 89_680 * RUPEE,
      buyerPaysGovernmentPaise: 0,
      sellerRemitsGovernmentPaise: 13_680 * RUPEE,
    });
    expect(result.breakdown.ewayBill).toMatchObject({
      needed: true,
      raisedBy: "seller",
    });
    expect(result.breakdown.notes[0]).toBe("informational");
    expect(result.breakdown.notes).toEqual(
      expect.arrayContaining(["forwardCharge", "tcsWaived", "ewayBill"]),
    );

    const recycler = await signInAs(t, RECYCLER);
    const theirs = await recycler.query(api.payments.breakdown, {
      tradeId: pet.tradeId,
    });
    expect(theirs.side).toBe("buyer");
    expect(theirs.breakdown.invoiceTotalPaise).toBe(89_680 * RUPEE);
  });

  it("charges no GST when a kabadiwala without a GSTIN sells paper", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const newspaper = await entryFor(yard, "payable", "PAPER-NEWS");
    const result = await yard.query(api.payments.breakdown, {
      tradeId: newspaper.tradeId,
    });
    expect(result.seller.registered).toBe(false);
    expect(result.breakdown).toMatchObject({
      gstRateBp: 500,
      gstPaise: 0,
      reverseCharge: false,
      tcsPaise: 0,
      invoiceTotalPaise: 7000 * RUPEE,
    });
    expect(result.breakdown.ewayBill.needed).toBe(false);
    expect(result.breakdown.notes).toEqual(
      expect.arrayContaining(["noGstUnregistered", "ewayBillUnderLimit"]),
    );
    expect(result.selfInvoiceDueAt).toBeNull();
  });

  it("puts metal from an unregistered seller under reverse charge with a self-invoice date", async () => {
    const t = await demoWorld();
    const tradeId = await metalTrade(t);
    const yard = await signInAs(t, YARD);
    const result = await yard.query(api.payments.breakdown, { tradeId });
    expect(result.breakdown.reverseCharge).toBe(true);
    expect(result.breakdown.gstPaise).toBe(3015 * RUPEE);
    expect(result.breakdown.buyerPaysGovernmentPaise).toBe(3015 * RUPEE);
    expect(result.breakdown.buyerPaysSellerPaise).toBe(16_750 * RUPEE);
    expect(result.selfInvoiceDueAt).not.toBeNull();
    expect(result.breakdown.notes).toEqual(
      expect.arrayContaining(["reverseCharge", "selfInvoice"]),
    );
  });

  it("is only for the two sides of the trade", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const pet = await entryFor(yard, "receivable", "PLASTIC-PET");
    const maker = await signInAs(t, MAKER);
    await expect(
      maker.query(api.payments.breakdown, { tradeId: pet.tradeId }),
    ).rejects.toThrow(/NOT_FOUND/);
    await expect(
      t.query(api.payments.breakdown, { tradeId: pet.tradeId }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });
});

// --- E-way bills ------------------------------------------------------------------------

describe("ewayBillCheck and ewayBillPartA", () => {
  it("answers who raises the bill for a load", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const needed = await yard.query(api.payments.ewayBillCheck, {
      valuePaise: 89_680 * RUPEE,
      vehicle: "mini_truck",
      sellerRegistered: false,
      distanceKm: 30,
    });
    expect(needed).toMatchObject({
      needed: true,
      raisedBy: "buyer",
      validityDays: 1,
      partBOptional: true,
      note: "ewayBill",
    });
    const handcart = await yard.query(api.payments.ewayBillCheck, {
      valuePaise: 89_680 * RUPEE,
      vehicle: "handcart",
      sellerRegistered: true,
    });
    expect(handcart.needed).toBe(false);
    expect(handcart.note).toBe("ewayBillNonMotor");

    await expect(
      yard.query(api.payments.ewayBillCheck, {
        valuePaise: -1,
        vehicle: "truck",
        sellerRegistered: true,
      }),
    ).rejects.toThrow(/INVALID_AMOUNT/);
    await expect(
      t.query(api.payments.ewayBillCheck, {
        valuePaise: 100,
        vehicle: "truck",
        sellerRegistered: true,
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });

  it("fills Part A from the trade: parties, HSN, kilos, tax split and distance", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const pet = await entryFor(yard, "receivable", "PLASTIC-PET");
    const partA = await yard.query(api.payments.ewayBillPartA, {
      tradeId: pet.tradeId,
    });
    expect(partA).toMatchObject({
      supplyType: "Outward",
      subType: "Supply",
      documentType: "Tax Invoice",
      documentNo: "LG-26-0004",
    });
    expect(partA.documentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(partA.from).toMatchObject({
      gstin: "29ABCPE1234F1Z5",
      name: "Peenya Paper & Plastic Yard",
      stateCode: "29",
    });
    expect(partA.to.gstin).toBe("29AAGCG4321L1Z8");
    expect(partA.item).toMatchObject({
      hsn: "39159029",
      quantityKg: 2000,
      unit: "KGS",
      taxableValuePaise: 76_000 * RUPEE,
      cgstBp: 900,
      sgstBp: 900,
      igstBp: 0,
    });
    expect(partA.totals).toEqual({
      taxableValuePaise: 76_000 * RUPEE,
      cgstPaise: 6840 * RUPEE,
      sgstPaise: 6840 * RUPEE,
      igstPaise: 0,
      totalPaise: 89_680 * RUPEE,
    });
    // Peenya to Bommasandra is across the city.
    expect(partA.transport.approxDistanceKm).toBeGreaterThan(20);
    expect(partA.check.needed).toBe(true);
    expect(partA.check.validityDays).toBe(1);

    const recycler = await signInAs(t, RECYCLER);
    const inward = await recycler.query(api.payments.ewayBillPartA, {
      tradeId: pet.tradeId,
    });
    expect(inward.supplyType).toBe("Inward");
  });

  it("writes URP and a self-invoice for a seller without a GSTIN", async () => {
    const t = await demoWorld();
    const tradeId = await metalTrade(t);
    const yard = await signInAs(t, YARD);
    const partA = await yard.query(api.payments.ewayBillPartA, { tradeId });
    expect(partA.documentType).toBe("Self Invoice");
    expect(partA.from.gstin).toBe("URP");
    expect(partA.item.cgstBp).toBe(0);
    expect(partA.totals.totalPaise).toBe(16_750 * RUPEE);
    expect(partA.check.needed).toBe(false);

    const maker = await signInAs(t, MAKER);
    await expect(
      maker.query(api.payments.ewayBillPartA, { tradeId }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

// --- Registers and self-invoices ----------------------------------------------------------

describe("purchaseRegister", () => {
  it("lists the month's purchases with HSN, GST, reverse charge and TDS", async () => {
    const t = await demoWorld();
    const tradeId = await metalTrade(t);
    const yard = await signInAs(t, YARD);
    const month = indiaToday(Date.now() - 3 * DAY).slice(0, 7);
    const register = await yard.query(api.payments.purchaseRegister, {
      month,
    });
    expect(register.month).toBe(month);
    const iron = register.rows.find((row) => row.tradeId === tradeId);
    expect(iron).toMatchObject({
      supplier: "Ramesh Kabadi Store",
      supplierGstin: null,
      hsn: "72044900",
      grams: 500_000,
      taxableValuePaise: 16_750 * RUPEE,
      gstRateBp: 1800,
      gstPaise: 3015 * RUPEE,
      reverseCharge: true,
      gstTdsPaise: 0,
      tcsPaise: 0,
      totalPaise: 16_750 * RUPEE,
      invoiceNo: "LG-26-0099",
    });
    expect(iron?.date.startsWith(month)).toBe(true);
    // Rows are in date order and the totals add up.
    const dates = register.rows.map((row) => row.date);
    expect(dates).toEqual([...dates].sort());
    expect(register.totals.grams).toBe(
      register.rows.reduce((sum, row) => sum + row.grams, 0),
    );
    expect(register.totals.gstPaise).toBe(
      register.rows.reduce((sum, row) => sum + row.gstPaise, 0),
    );
  });

  it("puts the PET load in the recycler's register with the seller's GSTIN", async () => {
    const t = await demoWorld();
    const recycler = await signInAs(t, RECYCLER);
    const pet = await entryFor(recycler, "payable", "PLASTIC-PET");
    const invoicedAt = await t.run(async (ctx) => {
      const trade = await ctx.db.get("trades", pet.tradeId);
      return (
        trade?.timeline.find((step) => step.status === "paid_to_escrow")?.at ??
        0
      );
    });
    const month = indiaToday(invoicedAt).slice(0, 7);
    const register = await recycler.query(api.payments.purchaseRegister, {
      month,
    });
    const row = register.rows.find((entry) => entry.tradeId === pet.tradeId);
    expect(row).toMatchObject({
      supplier: "Peenya Paper & Plastic Yard",
      supplierGstin: "29ABCPE1234F1Z5",
      reverseCharge: false,
      gstPaise: 13_680 * RUPEE,
      totalPaise: 89_680 * RUPEE,
    });
  });

  it("refuses a badly formed month and anyone without a business", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    await expect(
      yard.query(api.payments.purchaseRegister, { month: "2026-13" }),
    ).rejects.toThrow(/INVALID_MONTH/);
    await expect(
      yard.query(api.payments.purchaseRegister, { month: "October" }),
    ).rejects.toThrow(/INVALID_MONTH/);
    const saathi = await signInAs(t, SAATHI);
    await expect(
      saathi.query(api.payments.purchaseRegister, { month: "2026-10" }),
    ).rejects.toThrow(/NO_BUSINESS/);
  });
});

describe("selfInvoices and selfInvoice", () => {
  it("lists metal bought from unregistered sellers with the 30-day deadline", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    expect(await yard.query(api.payments.selfInvoices, {})).toEqual([]);

    const tradeId = await metalTrade(t, 3);
    const items = await yard.query(api.payments.selfInvoices, {});
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      tradeId,
      selfInvoiceNo: "SI-LG-26-0099",
      invoiceNo: "LG-26-0099",
      grams: 500_000,
      taxableValuePaise: 16_750 * RUPEE,
      gstRateBp: 1800,
      gstPaise: 3015 * RUPEE,
      daysLeft: TAX_RULES.selfInvoiceDays - 3,
    });
    expect(items[0].supplier.name).toBe("Ramesh Kabadi Store");
    expect(items[0].dueAt - items[0].receivedAt).toBe(
      TAX_RULES.selfInvoiceDays * DAY,
    );

    const invoice = await yard.query(api.payments.selfInvoice, { tradeId });
    expect(invoice).toMatchObject({
      selfInvoiceNo: "SI-LG-26-0099",
      reverseCharge: true,
      gstRateBp: 1800,
      cgstPaise: 1507.5 * RUPEE,
      sgstPaise: 1507.5 * RUPEE,
      totalPaise: 19_765 * RUPEE,
    });
    expect(invoice?.supplier.gstin).toBe("URP");
    expect(invoice?.recipient.gstin).toBe("29ABCPE1234F1Z5");
    expect(invoice?.item).toMatchObject({
      hsn: "72044900",
      grams: 500_000,
      paisePerKg: 3350,
    });
  });

  it("returns null for a trade that needs no self-invoice", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const newspaper = await entryFor(yard, "payable", "PAPER-NEWS");
    expect(
      await yard.query(api.payments.selfInvoice, {
        tradeId: newspaper.tradeId,
      }),
    ).toBeNull();
  });

  it("is only visible to the buyer", async () => {
    const t = await demoWorld();
    const tradeId = await metalTrade(t);
    // The seller (Ramesh) sees the trade but has no self-invoice to issue.
    const shop = await signInAs(t, SHOP);
    expect(await shop.query(api.payments.selfInvoices, {})).toEqual([]);
    const maker = await signInAs(t, MAKER);
    await expect(
      maker.query(api.payments.selfInvoice, { tradeId }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

// --- Declarations ------------------------------------------------------------------------

describe("declarations and setDeclaration", () => {
  it("shows what the demo businesses declared", async () => {
    const t = await demoWorld();
    const maker = await signInAs(t, MAKER);
    const result = await maker.query(api.payments.declarations, {});
    expect(result.gstin).toBe("29AADCD9900P1Z6");
    expect(result.items).toEqual([
      expect.objectContaining({
        kind: "gstStatus",
        value: "registered",
        source: "declared",
      }),
      expect.objectContaining({ kind: "msme", value: "medium" }),
      expect.objectContaining({ kind: "manufacturingUse", value: "yes" }),
    ]);

    const shop = await signInAs(t, SHOP);
    const theirs = await shop.query(api.payments.declarations, {});
    expect(theirs.gstin).toBeUndefined();
    expect(theirs.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "gstStatus", value: "unregistered" }),
        expect.objectContaining({ kind: "msme", value: "micro" }),
      ]),
    );
  });

  it("falls back to the registration when nothing was declared", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const org = await orgBySlug(t, "peenya-paper-plastic-yard");
    await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("declarations")
        .withIndex("by_org_kind", (q) => q.eq("orgId", org._id))
        .collect();
      for (const row of rows) await ctx.db.delete("declarations", row._id);
    });
    const result = await yard.query(api.payments.declarations, {});
    expect(result.items.map((item) => item.source)).toEqual([
      "default",
      "default",
      "default",
    ]);
    expect(result.items[0]).toMatchObject({
      kind: "gstStatus",
      value: "registered",
    });
    expect(result.items[2]).toMatchObject({
      kind: "manufacturingUse",
      value: "no",
    });
  });

  it("saves a declaration, audits it, and the tax rules follow", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const id = await yard.mutation(api.payments.setDeclaration, {
      kind: "msme",
      value: "none",
    });
    expect(await auditActions(t, "declarations", id)).toEqual([
      "declaration.set",
    ]);
    const mine = await yard.query(api.payments.declarations, {});
    expect(mine.items.find((item) => item.kind === "msme")).toMatchObject({
      value: "none",
      source: "declared",
      validFrom: indiaToday(Date.now()),
    });

    // GreenLoop owes the yard for the HDPE: no 45-day clock any more.
    const recycler = await signInAs(t, RECYCLER);
    const hdpe = await entryFor(recycler, "payable", "PLASTIC-HDPE");
    expect(hdpe.msme).toBeNull();

    // The yard says it buys for manufacturing, from a chosen date.
    await yard.mutation(api.payments.setDeclaration, {
      kind: "manufacturingUse",
      value: "yes",
      validFrom: "2026-10-01",
    });
    const again = await yard.query(api.payments.declarations, {});
    expect(
      again.items.find((item) => item.kind === "manufacturingUse"),
    ).toMatchObject({ value: "yes", validFrom: "2026-10-01" });
  });

  it("refuses values that aren't on the list, bad dates and non-businesses", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    await expect(
      yard.mutation(api.payments.setDeclaration, {
        kind: "gstStatus",
        value: "maybe",
      }),
    ).rejects.toThrow(/INVALID_DECLARATION/);
    await expect(
      yard.mutation(api.payments.setDeclaration, {
        kind: "msme",
        value: "micro",
        validFrom: "1 Oct 2026",
      }),
    ).rejects.toThrow(/INVALID_DATE/);
    const saathi = await signInAs(t, SAATHI);
    await expect(
      saathi.mutation(api.payments.setDeclaration, {
        kind: "msme",
        value: "micro",
      }),
    ).rejects.toThrow(/NO_BUSINESS/);
    await expect(
      t.mutation(api.payments.setDeclaration, { kind: "msme", value: "micro" }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });
});
