/**
 * The factory floor's rules, as pure functions shared by Convex and the
 * screens: quality-check defaults per material, the weight tolerance between
 * two scales, scale stamps under the Legal Metrology Rules, production yield,
 * capacity use, and who on a team may do what.
 *
 * The defaults are industry starting points (ISRI/ReMA Scrap Specifications
 * Circular 2024, tuned for Indian conditions), not law: a buyer and seller
 * can agree others before a load moves. Mass stays in integer grams.
 */

import type { Family } from "./catalogue";

// --- Quality checks -----------------------------------------------------------

export type QualityKey =
  "moisture" | "prohibitives" | "outthrows" | "contamination" | "offColour";

export const QUALITY_KEYS: readonly QualityKey[] = [
  "moisture",
  "prohibitives",
  "outthrows",
  "contamination",
  "offColour",
];

export type QualityResult = "accept" | "deduct" | "reject";

export interface QualityLimit {
  key: QualityKey;
  /** Per cent of the load, whole numbers. */
  limit: number;
}

export interface QualityReading extends QualityLimit {
  /** What was measured, per cent of the load. */
  value: number;
}

export interface QualityMaterial {
  code: string;
  family: Family;
  stage: "scrap" | "recycled";
}

/** Old corrugated containers carry the OCC rules on prohibitives and outthrows. */
const OCC_CODES: ReadonlySet<string> = new Set(["PAPER-CARTON"]);

const FAMILY_DEFAULTS: Record<Family, readonly QualityLimit[]> = {
  // ISRI paper grades: packed at no more than 12% moisture.
  paper: [{ key: "moisture", limit: 12 }],
  // Baled bottles and film: dry, few foreign objects, colour as sold.
  plastic: [
    { key: "moisture", limit: 3 },
    { key: "contamination", limit: 2 },
    { key: "offColour", limit: 5 },
  ],
  // Attachments, dirt and oil on scrap metal.
  metal: [
    { key: "contamination", limit: 2 },
    { key: "moisture", limit: 1 },
  ],
  // Ceramics, stones and caps in cullet.
  glass: [{ key: "contamination", limit: 2 }],
  // Non-electronic material mixed into an e-waste lot.
  ewaste: [{ key: "contamination", limit: 5 }],
  other: [{ key: "contamination", limit: 5 }],
};

/** Recycled output (flakes, granules, rolls, ingots) is held to tighter limits. */
const RECYCLED_DEFAULTS: Partial<Record<Family, readonly QualityLimit[]>> = {
  plastic: [
    { key: "moisture", limit: 1 },
    { key: "contamination", limit: 1 },
    { key: "offColour", limit: 2 },
  ],
  paper: [{ key: "moisture", limit: 8 }],
  metal: [{ key: "contamination", limit: 1 }],
};

/**
 * The parameters a quality check measures for a material, with the default
 * limit for each: paper moisture 12%; OCC prohibitives 1% and outthrows plus
 * prohibitives 5%; plastics moisture, contamination and colour.
 */
export function qualityDefaults(material: QualityMaterial): QualityLimit[] {
  if (OCC_CODES.has(material.code)) {
    return [
      { key: "moisture", limit: 12 },
      { key: "prohibitives", limit: 1 },
      { key: "outthrows", limit: 5 },
    ];
  }
  const defaults =
    (material.stage === "recycled"
      ? RECYCLED_DEFAULTS[material.family]
      : undefined) ?? FAMILY_DEFAULTS[material.family];
  return defaults.map((limit) => ({ ...limit }));
}

/** Readings over their limit. */
export function exceeded(
  readings: readonly QualityReading[],
): QualityReading[] {
  return readings.filter((reading) => reading.value > reading.limit);
}

/**
 * What the readings suggest: prohibitives over the limit means the load is
 * refused; anything else over the limit means a deduction; otherwise accept.
 * The person checking decides — this only fills the form in.
 */
export function suggestResult(
  readings: readonly QualityReading[],
): QualityResult {
  const over = exceeded(readings);
  if (over.some((reading) => reading.key === "prohibitives")) return "reject";
  return over.length > 0 ? "deduct" : "accept";
}

/** The most a check may deduct, per cent; more than this is a rejection. */
export const MAX_DEDUCTION_PCT = 50;

/**
 * A starting deduction: one per cent for every per cent over the limits,
 * summed over the readings, whole numbers, at least 1 and at most 50.
 */
