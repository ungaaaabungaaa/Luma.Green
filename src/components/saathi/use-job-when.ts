"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";

import { dayKey } from "./job-day";
import type { Job } from "./job-meta";

/**
 * "Today, Evening" or "2 Oct, Morning". Without `today`, always the date.
 */
export function useJobWhen() {
  const t = useTranslations("saathi");
  const format = useFormat();
  return (job: Pick<Job, "date" | "window">, today?: string) => {
    const near = today === undefined ? null : dayKey(job.date, today);
    return t("when", {
      day: near ? t(`days.${near}`) : format.date(job.date),
      window: t(`windows.${job.window}`),
    });
  };
}
