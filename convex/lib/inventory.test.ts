import { expect, it } from "vitest";

import { stockGramsAfter } from "./inventory";

it.each([
  [0, 1, 1],
  [1, -1, 0],
  [Number.MAX_SAFE_INTEGER - 2, 2, Number.MAX_SAFE_INTEGER],
  [Number.MAX_SAFE_INTEGER, -2, Number.MAX_SAFE_INTEGER - 2],
])("keeps a valid stock movement exact (case %#)", (current, delta, result) => {
  expect(stockGramsAfter(current, delta)).toBe(result);
});

it.each([
  [Number.MAX_SAFE_INTEGER, 1],
  [Number.MAX_SAFE_INTEGER, 2],
  [Number.MAX_SAFE_INTEGER + 1, -1],
  [-1, 2],
  [0.5, 1],
  [0, 0.5],
  [0, Number.MAX_SAFE_INTEGER + 1],
  [NaN, 1],
  [0, Infinity],
])(
  "rejects invalid mass before it can become stock (case %#)",
  (current, delta) => {
    expect(() => stockGramsAfter(current, delta)).toThrow(/INVALID_WEIGHT/);
  },
);

it("retains the insufficient-stock error for a valid integer withdrawal", () => {
  expect(() => stockGramsAfter(100, -101)).toThrow(/NOT_ENOUGH_STOCK/);
});
