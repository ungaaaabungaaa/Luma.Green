import {
  columnPath,
  linearScale,
  niceTicks,
} from "@/components/site/chart-kit";

import type { Range } from "./calc";

export const SAVINGS_CHART = {
  height: 216,
  margin: { top: 24, right: 8, bottom: 28, left: 72 },
  maxBarWidth: 24,
} as const;

export interface SavingsBar {
  year: number;
  saved: number;
  x: number;
  width: number;
  centre: number;
  topY: number;
  path: string;
  /** Savings have covered even the high end of the cost estimate. */
  paidBack: boolean;
}

export interface SavingsGeometry {
  plot: { left: number; right: number; top: number; bottom: number };
  bars: SavingsBar[];
  yTicks: { value: number; y: number }[];
  /** The net-cost range as a horizontal band. */
  band: { top: number; bottom: number };
}

/**
 * Columns of savings so far, year by year, against the system's net cost —
 * the year the columns clear the band is the year it has paid for itself.
 */
export function savingsGeometry(
  savingsByYear: readonly { year: number; saved: number }[],
  netCost: Range,
  width: number,
): SavingsGeometry | null {
  if (savingsByYear.length === 0) return null;
  const { height, margin, maxBarWidth } = SAVINGS_CHART;
  const plot = {
    left: margin.left,
    right: Math.max(margin.left + 1, width - margin.right),
    top: margin.top,
    bottom: height - margin.bottom,
  };

  const highest = Math.max(
    netCost.high,
    ...savingsByYear.map((entry) => entry.saved),
  );
  const ticks = niceTicks(0, highest, 4);
  const y = linearScale([0, ticks.at(-1) ?? highest], [plot.bottom, plot.top]);
  const slot = (plot.right - plot.left) / savingsByYear.length;
  // Thin columns with air between them, never wider than the mark spec.
  const barWidth = Math.min(maxBarWidth, slot * 0.6);

  const bars = savingsByYear.map((entry, index) => {
    const x = plot.left + slot * index + (slot - barWidth) / 2;
    const topY = y(entry.saved);
    return {
      year: entry.year,
      saved: entry.saved,
      x,
      width: barWidth,
      centre: x + barWidth / 2,
      topY,
      path: columnPath(x, topY, barWidth, plot.bottom),
      paidBack: entry.saved >= netCost.high,
    };
  });

  return {
    plot,
    bars,
    yTicks: ticks.map((value) => ({ value, y: y(value) })),
    band: { top: y(netCost.high), bottom: y(netCost.low) },
  };
}
