"use client";

import { useFormatter } from "next-intl";

/**
 * "30 Jun 2027" — for licences and invoices, where the year matters. Takes a
 * YYYY-MM-DD day (read as India time) or a timestamp.
 */
export function useLongDate() {
  const format = useFormatter();
  return (value: string | number) =>
    format.dateTime(
      new Date(typeof value === "string" ? `${value}T00:00:00+05:30` : value),
      { day: "numeric", month: "short", year: "numeric" },
    );
}
