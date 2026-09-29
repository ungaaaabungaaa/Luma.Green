"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "institutions" area's build. */
export function CentrePage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.centre")} lead={t("comingSoon")} />;
}
