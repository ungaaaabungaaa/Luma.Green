"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "marketExtras" area's build. */
export function DemandPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.demand")} lead={t("comingSoon")} />;
}
