"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "solar" area's build. */
export function BusinessSolarPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.solar")} lead={t("comingSoon")} />;
}
