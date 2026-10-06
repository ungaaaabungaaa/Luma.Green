import { describe, expect, it } from "vitest";

import { primarySiteType } from "./siteClassification";

describe("primary site type", () => {
  it("keeps the site declared by a non-household generator", () => {
    expect(primarySiteType({ kind: "manufacturer", siteType: "office" })).toBe(
      "office",
    );
  });

  it("recognises older business records without changing them", () => {
    expect(primarySiteType({ kind: "yard" })).toBe("preprocessor_yard");
    expect(primarySiteType({ kind: "recycler" })).toBe("recycling_facility");
    expect(primarySiteType({ kind: "manufacturer" })).toBe(
      "manufacturing_facility",
    );
    expect(primarySiteType({ kind: "kabadiwala" })).toBeUndefined();
  });
});
