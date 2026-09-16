import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "./locales";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // `/` serves English, `/ta` serves Tamil. Keeps the canonical URL clean for SEO
  // while every other locale gets a stable, indexable prefix.
  localePrefix: "as-needed",
  localeDetection: true,
});
