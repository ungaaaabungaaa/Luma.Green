import { describe, expect, it } from "vitest";

import { paiseFor } from "./chain";
import {
  daysUntil,
  defaultDueAt,
  distanceKm,
  ewayBillCheck,
  gstRateBp,
  hsnFor,
  isMetalScrapHsn,
  ledgerStatus,
  msmeDueAt,
  msmeProtected,
  paymentWarnings,
  referenceRequired,
  selfInvoiceDueAt,
  TAX_RULES,
  taxBreakdown,
  type TaxInput,
} from "./tax";

const DAY = 24 * 60 * 60 * 1000;
const RUPEE = 100;

/** The research's worked example: 2,000 kg of PET at ₹38/kg. */
const PET_TRADE: TaxInput = {
  taxableValuePaise: paiseFor(2_000_000, 38 * RUPEE),
  materialCode: "PLASTIC-PET",
  family: "plastic",
  stage: "scrap",
  sellerRegistered: true,
  buyerRegistered: true,
  buyerManufacturingDeclaration: false,
  vehicle: "mini_truck",
};

describe("taxBreakdown", () => {
  it("2,000 kg PET at ₹38 = ₹76,000 + 18% GST = ₹89,680", () => {
    const result = taxBreakdown(PET_TRADE);
    expect(result.taxableValuePaise).toBe(76_000 * RUPEE);
    expect(result.gstRateBp).toBe(1800);
    expect(result.gstPaise).toBe(13_680 * RUPEE);
    expect(result.invoiceTotalPaise).toBe(89_680 * RUPEE);
    expect(result.reverseCharge).toBe(false);
    expect(result.hsn).toBe("39159029");
    expect(result.platformFeePaise).toBe(0);
    expect(result.notes).toContain("forwardCharge");
    expect(result.notes).toContain("noPlatformFee");
    expect(result.notes[0]).toBe("informational");
  });

  it("collects 2% TCS on the invoice from a buyer without a manufacturing declaration", () => {
    const result = taxBreakdown(PET_TRADE);
    // 2% of ₹89,680 = ₹1,793.60
    expect(result.tcsPaise).toBe(179_360);
    expect(result.tcsWaived).toBe(false);
    expect(result.buyerPaysSellerPaise).toBe(89_680 * RUPEE + 179_360);
    expect(result.sellerRemitsGovernmentPaise).toBe(
      13_680 * RUPEE + 179_360,
    );
    expect(result.buyerPaysGovernmentPaise).toBe(0);
  });

  it("waives TCS when the buyer declared manufacturing use", () => {
    const result = taxBreakdown({
      ...PET_TRADE,
      buyerManufacturingDeclaration: true,
    });
    expect(result.tcsPaise).toBe(0);
    expect(result.tcsWaived).toBe(true);
    expect(result.notes).toContain("tcsWaived");
    expect(result.buyerPaysSellerPaise).toBe(89_680 * RUPEE);
  });

  it("charges no GST or TCS when an unregistered kabadiwala sells paper", () => {
    const result = taxBreakdown({
      taxableValuePaise: 8_750 * RUPEE,
      materialCode: "PAPER-NEWS",
      family: "paper",
      stage: "scrap",
      sellerRegistered: false,
      buyerRegistered: true,
      buyerManufacturingDeclaration: false,
      vehicle: "auto",
    });
    expect(result.gstRateBp).toBe(500);
    expect(result.gstPaise).toBe(0);
    expect(result.reverseCharge).toBe(false);
    expect(result.tcsPaise).toBe(0);
    expect(result.invoiceTotalPaise).toBe(8_750 * RUPEE);
    expect(result.buyerPaysSellerPaise).toBe(8_750 * RUPEE);
    expect(result.notes).toEqual(
      expect.arrayContaining([
        "noGstUnregistered",
        "tcsSellerSmall",
        "ewayBillUnderLimit",
      ]),
    );
  });

  it("puts metal from an unregistered seller under reverse charge, with a 30-day self-invoice", () => {
    const result = taxBreakdown({
      taxableValuePaise: 60_000 * RUPEE,
      materialCode: "METAL-IRON",
      family: "metal",
      stage: "scrap",
      sellerRegistered: false,
      buyerRegistered: true,
      buyerManufacturingDeclaration: false,
      vehicle: "mini_truck",
    });
    expect(result.reverseCharge).toBe(true);
    expect(result.selfInvoiceDays).toBe(30);
    expect(result.gstPaise).toBe(10_800 * RUPEE);
    // The seller's document carries no GST; the buyer pays it to the government.
    expect(result.invoiceGstPaise).toBe(0);
    expect(result.invoiceTotalPaise).toBe(60_000 * RUPEE);
    expect(result.buyerPaysSellerPaise).toBe(60_000 * RUPEE);
    expect(result.buyerPaysGovernmentPaise).toBe(10_800 * RUPEE);
    expect(result.notes).toEqual(
      expect.arrayContaining(["reverseCharge", "selfInvoice"]),
    );
    // Over ₹50,000 by motor vehicle: the registered buyer raises the e-way bill.
    expect(result.ewayBill.needed).toBe(true);
    expect(result.ewayBill.raisedBy).toBe("buyer");
  });

  it("does not apply reverse charge when the buyer is unregistered too", () => {
    const result = taxBreakdown({
      taxableValuePaise: 20_000 * RUPEE,
      materialCode: "METAL-IRON",
      family: "metal",
      stage: "scrap",
      sellerRegistered: false,
      buyerRegistered: false,
      buyerManufacturingDeclaration: false,
    });
    expect(result.reverseCharge).toBe(false);
    expect(result.gstPaise).toBe(0);
    expect(result.ewayBill.raisedBy).toBe("none");
  });

  it("deducts 2% GST TDS on metal between registered businesses over ₹2.5 lakh", () => {
    const base: TaxInput = {
      taxableValuePaise: 300_000 * RUPEE,
      materialCode: "METAL-ALU",
      family: "metal",
      stage: "scrap",
      sellerRegistered: true,
      buyerRegistered: true,
      buyerManufacturingDeclaration: true,
      vehicle: "truck",
    };
    const over = taxBreakdown(base);
    expect(over.gstTdsPaise).toBe(6_000 * RUPEE);
    expect(over.gstPaise).toBe(54_000 * RUPEE);
    expect(over.buyerPaysSellerPaise).toBe((354_000 - 6_000) * RUPEE);
    expect(over.buyerPaysGovernmentPaise).toBe(6_000 * RUPEE);
    expect(over.notes).toContain("gstTds");

    const under = taxBreakdown({ ...base, taxableValuePaise: 250_000 * RUPEE });
    expect(under.gstTdsPaise).toBe(0);
    expect(under.notes).not.toContain("gstTds");

    const paper = taxBreakdown({
      ...base,
      materialCode: "PAPER-CARTON",
      family: "paper",
    });
    expect(paper.gstTdsPaise).toBe(0);
  });

  it("treats recycled output as goods, not scrap: 18% GST and no TCS", () => {
    const result = taxBreakdown({
      taxableValuePaise: 400_000 * RUPEE,
      materialCode: "RECYCLED-KRAFT",
      family: "paper",
      stage: "recycled",
      sellerRegistered: true,
      buyerRegistered: true,
      buyerManufacturingDeclaration: false,
    });
    expect(result.gstRateBp).toBe(1800);
    expect(result.tcsPaise).toBe(0);
    expect(result.notes).toContain("tcsNotScrap");
    expect(result.hsn).toBe("48041100");
  });

  it("prefers the catalogue's HSN when it has one", () => {
    const result = taxBreakdown({ ...PET_TRADE, catalogueHsn: "39159010" });
    expect(result.hsn).toBe("39159010");
  });
});

