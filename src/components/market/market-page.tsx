"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by this area's build. */
export function MarketPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.buy")} lead={t("comingSoon")} />;
}
