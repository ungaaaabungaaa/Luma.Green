import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import messages from "../../../messages/en.json";
import type { ListingView, TradeView } from "./types";

/** Renders market screens the way the app does: English, India time. */
export function WithIntl({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Asia/Kolkata"
    >
      {children}
    </NextIntlClientProvider>
  );
}

export function aTrade(overrides: Partial<TradeView> = {}): TradeView {
  return {
    id: "trade1" as TradeView["id"],
    material: {
      code: "PAPER-NEWS",
      names: { en: "Newspaper" },
      family: "paper",
    },
    grams: 100_000,
    paisePerKg: 1750,
    totalPaise: 175_000,
    status: "requested",
    timeline: [{ status: "requested", at: Date.parse("2026-10-02T10:00:00Z") }],
    counterparty: {
      name: "Peenya Paper & Plastic Yard",
      area: "Peenya Industrial Area",
      kind: "yard",
    },
    invoiceNo: undefined,
    needsEwayBill: false,
    inEscrow: false,
    actions: [],
    createdAt: Date.parse("2026-10-02T10:00:00Z"),
    ...overrides,
  };
}

export function aListing(overrides: Partial<ListingView> = {}): ListingView {
  return {
    id: "listing1" as ListingView["id"],
    seller: {
      name: "Ramesh Kabadi Store",
      area: "Yeshwanthpur",
      kind: "kabadiwala",
    },
    material: {
      code: "PAPER-NEWS",
      names: { en: "Newspaper" },
      family: "paper",
    },
    grams: 150_000,
    askPaisePerKg: 1750,
    note: "Dry, bundled",
    status: "open",
    isMine: false,
    createdAt: Date.parse("2026-10-01T10:00:00Z"),
    ...overrides,
  };
}
