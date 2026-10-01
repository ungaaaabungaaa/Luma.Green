import type { MetadataRoute } from "next";

import { locales } from "@/i18n/locales";
import { languageAlternates, localizedPath, publicRoutes } from "@/i18n/paths";
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
      // No reliable content-modified timestamp exists. A build is not an edit.
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(languageAlternates(path)).map(([language, route]) => [
            language,
            `${site.url}${route}`,
          ]),
        ),
      },
    })),
  );
}
