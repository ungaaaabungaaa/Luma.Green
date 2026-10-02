import { describe, expect, it } from "vitest";

import {
  estimateSolar,
  fromSquareMetres,
  monthlyUnitsFor,
  parseAmount,
  readRoof,
  readUsage,
  SOLAR,
  type SolarEstimate,
  type SolarInput,
  subsidyFor,
  systemSize,
  toSquareMetres,
} from "./calc";

function estimate(input: SolarInput): SolarEstimate {
  const result = estimateSolar(input);
  if (result.status !== "ok")
    throw new Error(`expected ok, got ${result.status}`);
  return result.estimate;
}

describe("monthly units", () => {
  it("takes units as typed", () => {
    expect(monthlyUnitsFor("home", "units", 300)).toBe(300);
  });

  it("turns a bill into units at the assumed tariff for each kind", () => {
    expect(monthlyUnitsFor("home", "bill", 2100)).toBe(300); // ₹7 a unit
    expect(monthlyUnitsFor("business", "bill", 2700)).toBe(300); // ₹9 a unit
  });
});

describe("system size", () => {
  it("covers the monthly use at about 120 units per kW, to the nearest half kW", () => {
    expect(systemSize(240)).toEqual({ kw: 2, limitedByRoof: false });
    expect(systemSize(250)).toEqual({ kw: 2, limitedByRoof: false }); // 2.08
    expect(systemSize(300)).toEqual({ kw: 2.5, limitedByRoof: false });
    expect(systemSize(420)).toEqual({ kw: 3.5, limitedByRoof: false });
  });

  it("never suggests less than 1 kW, the smallest practical system", () => {
    expect(systemSize(40)).toEqual({ kw: 1, limitedByRoof: false });
  });

  it("caps the size at what the roof holds, rounding down", () => {
    // 29 m² holds 2.9 kW → 2.5 kW; the bill alone would want 3.5 kW.
    expect(systemSize(420, 29)).toEqual({ kw: 2.5, limitedByRoof: true });
    // A roof with room to spare doesn't change anything.
    expect(systemSize(240, 100)).toEqual({ kw: 2, limitedByRoof: false });
  });

  it("treats an exact fit as enough roof", () => {
    expect(systemSize(360, 30)).toEqual({ kw: 3, limitedByRoof: false });
  });

  it("refuses a roof too small for even 1 kW", () => {
    expect(systemSize(300, 9)).toBeNull();
    expect(systemSize(300, 0)).toBeNull();
    expect(systemSize(300, 10)).toEqual({ kw: 1, limitedByRoof: true });
  });
});

describe("PM Surya Ghar subsidy", () => {
  it("pays ₹30,000 per kW for the first 2 kW", () => {
    expect(subsidyFor("home", 1)).toBe(30_000);
    expect(subsidyFor("home", 1.5)).toBe(45_000);
    expect(subsidyFor("home", 2)).toBe(60_000);
  });

  it("pays ₹18,000 for the 3rd kW", () => {
    expect(subsidyFor("home", 2.5)).toBe(69_000);
    expect(subsidyFor("home", 3)).toBe(78_000);
  });

  it("stops at ₹78,000 however big the system", () => {
    expect(subsidyFor("home", 3.5)).toBe(SOLAR.subsidy.cap);
    expect(subsidyFor("home", 10)).toBe(78_000);
  });

  it("gives businesses nothing", () => {
    expect(subsidyFor("business", 3)).toBe(0);
    expect(subsidyFor("business", 50)).toBe(0);
  });
});

