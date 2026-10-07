/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import {
  checklistFor,
  consentStatus,
  EPR_REGIME,
  eprStream,
  familyTotals,
  financialYear,
} from "./insights";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import { shiftDate } from "./lib/dates";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

/** Noon in Bengaluru on 29 Sep 2026 — the demo world is seeded around it. */
const NOW = new Date("2026-09-29T06:30:00Z");
const TODAY = "2026-09-29";

const PHONES = {
  kabadiwala: "+919000000101", // Ramesh Kabadi Store
  yard: "+919000000102", // Peenya Paper & Plastic Yard
  recycler: "+919000000103", // GreenLoop Polymers
  manufacturer: "+919000000104", // Deccan Packaging
  saathi: "+919000000105", // Lakshmi Devi
  applicant: "+919000000107", // waiting for the admin
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
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

async function setConsent(t: Test, slug: string, validUntil: string) {
  await t.run(async (ctx) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!org?.consent) throw new Error(`No consent for ${slug}`);
    await ctx.db.patch("orgs", org._id, {
      consent: { ...org.consent, validUntil },
    });
  });
}

// --- Pure rules ---------------------------------------------------------------

describe("consent status", () => {
  it("is missing when there's no usable date", () => {
    expect(consentStatus(undefined, TODAY)).toEqual({
      status: "missing",
      daysLeft: null,
    });
    expect(consentStatus("", TODAY).status).toBe("missing");
    expect(consentStatus("31/12/2026", TODAY).status).toBe("missing");
  });

  it("is good through its last day, then expired", () => {
    expect(consentStatus(TODAY, TODAY)).toEqual({
      status: "expiring",
      daysLeft: 0,
    });
    expect(consentStatus(shiftDate(TODAY, -1), TODAY)).toEqual({
      status: "expired",
      daysLeft: -1,
    });
  });

  it("flags renewal under 90 days left", () => {
    expect(consentStatus(shiftDate(TODAY, 89), TODAY)).toEqual({
      status: "expiring",
      daysLeft: 89,
    });
    expect(consentStatus(shiftDate(TODAY, 90), TODAY)).toEqual({
      status: "ok",
      daysLeft: 90,
    });
    // Across a leap day: 2028 has 29 February.
    expect(consentStatus("2028-03-01", "2028-02-28")).toEqual({
      status: "expiring",
      daysLeft: 2,
    });
  });
});

describe("the compliance checklist", () => {
  it("doesn't ask a small scrap shop for GST or a consent", () => {
    expect(checklistFor("kabadiwala", false, "missing")).toEqual([
      { id: "gst", status: "optional" },
      { id: "consent", status: "not_needed" },
      { id: "scale", status: "self_declared" },
      { id: "safety", status: "self_declared" },
    ]);
  });

  it("asks yards, recyclers and factories for both", () => {
    expect(checklistFor("yard", false, "missing").slice(0, 2)).toEqual([
      { id: "gst", status: "missing" },
      { id: "consent", status: "missing" },
    ]);
    expect(checklistFor("recycler", true, "ok")[0]).toEqual({
      id: "gst",
      status: "done",
    });
  });

  it("follows the consent's validity", () => {
    expect(
      (["ok", "expiring", "expired"] as const).map(
        (status) => checklistFor("manufacturer", true, status)[1]?.status,
      ),
    ).toEqual(["done", "due_soon", "overdue"]);
  });
});

describe("the financial year", () => {
  it("runs from April to March", () => {
    expect(financialYear("2026-09-29")).toEqual({
      from: "2026-04-01",
      to: "2027-03-31",
      startYear: 2026,
    });
    expect(financialYear("2027-03-31").startYear).toBe(2026);
    expect(financialYear("2027-04-01").startYear).toBe(2027);
    expect(financialYear("2026-01-15").startYear).toBe(2025);
  });
});

describe("EPR rules", () => {
  it("names the rules for plastic, e-waste and batteries, and none for the rest", () => {
    const regime = (code: string, family: "plastic" | "ewaste" | "paper") =>
      EPR_REGIME[eprStream({ code, family })];
    expect(regime("PLASTIC-PET", "plastic")).toBe("pwm_2016");
    expect(regime("EWASTE-PHONE", "ewaste")).toBe("ewaste_2022");
    expect(regime("EWASTE-BATTERY", "ewaste")).toBe("bwm_2022");
    expect(regime("PAPER-NEWS", "paper")).toBeNull();
    expect(EPR_REGIME.metal).toBeNull();
    expect(EPR_REGIME.glass).toBeNull();
  });
});

