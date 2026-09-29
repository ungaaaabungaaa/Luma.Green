"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "payments" area's build. */
export function KhataPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.khata")} lead={t("comingSoon")} />;
}
