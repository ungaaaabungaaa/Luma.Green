import { describe, expect, it } from "vitest";

import { checklistFor, GST_PORTAL, mapLink, XGN_REGISTER } from "./checklist";

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("the kabadiwala checklist", () => {
  const shop = {
    shopName: "Kavitha Raddi Shop",
    address: "3rd Block, Rajajinagar, Bengaluru",
    location: { lat: 12.9915, lng: 77.5525 },
    gstRegistered: false,
  };

  it("checks the map and a phone call", () => {
    const items = checklistFor({ kind: "kabadiwala", kabadiwala: shop });
    expect(ids(items)).toEqual(["location", "call"]);
    expect(items.at(0)?.link?.href).toBe(
      "https://www.google.com/maps/search/?api=1&query=12.9915,77.5525",
    );
  });

  it("checks the GSTIN only when one was given", () => {
    const items = checklistFor({
      kind: "kabadiwala",
      kabadiwala: { ...shop, gstRegistered: true, gstin: "29ABCDE1234F1Z5" },
    });
    expect(ids(items)).toEqual(["location", "call", "gstin"]);
    expect(items.at(2)?.link?.href).toBe(GST_PORTAL);
  });
});

describe("the business checklist", () => {
  const business = {
    businessName: "Irfan Metal & Plastic Yard",
    gstRegistered: true,
    gstin: "29AAIFI3344R1Z1",
  };

  it("checks GST, the KSPCB register, the machines and a call", () => {
    const items = checklistFor({
      kind: "yard",
      business,
      documents: { pcbNotRequired: false, board: "kspcb" },
    });
    expect(ids(items)).toEqual(["gstin", "consent", "machines", "call"]);
    expect(items.at(1)?.link?.href).toBe(XGN_REGISTER);
  });

  it("points to the other state's board", () => {
    const consent = checklistFor({
      kind: "recycler",
      business: { ...business, gstRegistered: false },
      documents: {
        pcbNotRequired: false,
        board: "other",
        boardState: "Tamil Nadu",
      },
    }).at(0);
    expect(consent?.hint).toBe(
      "Check with Tamil Nadu's pollution control board.",
    );
    expect(consent?.link).toBeUndefined();
  });

  it("asks the admin to test a 'no consent needed' claim", () => {
    const consent = checklistFor({
      kind: "manufacturer",
      business,
      documents: {
        pcbNotRequired: true,
        notRequiredReason: "Paper baling only, a white-category unit",
      },
    }).at(1);
    expect(consent?.label).toMatch(/needs no consent/);
    expect(consent?.hint).toContain("Paper baling only");
  });
});

describe("the Saathi checklist", () => {
  it("checks the ID, a masked Aadhaar, the selfie and a call", () => {
    expect(ids(checklistFor({ kind: "saathi" }))).toEqual([
      "id",
      "aadhaar",
      "selfie",
      "call",
    ]);
  });
});

describe("map links", () => {
  it("search the address when there's no pin", () => {
    expect(mapLink({ address: "8th Main, Malleshwaram" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=8th%20Main%2C%20Malleshwaram",
    );
    expect(mapLink({ address: "  " })).toBeUndefined();
  });
});
