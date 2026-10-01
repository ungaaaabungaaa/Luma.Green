import { ArrowDownIcon, ArrowRightIcon, MoveUpRightIcon } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Link } from "@/i18n/navigation";

import courtyard from "../../../../public/images/circular-courtyard.webp";
import { Container } from "../container";
import { PriceTeaser } from "./price-teaser";

/** Full-bleed editorial art; every action remains a real localized link. */
export async function HomeHero() {
  const [t, brand, chain] = await Promise.all([
    getTranslations("home.hero"),
    getTranslations("brand"),
    getTranslations("home.chain"),
  ]);
  return (
    <section aria-labelledby="hero-heading" className="relative">
      <div
        data-parallax-scene
        className="relative isolate min-h-[min(52rem,calc(100svh-5rem))] overflow-hidden bg-brand-950 text-brand-50"
      >
        <Image
          data-parallax="24"
          src={courtyard}
          alt=""
          fill
          preload
          sizes="100vw"
          className="scale-110 object-cover object-[65%_center]"
        />
        <div aria-hidden className="absolute inset-0 bg-brand-950/35" />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-r from-brand-950/95 via-brand-950/65 to-brand-950/5 rtl:bg-linear-to-l"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-brand-950/90 via-transparent to-transparent"
        />
        <Container className="relative flex min-h-[min(52rem,calc(100svh-5rem))] flex-col justify-between gap-12 pt-10 pb-8 sm:pt-16 lg:pt-20">
          <div className="flex items-center justify-between gap-4">
            <p className="inline-flex items-center gap-3 rounded-full border border-brand-100/25 bg-brand-950/35 px-4 py-2 text-xs font-medium tracking-wide backdrop-blur-sm">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-brand-300"
              />
              {t("eyebrow")}
            </p>
            <p className="hidden text-xs text-brand-100 md:block">
              {brand("tagline")}
            </p>
          </div>
          <div className="flex max-w-3xl flex-col items-start gap-6 py-6 sm:gap-8">
            <h1
              id="hero-heading"
              className="hero-title font-display font-medium text-balance"
            >
              {t("title")}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-brand-50/90 sm:text-lg">
              {t("lead")}
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <ShimmerButton
                asChild
                size="lg"
                background="var(--color-brand-200)"
                shimmerColor="var(--color-brand-50)"
                className="hero-action h-auto min-h-14 gap-5 rounded-full bg-brand-200 px-7 py-4 text-base whitespace-normal text-brand-950 hover:bg-brand-100"
              >
                <Link href="/sell">
                  {t("sell")}
                  <ArrowRightIcon
                    aria-hidden
                    className="size-5 shrink-0 rtl:rotate-180"
                  />
                </Link>
              </ShimmerButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-auto min-h-14 rounded-full border-brand-50/40 bg-brand-950/30 px-7 py-4 text-base whitespace-normal text-brand-50 backdrop-blur-sm hover:bg-brand-50/10 hover:text-brand-50"
              >
                <Link href="/join">{t("join")}</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand-100/25 pt-5">
            <a
              href="#chain-heading"
              className="inline-flex min-h-11 max-w-full items-center gap-3 rounded-lg text-sm text-brand-50 outline-none hover:text-brand-200 focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <ArrowDownIcon aria-hidden className="size-4 shrink-0" />
              {chain("heading")}
            </a>
            <Link
              href="/prices"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-brand-100 outline-none hover:text-brand-50 focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              {t("prices")}
              <MoveUpRightIcon
                aria-hidden
                className="size-4 rtl:-scale-x-100"
              />
            </Link>
          </div>
        </Container>
      </div>
      <Container className="relative z-10 py-6 sm:py-8">
        <PriceTeaser />
      </Container>
    </section>
  );
}
