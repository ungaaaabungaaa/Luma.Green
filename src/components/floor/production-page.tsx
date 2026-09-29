"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "floor" area's build. */
export function ProductionPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.production")} lead={t("comingSoon")} />;
}
