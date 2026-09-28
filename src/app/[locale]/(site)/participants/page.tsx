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

      <Container className="space-y-16 py-20">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(({ key, icon: Icon }) => (
            <li key={key}>
              <Card className="h-full">
                <CardHeader className="gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-900">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <CardTitle>
                    <h2 className="text-lg">{t(`${key}.name`)}</h2>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t(`${key}.body`)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>

        <section
          aria-labelledby="sector-heading"
          className="max-w-3xl space-y-3 border-s-4 border-primary ps-6"
        >
          <h2
            id="sector-heading"
            className="font-display text-2xl font-semibold tracking-tight"
          >
            {t("sectorHeading")}
          </h2>
          <p className="text-muted-foreground">{t("sectorBody")}</p>
        </section>
      </Container>

      <ClosingCta />
    </>
  );
}