describe("kilos and CO2e by family", () => {
  const materials = new Map(
    [
      { code: "PAPER-NEWS", family: "paper", co2eFactor: 1 },
      { code: "METAL-IRON", family: "metal", co2eFactor: 1.5 },
      { code: "METAL-ALU", family: "metal", co2eFactor: 9 },
      { code: "PLASTIC-MIXED", family: "plastic", co2eFactor: 0.8 },
    ].map((material) => [
      material.code,
      {
        ...material,
        family: material.family as "paper" | "metal" | "plastic",
        stage: "scrap" as const,
        names: { en: material.code },
      },
    ]),
  );

  it("counts a kilo that came in and moved on only once", () => {
    expect(
      familyTotals(
        [{ materialCode: "PAPER-NEWS", grams: 10_000 }],
        [{ materialCode: "PAPER-NEWS", grams: 8000 }],
        materials,
      ),
    ).toEqual([{ family: "paper", grams: 10_000, co2eKg: 10 }]);
  });

  it("takes the CO2e from the side the kilos came from", () => {
    expect(
      familyTotals(
        [{ materialCode: "METAL-IRON", grams: 100_000 }],
        [{ materialCode: "METAL-ALU", grams: 50_000 }],
        materials,
      ),
    ).toEqual([{ family: "metal", grams: 100_000, co2eKg: 150 }]);
  });

  it("keeps families apart, biggest first, and never loses a gram", () => {
    expect(
      familyTotals(
        [
          { materialCode: "PAPER-NEWS", grams: 1001 },
          { materialCode: "PLASTIC-MIXED", grams: 1 },
          { materialCode: "UNKNOWN", grams: 5000 },
        ],
        [],
        materials,
      ),
    ).toEqual([
      { family: "other", grams: 5000, co2eKg: null },
      { family: "paper", grams: 1001, co2eKg: 1.001 },
      { family: "plastic", grams: 1, co2eKg: 0.001 },
    ]);
  });
});

// --- Impact on the demo world ------------------------------------------------------

