"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusPill } from "@/components/app/page-parts";
import { cn } from "@/lib/utils";

import { LOAD_STEPS, loadStepStates } from "./logic";
import type { LoadStatus, StopStatus } from "./types";

const LOAD_TONES: Record<
  LoadStatus,
  "neutral" | "info" | "good" | "warn" | "bad"
> = {
  planned: "info",
  collecting: "warn",
  delivered: "good",
  cancelled: "neutral",
};

const STOP_TONES: Record<
  StopStatus,
  "neutral" | "info" | "good" | "warn" | "bad"
> = {
  pending: "warn",
  accepted: "info",
  declined: "bad",
  collected: "good",
};

export function LoadStatusPill({ status }: { status: LoadStatus }) {
  const t = useTranslations("logistics.loadStatus");
  return <StatusPill tone={LOAD_TONES[status]}>{t(status)}</StatusPill>;
}

export function StopStatusPill({ status }: { status: StopStatus }) {
  const t = useTranslations("logistics.stopStatus");
  return <StatusPill tone={STOP_TONES[status]}>{t(status)}</StatusPill>;
}

/** Planned → on the road → delivered, with where this load stands. */
export function LoadSteps({ status }: { status: LoadStatus }) {
  const t = useTranslations("logistics");
  const states = loadStepStates(status);
  if (!states) return null;
  return (
    <ol aria-label={t("steps.label")} className="flex items-center gap-2">
      {LOAD_STEPS.map((step, index) => {
        const state = states[index] ?? "todo";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-1.5"
          >
            <span
              aria-hidden
              className={cn(
                "flex h-1.5 rounded-full",
                state === "done" && "bg-primary",
                state === "current" && "bg-primary/40",
                state === "todo" && "bg-muted",
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                state === "todo" ? "text-muted-foreground" : "font-medium",
              )}
            >
              {state === "done" ? (
                <CheckIcon aria-hidden className="size-3 text-primary" />
              ) : null}
              {t(`steps.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
