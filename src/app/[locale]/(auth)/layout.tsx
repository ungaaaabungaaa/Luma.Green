import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
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
