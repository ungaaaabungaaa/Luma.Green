"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "floor" area's build. */
export function ScalesPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.scales")} lead={t("comingSoon")} />;
}
