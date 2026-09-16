import type { MetadataRoute } from "next";

import { defaultLocale, localeMeta, locales } from "@/i18n/locales";
import { site } from "@/lib/site";

/**
 * Every indexable route, listed once per locale with full hreflang alternates.
 *
 * Add new public routes to `routes` — the locale fan-out is automatic.
 */
const routes: readonly string[] = [""];

function url(locale: string, path: string) {
  return locale === defaultLocale
    ? `${site.url}${path || "/"}`
    : `${site.url}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((path) =>
    locales.map((locale) => ({
      url: url(locale, path),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [localeMeta[l].hreflang, url(l, path)]),
        ),
      },
    })),
  );
}
