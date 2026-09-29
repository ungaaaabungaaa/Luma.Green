"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "logistics" area's build. */
export function RoutePage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.route")} lead={t("comingSoon")} />;
}
