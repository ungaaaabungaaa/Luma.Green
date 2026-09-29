import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";

/** What `catalogue.priceBoard` returns, and its parts. */
export type PriceBoardData = FunctionReturnType<
  typeof api.catalogue.priceBoard
>;
export type PriceRow = PriceBoardData["rows"][number];
export type PricePoint = PriceRow["series"][number];
export type Family = PriceRow["family"];

/** The pilot city. Every public price is for Bengaluru until a second city. */
export const PRICE_CITY = "Bengaluru";

/** Families in the order people look for them: paper and plastic first. */
export const FAMILY_ORDER = [
  "paper",
  "plastic",
  "metal",
  "glass",
  "ewaste",
  "other",
] as const satisfies readonly Family[];

export interface FamilyGroup {
  family: Family;
  rows: PriceRow[];
}

/**
 * Household scrap grouped by family (empty families dropped), and recycled
 * output kept apart for the factory-gate section. Rows keep the catalogue's
 * order inside each group.
 */
export function groupBoard(rows: readonly PriceRow[]): {
  scrap: FamilyGroup[];
  recycled: PriceRow[];
} {
  const scrap = FAMILY_ORDER.map((family) => ({
    family,
    rows: rows.filter((row) => row.stage === "scrap" && row.family === family),
  })).filter((group) => group.rows.length > 0);
  const recycled = rows.filter((row) => row.stage === "recycled");
  return { scrap, recycled };
}

export type Trend = "up" | "down" | "flat" | "unknown";

/** Which way a price moved over the week; unknown without a week of history. */
export function trendOf(changePct: number | null): Trend {
  if (changePct === null || !Number.isFinite(changePct)) return "unknown";
  if (changePct > 0) return "up";
  return changePct < 0 ? "down" : "flat";
}

/** Everyday household scrap — what the home page's price card shows. */
export const TEASER_CODES = [
  "PAPER-NEWS",
  "PAPER-CARTON",
  "PLASTIC-PET",
  "METAL-IRON",
] as const;

/**
 * The rows for the home page's price card: the everyday materials in
 * `codes` order, topped up from the rest of the scrap board if the
 * catalogue changes. Only rows with a price today.
 */
export function pickTeaser(
  rows: readonly PriceRow[],
  codes: readonly string[] = TEASER_CODES,
  count = 4,
): PriceRow[] {
  const priced = rows.filter(
    (row) => row.stage === "scrap" && row.todayPaise !== null,
  );
  const chosen = codes
    .map((code) => priced.find((row) => row.code === code))
    .filter((row): row is PriceRow => row !== undefined);
  for (const row of priced) {
    if (chosen.length >= count) break;
    if (!chosen.includes(row)) chosen.push(row);
  }
  return chosen.slice(0, count);
}

/** Lowest and highest price in a series; null for an empty one. */
export function seriesRange(
  series: readonly PricePoint[],
): { low: number; high: number } | null {
  if (series.length === 0) return null;
  const prices = series.map((point) => point.paisePerKg);
  return { low: Math.min(...prices), high: Math.max(...prices) };
}

/** Whole days since 1970 for a `YYYY-MM-DD` date: an x-axis that skips no day. */
export function dayNumber(date: string): number {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}
