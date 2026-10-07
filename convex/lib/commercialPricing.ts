import { safePaiseFor } from "./chain";

/** The seller and buyer agree this price for physical material only. */
export interface MaterialPrice {
  kind: "material";
  grams: number;
  paisePerKg: number;
  totalPaise: number;
}

/** A Luma software charge. It is not part of the material price. */
export interface SaasServicePrice {
  kind: "saas_service";
  amountPaise: number;
  period: "one_time" | "monthly" | "yearly";
  payerOrgId: string;
}

/** An optional Luma service charge, disclosed before trade acceptance. */
export interface TransactionServiceFee {
  kind: "transaction_service";
  amountPaise: number;
  payerOrgId: string;
  disclosedAt: number;
}

export interface SeparatePrices {
  material: MaterialPrice;
  saasService: SaasServicePrice | null;
  transactionService: TransactionServiceFee | null;
}

function isSafeNonNegativePaise(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Build a read model without adding Luma charges to the seller's material
 * amount. This function does not invoice or collect any of these prices.
 */
export function separatePrices(input: {
  material: Omit<MaterialPrice, "kind">;
  saasService?: Omit<SaasServicePrice, "kind">;
  transactionService?: Omit<TransactionServiceFee, "kind">;
}): SeparatePrices {
  const { material, saasService, transactionService } = input;
  const expected = safePaiseFor(material.grams, material.paisePerKg);
  if (expected === null) throw new RangeError("INVALID_MATERIAL_PRICE");
  if (
    material.grams <= 0 ||
    material.paisePerKg < 0 ||
    material.totalPaise !== expected
  ) {
    throw new RangeError("INVALID_MATERIAL_PRICE");
  }
  if (
    saasService &&
    (!isSafeNonNegativePaise(saasService.amountPaise) ||
      !saasService.payerOrgId.trim())
  ) {
    throw new RangeError("INVALID_SAAS_PRICE");
  }
  if (
    transactionService &&
    (!isSafeNonNegativePaise(transactionService.amountPaise) ||
      !transactionService.payerOrgId.trim() ||
      !Number.isSafeInteger(transactionService.disclosedAt) ||
      transactionService.disclosedAt <= 0)
  ) {
    throw new RangeError("INVALID_TRANSACTION_FEE");
  }

  return {
    material: { kind: "material", ...material },
    saasService: saasService ? { kind: "saas_service", ...saasService } : null,
    transactionService: transactionService
      ? { kind: "transaction_service", ...transactionService }
      : null,
  };
}
