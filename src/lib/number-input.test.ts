import { describe, expect, it } from "vitest";

import { asciiDigits, fixedDecimalInput } from "./number-input";

describe("translated decimal input", () => {
  it("accepts the native digits used by supported keyboards", () => {
    for (const digits of [
      "१२३",
      "১২৩",
      "૧૨૩",
      "੧੨੩",
      "୧୨୩",
      "௧௨௩",
      "౧౨౩",
      "೧೨೩",
      "൧൨൩",
      "෧෨෩",
      "๑๒๓",
      "１２３",
      "١٢٣",
      "۱۲۳",
    ])
      expect(asciiDigits(digits)).toBe("123");
  });

  it("preserves exact grams and paise with locale decimal marks", () => {
    expect(fixedDecimalInput("12,345", 3, "fr")).toBe(12_345);
    expect(fixedDecimalInput("0,29", 2, "de")).toBe(29);
    expect(fixedDecimalInput("๑๒.๕", 3, "th")).toBe(12_500);
    expect(fixedDecimalInput("١٢٫٣٤٥", 3, "ar")).toBe(12_345);
    expect(fixedDecimalInput("12.345", 3, "fr")).toBe(12_345);
  });

  it("rejects grouping, mixed separators, excess precision and unsafe amounts", () => {
    expect(fixedDecimalInput("1,200", 3, "en")).toBeNull();
    expect(fixedDecimalInput("1.200,50", 2, "de")).toBeNull();
    expect(fixedDecimalInput("1,2345", 3, "fr")).toBeNull();
    expect(fixedDecimalInput("90071992547409.92", 2)).toBeNull();
    expect(fixedDecimalInput("90071992547409.91", 2)).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    for (const input of ["", ".", "-1", "Infinity", "1e3", "12kg"])
      expect(fixedDecimalInput(input, 3)).toBeNull();
  });
});
