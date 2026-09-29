import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../../convex/_generated/api";

/**
 * What the admin checks before approving each role —
 * docs/product/onboarding.md#what-the-admin-checks. Every item must be ticked
 * before Approve unlocks. Ticks are the admin's working notes, kept on the
 * page only; the decision itself is what the audit log records.
 */

export type ReviewedApplication = NonNullable<
  FunctionReturnType<typeof api.review.get>
>;

export interface CheckItem {
  id: string;
  label: string;
  hint?: string;
  link?: { href: string; label: string };
}

export const GST_PORTAL = "https://services.gst.gov.in/services/searchtp";
export const XGN_REGISTER =
  "https://xgn.karnataka.gov.in/CSHARP/ALLConsentOrder.aspx";

/** A Google Maps search for the pin, or for the address without one. */
export function mapLink(place: {
  location?: { lat: number; lng: number };
  address?: string;
}): string | undefined {
  const base = "https://www.google.com/maps/search/?api=1&query=";
  if (place.location) {
    return `${base}${String(place.location.lat)},${String(place.location.lng)}`;
  }
  const address = place.address?.trim();
  return address ? `${base}${encodeURIComponent(address)}` : undefined;
}

function gstCheck(
  section: { gstRegistered?: boolean; gstin?: string } | undefined,
  label: string,
): CheckItem[] {
  const hasGstin =
    section?.gstRegistered === true && Boolean(section.gstin?.trim());
  return hasGstin
    ? [
        {
          id: "gstin",
          label,
          link: { href: GST_PORTAL, label: "Search the GST portal" },
        },
      ]
    : [];
}

function consentCheck(documents: ReviewedApplication["documents"]): CheckItem {
  if (documents?.pcbNotRequired) {
    const reason = documents.notRequiredReason?.trim();
    return {
      id: "consent",
      label: "The claim that this unit needs no consent holds",
      hint: reason ? `Their reason: “${reason}”` : undefined,
    };
  }
  const label =
    "The consent is on the board's register: it names this business and address, hasn't expired, and covers what they do";
  if (documents?.board === "other") {
    const state = documents.boardState?.trim();
    const whose = state ? `${state}'s` : "the state's";
    return {
      id: "consent",
      label,
      hint: `Check with ${whose} pollution control board.`,
    };
  }
  return {
    id: "consent",
    label,
    link: { href: XGN_REGISTER, label: "Search KSPCB's XGN register" },
  };
}

type ChecklistInput = Pick<ReviewedApplication, "kind"> &
  Partial<Pick<ReviewedApplication, "kabadiwala" | "business" | "documents">>;

/** The checks for this application's role, in the order to do them. */
export function checklistFor(application: ChecklistInput): CheckItem[] {
  switch (application.kind) {
    case "kabadiwala": {
      const shop = application.kabadiwala;
      const map = shop ? mapLink(shop) : undefined;
      return [
        {
          id: "location",
          label: "The shop's location looks right on the map",
          link: map ? { href: map, label: "Open the map" } : undefined,
        },
        { id: "call", label: "Called the owner on their login number" },
        ...gstCheck(shop, "The GSTIN is active and matches the shop name"),
      ];
    }
    case "yard":
    case "recycler":
    case "manufacturer": {
      return [
        ...gstCheck(
          application.business,
          "The GSTIN is active on the GST portal and matches the business",
        ),
        consentCheck(application.documents),
        { id: "machines", label: "The machine photos show a working unit" },
        { id: "call", label: "Called the owner" },
      ];
    }
    case "saathi": {
      return [
        { id: "id", label: "The ID is readable and the name matches" },
        {
          id: "aadhaar",
          label:
            "Any Aadhaar card is masked, with only the last four digits showing",
          hint: "If it isn't, ask for changes: a masked copy only. Never keep a full Aadhaar number.",
        },
        { id: "selfie", label: "The selfie matches the photo on the ID" },
        { id: "call", label: "Called them on their phone number" },
      ];
    }
  }
}
