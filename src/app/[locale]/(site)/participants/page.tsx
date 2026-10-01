import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ClosingCta } from "@/components/site/closing-cta";
import { Container } from "@/components/site/container";
import { roles } from "@/components/site/content";
import { PageHeader } from "@/components/site/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "participants" });

  return pageMetadata({
    locale,
    path: "/participants",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ParticipantsPage() {
  const t = await getTranslations("participants");

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      <Container className="space-y-16 py-20 sm:py-28">
        <ul className="grid gap-5 md:grid-cols-2">
          {roles.map(({ key, icon: Icon }) => (
            <li data-reveal key={key}>
              <Card className="h-full border-brand-900/10 bg-brand-50/40 py-8 shadow-none">
                <CardHeader className="gap-5 px-7 sm:px-9">
                  <span className="inline-flex size-12 items-center justify-center rounded-full border border-brand-900/20 text-brand-900">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <CardTitle>
                    <h2 className="text-2xl tracking-tight">
                      {t(`${key}.name`)}
                    </h2>
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {t(`${key}.body`)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>

        <section
          aria-labelledby="household-heading"
          data-reveal
          className="space-y-4 rounded-2xl bg-brand-950 p-7 text-brand-50 sm:p-10"
        >
          <h2
            id="household-heading"
            className="font-display text-2xl font-semibold tracking-tight"
          >
            {t("householdHeading")}
          </h2>
          <p className="max-w-3xl leading-relaxed text-brand-100">
            {t("householdBody")}
          </p>
        </section>
      </Container>

      <ClosingCta />
    </>
  );
}
