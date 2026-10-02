import { expect, it } from "vitest";

import { paiseFor, safePaiseFor } from "./chain";

it("prices a line exactly when the intermediate product exceeds safe Number arithmetic", () => {
  expect(paiseFor(3, 9_007_199_254_740_833)).toBe(27_021_597_764_222);
  expect(paiseFor(999, Number.MAX_SAFE_INTEGER)).toBe(8_998_192_055_486_250);
});

it.each([
  [1, 499, 0],
  [1, 500, 1],
  [1, 501, 1],
  [-1, 499, -0],
  [-1, 500, -0],
  [-1, 501, -1],
  [-3, 500, -1],
  [1000, 1234, 1234],
  [0, 1234, 0],
])(
  "preserves whole-paisa rounding for %s grams at %s paise/kg",
  (grams, price, expected) => {
    expect(paiseFor(grams, price)).toBe(expected);
  },
);

it.each([
  [1001, Number.MAX_SAFE_INTEGER],
  [-1001, Number.MAX_SAFE_INTEGER],
  [1.5, 1000],
  [1, 0.5],
  [Infinity, 1000],
  [NaN, 1000],
  [Number.MAX_SAFE_INTEGER + 1, 1],
])("refuses unsafe input or totals (case %#)", (grams, price) => {
  expect(safePaiseFor(grams, price)).toBeNull();
  expect(() => paiseFor(grams, price)).toThrow(RangeError);
});
