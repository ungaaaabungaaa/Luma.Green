import { ConvexError } from "convex/values";

import { CATALOGUE } from "./catalogue";

export const DEMO_PRICE_CITY = "Bengaluru";
export const DEMO_PRICE_DAYS = 30;
/** The legacy development seed used this day as its price-series origin. */
export const DEMO_PRICE_ANCHOR = "2026-09-29";
const DAY_MS = 86_400_000;

export function demoPriceDate(input: string): number {
  const timestamp = Date.parse(`${input}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input) ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== input
  ) {
    throw new ConvexError("INVALID_DEMO_PRICE_DATE");
  }
  return timestamp;
}

/** Sample figures only. A fixed anchor keeps overlapping seed runs identical. */
export function demoPricePaise(materialCode: string, date: string): number {
  const index = CATALOGUE.findIndex((entry) => entry.code === materialCode);
  if (index === -1) throw new ConvexError("UNKNOWN_DEMO_PRICE_MATERIAL");
  const entry = CATALOGUE[index];
  const day = (demoPriceDate(date) - demoPriceDate(DEMO_PRICE_ANCHOR)) / DAY_MS;
  const wobble =
    0.06 * Math.sin(day / 4 + index) + 0.025 * Math.cos(day / 2 + index * 1.7);
  return Math.round((entry.fallbackPaise * (1 + wobble)) / 50) * 50;
}
