import { describe, expect, it } from "vitest";

import {
  bandProblem,
  computeBoard,
  defaultBand,
  floorToHalfRupee,
  freshDaysLeft,
  honourRate,
  isFresh,
  isInBand,
  median,
  mergeRelated,
  movePct,
  type OrgValue,
  orgValues,
  parsePriceCsv,
  requiresNote,
  roundToHalfRupee,
  rupeesToPaise,
  suggestedFallback,
  suggestedFloor,
  trimOutliers,
  weekChangePct,
  weightedMedian,
  windowDaysFor,
} from "./priceMath";

const DAY = 24 * 60 * 60 * 1000;

function value(
  orgId: string,
  rupees: number,
  overrides: Partial<OrgValue> = {},
): OrgValue {
  return {
    orgId,
    paisePerKg: rupees * 100,
    weight: 1,
    trades: 1,
    grams: 5000,
    ...overrides,
  };
}

describe("rounding", () => {
  it("rounds to the half rupee both ways", () => {
    expect(roundToHalfRupee(1437)).toBe(1450);
    expect(roundToHalfRupee(1424)).toBe(1400);
    expect(floorToHalfRupee(1437)).toBe(1400);
    expect(floorToHalfRupee(1499)).toBe(1450);
  });

  it("reads rupees the way people type them", () => {
    expect(rupeesToPaise("14")).toBe(1400);
    expect(rupeesToPaise("14.5")).toBe(1450);
    expect(rupeesToPaise(" ₹ 1,400.50 ")).toBe(140_050);
    for (const bad of ["", "-1", "14.355", "abc", "1e3", ".5"]) {
      expect(rupeesToPaise(bad)).toBeNull();
    }
  });

  it("gives the move in percent to one decimal, or nothing from zero", () => {
    expect(movePct(1100, 1150)).toBe(4.5);
    expect(movePct(1000, 900)).toBe(-10);
    expect(movePct(0, 900)).toBeNull();
  });
});

