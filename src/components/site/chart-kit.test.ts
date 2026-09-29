import { describe, expect, it } from "vitest";

import {
  areaPath,
  columnPath,
  linearScale,
  linePath,
  nearestIndex,
  niceTicks,
} from "./chart-kit";

describe("linearScale", () => {
  it("maps the domain onto the range, inverted for a y-axis", () => {
    const y = linearScale([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });

  it("puts a flat domain in the middle so a steady price draws level", () => {
    const y = linearScale([14, 14], [100, 0]);
    expect(y(14)).toBe(50);
  });
});

describe("niceTicks", () => {
  it("picks round steps a person would choose", () => {
    expect(niceTicks(12.3, 15.4)).toEqual([12, 13, 14, 15, 16]);
    expect(niceTicks(540, 710)).toEqual([500, 550, 600, 650, 700, 750]);
    expect(niceTicks(0, 350_000)).toEqual([
      0, 100_000, 200_000, 300_000, 400_000,
    ]);
  });

  it("handles small decimal steps without float noise", () => {
    expect(niceTicks(1.1, 1.9)).toEqual([1, 1.2, 1.4, 1.6, 1.8, 2]);
  });

  it("covers the whole range", () => {
    const ticks = niceTicks(7.5, 92.1);
    expect(ticks.at(0)).toBeLessThanOrEqual(7.5);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(92.1);
  });

  it("degrades gracefully on a flat or broken range", () => {
    expect(niceTicks(5, 5)).toEqual([5]);
    expect(niceTicks(NaN, 5)).toEqual([]);
  });
});

describe("paths", () => {
  const points = [
    { x: 0, y: 10 },
    { x: 5.555, y: 2 },
    { x: 10, y: 6 },
  ];

  it("draws a line through every point, rounded to keep the DOM small", () => {
    expect(linePath(points)).toBe("M0 10 L5.56 2 L10 6");
    expect(linePath([])).toBe("");
  });

  it("closes the area down to the baseline", () => {
    expect(areaPath(points, 20)).toBe("M0 10 L5.56 2 L10 6 L10 20 L0 20 Z");
    expect(areaPath([], 20)).toBe("");
  });

  it("rounds a column's data end and keeps its base square", () => {
    const path = columnPath(10, 20, 16, 100);
    expect(path.startsWith("M10 100 L10 24 A4 4 0 0 1 14 20")).toBe(true);
    expect(path.endsWith("L26 100 Z")).toBe(true);
  });

  it("shrinks the corner on a short column and skips an empty one", () => {
    expect(columnPath(0, 98, 16, 100)).toContain("A2 2");
    expect(columnPath(0, 100, 16, 100)).toBe("");
  });
});

describe("nearestIndex", () => {
  it("snaps to the closest position", () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20, 30], 16)).toBe(2);
    expect(nearestIndex([0, 10, 20, 30], 99)).toBe(3);
    expect(nearestIndex([], 5)).toBe(-1);
  });
});
