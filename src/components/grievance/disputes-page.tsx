"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "grievance" area's build. */
export function DisputesPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.disputes")} lead={t("comingSoon")} />;
}
