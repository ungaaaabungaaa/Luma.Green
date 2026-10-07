import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import {
  accountedGrams,
  combinedInputGrams,
  declareSchema,
  lotError,
  parseGrams,
} from "./logic";

describe("exact lot entry", () => {
  it("accepts native digits and rejects decimals, grouping, negative and unsafe mass", () => {
    expect(parseGrams(" ١٢٣٤ ")).toBe(1234);
    expect(parseGrams("೧೨೩೪")).toBe(1234);
    expect(parseGrams("०१२३")).toBe(123);
    for (const value of [
      "1.2",
      "1,000",
      "1 000",
      "-1",
      "1e3",
      "",
      "9007199254740992",
    ])
      expect(parseGrams(value)).toBeNull();
    expect(parseGrams("9007199254740991")).toBe(Number.MAX_SAFE_INTEGER);
    expect(
      declareSchema.safeParse({
        materialCode: "PET",
        state: "Bale",
        grams: "0",
        sourceReference: "",
      }).success,
    ).toBe(false);
  });
  it("accounts for every gram and rejects unsafe sums", () => {
    expect(
      accountedGrams({
        inputGrams: "1000",
        contaminationGrams: "50",
        processLossGrams: "50",
        outputs: [{ materialCode: "PET", state: "Flake", grams: "900" }],
      }),
    ).toBe(1000);
    expect(
      accountedGrams({
        inputGrams: "1",
        contaminationGrams: "1",
        processLossGrams: "0",
        outputs: [
          { materialCode: "PET", state: "Flake", grams: "9007199254740991" },
        ],
      }),
    ).toBeNull();
  });
  it("keeps server errors actionable without exposing internal detail", () => {
    expect(lotError(new ConvexError("WEIGHT_DISPUTE"))).toBe("weightDispute");
    expect(lotError(new ConvexError("WORKSPACE_PERMISSION_DENIED"))).toBe(
      "accessChanged",
    );
    expect(lotError(new Error("Private server diagnostic"))).toBe(
      "genericError",
    );
  });
});

it("sums exact multi-input grams and rejects incomplete or unsafe allocations", () => {
  expect(
    combinedInputGrams({
      inputGrams: "1000",
      additionalInputs: [{ lotId: "source", grams: "٢٠٠" }],
    }),
  ).toBe(1200);
  expect(
    combinedInputGrams({
      inputGrams: "1000",
      additionalInputs: [{ lotId: "source", grams: "" }],
    }),
  ).toBeNull();
  expect(
    combinedInputGrams({
      inputGrams: "9007199254740991",
      additionalInputs: [{ lotId: "source", grams: "1" }],
    }),
  ).toBeNull();
});