describe("estimate", () => {
  it("works a home through from a ₹3,000 bill", () => {
    const home = estimate({ kind: "home", mode: "bill", amount: 3000 });

    expect(home.monthlyUnits).toBe(429); // 3000 / 7
    expect(home.kw).toBe(3.5);
    expect(home.roofNeededM2).toBe(35);
    expect(home.monthlyGeneration).toBe(420);
    expect(home.cost).toEqual({ low: 192_500, high: 227_500 });
    expect(home.subsidy).toBe(78_000);
    expect(home.netCost).toEqual({ low: 114_500, high: 149_500 });
    // Makes 420 of the 429 units used, at ₹7.
    expect(home.monthlySavings).toBe(2940);
    expect(home.yearlySavings).toBe(35_280);
    expect(home.paybackYears).toEqual({ low: 3.2, high: 4.2 });
  });

  it("gives a business no subsidy and prices its units higher", () => {
    const shop = estimate({ kind: "business", mode: "units", amount: 600 });

    expect(shop.kw).toBe(5);
    expect(shop.subsidy).toBe(0);
    expect(shop.netCost).toEqual(shop.cost);
    expect(shop.monthlySavings).toBe(600 * 9);
  });

  it("never saves more than the bill when the system rounds up", () => {
    // 100 units wants 0.83 kW; the 1 kW minimum makes 120 units.
    const small = estimate({ kind: "home", mode: "units", amount: 100 });
    expect(small.kw).toBe(1);
    expect(small.monthlySavings).toBe(700); // 100 units × ₹7, not 120
  });

  it("counts only what a roof-limited system makes", () => {
    const limited = estimate({
      kind: "home",
      mode: "units",
      amount: 600,
      roofM2: 20,
    });
    expect(limited.kw).toBe(2);
    expect(limited.limitedByRoof).toBe(true);
    expect(limited.monthlySavings).toBe(240 * 7);
  });

  it("adds up savings year by year for the chart", () => {
    const home = estimate({ kind: "home", mode: "units", amount: 240 });
    expect(home.savingsByYear).toHaveLength(SOLAR.years);
    expect(home.savingsByYear[0]).toEqual({
      year: 1,
      saved: home.yearlySavings,
    });
    expect(home.savingsByYear.at(-1)).toEqual({
      year: 10,
      saved: home.yearlySavings * 10,
    });
  });

  it("keeps every amount in whole rupees", () => {
    const home = estimate({ kind: "home", mode: "bill", amount: 1234.5 });
    for (const value of [
      home.cost.low,
      home.cost.high,
      home.subsidy,
      home.netCost.low,
      home.netCost.high,
      home.monthlySavings,
      home.yearlySavings,
    ]) {
      expect(Number.isSafeInteger(value)).toBe(true);
    }
  });

  it("asks for usage before it estimates", () => {
    expect(estimateSolar({ kind: "home", mode: "bill", amount: 0 })).toEqual({
      status: "noUsage",
    });
    expect(estimateSolar({ kind: "home", mode: "units", amount: NaN })).toEqual(
      { status: "noUsage" },
    );
  });

  it("says so when the roof is too small", () => {
    expect(
      estimateSolar({ kind: "home", mode: "units", amount: 300, roofM2: 6 }),
    ).toEqual({ status: "roofTooSmall", minRoofM2: 10 });
  });
});

describe("roof units", () => {
  it("converts square feet to square metres and back", () => {
    expect(toSquareMetres(30, "m2")).toBe(30);
    expect(toSquareMetres(323, "sqft")).toBeCloseTo(30.01, 2);
    expect(fromSquareMetres(30, "m2")).toBe(30);
    expect(fromSquareMetres(30, "sqft")).toBe(323);
  });
});

describe("reading the form", () => {
  const invalid = { status: "invalid" };

  it("waits for usage, and bounds it", () => {
    expect(readUsage("bill", " ")).toEqual({ status: "empty" });
    expect(readUsage("bill", "2,500")).toEqual({ status: "ok", value: 2500 });
    expect(readUsage("bill", "50")).toEqual(invalid); // below ₹100
    expect(readUsage("bill", "20,00,000")).toEqual(invalid); // above ₹10 lakh
    expect(readUsage("units", "300")).toEqual({ status: "ok", value: 300 });
    expect(readUsage("units", "five")).toEqual(invalid);
  });

  it("treats an empty roof as unknown, not zero", () => {
    expect(readRoof("", "sqft")).toEqual({ status: "empty" });
    expect(readRoof("30", "m2")).toEqual({ status: "ok", value: 30 });
    const sqft = readRoof("323", "sqft");
    expect(sqft.status === "ok" && sqft.value).toBeCloseTo(30.01, 2);
    expect(readRoof("0", "m2")).toEqual(invalid);
    expect(readRoof("big", "m2")).toEqual(invalid);
  });
});

