"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { SELL_STEPS, type SellStep } from "./draft";

function labelTone(index: number, current: number): string {
  if (index === current) return "font-semibold text-foreground";
  return index < current ? "text-primary" : "text-muted-foreground";
}

/** Connected steps show current progress and completed selections. */
export function StepIndicator({ step }: { step: SellStep }) {
  const t = useTranslations("sell.steps");
  const current = SELL_STEPS.indexOf(step);
  return (
    <nav aria-label={t("label")} className="border-b border-border pb-4">
      <p className="sr-only" aria-live="polite">
        {t("progress", { current: current + 1, total: SELL_STEPS.length })}
      </p>
      <ol className="grid grid-cols-4">
        {SELL_STEPS.map((name, index) => (
          <li
            key={name}
            aria-current={index === current ? "step" : undefined}
            className="relative flex min-w-0 flex-col gap-2 pe-2"
          >
            {index < SELL_STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute start-3 end-0 top-2.5 h-px",
                  index < current ? "bg-primary" : "bg-border",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative flex size-5 items-center justify-center rounded-full border-2 transition-colors motion-reduce:transition-none",
                index <= current
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background",
              )}
            >
              {index < current ? <CheckIcon className="size-3" /> : null}
            </span>
            <span
              className={cn(
                "text-xs leading-relaxed wrap-anywhere",
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
