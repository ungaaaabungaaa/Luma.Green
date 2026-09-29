import { describe, expect, it } from "vitest";

import { parseRupees, priceInputProblem, rupeesInput } from "./rupees";

describe("parseRupees", () => {
  it("turns what the admin types into exact paise", () => {
    expect(parseRupees("14")).toBe(1400);
    expect(parseRupees("14.5")).toBe(1450);
    expect(parseRupees("14.35")).toBe(1435);
    expect(parseRupees("0.05")).toBe(5);
    expect(parseRupees(" ₹ 1,400.50 ")).toBe(140_050);
  });

  it("refuses anything that isn't a rupee amount", () => {
    for (const input of ["", "-1", "14.355", "abc", "1e3", ".5", "14."]) {
      expect(parseRupees(input)).toBeNull();
    }
  });
});

describe("rupeesInput", () => {
  it("shows whole rupees plainly and paise with two digits", () => {
    expect(rupeesInput(1400)).toBe("14");
    expect(rupeesInput(1450)).toBe("14.50");
    expect(rupeesInput(1405)).toBe("14.05");
    expect(rupeesInput(null)).toBe("");
  });

  it("round-trips", () => {
    for (const paise of [1, 99, 100, 1234, 21_000]) {
      expect(parseRupees(rupeesInput(paise))).toBe(paise);
    }
  });
});

describe("priceInputProblem", () => {
  it("accepts a floor at or under the fallback", () => {
    expect(priceInputProblem("12", "14")).toBeNull();
    expect(priceInputProblem("14", "14.00")).toBeNull();
  });

  it("names the problem the admin has to fix", () => {
    expect(priceInputProblem("", "14")).toBe("MISSING");
    expect(priceInputProblem("0", "14")).toBe("INVALID_PRICE");
    expect(priceInputProblem("twelve", "14")).toBe("INVALID_PRICE");
    expect(priceInputProblem("15", "14")).toBe("FLOOR_ABOVE_FALLBACK");
    expect(priceInputProblem("12", "20000")).toBe("PRICE_TOO_HIGH");
  });
});
