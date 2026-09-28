import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";

import { Container } from "./container";
import { navItems } from "./content";

export async function SiteFooter() {
  const [t, nav, brand] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getTranslations("brand"),
  ]);

  return (
    <footer className="mt-auto border-t border-border/60">
      <Container className="grid gap-10 py-12 md:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm font-medium">{brand("tagline")}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("summary")}
          </p>
        </div>
        <nav aria-label={t("navLabel")}>
          <ul className="grid gap-2 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {nav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <div className="border-t border-border/60">
        <Container className="py-6 text-xs text-muted-foreground">
          {t("copyright")}
        </Container>
      </div>
    </footer>
  );
}
