import { describe, expect, it } from "vitest";

import { isGeneratorSiteType } from "./stakeholderKinds";

describe("material generator site policy", () => {
  it("accepts community and commercial premises, but not processing plants", () => {
    for (const site of [
      "apartment_community",
      "office",
      "hotel",
      "resort",
      "other",
    ] as const) {
      expect(isGeneratorSiteType(site)).toBe(true);
    }
    expect(isGeneratorSiteType("manufacturing_facility")).toBe(false);
    expect(isGeneratorSiteType("preprocessor_yard")).toBe(false);
    expect(isGeneratorSiteType(undefined)).toBe(false);
  });
});
