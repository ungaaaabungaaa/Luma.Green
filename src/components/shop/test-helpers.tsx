import { render } from "@testing-library/react";
import { type FunctionReference, getFunctionName } from "convex/server";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import type { Id } from "../../../convex/_generated/dataModel";
import messages from "../../../messages/en.json";
import type { BookingView, MaterialRef } from "./types";

/**
 * Fixtures and a renderer for the shop's component tests. Missing or broken
 * messages throw, so a typo in a key fails the test instead of rendering it.
 */

/** 11:30 in India on 29 September 2026. */
export const NOW = new Date("2026-09-29T06:00:00.000Z");
export const TODAY = "2026-09-29";

export function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Asia/Kolkata"
      now={NOW}
      onError={(error) => {
        throw error;
      }}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

/**
 * A stand-in for Convex's `useQuery`: answers by function name
 * ("shop:requests"), and nothing for a skipped query.
 */
export function fakeQueries(results: Record<string, unknown>) {
  return (query: FunctionReference<"query">, args?: unknown): unknown =>
    args === "skip" ? undefined : results[getFunctionName(query)];
}

export const NEWSPAPER: MaterialRef = {
  code: "PAPER-NEWS",
  names: { en: "Newspaper" },
  family: "paper",
};
export const PET: MaterialRef = {
  code: "PLASTIC-PET",
  names: { en: "PET bottles" },
  family: "plastic",
};
export const IRON: MaterialRef = {
  code: "METAL-IRON",
  names: { en: "Iron and steel" },
  family: "metal",
};

export function booking(overrides: Partial<BookingView> = {}): BookingView {
  return {
    id: "booking-1" as Id<"bookings">,
    token: "",
    name: "Priya",
    phone: "+91•••••••109",
    address: "Yeshwanthpur",
    mode: "pickup",
    items: [
      { material: NEWSPAPER, estKg: 12 },
      { material: PET, estKg: 3 },
    ],
    estimatePaise: 22_800,
    slotDate: TODAY,
    slotWindow: "evening",
    status: "requested",
    receipt: undefined,
    createdAt: NOW.getTime(),
    ...overrides,
  };
}

export const SHOP_WORKSPACE = {
  kind: "org",
  org: {
    id: "org-1",
    kind: "kabadiwala",
    name: "Ramesh Kabadi Store",
    slug: "ramesh-kabadi-store",
    area: "Yeshwanthpur",
    city: "Bengaluru",
    offersPickup: true,
  },
} as const;

export const YARD_WORKSPACE = {
  kind: "org",
  org: { ...SHOP_WORKSPACE.org, kind: "yard", name: "Peenya Yard" },
} as const;
