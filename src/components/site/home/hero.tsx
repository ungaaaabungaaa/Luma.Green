import {
  ArrowRightIcon,
  MapPinIcon,
  PackageOpenIcon,
  StoreIcon,
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { Container } from "../container";
import { PriceTeaser } from "./price-teaser";

/** The promise, the two ways in, and today's prices beside them. */
export async function HomeHero() {
  const t = await getTranslations("home.hero");

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-border/60"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -end-40 -top-40 size-[36rem] rounded-full bg-brand-100/60 blur-3xl"
      />
      <Container className="relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[7fr_5fr] lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-900">
            <MapPinIcon aria-hidden className="size-4" />
            {t("eyebrow")}
          </p>
          <h1
            id="hero-heading"
            className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground sm:text-xl">
            {t("lead")}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/sell">
                <PackageOpenIcon aria-hidden className="size-5" />
                {t("sell")}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
            >
              <Link href="/join">
                <StoreIcon aria-hidden className="size-5" />
                {t("join")}
              </Link>
            </Button>
          </div>
          <Link
            href="/prices"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t("prices")}
            <ArrowRightIcon aria-hidden className="size-4 rtl:rotate-180" />
          </Link>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <PriceTeaser />
          <Image
            src="/images/neighbourhood-collection.webp"
            alt=""
            width={960}
            height={640}
            sizes="(min-width: 1280px) 480px, (min-width: 1024px) 42vw, (min-width: 640px) 600px, 100vw"
            className="h-auto w-full rounded-lg"
          />
        </div>
      </Container>
    </section>
  );
}
