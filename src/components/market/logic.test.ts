import { describe, expect, it } from "vitest";

import {
  byUrgency,
  isFarFromSuggestion,
  kgFieldValue,
  materialOptions,
  parseKg,
  parseRupees,
  recycledFirst,
  rupeeFieldValue,
  stepStates,
  suggestedAskPaise,
  tradeTotals,
} from "./logic";
import { aTrade } from "./test-utils";
import type { TradeView } from "./types";

describe("parseKg", () => {
  it.each([
    ["12", 12_000],
    ["12.5", 12_500],
    [" 0.001 ", 1],
    ["1.001", 1001],
    [".5", 500],
    ["150.", 150_000],
  ])("reads %j as %i grams", (input, grams) => {
    expect(parseKg(input)).toBe(grams);
  });

  it.each(["", "0", "0.000", "-3", "1.0005", "12kg", "1,200", "abc"])(
    "refuses %j",
    (input) => {
      expect(parseKg(input)).toBeNull();
    },
  );
});

describe("parseRupees", () => {
  it.each([
    ["18", 1800],
    ["17.5", 1750],
    ["17.50", 1750],
    ["0.05", 5],
  ])("reads ₹%s as %i paise", (input, paise) => {
    expect(parseRupees(input)).toBe(paise);
  });

  it.each(["", "0", "-1", "17.555", "₹18", "1,800"])("refuses %j", (input) => {
    expect(parseRupees(input)).toBeNull();
  });
});

describe("translated market input", () => {
  it("reads the selected language without changing integer units", () => {
    expect(parseKg("12,345", "fr")).toBe(12_345);
    expect(parseRupees("17,50", "de")).toBe(1750);
    expect(parseKg("๑๒.๕", "th")).toBe(12_500);
    expect(parseRupees("١٧٫٥٠", "ar")).toBe(1750);
  });
});

describe("field values", () => {
  it("round-trips grams and paise through what a field holds", () => {
    expect(kgFieldValue(12_500)).toBe("12.5");
    expect(parseKg(kgFieldValue(1001))).toBe(1001);
    expect(rupeeFieldValue(1750)).toBe("17.5");
    expect(parseRupees(rupeeFieldValue(2505))).toBe(2505);
  });
});

describe("suggestedAskPaise", () => {
  it("marks scrap up for the seller's step, to the nearest 50 paise", () => {
    expect(suggestedAskPaise(1400, "scrap", "kabadiwala")).toBe(1750); // ×1.25
    expect(suggestedAskPaise(1400, "scrap", "yard")).toBe(2050); // ×1.45
    expect(suggestedAskPaise(1400, "scrap", "recycler")).toBe(2400); // ×1.7
  });

  it("doesn't mark recycled material up: it's priced at the factory gate", () => {
    expect(suggestedAskPaise(6500, "recycled", "recycler")).toBe(6500);
  });

  it("has nothing to suggest without a price, or to a manufacturer", () => {
    expect(suggestedAskPaise(null, "scrap", "yard")).toBeNull();
    expect(suggestedAskPaise(undefined, "scrap", "yard")).toBeNull();
    expect(suggestedAskPaise(0, "scrap", "yard")).toBeNull();
    expect(suggestedAskPaise(1400, "scrap", "manufacturer")).toBeNull();
  });

  it("never suggests less than 50 paise", () => {
    expect(suggestedAskPaise(10, "scrap", "kabadiwala")).toBe(50);
  });
});

describe("isFarFromSuggestion", () => {
  it("flags less than half or more than twice the suggestion", () => {
    expect(isFarFromSuggestion(900, 2000)).toBe(true);
    expect(isFarFromSuggestion(1000, 2000)).toBe(false);
    expect(isFarFromSuggestion(4000, 2000)).toBe(false);
    expect(isFarFromSuggestion(4001, 2000)).toBe(true);
    expect(isFarFromSuggestion(null, 2000)).toBe(false);
    expect(isFarFromSuggestion(900, null)).toBe(false);
  });
});

