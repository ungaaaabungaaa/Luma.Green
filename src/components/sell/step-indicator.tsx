"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { SELL_STEPS, type SellStep } from "./draft";

function labelTone(index: number, current: number): string {
  if (index === current) return "font-semibold text-foreground";
  return index < current ? "text-primary" : "text-muted-foreground";
}

/** Four short bars — what, who, when, book — with where they are now. */
export function StepIndicator({ step }: { step: SellStep }) {
  const t = useTranslations("sell.steps");
  const current = SELL_STEPS.indexOf(step);
  return (
    <nav
      aria-label={t("label")}
      className="rounded-xl border border-border bg-card p-4"
    >
      <p className="sr-only" aria-live="polite">
        {t("progress", { current: current + 1, total: SELL_STEPS.length })}
      </p>
      <ol className="grid grid-cols-4 gap-2">
        {SELL_STEPS.map((name, index) => (
          <li
            key={name}
            aria-current={index === current ? "step" : undefined}
            className="flex flex-col gap-1.5"
          >
            <span
              aria-hidden
              className={cn(
                "h-1 rounded-sm transition-colors motion-reduce:transition-none",
                index <= current ? "bg-primary" : "bg-border",
              )}
            />
            <span
              className={cn(
                "text-xs leading-relaxed",
                labelTone(index, current),
              )}
            >
              {t(name)}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
