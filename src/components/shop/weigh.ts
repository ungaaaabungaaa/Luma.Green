import { paiseFor } from "../../../convex/lib/chain";

/**
 * Weights and prices as people type them, and back. The database keeps
 * integer grams and paise; the fields show kilograms and rupees. Parsing is
 * done on the digits, never through floats, so 12.345 kg is exactly 12,345 g.
 */

/** The − / + buttons move by half a kilo. */
export const STEP_GRAMS = 500;
/** No home pickup is bigger than this; more is a typing slip. */
export const MAX_GRAMS = 5_000_000;

const KG_PATTERN = /^(\d{0,4})(?:[.,](\d{0,3}))?$/;
const RUPEES_PATTERN = /^(\d{0,5})(?:[.,](\d{0,2}))?$/;

/**
 * Kilograms as typed — "12", "12.5", "12,5", ".5" — to grams. Empty is zero
 * (not weighed); anything else that isn't a weight is null.
 */
export function parseKg(input: string): number | null {
  const text = input.trim();
  if (text === "") return 0;
  const match = KG_PATTERN.exec(text);
  if (!match) return null;
  const [, whole = "", fraction = ""] = match;
  if (whole === "" && fraction === "") return null;
  const grams = Number(whole || "0") * 1000 + Number(fraction.padEnd(3, "0"));
  return grams <= MAX_GRAMS ? grams : null;
}

/** Grams as the kg field shows them: 12500 → "12.5", 12000 → "12". */
export function kgInput(grams: number): string {
  const whole = String(Math.floor(grams / 1000));
  let fraction = String(grams % 1000).padStart(3, "0");
  while (fraction.endsWith("0")) fraction = fraction.slice(0, -1);
  return fraction === "" ? whole : `${whole}.${fraction}`;
}

/**
 * Half a kilo more or less, landing on the half-kilo grid: 12.3 kg goes up to
 * 12.5 and down to 12. Never below zero.
 */
export function stepGrams(grams: number, direction: 1 | -1): number {
  // Up: the next grid line above. Down: the same, seen from the other side
  // (ceil(x) - 1 is -(floor(-x) + 1)).
  const next =
    direction * (Math.floor((direction * grams) / STEP_GRAMS) + 1) * STEP_GRAMS;
  return Math.min(MAX_GRAMS, Math.max(0, next));
}

/** Rupees as typed — "14", "14.5", "14.50" — to paise; null if it isn't one. */
export function parseRupees(input: string): number | null {
  const match = RUPEES_PATTERN.exec(input.trim());
  if (!match) return null;
  const [, whole = "", fraction = ""] = match;
  return whole === "" && fraction === ""
    ? null
    : Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
}

/** Paise as the price field shows them: 1450 → "14.50", 1400 → "14". */
export function rupeesInput(paise: number): string {
  const whole = String(Math.floor(paise / 100));
  const fraction = paise % 100;
  return fraction === 0
    ? whole
    : `${whole}.${String(fraction).padStart(2, "0")}`;
}

export interface PricedLine {
  materialCode: string;
  grams: number;
  /** Null when there's no price for this material. */
  paisePerKg: number | null;
  paise: number | null;
}

/**
 * Weighed lines at the shop's prices, with the total — counted the way the
 * server counts them: each line rounded to the paisa, then added up.
 */
export function priceLines(
  lines: readonly { materialCode: string; grams: number }[],
  rates: ReadonlyMap<string, number>,
): { lines: PricedLine[]; totalPaise: number } {
  const priced = lines.map((line) => {
    const paisePerKg = rates.get(line.materialCode) ?? null;
    return {
      materialCode: line.materialCode,
      grams: line.grams,
      paisePerKg,
      paise: paisePerKg === null ? null : paiseFor(line.grams, paisePerKg),
    };
  });
  return {
    lines: priced,
    totalPaise: priced.reduce((sum, line) => sum + (line.paise ?? 0), 0),
  };
}
