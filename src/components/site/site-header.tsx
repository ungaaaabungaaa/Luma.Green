import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { Container } from "./container";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { SiteNav } from "./site-nav";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const auth = await getTranslations("auth");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/90">
      <Container className="flex min-h-16 items-center gap-4 py-2 lg:px-8 xl:gap-5">
        <Link
          href="/"
          aria-label={t("home")}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo className="gap-2 [&>span]:text-lg [&>svg]:size-7" />
        </Link>
        <SiteNav className="hidden min-w-0 xl:flex" />
        <div className="ms-auto hidden shrink-0 items-center gap-1 xl:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          <Button asChild variant="ghost" className="rounded-lg px-3">
            <Link href="/login">{auth("metaTitle")}</Link>
          </Button>
          <Button asChild size="default" className="ms-1 rounded-lg px-5">
            <Link href="/sell">{t("sellScrap")}</Link>
          </Button>
        </div>
        <MobileNav className="ms-auto xl:hidden" />
      </Container>
    </header>
  );
}