describe("medians", () => {
  it("takes the middle value, or the mean of the two middle ones", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("weighs newspaper the way the spec does: ₹11.50", () => {
    // K1 card 10.00 (½), K2 receipts 11.00, K4 11.50, K3 12.00 (1 each).
    expect(
      weightedMedian([
        { value: 1000, weight: 0.5 },
        { value: 1100, weight: 1 },
        { value: 1150, weight: 1 },
        { value: 1200, weight: 1 },
      ]),
    ).toBe(1150);
  });

  it("weighs cans the way the spec does: ₹60", () => {
    // K1 card 55 (½), K2 receipts 60 (1), K3 one small receipt 60 (½), K5 card 70 (½).
    expect(
      weightedMedian([
        { value: 5500, weight: 0.5 },
        { value: 6000, weight: 1 },
        { value: 6000, weight: 0.5 },
        { value: 7000, weight: 0.5 },
      ]),
    ).toBe(6000);
  });

  it("ignores zero weights and has nothing to say about nothing", () => {
    expect(weightedMedian([])).toBeNull();
    expect(weightedMedian([{ value: 100, weight: 0 }])).toBeNull();
  });
});

describe("one value per business", () => {
  it("uses the median of a business's trades, weighted 1, or ½ under a kilo", () => {
    const values = orgValues([
      { orgId: "k2", paisePerKg: 1100, source: "receipt", grams: 40_000 },
      { orgId: "k2", paisePerKg: 1200, source: "receipt", grams: 44_000 },
      { orgId: "k2", paisePerKg: 1000, source: "rateCard" },
      { orgId: "k3", paisePerKg: 6000, source: "receipt", grams: 600 },
      { orgId: "k1", paisePerKg: 1000, source: "rateCard" },
      { orgId: "k1", paisePerKg: 1050, source: "survey" },
    ]);
    expect(values).toEqual([
      { orgId: "k2", paisePerKg: 1150, weight: 1, trades: 2, grams: 84_000 },
      { orgId: "k3", paisePerKg: 6000, weight: 0.5, trades: 1, grams: 600 },
      { orgId: "k1", paisePerKg: 1025, weight: 0.5, trades: 0, grams: 0 },
    ]);
  });

  it("drops values over 30% from the median only with four or more businesses", () => {
    const three = [value("a", 10), value("b", 11), value("c", 25)];
    expect(trimOutliers(three).dropped).toEqual([]);

    const four = [...three, value("d", 12)];
    const { kept, dropped } = trimOutliers(four);
    expect(dropped.map((v) => v.orgId)).toEqual(["c"]);
    expect(kept.map((v) => v.orgId)).toEqual(["a", "b", "d"]);
  });

  it("reads a fortnight when fewer than three businesses reported this week", () => {
    expect(windowDaysFor(2)).toBe(14);
    expect(windowDaysFor(3)).toBe(7);
  });

  it("merges businesses that share a phone, owner or GSTIN", () => {
    const groups = mergeRelated([
      { id: "a", keys: ["phone:+919000000101"] },
      { id: "b", keys: ["phone:+919000000102", "gstin:29X"] },
      { id: "c", keys: ["gstin:29x", ""] },
      { id: "d", keys: ["phone:+919000000101"] },
    ]);
    expect(groups.get("a")).toBe("a");
    expect(groups.get("d")).toBe("a");
    expect(groups.get("b")).toBe("b");
    expect(groups.get("c")).toBe("b");
  });
});

describe("computeBoard", () => {
  const newspaper = [
    value("k1", 10, { weight: 0.5, trades: 0, grams: 0 }),
    value("k2", 11, { trades: 6, grams: 84_000 }),
    value("k3", 12, { trades: 5, grams: 61_000 }),
    value("k4", 11.5, { trades: 3, grams: 40_000 }),
  ];

  it("publishes the spec's newspaper line: ₹10–12, typical ₹11.50, Live", () => {
    const line = computeBoard({
      values: newspaper,
      floorPaise: 750,
      fallbackPaise: 1000,
      maxDailyMovePct: 10,
      previousTypical: 1100,
    });
    expect(line).toMatchObject({
      status: "live",
      typicalPaise: 1150,
      lowPaise: 1000,
      highPaise: 1200,
      nOrgs: 4,
      nTrades: 14,
      heldPaise: null,
      droppedOutliers: 0,
    });
  });

  it("is Guide without three businesses, and shows the fallback", () => {
    const line = computeBoard({
      values: [value("k2", 11), value("k3", 12)],
      floorPaise: 750,
      fallbackPaise: 1000,
      maxDailyMovePct: 10,
      previousTypical: null,
    });
    expect(line).toMatchObject({
      status: "guide",
      typicalPaise: 1000,
      lowPaise: 1100,
      highPaise: 1200,
      nOrgs: 2,
    });
  });

  it("is Guide when every business only quoted, however many", () => {
    const line = computeBoard({
      values: ["a", "b", "c", "d"].map((id) =>
        value(id, 10, { weight: 0.5, trades: 0, grams: 0 }),
      ),
      floorPaise: null,
      fallbackPaise: 1100,
      maxDailyMovePct: 10,
      previousTypical: null,
    });
    expect(line.status).toBe("guide");
    expect(line.typicalPaise).toBe(1100);
  });

  it("falls back to the computed value where the admin has set none", () => {
    const line = computeBoard({
      values: [value("k2", 11)],
      floorPaise: null,
      fallbackPaise: null,
      maxDailyMovePct: 10,
      previousTypical: null,
    });
    expect(line).toMatchObject({ status: "guide", typicalPaise: 1100 });
    expect(
      computeBoard({
        values: [],
        floorPaise: null,
        fallbackPaise: null,
        maxDailyMovePct: 10,
        previousTypical: null,
      }).typicalPaise,
    ).toBeNull();
  });

  it("holds a move over the daily limit at yesterday's price until confirmed", () => {
    const held = computeBoard({
      values: newspaper,
      floorPaise: null,
      fallbackPaise: null,
      maxDailyMovePct: 10,
      previousTypical: 1000,
    });
    expect(held).toMatchObject({
      status: "live",
      typicalPaise: 1000,
      heldPaise: 1150,
      heldPct: 15,
    });

    const confirmed = computeBoard({
      values: newspaper,
      floorPaise: null,
      fallbackPaise: null,
      maxDailyMovePct: 10,
      previousTypical: 1000,
      isConfirmed: true,
    });
    expect(confirmed).toMatchObject({ typicalPaise: 1150, heldPaise: null });
  });

  it("uses the tighter metals limit", () => {
    const line = computeBoard({
      values: [value("a", 60), value("b", 62), value("c", 61)],
      floorPaise: null,
      fallbackPaise: null,
      maxDailyMovePct: 5,
      previousTypical: 5700,
    });
    expect(line.heldPaise).toBe(6100);
    expect(line.typicalPaise).toBe(5700);
  });

  it("never shows a household price below the floor", () => {
    const line = computeBoard({
      values: [value("a", 7), value("b", 7.5), value("c", 8)],
      floorPaise: 900,
      fallbackPaise: 1000,
      maxDailyMovePct: 10,
      previousTypical: null,
    });
    expect(line).toMatchObject({
      status: "live",
      typicalPaise: 900,
      lowPaise: 900,
      highPaise: 900,
    });
  });
});

describe("freshness and bands", () => {
  const now = Date.UTC(2026, 8, 29);

  it("keeps paper cards a fortnight and metal cards a week", () => {
    expect(isFresh(now - 13 * DAY, "paper", now)).toBe(true);
    expect(isFresh(now - 15 * DAY, "paper", now)).toBe(false);
    expect(isFresh(now - 6 * DAY, "metal", now)).toBe(true);
    expect(isFresh(now - 8 * DAY, "metal", now)).toBe(false);
    expect(freshDaysLeft(now - 12 * DAY, "plastic", now)).toBe(2);
    expect(freshDaysLeft(now - 9 * DAY, "metal", now)).toBe(-2);
  });

  it("starts a band at half to two and a half times the fallback", () => {
    expect(defaultBand(1000, "paper")).toEqual({
      minPaise: 500,
      maxPaise: 2500,
      maxDailyMovePct: 10,
    });
    expect(defaultBand(6000, "metal")).toEqual({
      minPaise: 3000,
      maxPaise: 15_000,
      maxDailyMovePct: 5,
    });
    expect(defaultBand(20, "glass").minPaise).toBe(50);
  });

  it("checks values against the band, and the band against itself", () => {
    const band = { minPaise: 500, maxPaise: 2000, maxDailyMovePct: 10 };
    expect(isInBand(500, band)).toBe(true);
    expect(isInBand(2500, band)).toBe(false);
    expect(isInBand(2500, null)).toBe(true);
    expect(bandProblem(band)).toBeNull();
    expect(bandProblem({ ...band, minPaise: 0 })).toBe("INVALID_BAND");
    expect(bandProblem({ ...band, minPaise: 2000 })).toBe("BAND_MIN_ABOVE_MAX");
    expect(bandProblem({ ...band, maxDailyMovePct: 60 })).toBe("INVALID_MOVE");
    expect(bandProblem({ ...band, maxDailyMovePct: 0 })).toBe("INVALID_MOVE");
  });
});

describe("honourRate", () => {
  it("counts pickups paid over 5% under the card, once per pickup", () => {
    const rate = honourRate([
      { pickupRef: "p1", paidPaisePerKg: 1200, cardPaisePerKg: 1200 },
      { pickupRef: "p1", paidPaisePerKg: 1000, cardPaisePerKg: 1200 },
      { pickupRef: "p2", paidPaisePerKg: 1150, cardPaisePerKg: 1200 },
      { pickupRef: "p3", paidPaisePerKg: 1100, cardPaisePerKg: 1200 },
      { pickupRef: "p4", paidPaisePerKg: 1200, cardPaisePerKg: 1200 },
      { pickupRef: "p5", paidPaisePerKg: 1200, cardPaisePerKg: 1200 },
    ]);
    expect(rate).toEqual({
      pickups: 5,
      under: 2,
      underPct: 40,
      flagged: true,
    });
  });

  it("leaves a shop at 20% or under alone, and an idle shop at zero", () => {
    const lines = Array.from({ length: 25 }, (_, index) => ({
      pickupRef: `p${String(index)}`,
      paidPaisePerKg: index < 5 ? 1000 : 1200,
      cardPaisePerKg: 1200,
    }));
    expect(honourRate(lines)).toMatchObject({ underPct: 20, flagged: false });
    expect(honourRate([])).toEqual({
      pickups: 0,
      under: 0,
      underPct: 0,
      flagged: false,
    });
  });
});

describe("the admin's suggestions", () => {
  it("suggests the 28-day median rounded down, and 75% of it as the floor", () => {
    expect(suggestedFallback([1100, 1150, 1200, 1000])).toBe(1100);
    expect(suggestedFallback([1149])).toBe(1100);
    expect(suggestedFallback([])).toBeNull();
    expect(suggestedFloor(1000)).toBe(750);
    expect(suggestedFloor(1100)).toBe(800);
    expect(suggestedFloor(20)).toBe(50);
  });

  it("asks for a note on a move over 10%", () => {
    expect(requiresNote(1000, 1100)).toBe(false);
    expect(requiresNote(1000, 1101)).toBe(true);
    expect(requiresNote(1000, 850)).toBe(true);
    expect(requiresNote(null, 850)).toBe(false);
  });

  it("reads the week's change from a series", () => {
    const series = [
      1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1050,
    ].map((paisePerKg) => ({ paisePerKg }));
    expect(weekChangePct(series)).toBe(5);
    expect(weekChangePct(series.slice(0, 5))).toBeNull();
  });
});

describe("parsePriceCsv", () => {
  it("reads codes and rupees, skipping a header and blank lines", () => {
    const { rows, problems } = parsePriceCsv(
      "code,floor,fallback\n\npaper-news, 7.50, 10\nMETAL-ALU-CAN;45;60\nPLASTIC-PET\t16\t20\n",
    );
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      { line: 3, materialCode: "PAPER-NEWS", floorPaise: 750, fallbackPaise: 1000 },
      {
        line: 4,
        materialCode: "METAL-ALU-CAN",
        floorPaise: 4500,
        fallbackPaise: 6000,
      },
      { line: 5, materialCode: "PLASTIC-PET", floorPaise: 1600, fallbackPaise: 2000 },
    ]);
  });

  it("names the line that is wrong", () => {
    const { rows, problems } = parsePriceCsv(
      "PAPER-NEWS, 7.50\nPAPER-CARTON, abc, 10\nPAPER-BOOKS, 12, 10\nPAPER-MIXED, 0, 8\nPAPER-OFFICE, 14, 16",
    );
    expect(rows.map((row) => row.materialCode)).toEqual(["PAPER-OFFICE"]);
    expect(problems).toEqual([
      { line: 1, problem: "COLUMNS", text: "PAPER-NEWS, 7.50" },
      { line: 2, problem: "INVALID_PRICE", text: "PAPER-CARTON, abc, 10" },
      { line: 3, problem: "FLOOR_ABOVE_FALLBACK", text: "PAPER-BOOKS, 12, 10" },
      { line: 4, problem: "INVALID_PRICE", text: "PAPER-MIXED, 0, 8" },
    ]);
  });
});
