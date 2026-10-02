import { expect, it } from "vitest";

import { formatPaise } from "./money-format";

it("keeps the final paisa at the safe-integer boundary with Indian grouping", () => {
  expect(formatPaise(Number.MAX_SAFE_INTEGER, "en-IN")).toBe(
    "₹9,00,71,99,25,47,409.91",
  );
  expect(formatPaise(-Number.MAX_SAFE_INTEGER, "en-IN")).toBe(
    "-₹9,00,71,99,25,47,409.91",
  );
});

it("localizes the exact fraction and grouping for Arabic digits", () => {
  const formatted = formatPaise(Number.MAX_SAFE_INTEGER, "ar-u-nu-arab");
  expect(formatted).toContain("٩٠٬٠٧١٬٩٩٢٬٥٤٧٬٤٠٩٫٩١");
  expect(formatted).toContain("₹");
});

it.each(["en-IN", "ar", "ar-u-nu-arab", "bn"])(
  "preserves ordinary Intl currency output and negative subrupee signs for %s",
  (locale) => {
    for (const paise of [
      0, -0, 1, 50, 99, 100, 1450, 2_100_000, -1, -50, -99, -100, -1450,
    ]) {
      const expected = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
      }).format(paise / 100);
      expect(formatPaise(paise, locale)).toBe(expected);
    }
  },
);
