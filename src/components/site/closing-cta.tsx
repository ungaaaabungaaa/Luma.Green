import { ArrowRightIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { actionName } from "@/components/site/action-name";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { Container } from "./container";
import effects from "./public-effects.module.css";

/** Two clear next actions at the end of the public material story. */
export async function ClosingCta() {
  const [t, nav] = await Promise.all([
    getTranslations("home.closing"),
    getTranslations("nav"),
  ]);
  return (
    <section
      aria-labelledby="closing-cta-heading"
      className={cn(
        "border-t bg-muted/50 py-10 sm:py-12 lg:py-24",
        effects.mesh,
      )}
    >
      <Container className="grid min-w-0 grid-cols-1 items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
        <div data-reveal className="max-w-3xl min-w-0 space-y-5 wrap-anywhere">
          <h2
            id="closing-cta-heading"
            className="font-display text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            {t("title")}
          </h2>
          <p className="max-w-xl leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col">
          <Button
            asChild
            size="lg"
            className={cn(
              "min-h-12 max-w-full min-w-0 py-3 text-start whitespace-nowrap",
              effects.action,
            )}
          >
            <Link
              href="/sell"
              aria-label={actionName(nav("sellScrap"), t("sell"))}
            >
              <span className="sm:hidden">{nav("sellScrap")}</span>
              <span className="hidden sm:inline">{t("sell")}</span>
              <ArrowRightIcon aria-hidden className="size-5 rtl:rotate-180" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-h-12 max-w-full min-w-0 py-3 text-start whitespace-nowrap"
          >
            <Link href="/join" aria-label={actionName(nav("join"), t("join"))}>
              <span className="sm:hidden">{nav("join")}</span>
              <span className="hidden sm:inline">{t("join")}</span>
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
