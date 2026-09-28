import { describe, expect, it } from "vitest";

import { localeMeta, locales } from "./locales";
import { languageAlternates, localizedPath, publicRoutes } from "./paths";

describe("localizedPath", () => {
  it("serves English without a prefix so its canonical URLs stay clean", () => {
    expect(localizedPath("en", "/")).toBe("/");
    expect(localizedPath("en", "/contact")).toBe("/contact");
  });

  it("prefixes every other locale, without a trailing slash on home", () => {
    expect(localizedPath("ta", "/")).toBe("/ta");
    expect(localizedPath("ar", "/how-it-works")).toBe("/ar/how-it-works");
  });
});

describe("languageAlternates", () => {
  it.each(publicRoutes)("lists every locale plus x-default for %s", (route) => {
    const alternates = languageAlternates(route);

    expect(Object.keys(alternates)).toHaveLength(locales.length + 1);
    expect(alternates["x-default"]).toBe(route);
    for (const locale of locales) {
      expect(alternates[localeMeta[locale].hreflang]).toBe(
        localizedPath(locale, route),
      );
    }
  });
});
