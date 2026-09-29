import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { KabadiwalaJoin } from "@/components/join/join-pages";
import { localeFromParams } from "@/i18n/paths";
import { requireSession } from "@/lib/require-session";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "join" });
  return privateMetadata(t("roles.kabadiwala.title"));
}

export default async function KabadiwalaPage({ params }: Props) {
  const locale = await localeFromParams(params);
  await requireSession(locale, "/join/kabadiwala");
  return <KabadiwalaJoin />;
}
