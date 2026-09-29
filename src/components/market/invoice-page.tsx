"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by this area's build. */
export function InvoicePage({ id }: { id: string }) {
  const t = useTranslations("app");
  return (
    <AppPageHeader
      title={t("nav.trades")}
      lead={`${t("comingSoon")} (${id})`}
    />
  );
}
