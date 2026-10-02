import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { AccountMenu } from "@/components/account/account-menu";
import { Logo } from "@/components/brand/logo";
import { SkipLink } from "@/components/site/skip-link";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Household, applicant and operator settings share identity, not org approval. */
export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("nav");
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SkipLink />
      <header className="flex min-h-16 items-center justify-between gap-2 border-b px-4 py-2 sm:px-8">
        <Link
          href="/"
          aria-label={t("home")}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <AccountMenu />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-8 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
