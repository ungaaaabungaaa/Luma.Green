"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { stepStates, TRADE_STEPS } from "./logic";
import type { TradeStatus } from "./types";

/**
 * A trade's way to delivery: requested → accepted → paid into escrow →
 * dispatched → delivered. Done steps are ticked; the step it's waiting for
 * is ringed. Declined trades have no steps (the card says so instead).
 */
export function TradeSteps({ status }: { status: TradeStatus }) {
  const t = useTranslations("market.trades.steps");
  const states = stepStates(status);
  if (!states) return null;

  return (
    <ol aria-label={t("label")} className="grid grid-cols-5">
      {TRADE_STEPS.map((step, index) => {
        const state = states[index] ?? "todo";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className="relative flex flex-col items-center gap-1.5 px-0.5 text-center"
          >
            {index > 0 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute end-1/2 top-3 h-0.5 w-full -translate-y-1/2",
                  state === "done" && "bg-primary",
                  state === "current" && "bg-primary/40",
                  state === "todo" && "bg-border",
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
                state === "todo" && "border-border bg-card",
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
                "w-full text-xs leading-tight break-words hyphens-auto",
                state === "todo"
                  ? "text-muted-foreground"
                  : "font-medium text-foreground",
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
