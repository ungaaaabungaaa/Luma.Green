import { ConvexError } from "convex/values";

/** Keep each stored stock balance exact, including stock loaded from old data. */
export function stockGramsAfter(
  currentGrams: number,
  deltaGrams: number,
): number {
  if (
    !Number.isSafeInteger(currentGrams) ||
    currentGrams < 0 ||
    !Number.isSafeInteger(deltaGrams)
  ) {
    throw new ConvexError("INVALID_WEIGHT");
  }
  const grams = currentGrams + deltaGrams;
  if (!Number.isSafeInteger(grams)) throw new ConvexError("INVALID_WEIGHT");
  if (grams < 0) throw new ConvexError("NOT_ENOUGH_STOCK");
  return grams;
}
