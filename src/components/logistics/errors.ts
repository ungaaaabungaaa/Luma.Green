import { ConvexError } from "convex/values";

/** Error codes convex/logistics.ts throws, each with a `logistics.errors` message. */
export const LOGISTICS_ERRORS = [
  "NOT_SIGNED_IN",
  "WRONG_ROLE",
  "NOT_FOUND",
  "LISTING_NOT_OPEN",
  "NOT_ENOUGH_LEFT",
  "INVALID_WEIGHT",
  "INVALID_DATE",
  "INVALID_PHONE",
  "INVALID_VEHICLE_NO",
  "INVALID_LIMIT",
  "INVALID_ORDER",
  "UNKNOWN_VEHICLE",
  "NO_STOPS",
  "TOO_MANY_STOPS",
  "DUPLICATE_STOP",
  "OVER_PAYLOAD",
  "OVER_VOLUME",
  "LOAD_CLOSED",
  "WRONG_STATUS",
] as const;

export type LogisticsErrorKey = (typeof LOGISTICS_ERRORS)[number] | "generic";

function codeOf(data: unknown): unknown {
  if (typeof data === "string") return data;
  return typeof data === "object" && data !== null && "code" in data
    ? data.code
    : undefined;
}

/** What to tell someone whose action failed: a `logistics.errors` key. */
export function logisticsErrorKey(error: unknown): LogisticsErrorKey {
  if (!(error instanceof ConvexError)) return "generic";
  const code = codeOf(error.data);
  return LOGISTICS_ERRORS.find((known) => known === code) ?? "generic";
}
