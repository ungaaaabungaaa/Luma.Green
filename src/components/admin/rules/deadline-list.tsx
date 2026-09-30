"use client";

import { CheckIcon, RotateCcwIcon } from "lucide-react";

import { StatusPill } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { KIND_LABELS } from "../labels";
import { groupByDate } from "./calendar-filters";
import { dayHeading, daysLabel, KIND_LOOK, STATE_LOOK } from "./calendar-kinds";
import type { CalendarEvent } from "./rule-types";

/** Deadlines by day, each with a way to tick it off or reopen it. */
export function DeadlineList({
  events,
  busyKey,
  onToggle,
}: {
  events: readonly CalendarEvent[];
  /** The event being saved right now, so its button waits. */
  busyKey: string | null;
  onToggle: (event: CalendarEvent, done: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {groupByDate(events).map((day) => (
        <section
          key={day.date}
          aria-label={dayHeading(day.date)}
          className="flex flex-col gap-2"
        >
          <h3 className="text-sm font-medium text-muted-foreground">
            {dayHeading(day.date)}
          </h3>
          <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {day.events.map((event) => (
              <DeadlineRow
                key={eventKey(event)}
                event={event}
                isBusy={busyKey === eventKey(event)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Something stable to key a row by: the row id, or the generated key. */
export function eventKey(event: CalendarEvent): string {
  return event.id ?? event.sourceKey ?? `${event.kind}:${event.dueAt}`;
}

function DeadlineRow({
  event,
  isBusy,
  onToggle,
}: {
  event: CalendarEvent;
  isBusy: boolean;
  onToggle: (event: CalendarEvent, done: boolean) => void;
}) {
  const kind = KIND_LOOK[event.kind];
  const state = STATE_LOOK[event.state];
  const owner = event.org
    ? `${event.org.name} · ${KIND_LABELS[event.org.kind]}`
    : "The platform";
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          event.state === "overdue" && "bg-destructive/10 text-destructive",
          event.state === "due_soon" && "bg-amber-50 text-amber-700",
          event.done && "bg-brand-50 text-primary",
        )}
      >
        <kind.icon aria-hidden className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "font-medium",
              event.done && "text-muted-foreground line-through",
            )}
          >
            {event.title}
          </span>
          <StatusPill tone={state.tone}>
            {event.done
              ? state.label
              : `${state.label} · ${daysLabel(event.daysLeft)}`}
          </StatusPill>
        </div>
        <p className="text-sm text-muted-foreground">
          {owner} · {kind.label}
        </p>
        {event.note ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {event.note}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant={event.done ? "ghost" : "outline"}
        size="sm"
        className="h-9 shrink-0 md:h-7"
        disabled={isBusy}
        aria-label={
          event.done ? `Reopen ${event.title}` : `Mark ${event.title} done`
        }
        onClick={() => {
          onToggle(event, !event.done);
        }}
      >
        {event.done ? <RotateCcwIcon aria-hidden /> : <CheckIcon aria-hidden />}
        {event.done ? "Reopen" : "Done"}
      </Button>
    </li>
  );
}
