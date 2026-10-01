import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/join/sign-out-button";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { SkipLink } from "@/components/site/skip-link";
import { Link } from "@/i18n/navigation";

/**
 * Shell for applicants: one phone-width column, the language switcher and a
 * way out. Every page here is private and checks the session itself.
 */
export default async function JoinLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("nav");

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <SkipLink />
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-4 backdrop-blur sm:px-8">
        <Link
          href="/"
          aria-label={t("home")}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto my-6 flex w-full max-w-2xl flex-1 flex-col px-4 py-3 sm:my-10 sm:rounded-3xl sm:border sm:bg-card sm:p-10 sm:shadow-sm"
      >
        {children}
      </main>
    </div>
  );
}
