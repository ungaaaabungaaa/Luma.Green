import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DisputePage } from "@/components/grievance/dispute-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "app.nav" });
  return privateMetadata(t("disputes"));
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <DisputePage id={id} />;
}
