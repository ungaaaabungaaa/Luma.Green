import { ArrowDownIcon, ArrowRightIcon, MoveUpRightIcon } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import materialsHall from "../../../../public/images/materials-hall.webp";
import { Container } from "../container";
import { PriceTeaser } from "./price-teaser";

/** The material story leads; actions and prices remain real localized links. */
export async function HomeHero() {
  const [t, chain] = await Promise.all([
    getTranslations("home.hero"),
    getTranslations("home.chain"),
  ]);
  return (
    <section
      aria-labelledby="hero-heading"
      className="overflow-hidden border-b"
    >
      <Container className="pt-14 sm:pt-20 lg:pt-24">
        <p className="mb-6 text-sm font-medium text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1
          id="hero-heading"
          className="max-w-5xl font-display text-[clamp(2.75rem,5.7vw,5.25rem)] leading-[1.06] font-medium tracking-tight text-balance"
        >
          {t("title")}
        </h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("lead")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/sell">
                {t("sell")}
                <ArrowRightIcon aria-hidden className="size-5 rtl:rotate-180" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/join">{t("join")}</Link>
            </Button>
          </div>
        </div>
        <div
          data-parallax-scene
          className="relative mt-10 aspect-[4/3] overflow-hidden rounded-xl bg-muted sm:mt-12 sm:aspect-[2.4/1] lg:ms-20"
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