describe("impact", () => {
  it("keeps physical totals but marks the estimate unknown when a factor is absent", async () => {
    const t = await demoWorld();
    await t.run(async (ctx) => {
      const material = await ctx.db
        .query("materials")
        .withIndex("by_code", (q) => q.eq("code", "PAPER-NEWS"))
        .unique();
      if (!material) throw new Error("Missing fixture material");
      await ctx.db.patch(material._id, { co2eFactor: undefined });
    });
    const user = await signInAs(t, PHONES.kabadiwala);
    const result = await user.query(api.insights.impact, {});
    expect(result).toMatchObject({
      kind: "org",
      recycledGrams: 433_950,
      co2eKg: null,
    });
    if (result.kind !== "org") throw new Error("Expected business impact");
    expect(result.families.find(({ family }) => family === "paper")).toEqual({
      family: "paper",
      grams: 400_000,
      co2eKg: null,
    });
    expect(
      result.families.find(({ family }) => family === "metal")?.co2eKg,
    ).toBeCloseTo(43.65);
  });
  it("adds up a kabadiwala's pickups and sales", async () => {
    const t = await demoWorld();
    const ramesh = await signInAs(t, PHONES.kabadiwala);
    const impact = await ramesh.query(api.insights.impact, {});
    if (impact.kind !== "org") throw new Error("expected a business");

    // Three completed pickups: 81.48 kg for ₹1,587.41, weighed at 97% of
    // the estimate and priced from the shop's rate card.
    expect(impact.households).toEqual({
      grams: 81_480,
      paise: 158_741,
      count: 3,
    });
    // 400 kg of newspaper sold to the yard at ₹17.50/kg.
    expect(impact.sold).toEqual({ grams: 400_000, paise: 700_000, count: 1 });
    expect(impact.bought).toEqual({ grams: 0, paise: 0, count: 0 });
    // Paper counts once: the 400 kg that moved on is more than the 47.53 kg
    // that came in. Metal and plastic count as they came in.
    expect(impact.families).toEqual([
      { family: "paper", grams: 400_000, co2eKg: 400 },
      { family: "metal", grams: 29_100, co2eKg: 43.65 },
      { family: "plastic", grams: 4850, co2eKg: 4.85 },
    ]);
    expect(impact.recycledGrams).toBe(433_950);
    expect(impact.co2eKg).toBe(448.5);
    expect(impact.since).toBeLessThan(NOW.getTime());
  });

  it("follows material up the chain: yard, recycler, factory", async () => {
    const t = await demoWorld();

    const farida = await signInAs(t, PHONES.yard);
    const yard = await farida.query(api.insights.impact, {});
    expect(yard).toMatchObject({
      kind: "org",
      orgKind: "yard",
      households: { grams: 0, paise: 0, count: 0 },
      bought: { grams: 400_000, paise: 700_000, count: 1 },
      sold: { grams: 800_000, paise: 3_360_000, count: 1 },
      recycledGrams: 1_200_000,
      co2eKg: 1200,
    });

    const suresh = await signInAs(t, PHONES.recycler);
    const recycler = await suresh.query(api.insights.impact, {});
    // 800 kg of HDPE in, 2.5 t of granules out: the same family, so the
    // larger side counts and nothing is counted twice.
    expect(recycler).toMatchObject({
      kind: "org",
      bought: { grams: 800_000, count: 1 },
      sold: { grams: 2_500_000, paise: 17_500_000, count: 1 },
      recycledGrams: 2_500_000,
      co2eKg: 2500,
      families: [{ family: "plastic", grams: 2_500_000, co2eKg: 2500 }],
    });

    const anita = await signInAs(t, PHONES.manufacturer);
    const factory = await anita.query(api.insights.impact, {});
    // Payments still in escrow or not yet accepted don't count.
    expect(factory).toMatchObject({
      kind: "org",
      bought: { grams: 2_500_000, paise: 17_500_000, count: 1 },
      sold: { grams: 0, paise: 0, count: 0 },
      recycledGrams: 2_500_000,
    });
  });

  it("shows a Saathi their jobs and earnings", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, PHONES.saathi);
    const impact = await lakshmi.query(api.insights.impact, {});
    expect(impact).toMatchObject({
      kind: "saathi",
      totalPaise: 110_000,
      jobsDone: 2,
      weekPaise: 110_000,
      weekJobs: 2,
      byKind: [
        { kind: "yard_sorting", jobs: 1, paise: 70_000 },
        { kind: "home_pickups", jobs: 1, paise: 40_000 },
      ],
    });
    if (impact.kind !== "saathi") throw new Error("expected a Saathi");
    expect(impact.recent.map((job) => job.title)).toEqual([
      "Sorting shift: cartons",
      "Home pickups, 5 houses",
    ]);
  });

  it("needs a business or a Saathi profile", async () => {
    const t = await demoWorld();
    await expect(t.query(api.insights.impact, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const irfan = await signInAs(t, PHONES.applicant);
    await expect(irfan.query(api.insights.impact, {})).rejects.toThrow(
      /NO_WORKSPACE/,
    );
  });
});

// --- Compliance on the demo world ----------------------------------------------------

