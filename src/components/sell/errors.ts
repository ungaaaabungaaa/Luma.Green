import { ConvexError } from "convex/values";

import type { SellStep } from "./draft";

/**
 * What convex/households.ts can refuse with, mapped to what we tell the
 * household (keys under `sell.errors`) and where they can fix it.
 */
const FIX_STEP = {
  EMPTY_BASKET: "basket",
  TOO_MANY_ITEMS: "basket",
  DUPLICATE_ITEM: "basket",
  INVALID_KG: "basket",
  UNKNOWN_MATERIAL: "basket",
  SHOP_NOT_FOUND: "shop",
  SHOP_NO_PICKUP: "shop",
  INVALID_DATE: "when",
  SLOT_PASSED: "when",
  INVALID_NAME: "when",
  ADDRESS_REQUIRED: "when",
  INVALID_ADDRESS: "when",
  TOO_MANY_OPEN: null,
  NO_PHONE: null,
  NOT_SIGNED_IN: null,
  CANNOT_CANCEL: null,
  NOT_YOURS: null,
  NOT_FOUND: null,
} as const satisfies Record<string, SellStep | null>;

export type SellErrorKey = keyof typeof FIX_STEP | "generic";

function isKnown(code: string): code is keyof typeof FIX_STEP {
  return Object.hasOwn(FIX_STEP, code);
}

/** The message key for a failed call; anything unexpected is "generic". */
export function sellErrorKey(error: unknown): SellErrorKey {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return isKnown(error.data) ? error.data : "generic";
  }
  return "generic";
}

/** The step where the household can put this right, if there is one. */
export function stepToFix(key: SellErrorKey): SellStep | null {
  return key === "generic" ? null : FIX_STEP[key];
}
