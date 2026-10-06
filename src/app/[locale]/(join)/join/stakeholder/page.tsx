import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StakeholderRequest } from "@/components/join/stakeholder-request";
import { localeFromParams } from "@/i18n/paths";
import { requireSession } from "@/lib/require-session";
import { privateMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "stakeholder" });
  return privateMetadata(t("title"));
}

export default async function StakeholderPage({ params }: Props) {
  const locale = await localeFromParams(params);
  await requireSession(locale, "/join/stakeholder");
  return <StakeholderRequest />;
}
