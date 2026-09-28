import type { MetadataRoute } from "next";

import { localeMeta, locales } from "@/i18n/locales";
import { localizedPath, publicRoutes } from "@/i18n/paths";
import { site } from "@/lib/site";

/**
 * Every indexable route, listed once per locale with full hreflang alternates.
 *
 * Routes come from `publicRoutes` in `src/i18n/paths.ts` — the locale fan-out
 * is automatic.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.flatMap((path) =>
    locales.map((locale) => ({
      url: `${site.url}${localizedPath(locale, path)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [
            localeMeta[l].hreflang,
            `${site.url}${localizedPath(l, path)}`,
          ]),
        ),
      },
    })),
  );
}
