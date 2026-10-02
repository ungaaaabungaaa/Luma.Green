import { asciiDigits } from "@/lib/number-input";

/**
 * Rooftop solar in Karnataka: the estimate behind /solar, kept pure so each
 * rule has a test. Amounts are whole rupees — these are estimates shown to
 * people, never stored or charged.
 *
 * Every assumption below is also stated on the page:
 * - 1 kW of panels makes about 120 units (kWh) a month.
 * - Each kW needs about 10 m² of shade-free roof.
 * - Installed cost is ₹55,000–65,000 per kW.
 * - PM Surya Ghar (https://pmsuryaghar.gov.in), homes only: ₹30,000 per kW
 *   for the first 2 kW and ₹18,000 for the 3rd kW, at most ₹78,000.
 * - A bill becomes units at an assumed average tariff: ₹7 a unit for homes,
 *   ₹9 for businesses.
 * - Savings count only the power used on site, at today's tariff.
 */
export const SOLAR = {
  unitsPerKwMonth: 120,
  roofM2PerKw: 10,
  costPerKw: { low: 55_000, high: 65_000 },
  tariff: { home: 7, business: 9 },
  subsidy: { perKwFirstTwo: 30_000, perKwThird: 18_000, cap: 78_000 },
  minKw: 1,
  stepKw: 0.5,
  years: 10,
  sqftPerM2: 10.7639,
} as const;

export type SolarKind = "home" | "business";
export type UsageMode = "bill" | "units";
export type AreaUnit = "sqft" | "m2";

export interface SolarInput {
  kind: SolarKind;
  mode: UsageMode;
  /** Rupees a month for a bill, or units (kWh) a month. */
  amount: number;
  /** Shade-free roof in m²; null or absent when they don't know. */
  roofM2?: number | null;
}

export interface Range {
  low: number;
  high: number;
}

export interface SolarEstimate {
  kind: SolarKind;
  /** Units used a month (from the bill, or as typed), rounded. */
  monthlyUnits: number;
  kw: number;
  /** The roof, not the bill, set the size. */
  limitedByRoof: boolean;
  roofNeededM2: number;
  monthlyGeneration: number;
  cost: Range;
  subsidy: number;
  netCost: Range;
  monthlySavings: number;
  yearlySavings: number;
  /** Years to earn back the net cost, one decimal; null if nothing is saved. */
  paybackYears: Range | null;
  savingsByYear: { year: number; saved: number }[];
}

export type SolarResult =
  | { status: "ok"; estimate: SolarEstimate }
  | { status: "roofTooSmall"; minRoofM2: number }
  | { status: "noUsage" };

const EPSILON = 1e-9;

const roundToStep = (kw: number) =>
  Math.round(kw / SOLAR.stepKw) * SOLAR.stepKw;
const floorToStep = (kw: number) =>
  Math.floor(kw / SOLAR.stepKw + EPSILON) * SOLAR.stepKw;
const oneDecimal = (value: number) => Math.round(value * 10) / 10;

/** Units a month: as typed, or a bill divided by the assumed tariff. */
export function monthlyUnitsFor(
  kind: SolarKind,
  mode: UsageMode,
  amount: number,
): number {
  return mode === "units" ? amount : amount / SOLAR.tariff[kind];
}

/**
 * The system to suggest: enough to cover the monthly use, to the nearest
 * half kW and at least 1 kW, but never more than the roof holds. Null when
 * the roof can't hold even 1 kW.
 */
export function systemSize(
  monthlyUnits: number,
  roofM2?: number | null,
): { kw: number; limitedByRoof: boolean } | null {
  const roofKw =
    roofM2 === null || roofM2 === undefined
      ? Infinity
      : floorToStep(roofM2 / SOLAR.roofM2PerKw);
  if (roofKw < SOLAR.minKw) return null;
  const wanted = Math.max(
    SOLAR.minKw,
    roundToStep(monthlyUnits / SOLAR.unitsPerKwMonth),
  );
  return { kw: Math.min(wanted, roofKw), limitedByRoof: roofKw < wanted };
}

/** PM Surya Ghar central subsidy for a home system; businesses get none. */
export function subsidyFor(kind: SolarKind, kw: number): number {
  if (kind === "business" || kw <= 0) return 0;
  const { perKwFirstTwo, perKwThird, cap } = SOLAR.subsidy;
  const firstTwo = Math.min(kw, 2) * perKwFirstTwo;
  const third = Math.min(Math.max(kw - 2, 0), 1) * perKwThird;
  return Math.min(Math.round(firstTwo + third), cap);
}

