import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { SkipLink } from "@/components/site/skip-link";
import { Link } from "@/i18n/navigation";

import materialStudy from "../../../../public/images/material-study.webp";

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
        <aside className="relative hidden min-h-160 flex-col justify-between overflow-hidden rounded-3xl bg-brand-950 p-10 text-brand-50 lg:flex">
          <p className="relative z-10 max-w-sm font-display text-5xl leading-tight font-semibold tracking-tight text-balance">
            {brand("tagline")}
          </p>
          <div className="mt-10 overflow-hidden rounded-2xl border border-brand-700/40 bg-brand-50">
            <Image
              src={materialStudy}
              alt=""
              sizes="(min-width: 1024px) 520px, 1px"
              className="h-auto w-full object-cover"
            />
          </div>
          <p className="mt-8 text-sm font-medium text-brand-200">
            {brand("name")}
          </p>
        </aside>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-lg flex-col justify-center py-6 sm:py-10 lg:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
