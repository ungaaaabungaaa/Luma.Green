import { describe, expect, it } from "vitest";

import workbook from "../data/industryWorkbook.json";
import {
  getIndustrySector,
  searchIndustryReference,
} from "./industryReference";

describe("workbook reference boundaries", () => {
  it("keeps all distinct source rows and preserves repeated codes without overwriting sectors", () => {
    expect(workbook.sectors).toHaveLength(419);
    expect(new Set(workbook.sectors.map((row) => row.id)).size).toBe(419);
    const sameCodes = workbook.sectors.filter(
      (row) => row.annexure.startsWith("Annexure II ") && row.code === "1.1",
    );
    expect(sameCodes).toHaveLength(2);
    expect(getIndustrySector(sameCodes[0]?.id ?? "")?.name).not.toBe(
      getIndustrySector(sameCodes[1]?.id ?? "")?.name,
    );
    expect(getIndustrySector("not-a-source-row")).toBeNull();
  });

  it("preserves the four source-name disagreements instead of silently treating inferred corrections as official", () => {
    expect(
      workbook.sectors.filter((row) => !row.analysis.nameMatchesSource),
    ).toHaveLength(4);
    expect(getIndustrySector("cpcb-2025-row-393")?.name).not.toBe(
      getIndustrySector("cpcb-2025-row-393")?.analysis.reportedSectorName,
    );
    expect(workbook.sourceQuality).toBe("workbook_unverified");
  });

  it("uses actual records rather than header-inclusive dashboard formulas", () => {
    expect(searchIndustryReference("industries", "").total).toBe(99);
    expect(searchIndustryReference("lifecycles", "").total).toBe(33);
    expect(searchIndustryReference("byproducts", "").total).toBe(30);
  });

  it("bounds pages, searches material attributes and exposes reference status without trading permission", () => {
    const first = searchIndustryReference("sectors", "");
    expect(first.items).toHaveLength(25);
    expect(first.nextOffset).toBe(25);
    expect(searchIndustryReference("sectors", "", 400).items).toHaveLength(19);
    expect(searchIndustryReference("sectors", "", 400).nextOffset).toBeNull();
    const results = searchIndustryReference("lifecycles", "hot washed");
    expect(results.items.map((row) => row.title)).toContain(
      "Hot-washed PET flakes",
    );
    expect(results.sourceQuality).toBe("workbook_unverified");
    expect(results).not.toHaveProperty("canTrade");
    expect(
      searchIndustryReference("byproducts", "no-such-material").items,
    ).toEqual([]);
  });

  it("rejects invalid pagination and unbounded search input", () => {
    for (const offset of [-1, 0.5, NaN, 10_001])
      expect(() => searchIndustryReference("sectors", "", offset)).toThrow(
        "INVALID_REFERENCE_SEARCH",
      );
    expect(() => searchIndustryReference("sectors", "x".repeat(201))).toThrow(
      "INVALID_REFERENCE_SEARCH",
    );
  });
});
