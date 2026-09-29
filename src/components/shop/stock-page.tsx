"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by this area's build. */
export function StockPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.stock")} lead={t("comingSoon")} />;
}
