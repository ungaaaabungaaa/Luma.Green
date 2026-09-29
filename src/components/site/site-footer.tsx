import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";

import { Container } from "./container";
import { footerGroups } from "./content";

const linkClass =
  "inline-flex min-h-8 items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

export async function SiteFooter() {
  const [t, brand, labels] = await Promise.all([
    getTranslations("footer"),
    getTranslations("brand"),
    getTranslations(),
  ]);

  return (
    <footer className="mt-auto border-t border-border/60">
      <Container className="grid gap-10 py-12 md:grid-cols-[3fr_2fr_2fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm font-medium">{brand("tagline")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("about")}</p>
        </div>
        <nav
          aria-label={t("navLabel")}
          className="grid grid-cols-2 gap-8 md:col-span-2"
        >
          {footerGroups.map((group) => (
            <div key={group.heading} className="space-y-3">
              <h2 className="text-sm font-semibold">{t(group.heading)}</h2>
              <ul className="grid gap-1 text-sm">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {labels(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
