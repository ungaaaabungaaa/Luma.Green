import {
  AlarmClockIcon,
  BanknoteIcon,
  CircleCheckIcon,
  EyeIcon,
  FileCheckIcon,
  FileTextIcon,
  type LucideIcon,
  PinIcon,
  ReceiptIcon,
  ScaleIcon,
  ShieldCheckIcon,
  StoreIcon,
  TriangleAlertIcon,
} from "lucide-react";

import type {
  CalendarKind,
  DeadlineState,
} from "../../../../convex/lib/rules";
import { CALENDAR_KINDS } from "../../../../convex/lib/rules";

/** The console's words and marks for each kind of deadline. English only. */

export const KIND_LOOK: Record<
  CalendarKind,
  { label: string; icon: LucideIcon; dot: string }
> = {
  consent: {
    label: "Consent expiry",
    icon: ShieldCheckIcon,
    dot: "bg-emerald-500",
  },
  scale: { label: "Scale stamp", icon: ScaleIcon, dot: "bg-sky-500" },
  gstr7: { label: "GSTR-7", icon: ReceiptIcon, dot: "bg-violet-500" },
  gstr8: { label: "GSTR-8", icon: ReceiptIcon, dot: "bg-violet-400" },
  eprReturn: {
    label: "EPR annual return",
    icon: FileCheckIcon,
    dot: "bg-teal-500",
  },
  eprQuarterly: {
    label: "EPR quarterly return",
    icon: FileTextIcon,
    dot: "bg-teal-400",
  },
  msmeDue: { label: "MSME payment", icon: BanknoteIcon, dot: "bg-amber-500" },
  darkPatternAudit: {
    label: "Dark-pattern audit",
    icon: EyeIcon,
    dot: "bg-rose-500",
  },
  tradeLicence: {
    label: "Trade licence",
    icon: StoreIcon,
    dot: "bg-orange-500",
  },
  custom: { label: "Other", icon: PinIcon, dot: "bg-slate-500" },
};

export const KIND_ORDER: readonly CalendarKind[] = CALENDAR_KINDS;

export const STATE_LOOK: Record<
  DeadlineState,
  { label: string; tone: "good" | "warn" | "bad" | "neutral"; icon: LucideIcon }
> = {
  done: { label: "Done", tone: "good", icon: CircleCheckIcon },
  overdue: { label: "Overdue", tone: "bad", icon: TriangleAlertIcon },
  due_soon: { label: "Due soon", tone: "warn", icon: AlarmClockIcon },
  ok: { label: "On track", tone: "neutral", icon: CircleCheckIcon },
};

/** `In 3 days`, `Today`, `2 days late`. */
export function daysLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Today";
  if (daysLeft > 0) {
    return daysLeft === 1 ? "Tomorrow" : `In ${String(daysLeft)} days`;
  }
  return daysLeft === -1 ? "Yesterday" : `${String(-daysLeft)} days late`;
}

// --- Months -------------------------------------------------------------------

/** `2026-09` for a YYYY-MM-DD date. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** The month before or after `month` (`YYYY-MM`). */
export function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (index ?? 1) - 1 + by, 1));
  return `${String(date.getUTCFullYear())}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const monthFormat = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** `September 2026` */
export function monthLabel(month: string): string {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`));
}

export interface MonthCell {
  /** YYYY-MM-DD, or null for the padding before the 1st and after the last day. */
  date: string | null;
  day: number | null;
}

/**
 * The month as weeks of seven cells, Monday first, padded so every week is
 * whole. What the grid renders.
 */
export function monthGrid(month: string): MonthCell[][] {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year ?? 0, (index ?? 1) - 1, 1));
  const days = new Date(Date.UTC(year ?? 0, index ?? 1, 0)).getUTCDate();
  // getUTCDay: 0 = Sunday; we start weeks on Monday.
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: MonthCell[] = Array.from({ length: lead }, () => ({
    date: null,
    day: null,
  }));
  for (let day = 1; day <= days; day += 1) {
    cells.push({
      date: `${month}-${String(day).padStart(2, "0")}`,
      day,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  const weeks: MonthCell[][] = [];
  for (let start = 0; start < cells.length; start += 7) {
    weeks.push(cells.slice(start, start + 7));
  }
  return weeks;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Codes the calendar mutations can refuse with, in the admin's words. */
export const CALENDAR_ERRORS: Readonly<Record<string, string>> = {
  NOT_FOUND: "That deadline was removed.",
  FORBIDDEN: "That deadline belongs to another business.",
  INVALID_TITLE: "Give the deadline a short title.",
  INVALID_DATE: "Pick a real date.",
  NOTE_TOO_LONG: "Keep the note under 600 characters.",
  UNKNOWN_BUSINESS: "That business isn't on the platform any more.",
  NOTHING_TO_MARK: "Nothing to mark.",
};