describe("HSN and rates", () => {
  it("knows the headings by code, then by family", () => {
    expect(hsnFor("PAPER-NEWS", "paper", "scrap")).toBe("47073000");
    expect(hsnFor("NEW-METAL", "metal", "scrap")).toBe("7204");
    expect(hsnFor("NEW-PLASTIC", "plastic", "recycled")).toBe("3901");
  });

  it("reads the rate from the heading", () => {
    expect(gstRateBp("4707", "paper", "scrap")).toBe(500);
    expect(gstRateBp("70010010", "glass", "scrap")).toBe(500);
    expect(gstRateBp("63109010", "other", "scrap")).toBe(500);
    expect(gstRateBp("3915", "plastic", "scrap")).toBe(1800);
    expect(gstRateBp("85491300", "ewaste", "scrap")).toBe(1800);
    expect(gstRateBp("74040012", "metal", "scrap")).toBe(1800);
    expect(gstRateBp("0000", "paper", "recycled")).toBe(1800);
    expect(gstRateBp("0000", "paper", "scrap")).toBe(500);
  });

  it("recognises chapters 72–81 as metal", () => {
    expect(isMetalScrapHsn("72044900")).toBe(true);
    expect(isMetalScrapHsn("76020010")).toBe(true);
    expect(isMetalScrapHsn("81")).toBe(true);
    expect(isMetalScrapHsn("3915")).toBe(false);
    expect(isMetalScrapHsn("8549")).toBe(false);
  });
});

