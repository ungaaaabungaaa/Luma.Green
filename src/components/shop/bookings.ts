import { ConvexError } from "convex/values";

import { shiftDate } from "../../../convex/lib/dates";

/** Small rules the request screens share. Pure, so they're tested alone. */

export type RelativeDay = "today" | "tomorrow" | "yesterday";

const NEAR_DAYS: readonly (readonly [RelativeDay, number])[] = [
  ["today", 0],
  ["tomorrow", 1],
  ["yesterday", -1],
];

/** Today, tomorrow or yesterday for a YYYY-MM-DD date; null for others. */
export function relativeDay(date: string, today: string): RelativeDay | null {
  const near = NEAR_DAYS.find(([, days]) => shiftDate(today, days) === date);
  return near ? near[0] : null;
}

/**
 * The area of an address: the last part before the city. "5, Sampige Road,
 * Malleshwaram, Bengaluru" → "Malleshwaram". Before the shop accepts, the
 * server sends only this part.
 */
export function areaOf(address: string, city: string): string {
  const cityAt = address.toLowerCase().indexOf(`, ${city.toLowerCase()}`);
  const beforeCity = cityAt === -1 ? address : address.slice(0, cityAt);
  const parts = beforeCity
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  return parts.at(-1) ?? address;
}

/** "Priya Sharma" → "Priya", for cards. */
export function firstName(name: string | undefined): string | undefined {
  const first = name?.trim().split(/\s+/, 1)[0];
  return first === "" ? undefined : first;
}

/** Accepted pickups: those due now (today, or late) and those still ahead. */
export function splitDue<T extends { slotDate: string }>(
  bookings: readonly T[],
  today: string,
): { due: T[]; later: T[] } {
  return {
    due: bookings.filter((booking) => booking.slotDate <= today),
    later: bookings.filter((booking) => booking.slotDate > today),
  };
}

/** The code a Convex function failed with, e.g. "BELOW_FLOOR". */
export function errorCode(error: unknown): string | null {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : null;
}

/**
 * What to say when accepting, starting or paying fails: `changed` when the
 * request moved on meanwhile (someone else acted), else `generic`. Keys under
 * `shop.errors`.
 */
export function actionErrorKey(error: unknown): "changed" | "generic" {
  const code = errorCode(error);
  return code === "WRONG_STATUS" || code === "NOT_FOUND"
    ? "changed"
    : "generic";
}
