"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "logistics" area's build. */
export function LoadPage({ id }: { id: string }) {
  const t = useTranslations("app");
  return (
    <AppPageHeader title={t("nav.loads")} lead={`${t("comingSoon")} (${id})`} />
  );
}
