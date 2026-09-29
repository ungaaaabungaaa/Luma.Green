"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "kabadi" area's build. */
export function PoliciesPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.policies")} lead={t("comingSoon")} />;
}
