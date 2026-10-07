import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/site/container";
import { PageHeader } from "@/components/site/page-header";
import { SolarPlanner } from "@/components/solar/solar-planner";
import { SubsidyExplainer } from "@/components/solar/subsidy-explainer";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "solar" });

  return pageMetadata({
    locale,
    path: "/solar",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/**
 * Rooftop solar for homes and businesses in Karnataka: a calculator built on
 * PM Surya Ghar's published subsidy, and a way to talk to us.
 */
export default async function SolarPage() {
  const t = await getTranslations("solar");
  const imageRole = "solar";

  return (
    <>
      <PageHeader
        variant="task"
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        scene={imageRole}
      />
      <Container className="py-8 lg:py-12">
        <SolarPlanner between={<SubsidyExplainer />} />
      </Container>
    </>
  );
}
