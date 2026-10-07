import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MaterialStandards } from "@/components/operations/material-standards";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "operations" });
  return privateMetadata(t("standards"));
}
export default function Page() {
  return <MaterialStandards />;
}
