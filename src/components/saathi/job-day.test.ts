import { describe, expect, it } from "vitest";

import { dayKey, splitByDay } from "./job-day";

describe("dayKey", () => {
  it("names the days next to today", () => {
    expect(dayKey("2026-09-29", "2026-09-29")).toBe("today");
    expect(dayKey("2026-09-30", "2026-09-29")).toBe("tomorrow");
    expect(dayKey("2026-09-28", "2026-09-29")).toBe("yesterday");
  });

  it("leaves other days to be written as dates", () => {
    expect(dayKey("2026-10-01", "2026-09-29")).toBeNull();
    expect(dayKey("2026-09-20", "2026-09-29")).toBeNull();
  });

  it("counts across months and years", () => {
    expect(dayKey("2026-10-01", "2026-09-30")).toBe("tomorrow");
    expect(dayKey("2026-12-31", "2027-01-01")).toBe("yesterday");
  });
});

describe("splitByDay", () => {
  it("puts today's and overdue jobs first, and later ones apart", () => {
    const jobs = [
      { id: "late", date: "2026-09-27" },
      { id: "today", date: "2026-09-29" },
      { id: "tomorrow", date: "2026-09-30" },
    ];
    const { now, later } = splitByDay(jobs, "2026-09-29");
    expect(now.map((job) => job.id)).toEqual(["late", "today"]);
    expect(later.map((job) => job.id)).toEqual(["tomorrow"]);
  });
});
