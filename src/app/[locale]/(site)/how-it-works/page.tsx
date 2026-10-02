import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { ClosingCta } from "@/components/site/closing-cta";
import { Container } from "@/components/site/container";
import { loopSteps } from "@/components/site/content";
import { PageHeader } from "@/components/site/page-header";
import { Principles } from "@/components/site/principles";
import { SortingGuide } from "@/components/site/sorting-guide";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "howItWorks" });

  return pageMetadata({
    locale,
    path: "/how-it-works",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

const storyRoles = {
  sell: "preparation",
  trade: "dispatch",
  record: "pellets",
} as const;

const points = ["point1", "point2", "point3"] as const;

export default async function HowItWorksPage() {
  const [t, loop] = await Promise.all([
    getTranslations("howItWorks"),
    getTranslations("loop"),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        scene="sorting"
        atmosphere
      />

      <Container className="py-8 sm:py-10 lg:py-16">
        <ol className="divide-y border-y">
          {loopSteps.map(({ key, icon: Icon }, index) => (
            <li
              key={key}
              data-reveal
              aria-labelledby={`step-${key}`}
              className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:items-center md:gap-8 lg:py-10"
            >
              <div className="min-w-0 space-y-3 lg:space-y-5">
                <span className="inline-flex size-8 items-center text-primary">
                  <Icon aria-hidden className="size-6" />
                </span>
                <p className="text-sm font-medium text-primary">
                  {t("stepLabel", { number: index + 1 })}
                </p>
                <h2
                  id={`step-${key}`}
                  className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  {loop(`${key}.title`)}
                </h2>
                <RoleStoryImage scene={storyRoles[key]} className="w-full" />
              </div>
              <div className="space-y-6">
                <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
                  {t(`${key}.body`)}
                </p>
                <ul className="grid gap-4 border-t border-border pt-6">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <CheckIcon
                        aria-hidden
                        className="mt-0.5 size-5 shrink-0 text-primary"
                      />
                      <span>{t(`${key}.${point}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Container>

      <SortingGuide />

      <div className="border-y border-border">
        <Principles />
      </div>

      <div>
        <ClosingCta />
      </div>
    </>
  );
}
