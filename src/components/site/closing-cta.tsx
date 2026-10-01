import { ArrowRightIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { Container } from "./container";

/** The panel that closes the public pages: sell scrap, or join. */
export async function ClosingCta() {
  const t = await getTranslations("home.closing");

  return (
    <section aria-labelledby="closing-cta-heading" className="pb-20 sm:pb-28">
      <Container>
        <div
          data-parallax-scene
          className="relative isolate overflow-hidden rounded-3xl bg-brand-100 px-6 py-12 text-brand-950 sm:px-12 sm:py-16 lg:px-16 lg:py-20"
        >
          <div
            aria-hidden
            data-parallax="-40"
            className="pointer-events-none absolute -end-32 -bottom-44 -z-10 size-96 rounded-full border-[3rem] border-brand-300/60 sm:-end-16 sm:-bottom-52 sm:size-[32rem] sm:border-[4rem]"
          />
          <div
            data-reveal
            className="relative grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-16"
          >
            <div className="max-w-2xl space-y-5">
              <span
                aria-hidden
                className="block h-1 w-12 rounded-full bg-brand-800"
              />
              <h2
                id="closing-cta-heading"
                className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
              >
                {t("title")}
              </h2>
              <p className="max-w-lg leading-relaxed text-brand-950/80">
                {t("body")}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-fit sm:flex-row lg:w-full lg:flex-col">
              <Button
                asChild
                size="lg"
                className="h-auto min-h-14 justify-between gap-6 rounded-full bg-brand-950 px-6 py-4 text-base whitespace-normal text-brand-50 hover:bg-brand-900"
              >
                <Link href="/sell">
                  {t("sell")}
                  <ArrowRightIcon
                    aria-hidden
                    className="shrink-0 rtl:rotate-180"
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-auto min-h-14 rounded-full border-brand-950/30 bg-transparent px-6 py-4 text-base whitespace-normal text-brand-950 hover:bg-brand-50 hover:text-brand-950"
              >
                <Link href="/join">{t("join")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
