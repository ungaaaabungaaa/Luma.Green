"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "grievance" area's build. */
export function PrivacyPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.privacy")} lead={t("comingSoon")} />;
}
