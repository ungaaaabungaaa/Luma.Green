"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "hazard" area's build. */
export function RegistrationsPage() {
  const t = useTranslations("app");
  return (
    <AppPageHeader title={t("nav.registrations")} lead={t("comingSoon")} />
  );
}
