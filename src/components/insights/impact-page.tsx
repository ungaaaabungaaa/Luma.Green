"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by this area's build. */
export function ImpactPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.impact")} lead={t("comingSoon")} />;
}
