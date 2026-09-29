import { ArrowRightIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { Container } from "./container";

/** The panel that closes the public pages: sell scrap, or join. */
export async function ClosingCta() {
  const t = await getTranslations("home.closing");

  return (
    <section aria-labelledby="closing-cta-heading" className="pb-20">
      <Container>
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-2">
            <h2
              id="closing-cta-heading"
              className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
            >
              {t("title")}
            </h2>
            <p className="text-primary-foreground/85">{t("body")}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-12 px-5 text-base"
            >
              <Link href="/sell">
                {t("sell")}
                <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-primary-foreground/40 bg-transparent px-5 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/join">{t("join")}</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
