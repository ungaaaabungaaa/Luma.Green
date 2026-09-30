import type { Id } from "../../../../convex/_generated/dataModel";
import type { CalendarKind, DeadlineState } from "../../../../convex/lib/rules";
import type { CalendarEvent } from "./rule-types";

/** The admin's narrowing of the month: whose, what kind, where it stands. */
export interface CalendarFilters {
  /** `all`, `platform` (the platform's own duties) or a business id. */
  who: "all" | "platform" | Id<"orgs">;
  kind: "all" | CalendarKind;
  /** `all`, `open` (anything not done) or one state. */
  state: "all" | "open" | DeadlineState;
}

export const DEFAULT_FILTERS: CalendarFilters = {
  who: "all",
  kind: "all",
  state: "open",
};

function isForWho(event: CalendarEvent, who: CalendarFilters["who"]): boolean {
  if (who === "all") return true;
  return who === "platform" ? event.org === null : event.org?.id === who;
}

function isInState(
  event: CalendarEvent,
  state: CalendarFilters["state"],
): boolean {
  if (state === "all") return true;
  return state === "open" ? !event.done : event.state === state;
}

/** The events that pass every filter, in the order given. */
export function filterEvents(
  events: readonly CalendarEvent[],
  filters: CalendarFilters,
): CalendarEvent[] {
  return events.filter(
    (event) =>
      isForWho(event, filters.who) &&
      (filters.kind === "all" || event.kind === filters.kind) &&
      isInState(event, filters.state),
  );
}

export interface Tally {
  open: number;
  overdue: number;
  dueSoon: number;
  done: number;
}

/** The tally after one more event in `state`. */
function counted(tally: Tally, state: DeadlineState): Tally {
  switch (state) {
    case "done": {
      return { ...tally, done: tally.done + 1 };
    }
    case "overdue": {
      return { ...tally, open: tally.open + 1, overdue: tally.overdue + 1 };
    }
    case "due_soon": {
      return { ...tally, open: tally.open + 1, dueSoon: tally.dueSoon + 1 };
    }
    case "ok": {
      return { ...tally, open: tally.open + 1 };
    }
  }
}

/** How the month stands, before any filter. */
export function tallyEvents(events: readonly CalendarEvent[]): Tally {
  let tally: Tally = { open: 0, overdue: 0, dueSoon: 0, done: 0 };
  for (const event of events) tally = counted(tally, event.state);
  return tally;
}

/** `3 open · 1 overdue · 2 due soon · 4 done` */
export function tallyLabel(tally: Tally): string {
  return [
    `${String(tally.open)} open`,
    `${String(tally.overdue)} overdue`,
    `${String(tally.dueSoon)} due soon`,
    `${String(tally.done)} done`,
  ].join(" · ");
}

/** Events by day, days in order, for the list and the grid. */
export function groupByDate(
  events: readonly CalendarEvent[],
): { date: string; events: CalendarEvent[] }[] {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const group = byDate.get(event.dueAt);
    if (group) group.push(event);
    else byDate.set(event.dueAt, [event]);
  }
  return [...byDate]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([date, group]) => ({ date, events: group }));
}

/**
 * What `rulebook.markDone` needs: the row's id when it's stored, or the
 * generated event itself so the server can make the row the first time.
 */
export function markDoneArgs(
  event: CalendarEvent,
  isDone: boolean,
):
  | { id: Id<"calendarEvents">; done: boolean }
  | {
      generated: {
        sourceKey: string;
        kind: CalendarKind;
        title: string;
        dueAt: string;
        orgId?: Id<"orgs">;
        note?: string;
      };
      done: boolean;
    } {
  if (event.id !== null) return { id: event.id, done: isDone };
  return {
    generated: {
      sourceKey: event.sourceKey ?? `${event.kind}:${event.dueAt}`,
      kind: event.kind,
      title: event.title,
      dueAt: event.dueAt,
      orgId: event.org?.id,
      note: event.note,
    },
    done: isDone,
  };
}
