import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EnergyPage } from "@/components/credits/energy-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "app.nav" });
  return privateMetadata(t("energy"));
}

export default function Page() {
  return <EnergyPage />;
}