export function suggestedDeductionPct(
  readings: readonly QualityReading[],
): number {
  const over = exceeded(readings);
  if (over.length === 0) return 0;
  const excess = over.reduce(
    (sum, reading) => sum + (reading.value - reading.limit),
    0,
  );
  return Math.min(MAX_DEDUCTION_PCT, Math.max(1, Math.round(excess)));
}

/** A reading is a whole or half per cent between 0 and 100. */
export function isPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

// --- Weights ----------------------------------------------------------------

/**
 * No adjustment when two scales disagree by 1% or less (ISRI domestic
 * tolerance); above that the load is flagged for both sides to look at.
 */
export const WEIGHT_TOLERANCE_PCT = 1;

export interface WeightMismatch {
  /** Net on the slip minus the trade's grams; negative when short. */
  differenceGrams: number;
  /** Absolute difference as a share of the trade, one decimal. */
  differencePct: number;
  flagged: boolean;
}

/** Compares a slip's net weight with the trade it was weighed against. */
export function weightMismatch(
  netGrams: number,
  tradeGrams: number,
): WeightMismatch {
  const differenceGrams = netGrams - tradeGrams;
  if (tradeGrams <= 0) {
    return { differenceGrams, differencePct: 0, flagged: netGrams > 0 };
  }
  const absolute = Math.abs(differenceGrams);
  return {
    differenceGrams,
    differencePct: Math.round((absolute * 1000) / tradeGrams) / 10,
    // Integer arithmetic: |diff| / trade > 1% ⇔ |diff| × 100 > trade × 1.
    flagged: absolute * 100 > tradeGrams * WEIGHT_TOLERANCE_PCT,
  };
}

/** Gross, tare and any deduction to the net weight in grams. */
export function netGramsOf(
  grossGrams: number,
  tareGrams: number,
  deductionGrams: number,
): number {
  return grossGrams - tareGrams - deductionGrams;
}

export type DeductionReason = "moisture" | "contamination" | "tare" | "other";

export const DEDUCTION_REASONS: readonly DeductionReason[] = [
  "moisture",
  "contamination",
  "tare",
  "other",
];

