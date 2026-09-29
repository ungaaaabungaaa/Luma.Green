import { describe, expect, it } from "vitest";

import {
  batchTotals,
  can,
  capacityUse,
  daysUntil,
  isIsoDate,
  mergeLines,
  netGramsOf,
  nextSlipNumber,
  normalizeVehicleNumber,
  qualityDefaults,
  reverificationMonths,
  ROLE_HOME,
  stampStatus,
  suggestedDeductionPct,
  suggestResult,
  TEAM_ROLES,
  weightMismatch,
} from "./quality";

describe("quality defaults", () => {
  it("holds paper to 12% moisture", () => {
    expect(
      qualityDefaults({ code: "PAPER-NEWS", family: "paper", stage: "scrap" }),
    ).toEqual([{ key: "moisture", limit: 12 }]);
  });

  it("adds the OCC rules for cardboard: prohibitives 1%, outthrows 5%", () => {
    expect(
      qualityDefaults({
        code: "PAPER-CARTON",
        family: "paper",
        stage: "scrap",
      }),
    ).toEqual([
      { key: "moisture", limit: 12 },
      { key: "prohibitives", limit: 1 },
      { key: "outthrows", limit: 5 },
    ]);
  });

  it("checks plastics for moisture, contamination and colour", () => {
    expect(
      qualityDefaults({
        code: "PLASTIC-PET",
        family: "plastic",
        stage: "scrap",
      }).map((limit) => limit.key),
    ).toEqual(["moisture", "contamination", "offColour"]);
  });

  it("holds recycled output to tighter limits than scrap", () => {
    const scrap = qualityDefaults({
      code: "PLASTIC-PET",
      family: "plastic",
      stage: "scrap",
    });
    const flakes = qualityDefaults({
      code: "RECYCLED-PET-FLAKE",
      family: "plastic",
      stage: "recycled",
    });
    for (const [index, limit] of flakes.entries()) {
      expect(limit.limit).toBeLessThan(scrap[index]!.limit);
    }
  });

  it("has a default for every family and never shares the array", () => {
    for (const family of [
      "paper",
      "plastic",
      "metal",
      "glass",
      "ewaste",
      "other",
    ] as const) {
      const first = qualityDefaults({ code: "X", family, stage: "scrap" });
      const second = qualityDefaults({ code: "X", family, stage: "scrap" });
      expect(first.length).toBeGreaterThan(0);
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    }
  });
});

describe("quality suggestion", () => {
  it("accepts readings within their limits", () => {
    const readings = [
      { key: "moisture" as const, value: 12, limit: 12 },
      { key: "contamination" as const, value: 0, limit: 2 },
    ];
    expect(suggestResult(readings)).toBe("accept");
    expect(suggestedDeductionPct(readings)).toBe(0);
  });

  it("deducts one per cent per per cent over the limit, at least one", () => {
    const readings = [
      { key: "moisture" as const, value: 14.5, limit: 12 },
      { key: "contamination" as const, value: 2.2, limit: 2 },
    ];
    expect(suggestResult(readings)).toBe("deduct");
    expect(suggestedDeductionPct(readings)).toBe(3);
    expect(
      suggestedDeductionPct([
        { key: "moisture" as const, value: 12.2, limit: 12 },
      ]),
    ).toBe(1);
  });

  it("refuses a load with prohibitives over the limit, and caps deductions", () => {
    expect(
      suggestResult([{ key: "prohibitives" as const, value: 1.5, limit: 1 }]),
    ).toBe("reject");
    expect(
      suggestedDeductionPct([
        { key: "moisture" as const, value: 90, limit: 12 },
      ]),
    ).toBe(50);
  });
});

describe("weight mismatch", () => {
  it("lets a 1% gap pass and flags anything more", () => {
    expect(weightMismatch(99_000, 100_000)).toEqual({
      differenceGrams: -1000,
      differencePct: 1,
      flagged: false,
    });
    expect(weightMismatch(98_990, 100_000)).toEqual({
      differenceGrams: -1010,
      differencePct: 1,
      flagged: true,
    });
    expect(weightMismatch(101_500, 100_000)).toEqual({
      differenceGrams: 1500,
      differencePct: 1.5,
      flagged: true,
    });
  });

  it("uses integer arithmetic, so 1 g over the line still counts", () => {
    expect(weightMismatch(1_010_001, 1_000_000).flagged).toBe(true);
    expect(weightMismatch(1_010_000, 1_000_000).flagged).toBe(false);
  });

  it("never divides by a zero trade", () => {
    expect(weightMismatch(500, 0)).toEqual({
      differenceGrams: 500,
      differencePct: 0,
      flagged: true,
    });
  });

  it("takes gross, tare and the deduction down to the net", () => {
    expect(netGramsOf(12_400_000, 4_150_000, 60_000)).toBe(8_190_000);
  });
});

