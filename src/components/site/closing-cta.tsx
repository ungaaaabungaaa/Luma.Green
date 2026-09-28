import { ArrowRightIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { Container } from "./container";

/** The "talk to us" panel that closes every public page. */
export async function ClosingCta() {
  const [t, nav] = await Promise.all([
    getTranslations("home"),
    getTranslations("nav"),
  ]);

  return (
    <section aria-labelledby="closing-cta-heading" className="pb-20">
      <Container>
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-2">
            <h2
              id="closing-cta-heading"
              className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
            >
              {t("closingTitle")}
            </h2>
            <p className="text-primary-foreground/85">{t("closingBody")}</p>
          </div>
          <Button asChild size="lg" variant="secondary" className="h-11 px-5">
            <Link href="/contact">
              {nav("getStarted")}
              <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
