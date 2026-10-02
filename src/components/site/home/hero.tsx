import { ArrowDownIcon, ArrowRightIcon, MoveUpRightIcon } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { actionName } from "@/components/site/action-name";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import materialsHall from "../../../../public/images/materials-hall.webp";
import { Container } from "../container";
import effects from "../public-effects.module.css";
import { PriceTeaser } from "./price-teaser";

/** The material story leads; actions and prices remain real localized links. */
export async function HomeHero() {
  const [t, chain, nav] = await Promise.all([
    getTranslations("home.hero"),
    getTranslations("home.chain"),
    getTranslations("nav"),
  ]);
  return (
    <section
      aria-labelledby="hero-heading"
      className={cn("overflow-hidden border-b", effects.mesh)}
    >
      <Container className="pt-9 sm:pt-14 lg:pt-20">
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1
          id="hero-heading"
          data-text-entrance
          className={cn(
            "max-w-5xl font-display text-[clamp(2.25rem,5.7vw,5.25rem)] leading-[1.06] font-medium tracking-tight text-balance",
            effects.heading,
          )}
        >
          {t("title")}
        </h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("lead")}
          </p>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
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
              <Link
                href="/join"
                aria-label={actionName(nav("join"), t("join"))}
              >
                <span className="sm:hidden">{nav("join")}</span>
                <span className="hidden sm:inline">{t("join")}</span>
              </Link>
            </Button>
          </div>
        </div>
        <div
          data-parallax-scene
          className="relative mt-8 aspect-[5/4] overflow-hidden bg-muted sm:mt-10 sm:aspect-[2.4/1]"
        >
          <Image
            data-parallax="18"
            src={materialsHall}
            alt=""
            fill
            preload
            sizes="(min-width: 1280px) 1120px, 100vw"
            className="scale-110 object-cover object-[50%_60%]"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-4">
          <a
            href="#chain-heading"
            className="inline-flex min-h-11 items-center gap-3 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowDownIcon aria-hidden className="size-4 shrink-0" />
            {chain("heading")}
          </a>
          <Link
            href="/prices"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t("prices")}
            <MoveUpRightIcon aria-hidden className="size-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </Container>
      <div className="border-t bg-muted/40">
        <Container className="py-6 sm:py-8">
          <PriceTeaser />
        </Container>
      </div>
    </section>
  );
}
