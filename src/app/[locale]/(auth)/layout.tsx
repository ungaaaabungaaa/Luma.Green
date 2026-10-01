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
      <header className="flex min-h-18 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background px-4 py-2 sm:px-8">
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
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:p-8">
        <aside className="relative order-2 flex flex-col justify-between self-start overflow-hidden rounded-3xl border border-border bg-muted p-3 text-foreground lg:order-1 lg:min-h-140 lg:self-stretch lg:p-8">
          <p className="relative z-10 hidden max-w-md font-display text-5xl leading-tight font-semibold tracking-tight text-balance lg:block">
            {brand("tagline")}
          </p>
          <figure className="lg:mt-10">
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <Image
                src={collectionPartners}
                alt=""
                sizes="(min-width: 1024px) 520px, 92vw"
                className="h-24 w-full object-cover object-[center_25%] lg:h-auto lg:object-center"
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
          className="order-1 mx-auto flex w-full max-w-lg flex-col justify-center py-4 sm:py-8 lg:order-2 lg:px-4"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
