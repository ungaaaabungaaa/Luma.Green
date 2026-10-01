import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { SkipLink } from "@/components/site/skip-link";
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
  const showcase = await getTranslations("showcase");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SkipLink />
      <header className="flex h-20 items-center justify-between gap-2 border-b border-border/60 bg-background px-5 sm:px-8">
        <Link
          href="/"
          aria-label={t("home")}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <LanguageSwitcher />
      </header>
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 p-4 sm:p-8 lg:grid-cols-2 lg:gap-10 lg:p-10">
        <aside className="relative order-2 flex flex-col justify-between self-start overflow-hidden rounded-3xl bg-brand-950 p-3 text-brand-50 lg:order-1 lg:min-h-160 lg:self-stretch lg:p-10">
          <p className="relative z-10 hidden max-w-sm font-display text-5xl leading-tight font-semibold tracking-tight text-balance lg:block">
            {brand("tagline")}
          </p>
          <figure className="lg:mt-10">
            <div className="overflow-hidden rounded-2xl border border-brand-700/40 bg-brand-50">
              <Image
                src={collectionPartners}
                alt=""
                sizes="(min-width: 1024px) 520px, 92vw"
                className="h-24 w-full object-cover object-[center_25%] lg:h-auto lg:object-center"
              />
            </div>
            <figcaption className="mt-2 text-xs text-brand-100">
              {showcase("scene")}
            </figcaption>
          </figure>
          <p className="mt-8 hidden text-sm font-medium text-brand-200 lg:block">
            {brand("name")}
          </p>
        </aside>
        <main
          id="main"
          tabIndex={-1}
          className="order-1 mx-auto flex w-full max-w-lg flex-col justify-center py-6 sm:py-10 lg:order-2 lg:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
