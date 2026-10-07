import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LotDetailPage } from "@/components/lots/lots-page";
import { localeFromParams } from "@/i18n/paths";
import { privateMetadata } from "@/lib/seo";

import type { Id } from "../../../../../../../convex/_generated/dataModel";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "lots" });
  return privateMetadata(t("detail"));
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <LotDetailPage lotId={id as Id<"materialLots">} />;
}
