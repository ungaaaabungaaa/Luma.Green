import { ConvexError } from "convex/values";

import type { DocumentField } from "./types";

/** Error codes convex/exports.ts throws, each with an `exports.errors` message. */
export const EXPORT_ERRORS = [
  "NOT_SIGNED_IN",
  "NO_BUSINESS",
  "NOT_FOUND",
  "NOT_YOUR_FIELD",
  "INVALID_EWAY_BILL",
  "INVALID_IRN",
  "INVALID_VEHICLE",
  "INVALID_PHONE",
  "TOO_LONG",
  "INVALID_PERIOD",
  "INVALID_ROWS",
] as const;

export type ExportErrorCode = (typeof EXPORT_ERRORS)[number];
export type ExportErrorKey = ExportErrorCode | "generic";

/** What to tell someone whose export action failed: an `exports.errors` key. */
export function exportErrorKey(error: unknown): ExportErrorKey {
  if (!(error instanceof ConvexError) || typeof error.data !== "string") {
    return "generic";
  }
  const code = error.data;
  return EXPORT_ERRORS.find((known) => known === code) ?? "generic";
}

/**
 * The field a validation error belongs to, so the form can show it there.
 * `TOO_LONG` can come from any of the free-text fields; the form's own
 * length limits stop those before they reach the server.
 */
export function fieldOfError(key: ExportErrorKey): DocumentField | null {
  switch (key) {
    case "INVALID_EWAY_BILL": {
      return "ewayBillNo";
    }
    case "INVALID_IRN": {
      return "irn";
    }
    case "INVALID_VEHICLE": {
      return "vehicleNo";
    }
    case "INVALID_PHONE": {
      return "driverPhone";
    }
    default: {
      return null;
    }
  }
}
