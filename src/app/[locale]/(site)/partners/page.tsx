import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SoonPage } from "@/components/site/soon-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "soon" });
  return privateMetadata(t("partners"));
}

export default function Page() {
  return <SoonPage titleKey="partners" />;
}
