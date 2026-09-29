import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoadPage } from "@/components/logistics/load-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "app.nav" });
  return privateMetadata(t("loads"));
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <LoadPage id={id} />;
}
