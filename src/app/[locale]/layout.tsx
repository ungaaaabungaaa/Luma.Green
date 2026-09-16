import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import "../globals.css";

import { Providers } from "@/components/providers";
import {
  defaultLocale,
  localeMeta,
  locales,
  type Locale,
} from "@/i18n/locales";
import { routing } from "@/i18n/routing";
import { fontClassName } from "@/lib/fonts";
import { site } from "@/lib/site";

type LocaleParams = { params: Promise<{ locale: string }> };

/** Pre-render every locale at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function pathFor(locale: Locale) {
  return locale === defaultLocale ? "/" : `/${locale}`;
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(site.url),
    title: {
      default: t("title"),
      template: `%s · ${site.name}`,
    },
    description: t("description"),
    applicationName: site.name,
    alternates: {
      canonical: pathFor(locale),
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [localeMeta[l].hreflang, pathFor(l)]),
        ),
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: t("title"),
      description: t("description"),
      url: pathFor(locale),
      locale: localeMeta[locale].hreflang.replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0B3326" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Opts this subtree into static rendering; without it every page using
  // translations is forced dynamic.
  setRequestLocale(locale);

  return (
    <html
      lang={localeMeta[locale].hreflang}
      dir={localeMeta[locale].dir}
      className={`${fontClassName(locale)} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
