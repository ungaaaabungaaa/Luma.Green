import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { Container } from "./container";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { SiteNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <Container className="flex h-16 items-center gap-6">
        <Link
          href="/"
          aria-label={t("home")}
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <SiteNav className="hidden md:flex" />
        <div className="ms-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild size="lg" className="ms-2 hidden md:inline-flex">
            <Link href="/contact">{t("getStarted")}</Link>
          </Button>
          <MobileNav className="md:hidden" />
        </div>
      </Container>
    </header>
  );
}
