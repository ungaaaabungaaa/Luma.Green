import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/join/sign-out-button";
import { LanguageSwitcher } from "@/components/site/language-switcher";
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
    <div className="flex min-h-dvh flex-col bg-muted/50">
      <header className="flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-background px-4">
        <Link
          href="/"
          aria-label={t("home")}
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
        className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