/** Weigh slips are numbered per business: WS-26-0001, WS-26-0002, … */
export function nextSlipNumber(
  last: string | undefined,
  yearTwoDigits: string,
): string {
  const prefix = `WS-${yearTwoDigits}-`;
  const sequence =
    last?.startsWith(prefix) === true ? Number(last.slice(prefix.length)) : 0;
  const next = Number.isSafeInteger(sequence) ? sequence + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/** A vehicle number as printed on the plate: KA 05 MJ 1234, or a short word. */
const VEHICLE_NUMBER = /^[A-Z0-9][A-Z0-9 -]{2,15}$/;

/** Tidies what the gate types into a plate number, or null if it isn't one. */
export function normalizeVehicleNumber(input: string): string | null {
  const tidy = input.trim().toUpperCase().replaceAll(/\s+/g, " ");
  return VEHICLE_NUMBER.test(tidy) ? tidy : null;
}

// --- Scales and their stamps ------------------------------------------------

export type ScaleKind = "platform" | "weighbridge" | "beam" | "spring";

export const SCALE_KINDS: readonly ScaleKind[] = [
  "platform",
  "weighbridge",
  "beam",
  "spring",
];

/**
 * Legal Metrology (General) Rules 2011, rule 27: weights and beam scales are
 * re-verified every 24 months; every other instrument every 12.
 */
export function reverificationMonths(kind: ScaleKind): 12 | 24 {
  return kind === "beam" ? 24 : 12;
}

/** The stamp is flagged for renewal when it has fewer days left than this. */
export const STAMP_WARNING_DAYS = 30;

/** The heaviest load a scale record may claim, in kg (a 200-tonne weighbridge). */
export const MAX_SCALE_CAPACITY_KG = 200_000;

export type StampStatus = "ok" | "expiring" | "expired";

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A YYYY-MM-DD date that exists (2026-02-30 doesn't). */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return parsed.toISOString().slice(0, 10) === value;
}

function dayNumber(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS;
}

/** Days from `today` to `date`, both YYYY-MM-DD; negative when it has passed. */
export function daysUntil(date: string, today: string): number {
  return Math.round(dayNumber(date) - dayNumber(today));
}

/**
 * Where a scale's stamp stands on `today`: good through its last day,
 * "expiring" inside the 30-day reminder window, "expired" after.
 */
export function stampStatus(
  validUntil: string,
  today: string,
): { status: StampStatus; daysLeft: number } {
  const daysLeft = daysUntil(validUntil, today);
  if (daysLeft < 0) return { status: "expired", daysLeft };
  return {
    status: daysLeft < STAMP_WARNING_DAYS ? "expiring" : "ok",
    daysLeft,
  };
}

// --- Production -------------------------------------------------------------

export type Shift = "day" | "evening" | "night";

export const SHIFTS: readonly Shift[] = ["day", "evening", "night"];

export interface BatchLine {
  materialCode: string;
  grams: number;
}

export interface BatchTotals {
  inputGrams: number;
  outputGrams: number;
  /** Output as a share of input, one decimal; 0 when nothing went in. */
  yieldPct: number;
}

/** A batch's totals and yield. Grams in and out are added as integers. */
export function batchTotals(
  inputs: readonly BatchLine[],
  outputs: readonly BatchLine[],
): BatchTotals {
  const inputGrams = inputs.reduce((sum, line) => sum + line.grams, 0);
  const outputGrams = outputs.reduce((sum, line) => sum + line.grams, 0);
  return {
    inputGrams,
    outputGrams,
    yieldPct:
      inputGrams > 0 ? Math.round((outputGrams * 1000) / inputGrams) / 10 : 0,
  };
}

/** Adds a batch's lines up per material, so a material listed twice counts once. */
export function mergeLines(lines: readonly BatchLine[]): BatchLine[] {
  const sums = new Map<string, number>();
  for (const line of lines) {
    sums.set(
      line.materialCode,
      (sums.get(line.materialCode) ?? 0) + line.grams,
    );
  }
  return Array.from(sums, ([materialCode, grams]) => ({ materialCode, grams }));
}

export type CapacitySource = "consent" | "epr";

export const CAPACITY_SOURCES: readonly CapacitySource[] = ["consent", "epr"];

/** The largest installed capacity a business may declare, tonnes a year. */
export const MAX_CAPACITY_TONNES = 1_000_000;

export interface CapacityUse {
  /** Whole per cent of the year's capacity already used; can pass 100. */
  pct: number;
  over: boolean;
}

/**
 * How much of the declared capacity this year's input has used. Processing
 * more than the installed capacity is what CPCB's certificate audits look
 * for, so passing 100% is flagged rather than hidden.
 */
export function capacityUse(
  usedGrams: number,
  tonnesPerYear: number,
): CapacityUse {
  if (tonnesPerYear <= 0) return { pct: 0, over: usedGrams > 0 };
  const capacityGrams = tonnesPerYear * 1_000_000;
  return {
    pct: Math.round((usedGrams * 100) / capacityGrams),
    over: usedGrams > capacityGrams,
  };
}

// --- Team roles ---------------------------------------------------------------

/** The roles an owner can hand out. Each opens on its own screen. */
export type TeamRole =
  "purchase" | "gate" | "quality" | "accounts" | "compliance" | "plant";

export const TEAM_ROLES: readonly TeamRole[] = [
  "purchase",
  "gate",
  "quality",
  "accounts",
  "compliance",
  "plant",
];

/** Every role a membership can hold. */
export type MemberRole = "owner" | "staff" | TeamRole;

export const MEMBER_ROLES: readonly MemberRole[] = [
  "owner",
  "staff",
  ...TEAM_ROLES,
];

export function isTeamRole(value: string): value is TeamRole {
  return (TEAM_ROLES as readonly string[]).includes(value);
}

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<MemberRole, string> = {
  owner: "/app",
  staff: "/app",
  purchase: "/app/market",
  gate: "/app/gate",
  quality: "/app/gate",
  accounts: "/app/khata",
  compliance: "/app/compliance",
  plant: "/app/production",
};

export type FloorAction =
  | "manage_team"
  | "manage_scales"
  | "record_slip"
  | "quality_check"
  | "record_batch"
  | "set_capacity";

const ALLOWED: Record<FloorAction, readonly MemberRole[]> = {
  manage_team: ["owner"],
  manage_scales: ["owner", "compliance", "gate"],
  record_slip: ["owner", "staff", "gate"],
  quality_check: ["owner", "staff", "quality"],
  record_batch: ["owner", "staff", "plant"],
  set_capacity: ["owner", "compliance"],
};

/** Whether a member with `role` may take `action` for their business. */
export function isAllowed(role: MemberRole, action: FloorAction): boolean {
  return ALLOWED[action].includes(role);
}
