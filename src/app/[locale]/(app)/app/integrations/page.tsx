import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { IntegrationsPage } from "@/components/integrations/integrations-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "integrations" });
  return privateMetadata(t("title"));
}

export default function Page() {
  return <IntegrationsPage />;
}
