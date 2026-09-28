import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/** Shell for the public site. The signed-in app will get its own. */
export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("nav");

  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-4 py-2 font-medium shadow focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