describe("stepStates", () => {
  it("ticks what happened and rings the step it's waiting for", () => {
    expect(stepStates("requested")).toEqual([
      "done",
      "current",
      "todo",
      "todo",
      "todo",
    ]);
    expect(stepStates("paid_to_escrow")).toEqual([
      "done",
      "done",
      "done",
      "current",
      "todo",
    ]);
    expect(stepStates("completed")).toEqual([
      "done",
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("has no steps for a declined trade", () => {
    expect(stepStates("declined")).toBeNull();
  });
});

const DAY = 24 * 60 * 60 * 1000;

function trade(overrides: Partial<TradeView>): TradeView {
  return aTrade({ timeline: [], createdAt: 0, ...overrides });
}

describe("byUrgency", () => {
  it("puts trades that need me first, then open ones, then finished", () => {
    const done = trade({ status: "completed", createdAt: 5 });
    const open = trade({ status: "dispatched", createdAt: 4 });
    const mine = trade({ status: "accepted", actions: ["pay"], createdAt: 1 });
    const newerMine = trade({
      status: "requested",
      actions: ["accept", "decline"],
      createdAt: 2,
    });
    expect([done, open, mine, newerMine].toSorted(byUrgency)).toEqual([
      newerMine,
      mine,
      open,
      done,
    ]);
  });
});

describe("tradeTotals", () => {
  // 15 Oct 2026, noon in India.
  const now = Date.parse("2026-10-15T12:00:00+05:30");

  it("adds up escrow, waiting steps and this month's completed trades", () => {
    const totals = tradeTotals(
      [
        trade({ status: "paid_to_escrow", inEscrow: true, totalPaise: 50_000 }),
        trade({
          status: "dispatched",
          inEscrow: true,
          totalPaise: 20_000,
          actions: ["confirm"],
        }),
        trade({
          status: "completed",
          totalPaise: 30_000,
          timeline: [{ status: "completed", at: now - DAY }],
        }),
        // Last month.
        trade({
          status: "completed",
          totalPaise: 99_000,
          timeline: [{ status: "completed", at: now - 20 * DAY }],
        }),
      ],
      now,
    );
    expect(totals).toEqual({
      escrowPaise: 70_000,
      waiting: 1,
      completedThisMonth: 1,
      completedValuePaise: 30_000,
    });
  });

  it("counts the month in India time", () => {
    // 1 Oct, 00:30 in India is still 30 Sep in UTC.
    const firstOfMonth = Date.parse("2026-10-01T00:30:00+05:30");
    const totals = tradeTotals(
      [
        trade({
          status: "completed",
          timeline: [{ status: "completed", at: firstOfMonth }],
        }),
      ],
      now,
    );
    expect(totals.completedThisMonth).toBe(1);
  });
});

function lot(code: string, name: string) {
  return { material: { code, names: { en: name }, family: "paper" as const } };
}

describe("materialOptions", () => {
  it("lists each material once, most lots first, then by name", () => {
    const options = materialOptions(
      [
        lot("METAL-IRON", "Iron and steel"),
        lot("PAPER-NEWS", "Newspaper"),
        lot("PAPER-CARTON", "Cardboard boxes"),
        lot("PAPER-NEWS", "Newspaper"),
      ],
      (names: Record<string, string | undefined>, code) => names.en ?? code,
    );
    expect(options).toEqual([
      { code: "PAPER-NEWS", label: "Newspaper", count: 2 },
      { code: "PAPER-CARTON", label: "Cardboard boxes", count: 1 },
      { code: "METAL-IRON", label: "Iron and steel", count: 1 },
    ]);
  });
});

describe("recycledFirst", () => {
  it("moves recycled material to the front and keeps the order otherwise", () => {
    const lots = [
      "PLASTIC-PET",
      "RECYCLED-KRAFT",
      "PAPER-NEWS",
      "RECYCLED-PET-FLAKE",
    ].map((code) => ({
      material: { code, names: {}, family: "paper" as const },
    }));
    const recycled = new Set(["RECYCLED-KRAFT", "RECYCLED-PET-FLAKE"]);
    expect(
      recycledFirst(lots, recycled).map((listing) => listing.material.code),
    ).toEqual([
      "RECYCLED-KRAFT",
      "RECYCLED-PET-FLAKE",
      "PLASTIC-PET",
      "PAPER-NEWS",
    ]);
  });
});
