import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PrivacyPage } from "@/components/grievance/privacy-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "app.nav" });
  return privateMetadata(t("privacy"));
}

export default function Page() {
  return <PrivacyPage />;
}
