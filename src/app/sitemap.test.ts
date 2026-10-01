import { describe, expect, it } from "vitest";

import { localeMeta, locales } from "@/i18n/locales";
import { localizedPath, publicRoutes } from "@/i18n/paths";
import { site } from "@/lib/site";

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists only public entry pages in all locales, never protected workflows", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toHaveLength(publicRoutes.length * locales.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const locale of locales) {
      for (const path of ["/sell", "/join"]) {
        expect(urls).toContain(`${site.url}${localizedPath(locale, path)}`);
      }
      for (const path of [
        "/login",
        "/join/status",
        "/join/kabadiwala",
        "/app",
        "/t/token",
        "/admin",
      ]) {
        expect(urls).not.toContain(`${site.url}${localizedPath(locale, path)}`);
      }
    }
  });

  it("provides reciprocal language URLs and English x-default on every entry", () => {
    const entries = sitemap();
    for (const path of publicRoutes) {
      for (const locale of locales) {
        const entry = entries.find(
          (item) => item.url === `${site.url}${localizedPath(locale, path)}`,
        );
        expect(entry?.alternates?.languages).toEqual({
          ...Object.fromEntries(
            locales.map((alternate) => [
              localeMeta[alternate].hreflang,
              `${site.url}${localizedPath(alternate, path)}`,
            ]),
          ),
          "x-default": `${site.url}${path}`,
        });
      }
    }
  });

  it("does not claim that content changed whenever a build ran", () => {
    for (const entry of sitemap()) expect(entry.lastModified).toBeUndefined();
  });
});