describe("parseAmount", () => {
  it("reads numbers the way people type them", () => {
    expect(parseAmount("2500")).toBe(2500);
    expect(parseAmount(" 2,500 ")).toBe(2500);
    expect(parseAmount("1,00,000")).toBe(100_000);
    expect(parseAmount("₹ 3000")).toBe(3000);
    expect(parseAmount("12.5")).toBe(12.5);
  });

  it("reads digits in Indian scripts and Arabic", () => {
    expect(parseAmount("२५००")).toBe(2500); // Devanagari
    expect(parseAmount("೩೦೦೦")).toBe(3000); // Kannada
    expect(parseAmount("٣٠٠٠")).toBe(3000); // Arabic-Indic
    expect(parseAmount("۱۲٫۵")).toBe(12.5); // Urdu digits, Arabic decimal
    expect(parseAmount("๑๒.๕", "th")).toBe(12.5);
    expect(parseAmount("෧෨.෫", "si")).toBe(12.5);
    expect(parseAmount("１２.５", "ja")).toBe(12.5);
  });

  it("uses the active language's decimal and grouping marks", () => {
    expect(parseAmount("2.500,5", "de")).toBe(2500.5);
    expect(parseAmount("2\u{202F}500,5", "fr")).toBe(2500.5);
    expect(parseAmount("2 500,5", "pl")).toBe(2500.5);
    expect(parseAmount("2.500,5", "id")).toBe(2500.5);
    expect(parseAmount("12.5", "de")).toBeNull();
    expect(parseAmount("2,50", "en")).toBeNull();
    expect(parseAmount("1,00,000", "en")).toBe(100_000);
    expect(parseAmount("100,000", "en")).toBe(100_000);
    expect(parseAmount("2.500,5.6", "de")).toBeNull();
    expect(readUsage("bill", "2.500,5", "de")).toEqual({
      status: "ok",
      value: 2500.5,
    });
    expect(readRoof("12,5", "m2", "de")).toEqual({ status: "ok", value: 12.5 });
  });

  it("accepts complete Western and Indian grouping through the bill limit", () => {
    for (const locale of ["en", "en-IN", "hi", "mr"]) {
      for (const input of ["1,000,000", "1,000,000.00", "10,00,000"]) {
        expect(readUsage("bill", input, locale)).toEqual({
          status: "ok",
          value: 1_000_000,
        });
      }
      expect(parseAmount("123,456,789.50", locale)).toBe(123_456_789.5);
      expect(parseAmount("12,34,56,789.50", locale)).toBe(123_456_789.5);
      expect(readUsage("bill", "1,000,000.01", locale)).toEqual({
        status: "invalid",
      });
    }
    expect(parseAmount("१०,००,०००", "hi")).toBe(1_000_000);
  });

  it("rejects mixed or malformed grouping instead of removing separators", () => {
    for (const locale of ["en", "en-IN", "hi", "mr"]) {
      for (const input of [
        "1,000,00,000",
        "1,00,000,000",
        "123,45,678",
        "1,0000,000",
        "1,,000",
        "1,000,000.0,0",
      ])
        expect(parseAmount(input, locale), `${locale}: ${input}`).toBeNull();
    }
    // Indian grouping is not valid in a locale that uses Western grouping.
    expect(parseAmount("10,00,000", "en-US")).toBeNull();
    expect(parseAmount("10.00.000", "de")).toBeNull();
  });

  it("rejects anything that isn't a plain positive number", () => {
    for (const text of ["", "  ", "abc", "-5", "1e5", "12.", "1.2.3", "5kg"]) {
      expect(parseAmount(text), text).toBeNull();
    }
  });
});
