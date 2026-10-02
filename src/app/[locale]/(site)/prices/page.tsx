import { ArrowRightIcon, PackageOpenIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PriceBoard } from "@/components/prices/price-board";
import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { Container } from "@/components/site/container";
import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { localeFromParams } from "@/i18n/paths";
import { pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "prices" });

  return pageMetadata({
    locale,
    path: "/prices",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** The public price board for Bengaluru — docs/product/pricing.md. */
export default async function PricesPage() {
  const t = await getTranslations("prices");
  const imageRole = "kabadiwala";

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

      <Container className="flex flex-col gap-8 py-8 lg:py-12">
        <PriceBoard />

        <aside className="flex flex-col gap-4 border-y py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <PackageOpenIcon
              aria-hidden
              className="mt-0.5 size-6 shrink-0 text-primary"
            />
            <div>
              <p className="text-lg font-semibold">{t("sellCta.title")}</p>
              <p className="text-muted-foreground">{t("sellCta.body")}</p>
            </div>
          </div>
          <Button asChild size="lg" className="h-12 px-5 text-base">
            <Link href="/sell">
              {t("sellCta.action")}
              <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        </aside>
      </Container>
    </>
  );
}
