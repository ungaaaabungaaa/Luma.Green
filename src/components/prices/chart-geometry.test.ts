import { describe, expect, it } from "vitest";

import { monthOfPrices } from "./board.testing";
import { priceChartGeometry } from "./chart-geometry";

describe("priceChartGeometry", () => {
  it("places every day left to right across the plot", () => {
    const geometry = priceChartGeometry(monthOfPrices(1400), 1200, 600);
    if (!geometry) throw new Error("expected a chart");

    expect(geometry.points).toHaveLength(30);
    expect(geometry.xs.at(0)).toBe(geometry.plot.left);
    expect(geometry.xs.at(-1)).toBe(geometry.plot.right);
    expect(geometry.xs).toEqual(geometry.xs.toSorted((a, b) => a - b));
  });

  it("always keeps the floor on the chart, on a round-rupee axis", () => {
    // Prices around ₹14–15.50, floor far below at ₹8.
    const geometry = priceChartGeometry(monthOfPrices(1400), 800, 600);
    if (!geometry?.floorY) throw new Error("expected a floor line");

    expect(geometry.floorY).toBeLessThanOrEqual(geometry.plot.bottom);
    expect(geometry.floorY).toBeGreaterThanOrEqual(geometry.plot.top);
    for (const tick of geometry.yTicks) expect(tick.paise % 100).toBe(0);
    expect(geometry.yTicks.at(0)?.paise).toBeLessThanOrEqual(800);
  });

  it("gives a price that never moved a readable axis", () => {
    const flat = monthOfPrices(1400).map((point) => ({
      ...point,
      paisePerKg: 1400,
    }));
    const geometry = priceChartGeometry(flat, null, 600);
    if (!geometry) throw new Error("expected a chart");

    expect(geometry.yTicks.length).toBeGreaterThan(1);
    expect(new Set(geometry.points.map((point) => point.y)).size).toBe(1);
    expect(geometry.floorY).toBeNull();
  });

  it("has nothing to draw without history", () => {
    expect(priceChartGeometry([], 1200, 600)).toBeNull();
  });
});
