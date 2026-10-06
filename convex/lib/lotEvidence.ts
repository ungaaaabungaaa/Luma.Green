import { ConvexError } from "convex/values";

/** These records describe physical evidence; they do not prove title or origin. */
export function positiveGrams(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ConvexError("INVALID_WEIGHT");
  }
  return value;
}

export function nonnegativeGrams(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ConvexError("INVALID_WEIGHT");
  }
  return value;
}

export function requiredLabel(value: string): string {
  const label = value.trim();
  if (label.length === 0 || label.length > 120) {
    throw new ConvexError("INVALID_LABEL");
  }
  return label;
}

export function optionalReference(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const reference = value.trim();
  if (reference.length > 500) throw new ConvexError("INVALID_REFERENCE");
  return reference || undefined;
}

export function balancedOutputGrams(
  inputGrams: number,
  contaminationGrams: number,
  processLossGrams: number,
  outputs: readonly { grams: number }[],
): void {
  positiveGrams(inputGrams);
  nonnegativeGrams(contaminationGrams);
  nonnegativeGrams(processLossGrams);
  if (outputs.length === 0 || outputs.length > 10) {
    throw new ConvexError("INVALID_OUTPUTS");
  }
  let outputGrams = 0;
  for (const output of outputs) {
    outputGrams += positiveGrams(output.grams);
    if (!Number.isSafeInteger(outputGrams))
      throw new ConvexError("INVALID_WEIGHT");
  }
  if (contaminationGrams + processLossGrams + outputGrams !== inputGrams) {
    throw new ConvexError("MASS_BALANCE_MISMATCH");
  }
}
