import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ApplicationDetails,
  changeLabels,
  expiryNote,
} from "./application-details";
import type { ReviewedApplication } from "./checklist";

describe("changeLabels", () => {
  it("names each changed field once, in words", () => {
    expect(
      changeLabels([
        "kabadiwala.opens",
        "kabadiwala.closes",
        "kabadiwala.location",
        "files",
      ]),
    ).toEqual(["Opening hours", "Address", "Documents and photos"]);
  });
});

describe("expiryNote", () => {
  it("warns about a consent that has run out or soon will", () => {
    expect(expiryNote("2026-09-29", "2026-09-29")).toEqual({
      tone: "bad",
      text: "Expired",
    });
    expect(expiryNote("2026-10-19", "2026-09-29")).toEqual({
      tone: "warn",
      text: "Expires in 20 days",
    });
    expect(expiryNote("2028-03-31", "2026-09-29")).toBeNull();
    expect(expiryNote(undefined, "2026-09-29")).toBeNull();
  });
});

describe("ApplicationDetails", () => {
  const yard: ReviewedApplication = {
    id: "k17yard" as Id<"applications">,
    kind: "yard",
    status: "submitted",
    version: 2,
    locale: "en",
    name: "Irfan Metal & Plastic Yard",
    phone: "+919000000107",
    submittedAt: Date.UTC(2026, 8, 28, 12),
    decidedAt: undefined,
    note: undefined,
    kabadiwala: undefined,
    saathi: undefined,
    business: {
      businessName: "Irfan Metal & Plastic Yard",
      gstRegistered: true,
      gstin: "29aaifi3344r1z1",
      materials: ["metal", "plastic"],
      address: "Survey 42, Hegde Nagar, Bengaluru",
      location: { lat: 13.0708, lng: 77.6293 },
      locationTags: ["Hegde Nagar"],
      collectsFromSuppliers: true,
      phones: [{ number: "+919845000099", label: "Manager" }],
      opens: "09:00",
      closes: "19:00",
      weeklyOff: ["fri"],
    },
    documents: {
      pcbNotRequired: false,
      board: "kspcb",
      consentNumber: "KSPCB/CFO/2025/4410",
      validUntil: "2026-10-10",
      declaration: true,
    },
    files: [],
    earlierVersions: 1,
    changes: ["business.opens", "documents.validUntil"],
    audit: [],
  };

  it("shows the form as sent, with what changed and what's expiring", () => {
    render(<ApplicationDetails application={yard} today="2026-09-29" />);

    const business = screen.getByRole("heading", { name: "The business" });
    expect(business).toBeInTheDocument();
    expect(screen.getByText("29AAIFI3344R1Z1")).toBeInTheDocument();
    expect(screen.getByText("Metal")).toBeInTheDocument();
    expect(screen.getByText("09:00 to 19:00")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /See the pin on Google Maps/ }),
    ).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=13.0708,77.6293",
    );

    // Two fields changed since version 1.
    expect(screen.getAllByText("Changed")).toHaveLength(2);
    const validUntil = screen.getByText("Valid until").closest("div");
    if (!validUntil) throw new Error("No 'Valid until' row");
    expect(within(validUntil).getByText("Changed")).toBeInTheDocument();
    expect(
      within(validUntil).getByText("Expires in 11 days"),
    ).toBeInTheDocument();
  });

  it("shows a declared source site and origin for admin review", () => {
    render(
      <ApplicationDetails
        application={{
          ...yard,
          kind: "manufacturer",
          business: {
            ...yard.business,
            siteType: "manufacturing_facility",
            materialOrigins: ["industrial_byproduct"],
          },
          changes: ["business.materialOrigins"],
        }}
        today="2026-09-29"
      />,
    );

    expect(screen.getByText("Manufacturing facility")).toBeInTheDocument();
    const origins = screen.getByText("Material origins").closest("div");
    if (!origins) throw new Error("No material origins row");
    expect(
      within(origins).getByText("Industrial byproduct"),
    ).toBeInTheDocument();
    expect(within(origins).getByText("Changed")).toBeInTheDocument();
  });
});
