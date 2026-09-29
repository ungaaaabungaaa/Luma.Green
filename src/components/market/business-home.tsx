"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by this area's build. */
export function BusinessHome() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.home")} lead={t("comingSoon")} />;
}
