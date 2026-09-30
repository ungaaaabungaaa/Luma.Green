"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlarmClockIcon,
  CalendarCheckIcon,
  CalendarIcon,
  CircleCheckIcon,
  PlusIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AppPageHeader,
  DemoNote,
  EmptyState,
  ListSkeleton,
  StatCard,
} from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { api } from "../../../../convex/_generated/api";
import { indiaDate } from "../../../../convex/lib/rules";
import { adminErrorMessage } from "../convex-error";
import { AddDeadlineDialog } from "./add-deadline-dialog";
import {
  type CalendarFilters,
  DEFAULT_FILTERS,
  filterEvents,
  markDoneArgs,
  type Tally,
  tallyEvents,
} from "./calendar-filters";
import { CALENDAR_ERRORS, dayHeading, monthOf } from "./calendar-kinds";
import {
  CalendarFilterFields,
  type CalendarView,
  MonthNav,
  ViewToggle,
} from "./calendar-toolbar";
import { DeadlineList, eventKey } from "./deadline-list";
import { MonthGrid } from "./month-grid";
import type { CalendarData, CalendarEvent } from "./rule-types";

/** The tabs along the top of the list: a state, or everything not done. */
const STATE_TABS: readonly {
  value: CalendarFilters["state"];
  label: string;
  count: (tally: Tally) => number | null;
}[] = [
  { value: "open", label: "Open", count: (tally) => tally.open },
  { value: "overdue", label: "Overdue", count: (tally) => tally.overdue },
  { value: "due_soon", label: "Due soon", count: (tally) => tally.dueSoon },
  { value: "done", label: "Done", count: (tally) => tally.done },
  { value: "all", label: "All", count: () => null },
];

/**
 * `/admin/calendar`: every business's deadlines and the platform's own —
 * consents, scale stamps, monthly and yearly filings, payments due — a
 * month at a time, as a grid or a list, with a tick for each. The rules
 * behind the dates live on `/admin/rules`.
 */
export function ComplianceCalendar() {
  const [month, setMonth] = useState(() => monthOf(indiaDate(Date.now())));
  const data = useQuery(api.rulebook.listCalendar, { month });
  const thisMonth = monthOf(data?.today ?? indiaDate(Date.now()));

  const header = (
    <AppPageHeader
      title="Calendar"
      lead="Every business's deadlines and the platform's own: consents, scale stamps, filings and payments. Tick them off here, or let the business do it."
    />
  );

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      {header}
      <DemoNote>
        Sample deadlines for the demo businesses. Consents and stamps come from
        their records; filings follow from what each one handles.
      </DemoNote>
      <MonthNav month={month} thisMonth={thisMonth} onChange={setMonth} />
      {data === undefined ? (
        <ListSkeleton rows={4} />
      ) : (
        <MonthBody key={month} month={month} data={data} />
      )}
    </div>
  );
}

function MonthBody({ month, data }: { month: string; data: CalendarData }) {
  const markDone = useMutation(api.rulebook.markDone);
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const tally = tallyEvents(data.events);
  const filtered = filterEvents(data.events, filters);
  const listed =
    view === "month" && selectedDate
      ? filtered.filter((event) => event.dueAt === selectedDate)
      : filtered;

  async function toggle(event: CalendarEvent, done: boolean) {
    setBusyKey(eventKey(event));
    try {
      const { id } = await markDone(markDoneArgs(event, done));
      if (done) {
        toast.success(`Done: ${event.title}`, {
          action: {
            label: "Undo",
            onClick: () => {
              void markDone({ id, done: false }).catch((error: unknown) => {
                toast.error(adminErrorMessage(error, CALENDAR_ERRORS));
              });
            },
          },
        });
      } else {
        toast.success(`Reopened: ${event.title}`);
      }
    } catch (error) {
      toast.error(adminErrorMessage(error, CALENDAR_ERRORS));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <MonthStats tally={tally} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CalendarFilterFields
            filters={filters}
            orgs={data.orgs}
            onChange={setFilters}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle view={view} onChange={setView} />
            <Button
              type="button"
              onClick={() => {
                setIsAdding(true);
              }}
            >
              <PlusIcon aria-hidden />
              Add deadline
            </Button>
          </div>
        </div>
        <Tabs
          value={filters.state}
          onValueChange={(state) => {
            setFilters({
              ...filters,
              state: state as CalendarFilters["state"],
            });
          }}
        >
          <TabsList className="h-auto w-full flex-wrap sm:w-fit">
            {STATE_TABS.map((tab) => {
              const count = tab.count(tally);
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {count === null ? null : (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {view === "month" ? (
        <MonthGrid
          month={month}
          today={data.today}
          events={filtered}
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
      ) : null}

      <section aria-labelledby="deadlines" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="deadlines" className="text-lg font-semibold">
            {view === "month" && selectedDate
              ? dayHeading(selectedDate)
              : "Deadlines this month"}
          </h2>
          {view === "month" && selectedDate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDate(null);
              }}
            >
              Whole month
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {String(listed.length)} of {String(data.events.length)} shown
            </p>
          )}
        </div>
        {listed.length === 0 ? (
          <EmptyState
            icon={CalendarCheckIcon}
            title={
              data.events.length === 0
                ? "Nothing due this month"
                : "Nothing matches"
            }
            body={
              data.events.length === 0
                ? "No business owes anything this month. Add a deadline if you know of one."
                : "Try another business, kind or state, or pick a different day."
            }
          />
        ) : (
          <DeadlineList
            events={listed}
            busyKey={busyKey}
            onToggle={(event, done) => {
              void toggle(event, done);
            }}
          />
        )}
      </section>

      <AddDeadlineDialog
        open={isAdding}
        onOpenChange={setIsAdding}
        orgs={data.orgs}
        defaultDate={selectedDate ?? data.today}
      />
    </>
  );
}

function MonthStats({ tally }: { tally: Tally }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <li>
        <StatCard
          label="Open"
          value={String(tally.open)}
          icon={CalendarIcon}
          hint="Not yet done"
        />
      </li>
      <li>
        <StatCard
          label="Overdue"
          value={String(tally.overdue)}
          icon={TriangleAlertIcon}
          tone={tally.overdue > 0 ? "warn" : "neutral"}
          hint="Past their date"
        />
      </li>
      <li>
        <StatCard
          label="Due soon"
          value={String(tally.dueSoon)}
          icon={AlarmClockIcon}
          tone={tally.dueSoon > 0 ? "warn" : "neutral"}
          hint="Within 30 days"
        />
      </li>
      <li>
        <StatCard
          label="Done"
          value={String(tally.done)}
          icon={CircleCheckIcon}
          tone="good"
          hint="Ticked off"
        />
      </li>
    </ul>
  );
}
