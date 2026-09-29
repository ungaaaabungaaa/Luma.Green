"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "floor" area's build. */
export function TeamPage() {
  const t = useTranslations("app");
  return <AppPageHeader title={t("nav.team")} lead={t("comingSoon")} />;
}
