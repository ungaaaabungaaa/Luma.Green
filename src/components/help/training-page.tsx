"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "support" area's build. */
export function TrainingPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.training")} lead={t("comingSoon")} />;
}
