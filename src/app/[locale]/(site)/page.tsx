import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LogoMark } from "@/components/brand/logo";
import { ClosingCta } from "@/components/site/closing-cta";
import { Container } from "@/components/site/container";
import { loopSteps, roles } from "@/components/site/content";
import { Principles } from "@/components/site/principles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata, serializeJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "meta" });

  return pageMetadata({
    locale,
    path: "/",
    title: t("title"),
    description: t("description"),
    absoluteTitle: true,
  });
}

export default async function HomePage() {
  const [t, nav, loop, participants, meta] = await Promise.all([
    getTranslations("home"),
    getTranslations("nav"),
    getTranslations("loop"),
    getTranslations("participants"),
    getTranslations("meta"),
  ]);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: `${site.url}/logo.svg`,
    slogan: site.tagline,
    description: meta("description"),
    email: site.supportEmail,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD must be raw; serializeJsonLd escapes `<`.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organization) }}
      />

      <section className="relative overflow-hidden border-b border-border/60">
        <Container className="grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-6">
            <Badge variant="secondary">{t("eyebrow")}</Badge>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
              {t("lead")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href="/contact">{nav("getStarted")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5">
                <Link href="/how-it-works">
                  {t("secondaryCta")}
                  <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </div>
          {/* Decorative: the mark is sized, never rotated or recoloured. */}
          <div
            aria-hidden
            className="relative mx-auto hidden aspect-square w-full max-w-sm items-center justify-center lg:flex"
          >
            <div className="absolute inset-0 rounded-full bg-brand-100 blur-3xl dark:bg-brand-950" />
            <div className="absolute inset-8 rounded-full border border-brand-200 dark:border-brand-900" />
            <LogoMark className="relative size-48" />
          </div>
        </Container>
      </section>

      <section aria-labelledby="loop-heading" className="py-20">
        <Container className="space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2
              id="loop-heading"
              className="font-display text-3xl font-semibold tracking-tight text-balance"
            >
              {t("loopHeading")}
            </h2>
            <p className="text-muted-foreground">{t("loopIntro")}</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {loopSteps.map(({ key, icon: Icon }) => (
              <li key={key}>
                <Card className="h-full">
                  <CardHeader>
                    <Icon aria-hidden className="size-6 text-primary" />
                    <CardTitle className="text-lg">
                      {loop(`${key}.title`)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {loop(`${key}.summary`)}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
          <Button asChild variant="link" className="px-0">
            <Link href="/how-it-works">
              {t("secondaryCta")}
              <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        </Container>
      </section>

      <div className="border-y border-border/60 bg-muted/40">
        <Principles />
      </div>

      <section aria-labelledby="participants-heading" className="py-20">
        <Container className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="participants-heading"
              className="font-display text-3xl font-semibold tracking-tight text-balance"
            >
              {t("participantsHeading")}
            </h2>
            <p className="text-muted-foreground">{t("participantsIntro")}</p>
          </div>
          <ul className="flex flex-wrap gap-3">
            {roles.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
              >
                <Icon aria-hidden className="size-4 text-primary" />
                {participants(`${key}.name`)}
              </li>
            ))}
          </ul>
          <Button asChild variant="link" className="px-0">
            <Link href="/participants">
              {t("participantsCta")}
              <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        </Container>
      </section>

      <ClosingCta />
    </>
  );
}
