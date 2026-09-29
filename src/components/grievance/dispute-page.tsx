"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "grievance" area's build. */
export function DisputePage({ id }: { id: string }) {
  const t = useTranslations("app");
  return (
    <AppPageHeader
      title={t("nav.disputes")}
      lead={`${t("comingSoon")} (${id})`}
    />
  );
}
