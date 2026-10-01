import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { ClosingCta } from "@/components/site/closing-cta";
import { Container } from "@/components/site/container";
import { loopSteps } from "@/components/site/content";
import { PageHeader } from "@/components/site/page-header";
import { Principles } from "@/components/site/principles";
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
  sell: "household",
  trade: "yard",
  record: "manufacturer",
} as const;

const points = ["point1", "point2", "point3"] as const;

export default async function HowItWorksPage() {
  const [t, loop] = await Promise.all([
    getTranslations("howItWorks"),
    getTranslations("loop"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      <Container className="py-20 sm:py-28">
        <ol className="space-y-6">
          {loopSteps.map(({ key, icon: Icon }, index) => (
            <li
              key={key}
              data-reveal
              aria-labelledby={`step-${key}`}
              className="grid gap-8 rounded-2xl border border-border bg-card p-6 sm:p-10 md:grid-cols-[1fr_2fr] md:gap-16"
            >
              <div className="min-w-0 space-y-5">
                <span className="inline-flex size-14 items-center justify-center rounded-full border border-border bg-card text-primary">
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

      <div className="border-y border-border">
        <Principles />
      </div>

      <div className="pt-20">
        <ClosingCta />
      </div>
    </>
  );
}