describe("ewayBillCheck", () => {
  const load = {
    valuePaise: 89_680 * RUPEE,
    sellerRegistered: true,
    buyerRegistered: true,
  };

  it("needs one over ₹50,000 by motor vehicle, and never for a handcart or cycle", () => {
    expect(ewayBillCheck({ ...load, vehicle: "mini_truck" }).needed).toBe(true);
    expect(ewayBillCheck({ ...load, vehicle: "handcart" })).toMatchObject({
      needed: false,
      motorised: false,
      overLimit: true,
      raisedBy: "none",
      note: "ewayBillNonMotor",
    });
    expect(ewayBillCheck({ ...load, vehicle: "cycle" }).needed).toBe(false);
  });

  it("needs none at or under the limit", () => {
    expect(
      ewayBillCheck({
        ...load,
        valuePaise: TAX_RULES.ewayBillLimitPaise,
        vehicle: "truck",
      }),
    ).toMatchObject({ needed: false, note: "ewayBillUnderLimit" });
  });

  it("is raised by the registered party: the seller, else the buyer", () => {
    expect(ewayBillCheck({ ...load, vehicle: "auto" }).raisedBy).toBe("seller");
    expect(
      ewayBillCheck({ ...load, vehicle: "auto", sellerRegistered: false })
        .raisedBy,
    ).toBe("buyer");
    expect(
      ewayBillCheck({
        ...load,
        vehicle: "auto",
        sellerRegistered: false,
        buyerRegistered: false,
      }).raisedBy,
    ).toBe("none");
  });

  it("is valid one day per 200 km, and Part B can wait within 50 km", () => {
    expect(
      ewayBillCheck({ ...load, vehicle: "truck", distanceKm: 30 }),
    ).toMatchObject({ validityDays: 1, partBOptional: true });
    expect(
      ewayBillCheck({ ...load, vehicle: "truck", distanceKm: 200 }),
    ).toMatchObject({ validityDays: 1, partBOptional: false });
    expect(
      ewayBillCheck({ ...load, vehicle: "truck", distanceKm: 201 }).validityDays,
    ).toBe(2);
    expect(ewayBillCheck({ ...load, vehicle: "truck" }).validityDays).toBe(
      null,
    );
  });

  it("measures the road between two demo businesses roughly", () => {
    // Yeshwanthpur to Peenya: a couple of kilometres.
    const km = distanceKm(
      { lat: 13.028, lng: 77.5409 },
      { lat: 13.0285, lng: 77.519 },
    );
    expect(km).toBeGreaterThanOrEqual(2);
    expect(km).toBeLessThanOrEqual(3);
    // Bommasandra to Nelamangala: across the city.
    expect(
      distanceKm({ lat: 12.8155, lng: 77.697 }, { lat: 13.099, lng: 77.393 }),
    ).toBeGreaterThan(40);
  });
});

describe("paymentWarnings", () => {
  it("warns about cash above ₹10,000 and at ₹2 lakh", () => {
    expect(paymentWarnings("cash", 10_000 * RUPEE)).toEqual([]);
    expect(paymentWarnings("cash", 10_001 * RUPEE)).toEqual([
      "cashNotDeductible",
    ]);
    expect(paymentWarnings("cash", 200_000 * RUPEE)).toEqual([
      "cashOverReceiptLimit",
    ]);
  });

  it("warns about UPI above ₹1 lakh and nothing else", () => {
    expect(paymentWarnings("upi", 100_000 * RUPEE)).toEqual([]);
    expect(paymentWarnings("upi", 100_001 * RUPEE)).toEqual(["upiOverLimit"]);
    expect(paymentWarnings("neft", 5_000_000 * RUPEE)).toEqual([]);
    expect(paymentWarnings("rtgs", 5_000_000 * RUPEE)).toEqual([]);
  });

  it("needs a reference for everything but cash", () => {
    expect(referenceRequired("cash")).toBe(false);
    expect(referenceRequired("upi")).toBe(true);
    expect(referenceRequired("escrow")).toBe(true);
  });
});

describe("the khata", () => {
  const now = Date.parse("2026-10-13T09:00:00+05:30");

  it("moves open → part → settled as payments arrive", () => {
    const entry = { duePaise: 10_000, paidPaise: 0, dueAt: now + 5 * DAY };
    expect(ledgerStatus(entry, now)).toBe("open");
    expect(ledgerStatus({ ...entry, paidPaise: 4_000 }, now)).toBe("part");
    expect(ledgerStatus({ ...entry, paidPaise: 10_000 }, now)).toBe("settled");
    expect(ledgerStatus({ ...entry, paidPaise: 12_000 }, now)).toBe("settled");
  });

  it("is overdue once the due date has passed, unless settled", () => {
    const late = { duePaise: 10_000, paidPaise: 4_000, dueAt: now - DAY };
    expect(ledgerStatus(late, now)).toBe("overdue");
    expect(ledgerStatus({ ...late, paidPaise: 0 }, now)).toBe("overdue");
    expect(ledgerStatus({ ...late, paidPaise: 10_000 }, now)).toBe("settled");
  });

  it("counts days to a date, negative once it has passed", () => {
    expect(daysUntil(now + 3 * DAY, now)).toBe(3);
    expect(daysUntil(now + 2.5 * DAY, now)).toBe(3);
    expect(daysUntil(now - 2 * DAY, now)).toBe(-2);
  });

  it("knows the 30-day terms, the 45-day MSME clock and the 30-day self-invoice", () => {
    expect(defaultDueAt(now)).toBe(now + 30 * DAY);
    expect(msmeDueAt(now)).toBe(now + 45 * DAY);
    expect(selfInvoiceDueAt(now)).toBe(now + 30 * DAY);
    expect(msmeProtected("micro")).toBe(true);
    expect(msmeProtected("small")).toBe(true);
    expect(msmeProtected("medium")).toBe(false);
    expect(msmeProtected("none")).toBe(false);
    expect(msmeProtected(undefined)).toBe(false);
  });
});
