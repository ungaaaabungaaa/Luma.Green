import { describe, expect, it } from "vitest";

import {
  kgInput,
  parseKg,
  parseRupees,
  priceLines,
  rupeesInput,
  stepGrams,
} from "./weigh";

describe("parseKg", () => {
  it("reads kilograms the way people type them, to exact grams", () => {
    expect(parseKg("12")).toBe(12_000);
    expect(parseKg("12.5")).toBe(12_500);
    expect(parseKg("12,5")).toBe(12_500);
    expect(parseKg(" 0.001 ")).toBe(1);
    expect(parseKg(".5")).toBe(500);
    expect(parseKg("12.")).toBe(12_000);
    // No float drift: 0.1 + 0.2 would not be 0.3.
    expect(parseKg("0.3")).toBe(300);
  });

  it("treats an empty field as not weighed", () => {
    expect(parseKg("")).toBe(0);
    expect(parseKg(" ".repeat(3))).toBe(0);
  });

  it("refuses what isn't a weight, finer than a gram, or too big", () => {
    for (const text of [
      "abc",
      "-2",
      "1.2345",
      "1e3",
      ".",
      "12 kg",
      "5000.001",
    ]) {
      expect(parseKg(text), text).toBeNull();
    }
    expect(parseKg("5000")).toBe(5_000_000);
  });
});

describe("kgInput", () => {
  it("shows grams as the shortest kilogram figure", () => {
    expect(kgInput(12_000)).toBe("12");
    expect(kgInput(12_500)).toBe("12.5");
    expect(kgInput(12_345)).toBe("12.345");
    expect(kgInput(1)).toBe("0.001");
    expect(kgInput(0)).toBe("0");
  });

  it("round-trips with parseKg", () => {
    for (const grams of [0, 1, 999, 1000, 19_250, 4_999_999]) {
      expect(parseKg(kgInput(grams))).toBe(grams);
    }
  });
});

describe("stepGrams", () => {
  it("moves half a kilo, landing on the half-kilo grid", () => {
    expect(stepGrams(12_000, 1)).toBe(12_500);
    expect(stepGrams(12_000, -1)).toBe(11_500);
    expect(stepGrams(12_300, 1)).toBe(12_500);
    expect(stepGrams(12_300, -1)).toBe(12_000);
  });

  it("never goes below zero", () => {
    expect(stepGrams(0, -1)).toBe(0);
    expect(stepGrams(200, -1)).toBe(0);
    expect(stepGrams(0, 1)).toBe(500);
  });
});

describe("parseRupees and rupeesInput", () => {
  it("reads rupees to paise without float drift", () => {
    expect(parseRupees("14")).toBe(1400);
    expect(parseRupees("14.5")).toBe(1450);
    expect(parseRupees("14.50")).toBe(1450);
    expect(parseRupees("0.29")).toBe(29);
    expect(parseRupees("14,05")).toBe(1405);
  });

  it("refuses what isn't a price", () => {
    for (const text of ["", "abc", "14.505", "-3", ".", "₹14"]) {
      expect(parseRupees(text), text).toBeNull();
    }
  });

  it("shows paise as a price field value", () => {
    expect(rupeesInput(1400)).toBe("14");
    expect(rupeesInput(1450)).toBe("14.50");
    expect(rupeesInput(1405)).toBe("14.05");
    expect(parseRupees(rupeesInput(65_000))).toBe(65_000);
  });
});

describe("priceLines", () => {
  const rates = new Map([
    ["PAPER-NEWS", 1450],
    ["GLASS-BOTTLE", 200],
  ]);

  it("prices each line to the paisa, then adds the lines up", () => {
    const { lines, totalPaise } = priceLines(
      [
        { materialCode: "PAPER-NEWS", grams: 12_345 },
        { materialCode: "GLASS-BOTTLE", grams: 2501 },
      ],
      rates,
    );
    // 12.345 kg × ₹14.50 = ₹179.0025 → 17,900 paise; 2.501 kg × ₹2 = 500.2 → 500.
    expect(lines.map((line) => line.paise)).toEqual([17_900, 500]);
    expect(totalPaise).toBe(18_400);
  });

  it("leaves a material without a price out of the total", () => {
    const { lines, totalPaise } = priceLines(
      [{ materialCode: "GOLD", grams: 1000 }],
      rates,
    );
    expect(lines[0]?.paise).toBeNull();
    expect(totalPaise).toBe(0);
  });
});
