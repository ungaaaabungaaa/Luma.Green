"use client";

import { ChevronRightIcon, WalletIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { useFormat } from "@/components/app/format";
import { Link } from "@/i18n/navigation";

import type { Board } from "./job-meta";

/** The one number a Saathi opens the app for: what they earned this week. */
export function WeekEarnings({ earnings }: { earnings: Board["earnings"] }) {
  const t = useTranslations("saathi.week");
  const format = useFormat();
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 border-b border-border py-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-sm font-medium">
          {t("label")}
        </h2>
        <WalletIcon aria-hidden className="size-5" />
      </div>
      <p className="font-display text-4xl font-semibold tracking-tight text-primary tabular-nums">
        {format.money(earnings.weekPaise)}
      </p>
      <p className="text-sm">{t("hint", { count: earnings.weekJobs })}</p>
      <Link
        href="/app/impact"
        className="-mx-2 mt-2 inline-flex min-h-11 items-center gap-1 self-start rounded-lg px-2 text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {t("all")}
        <ChevronRightIcon aria-hidden className="size-4 rtl:rotate-180" />
      </Link>
    </section>
  );
}
