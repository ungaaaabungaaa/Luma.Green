"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/components/app/page-parts";

/** Placeholder — replaced by the "notifications" area's build. */
export function NotificationsPage() {
  const t = useTranslations("app");
  return (
    <AppPageHeader title={t("nav.notifications")} lead={t("comingSoon")} />
  );
}
