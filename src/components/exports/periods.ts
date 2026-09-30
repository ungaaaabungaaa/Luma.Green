import type { ReportKind } from "./types";

/**
 * The periods a report can be asked for. Months are calendar months in
 * India time ("2026-09"); quarters follow the Indian financial year
 * ("2026-Q2" is July to September 2026). Pure, so it can be tested without
 * a clock or a locale.
 */

export type PeriodKind = "month" | "quarter";

/** Which reports run by month and which by financial-year quarter. */
export const PERIOD_KIND: Record<Exclude<ReportKind, "evidencePack">, PeriodKind> =
  {
    tally: "month",
    eprPurchaseRegister: "month",
    swmQuarterly: "quarter",
    monthlyRecyclables: "month",
  };

/** How many periods the picker offers. */
export const MONTHS_OFFERED = 12;
export const QUARTERS_OFFERED = 6;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface YearMonth {
  year: number;
  /** 1 to 12. */
  month: number;
}

/** The calendar month a moment falls in, in India. */
export function indiaYearMonth(now: number): YearMonth {
  const date = new Date(now + IST_OFFSET_MS);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function monthPeriod({ year, month }: YearMonth): string {
  return `${String(year)}-${pad2(month)}`;
}

/** `count` months ending with the one `now` is in, newest first. */
export function recentMonths(now: number, count = MONTHS_OFFERED): string[] {
  const { year, month } = indiaYearMonth(now);
  const periods: string[] = [];
  for (let back = 0; back < count; back += 1) {
    const index = month - 1 - back;
    periods.push(
      monthPeriod({
        year: year + Math.floor(index / 12),
        month: ((index % 12) + 12) % 12 + 1,
      }),
    );
  }
  return periods;
}

export interface FinancialQuarter {
  /** The year the financial year starts in: 2026 for FY 2026-27. */
  fy: number;
  /** 1 (April to June) to 4 (January to March). */
  quarter: number;
}

/** The financial-year quarter a month falls in. */
export function quarterOf({ year, month }: YearMonth): FinancialQuarter {
  const fy = month >= 4 ? year : year - 1;
  return { fy, quarter: Math.floor(((month + 8) % 12) / 3) + 1 };
}

export function quarterPeriod({ fy, quarter }: FinancialQuarter): string {
  return `${String(fy)}-Q${String(quarter)}`;
}

/** `count` quarters ending with the one `now` is in, newest first. */
export function recentQuarters(
  now: number,
  count = QUARTERS_OFFERED,
): string[] {
  const { fy, quarter } = quarterOf(indiaYearMonth(now));
  const periods: string[] = [];
  for (let back = 0; back < count; back += 1) {
    const index = quarter - 1 - back;
    periods.push(
      quarterPeriod({
        fy: fy + Math.floor(index / 4),
        quarter: ((index % 4) + 4) % 4 + 1,
      }),
    );
  }
  return periods;
}

/** The periods offered for a kind of report, newest first. */
export function periodOptions(kind: PeriodKind, now: number): string[] {
  return kind === "month" ? recentMonths(now) : recentQuarters(now);
}

/** "2026-09" → the month; null for anything else. */
export function parseMonth(period: string): YearMonth | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
}

/** "2026-Q2" → the quarter; null for anything else. */
export function parseQuarter(period: string): FinancialQuarter | null {
  const match = /^(\d{4})-Q([1-4])$/.exec(period);
  return match ? { fy: Number(match[1]), quarter: Number(match[2]) } : null;
}

/** The first and last calendar months of a financial-year quarter. */
export function quarterMonths({ fy, quarter }: FinancialQuarter): {
  from: YearMonth;
  to: YearMonth;
} {
  const first = 4 + (quarter - 1) * 3;
  const year = first > 12 ? fy + 1 : fy;
  const from = { year, month: first > 12 ? first - 12 : first };
  return { from, to: { year, month: from.month + 2 } };
}

/** "2026-27", as financial years are written. */
export function financialYearLabel(fy: number): string {
  return `${String(fy)}-${String(fy + 1).slice(2)}`;
}

/** A moment inside a month, for formatting its name in any locale. */
export function monthDate({ year, month }: YearMonth): Date {
  return new Date(Date.UTC(year, month - 1, 15, 12));
}
