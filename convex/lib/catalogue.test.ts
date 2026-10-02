import { describe, expect, it } from "vitest";

import { locales } from "../../src/i18n/locales";
import { CATALOGUE, catalogueEntry, materialName } from "./catalogue";

describe("material catalogue translations", () => {
  it("provides a translated name for every material in every supported locale", () => {
    for (const material of CATALOGUE) {
      expect(
        Object.keys(material.names).toSorted((a, b) => a.localeCompare(b)),
        material.code,
      ).toEqual([...locales].toSorted((a, b) => a.localeCompare(b)));
      for (const locale of locales) {
        const name = materialName(material.names, locale, material.code);
        expect(name.trim(), `${material.code}.${locale}`).not.toBe("");
        // This exact Dutch term is also idiomatic English. Do not force an
        // incorrect spelling merely to make every translated value different.
        const isSharedDutchTerm =
          locale === "nl" &&
          material.code === "PLASTIC-HDPE" &&
          name === "Hard plastic (HDPE)";
        if (locale !== "en" && !isSharedDutchTerm)
          expect(name, `${material.code}.${locale}`).not.toBe(
            material.names.en,
          );
      }
    }
  });

  it("finds materials by their stable code", () => {
    expect(catalogueEntry("PAPER-NEWS")?.names.ar).toBe("صحف");
    expect(catalogueEntry("unknown")).toBeUndefined();
  });

  it("keeps English and code fallbacks for old records and unknown languages", () => {
    expect(materialName({ en: "Newspaper" }, "ta", "PAPER-NEWS")).toBe(
      "Newspaper",
    );
    expect(materialName({ en: "Newspaper" }, "xx", "PAPER-NEWS")).toBe(
      "Newspaper",
    );
    expect(materialName({}, "ar", "PAPER-NEWS")).toBe("PAPER-NEWS");
    expect(materialName(undefined, "ar", "PAPER-NEWS")).toBe("PAPER-NEWS");
  });
});
