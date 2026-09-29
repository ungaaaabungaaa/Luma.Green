import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InvoicePage } from "@/components/market/invoice-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "app.nav" });
  return privateMetadata(t("trades"));
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <InvoicePage id={id} />;
}
