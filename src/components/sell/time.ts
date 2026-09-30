"use client";

import { useFormatter } from "next-intl";

import { shiftDate } from "../../../convex/lib/dates";
import {
  SLOT_WINDOW_HOURS,
  type SlotWindow,
} from "../../../convex/lib/households";

/**
 * Days and times the way a household reads them, in their language. Every
 * time is India time: shops, windows and dates are all in Bengaluru.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Any day works for a time of day; India has no daylight saving. */
const SOME_DAY = "2026-01-01";

function indiaMoment(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

function hourText(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function useTimeFormat() {
  const format = useFormatter();

  function range(from: string, to: string): string | null {
    if (!TIME.test(from) || !TIME.test(to)) return null;
    const isWholeHours = from.endsWith(":00") && to.endsWith(":00");
    return format.dateTimeRange(
      indiaMoment(SOME_DAY, from),
      indiaMoment(SOME_DAY, to),
      isWholeHours
        ? { hour: "numeric" }
        : { hour: "numeric", minute: "2-digit" },
    );
  }

  return {
    /** "8 am – 12 pm" from two HH:MM times; null if either is unreadable. */
    range,
    /** A shop's opening hours, e.g. "8 am – 8 pm"; null if unreadable. */
    hours(hours: { opens: string; closes: string } | undefined) {
      return hours ? range(hours.opens, hours.closes) : null;
    },
    /** A pickup window's hours, e.g. "8 am – 12 pm". */
    window(window: SlotWindow): string {
      const [start, end] = SLOT_WINDOW_HOURS[window];
      return range(hourText(start), hourText(end)) ?? "";
    },
    /** "Today", "Tomorrow", or the weekday and date. */
    day(
      date: string,
      today: string,
      labels: { today: string; tomorrow: string },
    ): string {
      if (date === today) return labels.today;
      if (date === shiftDate(today, 1)) return labels.tomorrow;
      return format.dateTime(indiaMoment(date, "12:00"), {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    },
    /** The weekday and date on two short lines' worth, e.g. "Thu" + "2 Oct". */
    dayParts(date: string) {
      const moment = indiaMoment(date, "12:00");
      return {
        weekday: format.dateTime(moment, { weekday: "short" }),
        date: format.dateTime(moment, { day: "numeric", month: "short" }),
      };
    },
  };
}
