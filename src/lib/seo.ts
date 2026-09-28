import type { Metadata } from "next";

import { type Locale, localeMeta } from "@/i18n/locales";
import { languageAlternates, localizedPath } from "@/i18n/paths";

import { site } from "./site";

interface PageMetadataInput {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  /** Skip the `%s · Luma.Green` template — for the home page. */
  absoluteTitle?: boolean;
}

/**
 * Metadata for one localised route: a self-referencing canonical, the full
 * hreflang set, and Open Graph/Twitter cards.
 *
 * Next merges metadata shallowly, so a route that sets `openGraph` replaces the
 * layout's whole object — this builds the complete one every time.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const url = localizedPath(locale, path);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: site.name,
      title,
      description,
      url,
      locale: localeMeta[locale].hreflang.replace("-", "_"),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Metadata for a private page — sign-in, onboarding, the business app, booking
 * tracking. Never indexed, and it clears the canonical, hreflang and Open Graph
 * a child would otherwise inherit from the root layout
 * (docs/architecture/urls.md#indexing).
 */
export function privateMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
    alternates: {},
    openGraph: null,
    twitter: null,
  };
}

/**
 * Serialise JSON-LD for a `<script type="application/ld+json">` tag. `<` is
 * escaped so a value can never close the script element early.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replaceAll("<", String.raw`\u003c`);
}
