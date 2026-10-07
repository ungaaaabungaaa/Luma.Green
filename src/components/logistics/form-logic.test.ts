import { expect, it } from "vitest";

import { coordinateInput, gramsInput } from "./form-logic";

it("accepts local coordinate digits and signed decimals without grouping or exponents", () => {
  expect(coordinateInput("−١٢٫٥", "ar")).toBe(-12.5);
  expect(coordinateInput("77,125", "fr")).toBe(77.125);
  expect(coordinateInput("1,000.2", "en")).toBeNaN();
  expect(coordinateInput("1e2", "en")).toBeNaN();
  expect(coordinateInput("", "en")).toBeNaN();
});
it("keeps grams integral across local digits", () => {
  expect(gramsInput("١٢٥٠")).toBe(1250);
  expect(gramsInput("೧೨೫೦")).toBe(1250);
  for (const text of ["1.5", "1,000", "-1", "9007199254740993", ""])
    expect(gramsInput(text)).toBeNaN();
});
