"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "institutions" area's build. */
export function ContractsPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.contracts")} lead={t("comingSoon")} />;
}
