/**
 * Geometry for the small inline-SVG charts on the public pages: the price
 * sparklines, the 30-day price chart and the solar savings chart. Pure
 * functions, so the maths is tested rather than eyeballed, and no chart
 * library ships to phones on patchy networks.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Maps a value from `domain` onto `range`. A flat domain (one value) maps to
 * the middle of the range, so a price that never moved draws a level line.
 */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return (value: number) =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0);
}

/** 1, 2 or 5 times a power of ten: the step a person would pick by hand. */
function niceStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  let nice = 10;
  if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  return nice * power;
}

/**
 * Round tick values that cover `[min, max]`, about `count` intervals apart —
 * 12, 13, 14 rather than 12.37, 13.12, 13.87.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count < 1) return [];
  if (max <= min) return [min];
  const step = niceStep((max - min) / count);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const first = Math.floor(min / step);
  const last = Math.ceil(max / step);
  const ticks: number[] = [];
  for (let index = first; index <= last; index += 1) {
    ticks.push(Number((index * step).toFixed(decimals)));
  }
  return ticks;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** `M x y L x y …` through the points; empty when there are none. */
export function linePath(points: readonly Point[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${String(round2(point.x))} ${String(round2(point.y))}`,
    )
    .join(" ");
}

/** The line closed down to `baselineY`: the soft wash under a price line. */
export function areaPath(points: readonly Point[], baselineY: number): string {
  const first = points.at(0);
  const last = points.at(-1);
  if (!first || !last) return "";
  const base = String(round2(baselineY));
  return `${linePath(points)} L${String(round2(last.x))} ${base} L${String(round2(first.x))} ${base} Z`;
}

/**
 * A column that grows from the baseline: square where it meets the axis,
 * rounded at the data end (the dataviz mark spec). Empty for a zero height.
 */
export function columnPath(
  x: number,
  topY: number,
  width: number,
  baselineY: number,
  radius = 4,
): string {
  const height = baselineY - topY;
  if (height <= 0 || width <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  const [left, right, top, base] = [x, x + width, topY, baselineY].map(
    (value) => String(round2(value)),
  );
  const rs = String(round2(r));
  return [
    `M${left} ${base}`,
    `L${left} ${String(round2(topY + r))}`,
    `A${rs} ${rs} 0 0 1 ${String(round2(x + r))} ${top}`,
    `L${String(round2(x + width - r))} ${top}`,
    `A${rs} ${rs} 0 0 1 ${right} ${String(round2(topY + r))}`,
    `L${right} ${base}`,
    "Z",
  ].join(" ");
}

/** Index of the x-position closest to `x`: what a crosshair snaps to. */
export function nearestIndex(xs: readonly number[], x: number): number {
  let best = -1;
  let bestDistance = Infinity;
  for (const [index, candidate] of xs.entries()) {
    const distance = Math.abs(candidate - x);
    if (distance >= bestDistance) continue;
    best = index;
    bestDistance = distance;
  }
  return best;
}
