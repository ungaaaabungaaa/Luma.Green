const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD `days` after (or before) another YYYY-MM-DD date. */
export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
