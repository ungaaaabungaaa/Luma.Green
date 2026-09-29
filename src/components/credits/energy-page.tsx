"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "credits" area's build. */
export function EnergyPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.energy")} lead={t("comingSoon")} />;
}