describe("slips and plates", () => {
  it("numbers slips per business and per year", () => {
    expect(nextSlipNumber(undefined, "26")).toBe("WS-26-0001");
    expect(nextSlipNumber("WS-26-0041", "26")).toBe("WS-26-0042");
    expect(nextSlipNumber("WS-26-0041", "27")).toBe("WS-27-0001");
    expect(nextSlipNumber("garbage", "26")).toBe("WS-26-0001");
  });

  it("tidies plate numbers and refuses nonsense", () => {
    expect(normalizeVehicleNumber("  ka05  mj 1234 ")).toBe("KA05 MJ 1234");
    expect(normalizeVehicleNumber("KA-05-MJ-1234")).toBe("KA-05-MJ-1234");
    expect(normalizeVehicleNumber("auto")).toBe("AUTO");
    expect(normalizeVehicleNumber("")).toBeNull();
    expect(normalizeVehicleNumber("K")).toBeNull();
    expect(normalizeVehicleNumber("KA05MJ1234;drop")).toBeNull();
  });
});

describe("scale stamps", () => {
  it("re-verifies beam scales every 24 months, everything else every 12", () => {
    expect(reverificationMonths("beam")).toBe(24);
    expect(reverificationMonths("platform")).toBe(12);
    expect(reverificationMonths("weighbridge")).toBe(12);
    expect(reverificationMonths("spring")).toBe(12);
  });

  it("warns 30 days ahead and flags a stamp that has run out", () => {
    expect(stampStatus("2026-12-31", "2026-10-01")).toEqual({
      status: "ok",
      daysLeft: 91,
    });
    expect(stampStatus("2026-10-30", "2026-10-01")).toEqual({
      status: "expiring",
      daysLeft: 29,
    });
    expect(stampStatus("2026-10-31", "2026-10-01").status).toBe("ok");
    expect(stampStatus("2026-10-01", "2026-10-01")).toEqual({
      status: "expiring",
      daysLeft: 0,
    });
    expect(stampStatus("2026-09-30", "2026-10-01")).toEqual({
      status: "expired",
      daysLeft: -1,
    });
  });

  it("knows which dates exist", () => {
    expect(isIsoDate("2027-02-28")).toBe(true);
    expect(isIsoDate("2027-02-30")).toBe(false);
    expect(isIsoDate("30/06/2027")).toBe(false);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });
});

describe("production", () => {
  it("adds up a batch and gives the yield to one decimal", () => {
    expect(
      batchTotals(
        [{ materialCode: "PLASTIC-PET", grams: 1_800_000 }],
        [{ materialCode: "RECYCLED-PET-FLAKE", grams: 1_560_000 }],
      ),
    ).toEqual({
      inputGrams: 1_800_000,
      outputGrams: 1_560_000,
      yieldPct: 86.7,
    });
    expect(batchTotals([], []).yieldPct).toBe(0);
  });

  it("merges a material listed twice", () => {
    expect(
      mergeLines([
        { materialCode: "PAPER-NEWS", grams: 100 },
        { materialCode: "PAPER-CARTON", grams: 50 },
        { materialCode: "PAPER-NEWS", grams: 25 },
      ]),
    ).toEqual([
      { materialCode: "PAPER-NEWS", grams: 125 },
      { materialCode: "PAPER-CARTON", grams: 50 },
    ]);
  });

  it("shows capacity use as a share of the year, and flags going over", () => {
    expect(capacityUse(3_000_000_000, 12_000)).toEqual({
      pct: 25,
      over: false,
    });
    expect(capacityUse(12_600_000_000, 12_000)).toEqual({
      pct: 105,
      over: true,
    });
    expect(capacityUse(0, 12_000)).toEqual({ pct: 0, over: false });
    expect(capacityUse(1, 0)).toEqual({ pct: 0, over: true });
  });
});

describe("team roles", () => {
  it("lets only the owner manage the team", () => {
    expect(can("owner", "manage_team")).toBe(true);
    for (const role of TEAM_ROLES) {
      expect(can(role, "manage_team")).toBe(false);
    }
    expect(can("staff", "manage_team")).toBe(false);
  });

  it("gives each role its own job", () => {
    expect(can("gate", "record_slip")).toBe(true);
    expect(can("gate", "quality_check")).toBe(false);
    expect(can("quality", "quality_check")).toBe(true);
    expect(can("plant", "record_batch")).toBe(true);
    expect(can("plant", "set_capacity")).toBe(false);
    expect(can("compliance", "set_capacity")).toBe(true);
    expect(can("compliance", "manage_scales")).toBe(true);
    expect(can("accounts", "record_slip")).toBe(false);
  });

  it("sends every role to a screen that exists", () => {
    for (const role of ["owner", "staff", ...TEAM_ROLES] as const) {
      expect(ROLE_HOME[role]).toMatch(/^\/app/);
    }
  });
});
