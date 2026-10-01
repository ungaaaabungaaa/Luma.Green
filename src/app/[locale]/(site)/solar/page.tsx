import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
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
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        art={
          <RoleStoryImage
            scene={imageRole}
            compact
            frameClassName="h-40 aspect-auto sm:h-52 lg:h-64"
          />
        }
      />
      <Container className="py-16 lg:py-24">
        <SolarPlanner between={<SubsidyExplainer />} />
      </Container>
    </>
  );
}
