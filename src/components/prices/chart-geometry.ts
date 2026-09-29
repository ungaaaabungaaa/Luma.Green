import {
  areaPath,
  linearScale,
  linePath,
  niceTicks,
  type Point,
} from "@/components/site/chart-kit";

import { dayNumber, type PricePoint } from "./board";

export const PRICE_CHART = {
  height: 224,
  margin: { top: 16, right: 64, bottom: 30, left: 60 },
} as const;

export interface PriceChartGeometry {
  plot: { left: number; right: number; top: number; bottom: number };
  points: Point[];
  xs: number[];
  /** Round-rupee gridlines, in paise, with their y position. */
  yTicks: { paise: number; y: number }[];
  floorY: number | null;
  line: string;
  area: string;
}

/**
 * Where everything in the 30-day price chart goes, for a chart `width`
 * pixels wide. The y-axis always includes the floor, so the floor line is
 * never drawn off the chart. Null when there is nothing to draw.
 */
export function priceChartGeometry(
  series: readonly PricePoint[],
  floorPaise: number | null,
  width: number,
): PriceChartGeometry | null {
  const first = series.at(0);
  const last = series.at(-1);
  if (!first || !last) return null;

  const { height, margin } = PRICE_CHART;
  const plot = {
    left: margin.left,
    right: Math.max(margin.left + 1, width - margin.right),
    top: margin.top,
    bottom: height - margin.bottom,
  };

  const values = series.map((point) => point.paisePerKg);
  if (floorPaise !== null) values.push(floorPaise);
  const low = Math.min(...values);
  const high = Math.max(...values);
  // A price that never moved still gets a readable axis around it.
  const pad = low === high ? Math.max(100, Math.round(low * 0.1)) : 0;
  const ticks = niceTicks((low - pad) / 100, (high + pad) / 100, 4).map(
    (rupees) => Math.round(rupees * 100),
  );
  const y = linearScale(
    [ticks.at(0) ?? low, ticks.at(-1) ?? high],
    [plot.bottom, plot.top],
  );
  const x = linearScale(
    [dayNumber(first.date), dayNumber(last.date)],
    [plot.left, plot.right],
  );

  const points = series.map((point) => ({
    x: x(dayNumber(point.date)),
    y: y(point.paisePerKg),
  }));

  return {
    plot,
    points,
    xs: points.map((point) => point.x),
    yTicks: ticks.map((paise) => ({ paise, y: y(paise) })),
    floorY: floorPaise === null ? null : y(floorPaise),
    line: linePath(points),
    area: areaPath(points, plot.bottom),
  };
}
