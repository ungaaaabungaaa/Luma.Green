import { type PriceProblem, priceProblem } from "../../../../convex/lib/review";

/**
 * Rupees as the admin types them, to integer paise and back. Integer maths
 * only: `14.35` is 1435 paise exactly, never 1434.9999.
 */

const RUPEES = /^(\d{1,7})(?:\.(\d{1,2}))?$/;

/** `14`, `14.5`, `₹ 1,400.50` → paise; null if it isn't a rupee amount. */
export function parseRupees(input: string): number | null {
  const amount = input.replaceAll(/[\s,₹]/gu, "");
  if (!RUPEES.test(amount)) return null;
  const [whole = "0", fraction = ""] = amount.split(".", 2);
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** Paise as an editable rupee amount: `1400` → `14`, `1450` → `14.50`. */
export function rupeesInput(paise: number | null): string {
  if (paise === null) return "";
  const whole = Math.floor(paise / 100);
  const rest = paise % 100;
  return rest === 0
    ? String(whole)
    : `${String(whole)}.${String(rest).padStart(2, "0")}`;
}

export type PriceInputProblem = PriceProblem | "MISSING";

/** What's wrong with a typed floor and fallback, if anything. */
export function priceInputProblem(
  floor: string,
  fallback: string,
): PriceInputProblem | null {
  if (!floor.trim() || !fallback.trim()) return "MISSING";
  const floorPaise = parseRupees(floor);
  const fallbackPaise = parseRupees(fallback);
  return floorPaise === null || fallbackPaise === null
    ? "INVALID_PRICE"
    : priceProblem(floorPaise, fallbackPaise);
}

export const PRICE_PROBLEM_MESSAGES: Record<PriceInputProblem, string> = {
  MISSING: "Enter both prices.",
  INVALID_PRICE: "Enter rupees above zero, like 14 or 14.50.",
  FLOOR_ABOVE_FALLBACK: "The minimum can't be more than the fallback.",
  PRICE_TOO_HIGH: "That's over ₹10,000 a kilo. Check the number.",
};
