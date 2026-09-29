import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TradeDocumentsPage } from "@/components/exports/trade-documents-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "app.nav" });
  return privateMetadata(t("exports"));
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <TradeDocumentsPage id={id} />;
}
