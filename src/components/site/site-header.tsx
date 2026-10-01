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
      <Container className="flex min-h-18 flex-wrap items-center gap-2 py-3 sm:gap-4 lg:gap-x-5 lg:gap-y-1 lg:px-8 xl:flex-nowrap">
        <Link
          href="/"
          aria-label={t("home")}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo className="gap-2 [&>span]:text-lg [&>svg]:size-7" />
        </Link>
        <SiteNav className="hidden min-w-0 lg:order-last lg:flex lg:w-full lg:justify-center xl:order-none xl:w-auto" />
        <div className="ms-auto flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
          <Button
            asChild
            variant="ghost"
            className="hidden rounded-lg px-3 lg:inline-flex"
          >
            <Link href="/login">{auth("metaTitle")}</Link>
          </Button>
          {/* On phones the menu carries this: the header has no room. */}
          <Button
            asChild
            size="default"
            className="ms-1 hidden rounded-lg px-5 sm:inline-flex"
          >
            <Link href="/sell">{t("sellScrap")}</Link>
          </Button>
          <MobileNav className="lg:hidden" />
        </div>
      </Container>
    </header>
  );
}
