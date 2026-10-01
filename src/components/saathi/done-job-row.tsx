"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";

import { type Job, WORK_ICONS } from "./job-meta";
import { useJobWhen } from "./use-job-when";

/** A finished job in a list of earnings: what, when, where, for whom, pay. */
export function DoneJobRow({ job }: { job: Job }) {
  const t = useTranslations("saathi");
  const format = useFormat();
  const when = useJobWhen();
  const Icon = WORK_ICONS[job.kind];

  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-medium">{t(`work.${job.kind}`)}</p>
        <p className="truncate text-sm text-muted-foreground">
          {t("whenWhere", { when: when(job), area: job.area })}
        </p>
        {job.postedBy ? (
          <p className="truncate text-sm text-muted-foreground">
            {t("postedBy", { name: job.postedBy.name })}
          </p>
        ) : null}
      </div>
      <p className="shrink-0 font-semibold tabular-nums">
        <span className="sr-only">{t("pay")} </span>
        {format.money(job.payPaise)}
      </p>
    </li>
  );
}
