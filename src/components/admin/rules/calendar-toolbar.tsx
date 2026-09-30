"use client";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
} from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { KIND_LABELS } from "../labels";
import type { CalendarFilters } from "./calendar-filters";
import {
  KIND_LOOK,
  KIND_ORDER,
  monthLabel,
  shiftMonth,
} from "./calendar-kinds";
import type { CalendarOrgRef } from "./rule-types";

export type CalendarView = "month" | "list";

/** Which month, with a way back to this one. */
export function MonthNav({
  month,
  thisMonth,
  onChange,
}: {
  month: string;
  thisMonth: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onClick={() => {
          onChange(shiftMonth(month, -1));
        }}
      >
        <ChevronLeftIcon aria-hidden className="rtl:rotate-180" />
      </Button>
      <h2
        aria-live="polite"
        className="min-w-40 text-center text-lg font-semibold tabular-nums"
      >
        {monthLabel(month)}
      </h2>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next month"
        onClick={() => {
          onChange(shiftMonth(month, 1));
        }}
      >
        <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
      </Button>
      {month === thisMonth ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(thisMonth);
          }}
        >
          This month
        </Button>
      )}
    </div>
  );
}

/** Month grid or a plain list: two buttons, one pressed. */
export function ViewToggle({
  view,
  onChange,
}: {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
}) {
  const options: {
    value: CalendarView;
    label: string;
    icon: typeof ListIcon;
  }[] = [
    { value: "month", label: "Month", icon: CalendarDaysIcon },
    { value: "list", label: "List", icon: ListIcon },
  ];
  return (
    <div
      role="group"
      aria-label="View"
      className="inline-flex rounded-lg bg-muted p-[3px]"
    >
      {options.map((option) => {
        const isPressed = option.value === view;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isPressed}
            onClick={() => {
              onChange(option.value);
            }}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isPressed
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground",
            )}
          >
            <option.icon aria-hidden className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Whose deadlines and which kind. The state is a row of tabs elsewhere. */
export function CalendarFilterFields({
  filters,
  orgs,
  onChange,
}: {
  filters: CalendarFilters;
  orgs: readonly CalendarOrgRef[];
  onChange: (filters: CalendarFilters) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={`${id}-who`} className="text-xs text-muted-foreground">
          Business
        </Label>
        <Select
          value={filters.who}
          onValueChange={(who) => {
            onChange({ ...filters, who });
          }}
        >
          <SelectTrigger id={`${id}-who`} className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every business</SelectItem>
            <SelectItem value="platform">The platform only</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
                <span className="text-muted-foreground">
                  {" "}
                  · {KIND_LABELS[org.kind]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={`${id}-kind`} className="text-xs text-muted-foreground">
          Kind
        </Label>
        <Select
          value={filters.kind}
          onValueChange={(kind) => {
            onChange({ ...filters, kind: kind as CalendarFilters["kind"] });
          }}
        >
          <SelectTrigger id={`${id}-kind`} className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every kind</SelectItem>
            {KIND_ORDER.map((kind) => (
              <SelectItem key={kind} value={kind}>
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", KIND_LOOK[kind].dot)}
                />
                {KIND_LOOK[kind].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
