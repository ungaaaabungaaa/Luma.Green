import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { SkipLink } from "@/components/site/skip-link";
import { Link } from "@/i18n/navigation";

/**
 * Shell for signing in: one column, phone first, no marketing chrome. Pages
 * here are private — each sets `privateMetadata()` (docs/architecture/urls.md).
 */
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("nav");

  return (
    <div className="flex min-h-dvh flex-col bg-muted/50">
      <SkipLink />
      <header className="flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-background px-4">
        <Link
          href="/"
          aria-label={t("home")}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <LanguageSwitcher />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
