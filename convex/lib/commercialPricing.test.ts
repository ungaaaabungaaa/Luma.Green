import { describe, expect, it } from "vitest";

import { separatePrices } from "./commercialPricing";

describe("separate commercial prices", () => {
  it("keeps Luma charges out of the material price", () => {
    const prices = separatePrices({
      material: { grams: 2000, paisePerKg: 1000, totalPaise: 2000 },
      saasService: {
        amountPaise: 1200,
        period: "monthly",
        payerOrgId: "buyer",
      },
      transactionService: {
        amountPaise: 50,
        payerOrgId: "seller",
        disclosedAt: 1,
      },
    });

    expect(prices.material).toEqual({
      kind: "material",
      grams: 2000,
      paisePerKg: 1000,
      totalPaise: 2000,
    });
    expect(prices.saasService?.amountPaise).toBe(1200);
    expect(prices.transactionService?.amountPaise).toBe(50);
    expect(prices).not.toHaveProperty("totalPaise");
  });

  it("uses exact grams and rejects a material total that hides a fee", () => {
    expect(
      separatePrices({
        material: { grams: 1, paisePerKg: 500, totalPaise: 1 },
      }).material.totalPaise,
    ).toBe(1);
    expect(() =>
      separatePrices({
        material: { grams: 1001, paisePerKg: 100, totalPaise: 101 },
      }),
    ).toThrow("INVALID_MATERIAL_PRICE");
  });

  it("rejects fractional or unsafe fees and missing disclosure", () => {
    const material = { grams: 1000, paisePerKg: 100, totalPaise: 100 };
    expect(() =>
      separatePrices({
        material,
        saasService: {
          amountPaise: 1.5,
          period: "monthly",
          payerOrgId: "buyer",
        },
      }),
    ).toThrow("INVALID_SAAS_PRICE");
    expect(() =>
      separatePrices({
        material,
        transactionService: {
          amountPaise: 10,
          payerOrgId: "buyer",
          disclosedAt: 0,
        },
      }),
    ).toThrow("INVALID_TRANSACTION_FEE");
  });
});
