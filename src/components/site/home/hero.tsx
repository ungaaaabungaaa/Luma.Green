import {
  ArrowDownIcon,
  ArrowRightIcon,
  MapPinIcon,
  MoveUpRightIcon,
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import materialLoop from "../../../../public/images/material-loop.webp";
import { Container } from "../container";
import { PriceTeaser } from "./price-teaser";

/** A material-led opening. Every claim and action uses existing copy. */
export async function HomeHero() {
  const [t, brand, chain] = await Promise.all([
    getTranslations("home.hero"),
    getTranslations("brand"),
    getTranslations("home.chain"),
  ]);
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-border/70"
    >
      <Container className="relative pt-9 pb-12 sm:pt-14 sm:pb-16 lg:pt-16">
        <div className="mb-8 flex items-center justify-between gap-5 border-b border-border pb-5 sm:mb-12">
          <p className="eyebrow inline-flex items-center gap-2 text-primary">
            <span aria-hidden className="size-2 rounded-full bg-brand-600" />
            {t("eyebrow")}
          </p>
          <span className="hidden text-xs text-muted-foreground sm:block">
            {brand("tagline")}
          </span>
        </div>
        <div className="grid items-center gap-9 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="relative z-10 flex min-w-0 flex-col items-start gap-7 lg:py-4">
            <h1
              id="hero-heading"
              className="hero-title max-w-3xl font-display font-medium text-balance text-brand-950"
            >
              {t("title")}
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("lead")}
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className="h-14 gap-5 rounded-full px-7 text-base"
              >
                <Link href="/sell">
                  {t("sell")}
                  <ArrowRightIcon
                    aria-hidden
                    className="size-5 rtl:rotate-180"
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full px-7 text-base"
              >
                <Link href="/join">{t("join")}</Link>
              </Button>
            </div>
            <Link
              href="/prices"
              className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t("prices")}
              <MoveUpRightIcon
                aria-hidden
                className="size-4 rtl:-scale-x-100"
              />
            </Link>
          </div>
          <div
            data-parallax-scene
            className="relative isolate overflow-hidden rounded-3xl bg-brand-950 lg:-me-4"
          >
            <div className="relative aspect-[6/5] sm:aspect-[4/3] lg:aspect-[6/5]">
              <Image
                data-parallax="32"
                src={materialLoop}
                alt=""
                fill
                preload
                sizes="(min-width: 1280px) 560px, (min-width: 1024px) 48vw, 100vw"
                className="scale-110 object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-linear-to-t from-brand-950/65 via-transparent to-transparent"
              />
              <span
                aria-hidden
                className="absolute start-6 top-6 flex size-11 items-center justify-center rounded-full border border-brand-50/30 text-brand-50"
              >
                <MoveUpRightIcon className="size-5 rtl:-scale-x-100" />
              </span>
              <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 text-brand-50">
                <p className="max-w-52 text-lg leading-snug font-medium">
                  {brand("tagline")}
                </p>
                <span
                  aria-hidden
                  className="font-mono text-xs tracking-widest text-brand-100/75"
                >
                  LUMA / GREEN
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 grid items-stretch gap-5 lg:mt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <a
            href="#chain-heading"
            className="group flex min-h-32 items-center justify-between gap-6 rounded-2xl border border-border bg-brand-50/70 px-6 py-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-8"
          >
            <div className="flex flex-col gap-3">
              <span className="eyebrow inline-flex items-center gap-2 text-brand-900">
                <MapPinIcon aria-hidden className="size-3.5" />
                {t("eyebrow")}
              </span>
              <span className="text-xl font-medium tracking-tight sm:text-2xl">
                {chain("heading")}
              </span>
            </div>
            <span
              aria-hidden
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/25 text-primary group-hover:bg-card"
            >
              <ArrowDownIcon className="size-5" />
            </span>
          </a>
          <PriceTeaser />
        </div>
      </Container>
    </section>
  );
}
