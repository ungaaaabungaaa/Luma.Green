"use client";

import { cn } from "@/lib/utils";

import {
  dayCellLabel,
  KIND_LOOK,
  type MonthCell,
  monthGrid,
  WEEKDAYS,
} from "./calendar-kinds";
import type { CalendarEvent } from "./rule-types";

/** How many marks a day cell shows before "+n". */
const DOTS_PER_CELL = 3;
const CHIPS_PER_CELL = 2;

/**
 * The month as a grid, Monday first. Every day is a button: picking one
 * narrows the list below to that day. Phones see a dot per deadline;
 * wider screens see the first titles too.
 */
export function MonthGrid({
  month,
  today,
  events,
  selected,
  onSelect,
}: {
  month: string;
  today: string;
  events: readonly CalendarEvent[];
  selected: string | null;
  onSelect: (date: string | null) => void;
}) {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const day = byDate.get(event.dueAt);
    if (day) day.push(event);
    else byDate.set(event.dueAt, [event]);
  }
  return (
    <div
      role="group"
      aria-label="Month grid"
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <div
        aria-hidden
        className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground"
      >
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-2">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {monthGrid(month)
          .flat()
          .map((cell, index) => (
            <DayCell
              key={cell.date ?? `pad-${String(index)}`}
              cell={cell}
              isToday={cell.date === today}
              isSelected={cell.date !== null && cell.date === selected}
              events={cell.date ? (byDate.get(cell.date) ?? []) : []}
              onSelect={onSelect}
            />
          ))}
      </div>
    </div>
  );
}

function DayCell({
  cell,
  isToday,
  isSelected,
  events,
  onSelect,
}: {
  cell: MonthCell;
  isToday: boolean;
  isSelected: boolean;
  events: readonly CalendarEvent[];
  onSelect: (date: string | null) => void;
}) {
  if (cell.date === null || cell.day === null) {
    return <div aria-hidden className="min-h-16 bg-muted/40 md:min-h-24" />;
  }
  const { date, day } = cell;
  const open = events.filter((event) => !event.done);
  const hasOverdue = open.some((event) => event.state === "overdue");
  const extraDots = Math.max(0, events.length - DOTS_PER_CELL);
  const extraChips = Math.max(0, events.length - CHIPS_PER_CELL);
  return (
    <button
      type="button"
      aria-label={dayCellLabel(date, events.length)}
      aria-pressed={isSelected}
      onClick={() => {
        onSelect(isSelected ? null : date);
      }}
      className={cn(
        "flex min-h-16 flex-col items-start gap-1 bg-card p-1.5 text-start outline-none hover:bg-muted/60 focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset md:min-h-24 md:p-2",
        isSelected && "bg-brand-50 hover:bg-brand-50",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
          isToday && "bg-primary text-primary-foreground",
          !isToday && hasOverdue && "text-destructive",
        )}
      >
        {day}
      </span>
      {events.length > 0 ? (
        <>
          <span className="flex flex-wrap items-center gap-0.5 md:hidden">
            {events.slice(0, DOTS_PER_CELL).map((event, index) => (
              <span
                key={event.id ?? event.sourceKey ?? String(index)}
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  KIND_LOOK[event.kind].dot,
                  event.done && "opacity-40",
                )}
              />
            ))}
            {extraDots > 0 ? (
              <span className="text-[10px] leading-none text-muted-foreground">
                +{extraDots}
              </span>
            ) : null}
          </span>
          <span className="hidden w-full flex-col gap-0.5 md:flex">
            {events.slice(0, CHIPS_PER_CELL).map((event, index) => (
              <span
                key={event.id ?? event.sourceKey ?? String(index)}
                className={cn(
                  "flex min-w-0 items-center gap-1 text-xs",
                  event.done && "text-muted-foreground line-through",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    KIND_LOOK[event.kind].dot,
                  )}
                />
                <span className="truncate">
                  {event.org ? event.org.name : event.title}
                </span>
              </span>
            ))}
            {extraChips > 0 ? (
              <span className="text-xs text-muted-foreground">
                +{extraChips} more
              </span>
            ) : null}
          </span>
        </>
      ) : null}
    </button>
  );
}
