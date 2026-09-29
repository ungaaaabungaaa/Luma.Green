import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { Link } from "@/i18n/navigation";

/**
 * The household's own pages (booking tracking): private, never indexed
 * (docs/architecture/urls.md#indexing). Each page sets `privateMetadata()`;
 * this is the fallback for anything that doesn't.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** A phone-width column with the mark and the language switcher. */
export default async function HouseholdLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("nav");

  return (
    <div className="flex min-h-dvh flex-col bg-muted/50">
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-4 py-2 font-medium shadow focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
      >
        {t("skipToContent")}
      </a>
      <header className="flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-background px-4">
        <Link
          href="/"
          aria-label={t("home")}
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <LanguageSwitcher />
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
