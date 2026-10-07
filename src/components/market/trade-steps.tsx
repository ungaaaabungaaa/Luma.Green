"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { TradeStatus } from "./types";

/**
 * The two active order stages. Historical prototype payment states have no
 * progress indicator because they do not prove that money moved.
 */
export function TradeSteps({ status }: { status: TradeStatus }) {
  const t = useTranslations("market.trades.steps");
  if (status !== "requested" && status !== "accepted") return null;
  const steps = ["requested", "accepted"] as const;

  return (
    <ol aria-label={t("label")} className="grid grid-cols-2">
      {steps.map((step, index) => {
        const state = status === "accepted" || index === 0 ? "done" : "current";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center sm:px-0.5"
          >
            {index > 0 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute end-1/2 top-3 h-0.5 w-full -translate-y-1/2",
                  state === "done" && "bg-primary",
                  state === "current" && "bg-primary/40",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative flex size-6 items-center justify-center rounded-full border-2",
                state === "done" &&
                  "border-primary bg-primary text-primary-foreground",
                state === "current" && "border-primary bg-card",
              )}
            >
              {state === "done" ? <CheckIcon className="size-3.5" /> : null}
              {state === "current" ? (
                <span className="size-2 rounded-full bg-primary" />
              ) : null}
            </span>
            <span
              aria-hidden
              className={cn(
                "w-full text-[11px] leading-tight break-words hyphens-auto sm:text-xs",
                "font-medium text-foreground",
              )}
            >
              {t(step)}
            </span>
            <span className="sr-only">
              {t("srStep", { step: t(step), state: t(`state.${state}`) })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
