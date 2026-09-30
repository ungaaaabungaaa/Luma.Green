import { describe, expect, it } from "vitest";

import {
  dayCellLabel,
  dayHeading,
  daysLabel,
  KIND_LOOK,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
} from "./calendar-kinds";

describe("how far away a deadline is", () => {
  it("speaks in days, today and yesterday", () => {
    expect(daysLabel(0)).toBe("Today");
    expect(daysLabel(1)).toBe("Tomorrow");
    expect(daysLabel(12)).toBe("In 12 days");
    expect(daysLabel(-1)).toBe("Yesterday");
    expect(daysLabel(-9)).toBe("9 days late");
  });
});

describe("months", () => {
  it("move forward and back across a year end", () => {
    expect(monthOf("2026-12-31")).toBe("2026-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(shiftMonth("2026-09", 15)).toBe("2027-12");
  });

  it("read as words", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(dayHeading("2026-10-10")).toBe("Saturday, 10 October");
    expect(dayCellLabel("2026-10-10", 0)).toBe("10 October, nothing due");
    expect(dayCellLabel("2026-10-10", 1)).toBe("10 October, 1 deadline");
    expect(dayCellLabel("2026-10-10", 3)).toBe("10 October, 3 deadlines");
  });

  it("lay out as whole weeks, Monday first", () => {
    // October 2026 starts on a Thursday and has 31 days.
    const weeks = monthGrid("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks[0].map((cell) => cell.day)).toEqual([
      null,
      null,
      null,
      1,
      2,
      3,
      4,
    ]);
    expect(weeks[4].map((cell) => cell.date)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      null,
    ]);
    // February 2027 starts on a Monday: four whole weeks, no padding.
    expect(
      monthGrid("2027-02")
        .flat()
        .every((cell) => cell.date),
    ).toBe(true);
  });
});

describe("kinds", () => {
  it("each have a label, an icon and a colour", () => {
    for (const look of Object.values(KIND_LOOK)) {
      expect(look.label.length).toBeGreaterThan(0);
      expect(look.dot).toMatch(/^bg-/);
    }
  });
});
