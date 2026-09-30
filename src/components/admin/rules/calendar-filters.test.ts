import { describe, expect, it } from "vitest";

import type { Id } from "../../../../convex/_generated/dataModel";
import { draftProblem } from "./add-deadline-dialog";
import {
  DEFAULT_FILTERS,
  filterEvents,
  groupByDate,
  markDoneArgs,
  tallyEvents,
  tallyLabel,
} from "./calendar-filters";
import type { CalendarEvent } from "./rule-types";

const yardId = "yard1" as Id<"orgs">;
const shopId = "shop1" as Id<"orgs">;

function event(
  patch: Partial<CalendarEvent> & Pick<CalendarEvent, "dueAt" | "state">,
): CalendarEvent {
  return {
    id: null,
    sourceKey: `gstr7:${yardId}:${patch.dueAt}`,
    kind: "gstr7",
    title: "GSTR-7",
    done: patch.state === "done",
    org: { id: yardId, name: "Hebbal Metal Yard", kind: "yard" },
    daysLeft: 0,
    ...patch,
  };
}

const stamp = event({
  id: "ev1" as Id<"calendarEvents">,
  sourceKey: undefined,
  kind: "scale",
  title: "Scale stamp",
  dueAt: "2026-10-05",
  state: "overdue",
  daysLeft: -3,
  org: { id: shopId, name: "Ramesh Kabadi Store", kind: "kabadiwala" },
});
const filing = event({ dueAt: "2026-10-10", state: "due_soon", daysLeft: 2 });
const audit = event({
  kind: "darkPatternAudit",
  title: "Dark-pattern self-audit",
  dueAt: "2026-10-10",
  state: "ok",
  org: null,
  daysLeft: 40,
});
const ticked = event({
  id: "ev2" as Id<"calendarEvents">,
  dueAt: "2026-10-31",
  state: "done",
});
const month = [stamp, filing, audit, ticked];

describe("narrowing the month", () => {
  it("starts with everything not yet done", () => {
    expect(filterEvents(month, DEFAULT_FILTERS)).toEqual([
      stamp,
      filing,
      audit,
    ]);
  });

  it("narrows to one business, the platform, a kind or a state", () => {
    expect(filterEvents(month, { ...DEFAULT_FILTERS, who: shopId })).toEqual([
      stamp,
    ]);
    expect(
      filterEvents(month, { ...DEFAULT_FILTERS, who: "platform" }),
    ).toEqual([audit]);
    expect(
      filterEvents(month, { ...DEFAULT_FILTERS, kind: "gstr7", state: "all" }),
    ).toEqual([filing, ticked]);
    expect(
      filterEvents(month, { ...DEFAULT_FILTERS, state: "overdue" }),
    ).toEqual([stamp]);
    expect(filterEvents(month, { ...DEFAULT_FILTERS, state: "done" })).toEqual([
      ticked,
    ]);
  });

  it("counts the month before any filter", () => {
    const tally = tallyEvents(month);
    expect(tally).toEqual({ open: 3, overdue: 1, dueSoon: 1, done: 1 });
    expect(tallyLabel(tally)).toBe("3 open · 1 overdue · 1 due soon · 1 done");
  });

  it("groups by day, days in order", () => {
    expect(groupByDate([ticked, audit, stamp, filing])).toEqual([
      { date: "2026-10-05", events: [stamp] },
      { date: "2026-10-10", events: [audit, filing] },
      { date: "2026-10-31", events: [ticked] },
    ]);
  });
});

describe("ticking a deadline", () => {
  it("sends the row id when the deadline is stored", () => {
    expect(markDoneArgs(stamp, true)).toEqual({ id: stamp.id, done: true });
  });

  it("sends the generated deadline itself the first time", () => {
    expect(markDoneArgs(filing, true)).toEqual({
      generated: {
        sourceKey: filing.sourceKey,
        kind: "gstr7",
        title: "GSTR-7",
        dueAt: "2026-10-10",
        orgId: yardId,
        note: undefined,
      },
      done: true,
    });
    expect(markDoneArgs(audit, false)).toMatchObject({
      generated: { orgId: undefined },
      done: false,
    });
  });
});

describe("a new deadline", () => {
  const draft = {
    who: "platform",
    kind: "custom" as const,
    title: "Trade licence renewal",
    dueAt: "2027-03-31",
    note: "",
  };

  it("needs a title and a real date", () => {
    expect(draftProblem(draft)).toBeNull();
    expect(draftProblem({ ...draft, title: "  " })).toBe(
      "Give the deadline a short title.",
    );
    expect(draftProblem({ ...draft, title: "x".repeat(121) })).toBe(
      "Give the deadline a short title.",
    );
    expect(draftProblem({ ...draft, dueAt: "31/03/2027" })).toBe(
      "Pick a real date.",
    );
    expect(draftProblem({ ...draft, note: "x".repeat(601) })).toBe(
      "Keep the note under 600 characters.",
    );
  });
});
