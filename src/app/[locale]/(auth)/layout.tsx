import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { SkipLink } from "@/components/site/skip-link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Link } from "@/i18n/navigation";

import collectionPartners from "../../../../public/images/showcase/collection-partners.webp";

/**
 * Shell for signing in: a focused form and a quiet brand panel. Pages
 * here are private — each sets `privateMetadata()` (docs/architecture/urls.md).
 */
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("nav");
  const brand = await getTranslations("brand");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SkipLink />
      <header className="flex min-h-18 flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-2 sm:px-8">
        <Link
          href="/"
          aria-label={t("home")}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-12">
        <aside className="relative hidden flex-col justify-between overflow-hidden rounded-xl border border-border bg-muted p-8 text-foreground lg:flex">
          <p className="max-w-md font-display text-5xl leading-tight font-semibold tracking-tight text-balance">
            {brand("tagline")}
          </p>
          <figure className="lg:mt-10">
            <div className="overflow-hidden rounded-lg">
              <Image
                src={collectionPartners}
                alt=""
                sizes="(min-width: 1024px) 520px, 92vw"
                className="aspect-4/3 w-full object-cover"
              />
            </div>
          </figure>
          <p className="mt-8 hidden text-sm font-medium text-muted-foreground lg:block">
            {brand("name")}
          </p>
        </aside>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-md flex-col justify-center py-4 sm:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
