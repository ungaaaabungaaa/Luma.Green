import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { GatePage } from "@/components/floor/gate-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "app.nav" });
  return privateMetadata(t("gate"));
}

export default function Page() {
  return <GatePage />;
}
