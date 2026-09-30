"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CalendarCheckIcon, CalendarClockIcon, CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { useFormat } from "@/components/app/format";
import { ListSkeleton, StatusPill } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { api } from "../../../../convex/_generated/api";
import { markDoneArgs } from "./calendar-filters";
import { KIND_LOOK } from "./calendar-kinds";

type Deadlines = FunctionReturnType<typeof api.rulebook.myDeadlines>;
type Deadline = Deadlines["events"][number];

/** How many deadlines the card lists before "n more". */
const DEFAULT_LIMIT = 5;

const TONE: Record<Deadline["state"], "bad" | "warn" | "neutral" | "good"> = {
  overdue: "bad",
  due_soon: "warn",
  ok: "neutral",
  done: "good",
};

/**
 * A business's next deadlines, from the compliance calendar: consent
 * renewals, scale stamps, filings and payments due, each with a big "Done"
 * button. Self-contained — any business screen can mount it. Translated
 * under the `rules` namespace; the titles themselves come from the
 * calendar in English until the business writes its own.
 */
export function DeadlinesCard({ limit = DEFAULT_LIMIT }: { limit?: number }) {
  const t = useTranslations("rules.deadlines");
  const headingId = useId();
  const deadlines = useQuery(api.rulebook.myDeadlines);

  const events = deadlines?.events ?? [];
  const shown = events.slice(0, limit);
  const rest = events.length - shown.length;
  const hasUrgent = events.some((event) => event.state !== "ok");

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={deadlines === undefined}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4",
        hasUrgent && "border-amber-300",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            hasUrgent
              ? "bg-amber-50 text-amber-700"
              : "bg-brand-50 text-primary",
          )}
        >
          <CalendarClockIcon aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={headingId} className="text-lg font-semibold">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("lead")}</p>
        </div>
        {deadlines ? (
          <StatusPill tone={hasUrgent ? "warn" : "neutral"}>
            {t("open", { count: events.length })}
          </StatusPill>
        ) : null}
      </div>
      {deadlines === undefined ? <ListSkeleton rows={2} /> : null}
      {deadlines && events.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarCheckIcon aria-hidden className="size-4 shrink-0" />
          {t("empty")}
        </p>
      ) : null}
      {shown.length > 0 ? (
        <ul className="flex flex-col divide-y">
          {shown.map((event) => (
            <DeadlineItem
              key={event.id ?? event.sourceKey ?? event.dueAt}
              event={event}
            />
          ))}
        </ul>
      ) : null}
      {rest > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("more", { count: rest })}
        </p>
      ) : null}
    </section>
  );
}

function DeadlineItem({ event }: { event: Deadline }) {
  const t = useTranslations("rules.deadlines");
  const format = useFormat();
  const markDone = useMutation(api.rulebook.markDone);
  const [isSaving, setIsSaving] = useState(false);
  const { icon: Icon } = KIND_LOOK[event.kind];
  const kindLabel = t(`kinds.${event.kind}`);

  async function done() {
    setIsSaving(true);
    try {
      await markDone(markDoneArgs(event, true));
      toast.success(t("doneToast", { title: kindLabel }));
    } catch {
      toast.error(t("error"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          event.state === "overdue" && "bg-destructive/10 text-destructive",
          event.state === "due_soon" && "bg-amber-50 text-amber-700",
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">{kindLabel}</p>
        <p className="truncate text-sm text-muted-foreground">{event.title}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="tabular-nums">{format.date(event.dueAt)}</span>
          <StatusPill tone={TONE[event.state]}>
            {event.daysLeft < 0
              ? t("late", { days: -event.daysLeft })
              : t("in", { days: event.daysLeft })}
          </StatusPill>
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 shrink-0 px-4 text-base"
        disabled={isSaving}
        aria-label={t("doneFor", { title: kindLabel })}
        onClick={() => {
          void done();
        }}
      >
        <CheckIcon aria-hidden />
        {t(isSaving ? "saving" : "done")}
      </Button>
    </li>
  );
}
