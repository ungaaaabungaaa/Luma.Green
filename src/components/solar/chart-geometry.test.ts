import { describe, expect, it } from "vitest";

import { SAVINGS_CHART, savingsGeometry } from "./chart-geometry";

const years = Array.from({ length: 10 }, (_, index) => ({
  year: index + 1,
  saved: 35_000 * (index + 1),
}));

describe("savingsGeometry", () => {
  it("draws one thin column per year, never wider than 24px", () => {
    const geometry = savingsGeometry(
      years,
      { low: 100_000, high: 140_000 },
      600,
    );

    const bars = geometry?.bars ?? [];
    expect(bars).toHaveLength(10);
    for (const bar of bars) {
      expect(bar.width).toBeLessThanOrEqual(SAVINGS_CHART.maxBarWidth);
      expect(bar.path).not.toBe("");
    }
  });

  it("marks a year paid back only once savings clear the whole cost range", () => {
    const geometry = savingsGeometry(
      years,
      { low: 100_000, high: 140_000 },
      600,
    );

    expect(geometry?.bars.map((bar) => bar.paidBack)).toEqual([
      false, // 35k
      false, // 70k
      false, // 105k: inside the range, not yet past it
      true, // 140k
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it("scales so the tallest column and the cost band both fit", () => {
    const geometry = savingsGeometry(
      years,
      { low: 100_000, high: 140_000 },
      600,
    );
    if (!geometry) throw new Error("expected a chart");
    const { plot, bars, band, yTicks } = geometry;

    expect(yTicks.at(0)?.value).toBe(0);
    expect(yTicks.at(-1)?.value).toBeGreaterThanOrEqual(350_000);
    for (const bar of bars) expect(bar.topY).toBeGreaterThanOrEqual(plot.top);
    expect(band.top).toBeLessThan(band.bottom);
    expect(band.bottom).toBeLessThan(plot.bottom);
  });

  it("has nothing to draw without savings", () => {
    expect(savingsGeometry([], { low: 1, high: 2 }, 600)).toBeNull();
  });
});
