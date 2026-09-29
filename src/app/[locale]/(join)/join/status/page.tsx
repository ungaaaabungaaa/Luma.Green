import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StatusView } from "@/components/join/status-view";
import { localeFromParams } from "@/i18n/paths";
import { requireSession } from "@/lib/require-session";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "join.status" });
  return privateMetadata(t("metaTitle"));
}

/** Where every applicant lands after signing in. */
export default async function StatusPage({ params }: Props) {
  const locale = await localeFromParams(params);
  await requireSession(locale, "/join/status");
  return <StatusView />;
}
