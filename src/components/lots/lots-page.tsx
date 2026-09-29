"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "lots" area's build. */
export function LotsPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.lots")} lead={t("comingSoon")} />;
}
