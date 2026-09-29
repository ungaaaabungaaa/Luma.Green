"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "exports" area's build. */
export function TradeDocumentsPage({ id }: { id: string }) {
  const t = useTranslations("app");
  return (
    <AppPageHeader
      title={t("nav.exports")}
      lead={`${t("comingSoon")} (${id})`}
    />
  );
}