export function estimateSolar(input: SolarInput): SolarResult {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { status: "noUsage" };
  }
  const units = monthlyUnitsFor(input.kind, input.mode, input.amount);
  const size = systemSize(units, input.roofM2);
  if (!size) {
    return {
      status: "roofTooSmall",
      minRoofM2: SOLAR.minKw * SOLAR.roofM2PerKw,
    };
  }

  const { kw, limitedByRoof } = size;
  const monthlyGeneration = kw * SOLAR.unitsPerKwMonth;
  const cost = {
    low: kw * SOLAR.costPerKw.low,
    high: kw * SOLAR.costPerKw.high,
  };
  const subsidy = subsidyFor(input.kind, kw);
  const netCost = {
    low: Math.max(0, cost.low - subsidy),
    high: Math.max(0, cost.high - subsidy),
  };
  // Power beyond what the place uses isn't counted: export rates vary.
  const monthlySavings = Math.round(
    Math.min(monthlyGeneration, units) * SOLAR.tariff[input.kind],
  );
  const yearlySavings = monthlySavings * 12;

  return {
    status: "ok",
    estimate: {
      kind: input.kind,
      monthlyUnits: Math.round(units),
      kw,
      limitedByRoof,
      roofNeededM2: kw * SOLAR.roofM2PerKw,
      monthlyGeneration,
      cost,
      subsidy,
      netCost,
      monthlySavings,
      yearlySavings,
      paybackYears:
        yearlySavings > 0
          ? {
              low: oneDecimal(netCost.low / yearlySavings),
              high: oneDecimal(netCost.high / yearlySavings),
            }
          : null,
      savingsByYear: Array.from({ length: SOLAR.years }, (_, index) => ({
        year: index + 1,
        saved: yearlySavings * (index + 1),
      })),
    },
  };
}

/** Sensible bounds for what people type: a tea stall to a small factory. */
export const USAGE_LIMITS = {
  bill: { min: 100, max: 1_000_000 },
  units: { min: 10, max: 150_000 },
} as const;

/** A form field as typed: nothing yet, something unusable, or a value. */
export type Reading =
  { status: "empty" } | { status: "invalid" } | { status: "ok"; value: number };

/** The monthly bill (₹) or units they typed, within `USAGE_LIMITS`. */
export function readUsage(
  mode: UsageMode,
  text: string,
  locale = "en-IN",
): Reading {
  if (text.trim() === "") return { status: "empty" };
  const value = parseAmount(text, locale);
  const { min, max } = USAGE_LIMITS[mode];
  return value === null || value < min || value > max
    ? { status: "invalid" }
    : { status: "ok", value };
}

/** The roof in m². Empty is fine: plenty of people don't know it. */
export function readRoof(
  text: string,
  unit: AreaUnit,
  locale = "en-IN",
): Reading {
  if (text.trim() === "") return { status: "empty" };
  const value = parseAmount(text, locale);
  return value === null || value <= 0
    ? { status: "invalid" }
    : { status: "ok", value: toSquareMetres(value, unit) };
}

/** Square metres from what they typed, in the unit they chose. */
export function toSquareMetres(value: number, unit: AreaUnit): number {
  return unit === "m2" ? value : value / SOLAR.sqftPerM2;
}

/** m² in the unit someone reads, rounded for display. */
export function fromSquareMetres(m2: number, unit: AreaUnit): number {
  return Math.round(unit === "m2" ? m2 : m2 * SOLAR.sqftPerM2);
}

/**
 * A positive number as someone types it — "2,500", "₹ 3000", "1,00,000",
 * "12.5", or in their own script's digits. Null for anything else.
 */
export function parseAmount(text: string, locale = "en-IN"): number | null {
  const parts = new Intl.NumberFormat(
    locale === "en" ? "en-IN" : locale,
  ).formatToParts(1_234_567.8);
  const group = parts.find((part) => part.type === "group")?.value ?? ",";
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
  let cleaned = asciiDigits(text.trim()).replaceAll(/[\s₹]/g, "");
  // A dot is a grouping mark in some locales. Reject malformed groups rather
  // than silently turning a typed decimal (12.5) into a different value (125).
  if (!/\s/.test(group) && cleaned.includes(group)) {
    const [whole = "", fraction = ""] = cleaned.split(decimal);
    if (fraction.includes(group)) return null;
    const groups = whole.split(group);
    const integerParts = parts.filter((part) => part.type === "integer");
    const lastSize = integerParts.at(-1)?.value.length ?? 3;
    const middleSize = integerParts.at(-2)?.value.length ?? 3;
    const hasGrouping = (middleWidth: number) =>
      groups.every((value, index) => {
        if (!/^\d+$/.test(value)) return false;
        if (index === 0) return value.length <= middleWidth;
        const width = index === groups.length - 1 ? lastSize : middleWidth;
        return value.length === width;
      });
    // Indian keyboards and pasted bills can use either complete grouping
    // pattern. Choose one pattern for the whole number; never mix the two.
    const hasWesternGrouping =
      middleSize === 2 && lastSize === 3 && hasGrouping(3);
    if (!hasWesternGrouping && !hasGrouping(middleSize)) return null;
  }
  cleaned = cleaned
    .replaceAll(group, "")
    .replaceAll(decimal, ".")
    .replaceAll("٬", "")
    .replaceAll("٫", ".");
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
