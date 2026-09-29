import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../../convex/_generated/api";

/** One rule as `rulebook.listRules` returns it: in force, upcoming, history. */
export type RuleItem = FunctionReturnType<typeof api.rulebook.listRules>[number];

/** A stored (or default) row of a rule. */
export type RuleRowData = RuleItem["active"];

/** The admin's month as `rulebook.listCalendar` returns it. */
export type CalendarData = FunctionReturnType<typeof api.rulebook.listCalendar>;

export type CalendarEvent = CalendarData["events"][number];
export type CalendarOrgRef = CalendarData["orgs"][number];
