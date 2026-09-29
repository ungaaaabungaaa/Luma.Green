const DAY_MS = 24 * 60 * 60 * 1000;

export type DayKey = "yesterday" | "today" | "tomorrow";

const NEAR_DAYS: Readonly<Record<number, DayKey>> = {
  [-1]: "yesterday",
  0: "today",
  1: "tomorrow",
};

/** "today", "tomorrow" or "yesterday" for a YYYY-MM-DD day; null otherwise. */
export function dayKey(date: string, today: string): DayKey | null {
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      DAY_MS,
  );
  return NEAR_DAYS[days] ?? null;
}

/**
 * A Saathi's taken jobs: the ones to do now (today, or earlier and not yet
 * marked done) and the ones coming up.
 */
export function splitByDay<T extends { date: string }>(
  jobs: readonly T[],
  today: string,
): { now: T[]; later: T[] } {
  return {
    now: jobs.filter((job) => job.date <= today),
    later: jobs.filter((job) => job.date > today),
  };
}