describe("compliance", () => {
  it("gives a yard its GST, consent, checklist and unverified old references", async () => {
    const t = await demoWorld();
    const farida = await signInAs(t, PHONES.yard);
    const record = await farida.query(api.insights.compliance, {});

    expect(record.gstin).toBe("29ABCPE1234F1Z5");
    expect(record.consent).toEqual({
      status: "ok",
      board: "KSPCB",
      number: "KSPCB/CFO/2025/1187",
      validUntil: "2027-06-30",
      daysLeft: 274,
      remindOn: "2027-04-01",
    });
    expect(record.checklist).toEqual([
      { id: "gst", status: "done" },
      { id: "consent", status: "done" },
      { id: "scale", status: "self_declared" },
      { id: "safety", status: "self_declared" },
    ]);
    // Newest first; old LG numbers are preserved without payment proof.
    expect(
      record.receipts.map((receipt) => [
        receipt.legacyReceiptNo,
        receipt.paymentVerification,
        receipt.side,
        receipt.counterparty?.name,
        receipt.needsEwayBill,
      ]),
    ).toEqual([
      [
        "LG-26-0002",
        "legacy_unverified",
        "purchase",
        "Ramesh Kabadi Store",
        false,
      ],
      ["LG-26-0004", "legacy_unverified", "sale", "GreenLoop Polymers", true],
      [
        "LG-26-0001",
        "legacy_unverified",
        "purchase",
        "Ramesh Kabadi Store",
        false,
      ],
      ["LG-26-0005", "legacy_unverified", "sale", "GreenLoop Polymers", false],
    ]);
    expect(record.epr).toBeNull();
  });

  it("shows a kabadiwala only their own old references, and asks for no consent", async () => {
    const t = await demoWorld();
    const ramesh = await signInAs(t, PHONES.kabadiwala);
    const record = await ramesh.query(api.insights.compliance, {});

    expect(record.gstin).toBeNull();
    expect(record.consent).toEqual({ status: "missing" });
    expect(record.checklist.slice(0, 2)).toEqual([
      { id: "gst", status: "optional" },
      { id: "consent", status: "not_needed" },
    ]);
    expect(record.receipts.map((receipt) => receipt.legacyReceiptNo)).toEqual([
      "LG-26-0002",
      "LG-26-0001",
    ]);
    expect(record.receipts.every((receipt) => receipt.side === "sale")).toBe(
      true,
    );
  });

  it("keeps a recycler's EPR record for the financial year", async () => {
    const t = await demoWorld();
    const suresh = await signInAs(t, PHONES.recycler);
    // A delivery completed on 31 March belongs to the year before.
    await t.run(async (ctx) => {
      const greenloop = await ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", "greenloop-polymers"))
        .unique();
      const peenya = await ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", "peenya-paper-plastic-yard"))
        .unique();
      const listing = await ctx.db.query("listings").first();
      if (!greenloop || !peenya || !listing) throw new Error("demo missing");
      const lastYear = Date.parse("2026-03-31T18:00:00+05:30");
      await ctx.db.insert("trades", {
        listingId: listing._id,
        sellerOrgId: peenya._id,
        buyerOrgId: greenloop._id,
        materialCode: "PLASTIC-PET",
        grams: 999_000,
        paisePerKg: 3800,
        totalPaise: 3_796_200,
        status: "completed",
        timeline: [{ status: "completed", at: lastYear }],
        invoiceNo: "LG-25-9999",
        createdAt: lastYear,
        updatedAt: lastYear,
      });
    });

    const record = await suresh.query(api.insights.compliance, {});
    expect(record.epr).toEqual({
      role: "recycler",
      evidenceStatus: "source_records_unverified",
      from: "2026-04-01",
      to: "2027-03-31",
      rows: [
        {
          stream: "plastic",
          regime: "pwm_2016",
          receivedGrams: 800_000,
          recycledGrams: 2_500_000,
        },
      ],
    });
  });

  it("keeps a manufacturer's recycled content for the year", async () => {
    const t = await demoWorld();
    const anita = await signInAs(t, PHONES.manufacturer);
    const record = await anita.query(api.insights.compliance, {});
    expect(record.epr).toEqual({
      role: "manufacturer",
      evidenceStatus: "source_records_unverified",
      from: "2026-04-01",
      to: "2027-03-31",
      rows: [
        {
          stream: "plastic",
          regime: "pwm_2016",
          receivedGrams: 2_500_000,
          recycledGrams: 0,
        },
      ],
    });
    expect(
      record.receipts.map((receipt) => [
        receipt.legacyReceiptNo,
        receipt.needsEwayBill,
      ]),
    ).toEqual([
      ["LG-26-0006", true],
      ["LG-26-0007", true],
    ]);
  });

  it("warns before a consent runs out, and after", async () => {
    const t = await demoWorld();
    const farida = await signInAs(t, PHONES.yard);

    await setConsent(t, "peenya-paper-plastic-yard", shiftDate(TODAY, 30));
    let record = await farida.query(api.insights.compliance, {});
    expect(record.consent).toMatchObject({ status: "expiring", daysLeft: 30 });
    expect(record.consent.remindOn).toBeUndefined();
    expect(record.checklist[1]).toEqual({ id: "consent", status: "due_soon" });

    await setConsent(t, "peenya-paper-plastic-yard", shiftDate(TODAY, -1));
    record = await farida.query(api.insights.compliance, {});
    expect(record.consent).toMatchObject({ status: "expired", daysLeft: -1 });
    expect(record.checklist[1]).toEqual({ id: "consent", status: "overdue" });
  });

  it("is only for businesses", async () => {
    const t = await demoWorld();
    await expect(t.query(api.insights.compliance, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const lakshmi = await signInAs(t, PHONES.saathi);
    await expect(lakshmi.query(api.insights.compliance, {})).rejects.toThrow(
      /NO_BUSINESS/,
    );
    const irfan = await signInAs(t, PHONES.applicant);
    await expect(irfan.query(api.insights.compliance, {})).rejects.toThrow(
      /NO_BUSINESS/,
    );
  });
});
