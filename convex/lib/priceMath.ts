/**
 * The price engine's arithmetic — the price engine spec v0.1 (§2 inputs,
 * §3 admin tables, §4 daily calculation, §5 freshness, §6 honour rate) and
 * docs/plan.md "Live pricing". Pure functions, shared by convex/priceEngine.ts,
 * convex/adminPrices.ts and both consoles, so the screen and the server never
 * disagree. Money is integer paise per kilo throughout.
 */

export type PriceLevel = "L1" | "L2";
export type ObservationSource = "receipt" | "rateCard" | "survey" | "post";
export type BoardStatus = "live" | "guide";
export type PriceFamily =
  "paper" | "plastic" | "metal" | "glass" | "ewaste" | "other";

const DAY_MS = 24 * 60 * 60 * 1000;

// --- The rules, as numbers ---------------------------------------------------

/** The window the calculation reads, and the longer one when few report. */
export const WINDOW_DAYS = 7;
export const LONG_WINDOW_DAYS = 14;
/** Fewer businesses than this in 7 days → read 14 days instead. */
export const MIN_ORGS_FOR_SHORT_WINDOW = 3;

/** Live needs this many independent businesses, one of them with a trade. */
export const LIVE_MIN_ORGS = 3;
export const LIVE_MIN_TRADES = 1;

/** With this many businesses, values this far from the median are dropped. */
export const OUTLIER_MIN_ORGS = 4;
export const OUTLIER_PCT = 30;

/** A completed trade weighs 1; a rate card, post or survey quote weighs ½. */
export const TRADE_WEIGHT = 1;
export const QUOTE_WEIGHT = 0.5;
/** A business whose trades in the window total under 1 kg weighs ½. */
export const SMALL_TRADE_GRAMS = 1000;

/** Honour rate: a pickup paid this far under the posted card counts against it. */
export const HONOUR_UNDER_PCT = 5;
/** …and a shop with more than this share of such pickups loses its card. */
export const HONOUR_FLAG_PCT = 20;

/** Suggested fallback = 28-day median; suggested floor = 75% of it. */
export const SUGGEST_WINDOW_DAYS = 28;
export const FLOOR_SHARE = 0.75;
/** A floor or fallback move bigger than this needs a written reason. */
export const WEEKLY_NOTE_PCT = 10;

/** Yard buy posts expire after a week. */
export const POST_DAYS = 7;

const HALF_RUPEE = 50;

// --- Rounding ------------------------------------------------------------------

/** To the nearest ₹0.50: 1437 → 1450. */
export function roundToHalfRupee(paise: number): number {
  return Math.round(paise / HALF_RUPEE) * HALF_RUPEE;
}

/** Down to ₹0.50: 1437 → 1400. */
export function floorToHalfRupee(paise: number): number {
  return Math.floor(paise / HALF_RUPEE) * HALF_RUPEE;
}

/** The change from one price to another, in percent to one decimal. */
export function movePct(fromPaise: number, toPaise: number): number | null {
  return fromPaise > 0
    ? Math.round(((toPaise - fromPaise) / fromPaise) * 1000) / 10
    : null;
}

// --- Rupees as people type them -----------------------------------------------------

const RUPEES = /^(\d{1,7})(?:\.(\d{1,2}))?$/;

/** `14`, `14.5`, `₹ 1,400.50` → paise; null if it isn't a rupee amount. */
export function rupeesToPaise(input: string): number | null {
  const amount = input.replaceAll(/[\s,₹]/gu, "");
  if (!RUPEES.test(amount)) return null;
  const [whole = "0", fraction = ""] = amount.split(".", 2);
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

// --- Medians ---------------------------------------------------------------------

/** The plain median; the mean of the two middle values for an even count. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[middle - 1] ?? upper;
  return (lower + upper) / 2;
}

export interface Weighted {
  value: number;
  weight: number;
}

/**
 * The weighted median: sort by value, walk up the weights and stop at the
 * value where the running total reaches half of the whole. Newspaper at
 * 10.00 (½), 11.00 (1), 11.50 (1), 12.00 (1) → half of 3.5 is 1.75, reached
 * at 11.50.
 */
export function weightedMedian(values: readonly Weighted[]): number | null {
  const positive = values.filter((entry) => entry.weight > 0);
  if (positive.length === 0) return null;
  const sorted = positive.toSorted((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  let running = 0;
  for (const entry of sorted) {
    running += entry.weight;
    if (running >= total / 2) return entry.value;
  }
  return sorted.at(-1)?.value ?? null;
}

// --- Freshness and bands ---------------------------------------------------------

/** Rate cards count as fresh for 14 days, metals for 7 (they move daily). */
export function freshDays(family: PriceFamily): number {
  return family === "metal" ? 7 : 14;
}

export function isFresh(
  updatedAt: number,
  family: PriceFamily,
  now: number,
): boolean {
  return now - updatedAt <= freshDays(family) * DAY_MS;
}

/** Days until a card goes stale; negative once it has. */
export function freshDaysLeft(
  updatedAt: number,
  family: PriceFamily,
  now: number,
): number {
  return Math.ceil((updatedAt + freshDays(family) * DAY_MS - now) / DAY_MS);
}

/** The largest daily move the board takes on its own: ±10%, ±5% for metals. */
export function maxDailyMoveFor(family: PriceFamily): number {
  return family === "metal" ? 5 : 10;
}

export interface Band {
  minPaise: number;
  maxPaise: number;
  maxDailyMovePct: number;
}

/**
 * A starting band around the fallback: half of it to two and a half times
 * it, which takes in newspaper at ₹5–20 around ₹10 and cans at ₹30–150
 * around ₹60. The admin tightens it from there.
 */
export function defaultBand(fallbackPaise: number, family: PriceFamily): Band {
  return {
    minPaise: Math.max(HALF_RUPEE, floorToHalfRupee(fallbackPaise * 0.5)),
    maxPaise: Math.max(HALF_RUPEE * 2, roundToHalfRupee(fallbackPaise * 2.5)),
    maxDailyMovePct: maxDailyMoveFor(family),
  };
}

export function isInBand(paisePerKg: number, band: Band | null): boolean {
  return band
    ? paisePerKg >= band.minPaise && paisePerKg <= band.maxPaise
    : true;
}

export type BandProblem = "INVALID_BAND" | "BAND_MIN_ABOVE_MAX" | "INVALID_MOVE";

/** Whole paise above zero, min under max, and a daily limit of 1–50%. */
export function bandProblem(band: Band): BandProblem | null {
  const isWhole = (value: number) => Number.isSafeInteger(value) && value > 0;
  if (!isWhole(band.minPaise) || !isWhole(band.maxPaise)) return "INVALID_BAND";
  if (band.minPaise >= band.maxPaise) return "BAND_MIN_ABOVE_MAX";
  const move = band.maxDailyMovePct;
  return Number.isFinite(move) && move >= 1 && move <= 50
    ? null
    : "INVALID_MOVE";
}

// --- Related businesses count once ------------------------------------------------

/**
 * Spec §4 step 2: businesses that share an owner, a phone number or a GSTIN
 * are one business for the calculation. Returns each id's representative
 * (the first id, in the order given, of its group).
 */
export function mergeRelated(
  orgs: readonly { id: string; keys: readonly string[] }[],
): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while ((parent.get(root) ?? root) !== root) root = parent.get(root) ?? root;
    return root;
  };
  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };
  const byKey = new Map<string, string>();
  for (const org of orgs) {
    parent.set(org.id, find(org.id));
    for (const key of org.keys) {
      const normalized = key.trim().toLowerCase();
      if (normalized === "") continue;
      const seen = byKey.get(normalized);
      if (seen === undefined) byKey.set(normalized, org.id);
      else union(seen, org.id);
    }
  }
  return new Map(orgs.map((org) => [org.id, find(org.id)]));
}

// --- One value per business ---------------------------------------------------------

export interface PriceInput {
  orgId: string;
  paisePerKg: number;
  source: ObservationSource;
  grams?: number;
}

export interface OrgValue {
  orgId: string;
  paisePerKg: number;
  weight: number;
  /** Completed trades behind the value; 0 when it rests on a quote. */
  trades: number;
  grams: number;
}

/** Trades weigh 1, or ½ when the business weighed under a kilo in the window. */
export function tradeWeight(grams: number): number {
  return grams < SMALL_TRADE_GRAMS ? QUOTE_WEIGHT : TRADE_WEIGHT;
}

/**
 * A business counts once: the median of its trades if it has any, else its
 * rate card, post or survey quote (the median if it has more than one).
 */
export function orgValueOf(
  orgId: string,
  rows: readonly PriceInput[],
): OrgValue | null {
  const trades = rows.filter((row) => row.source === "receipt");
  if (trades.length > 0) {
    const grams = trades.reduce((sum, row) => sum + (row.grams ?? 0), 0);
    const paisePerKg = median(trades.map((row) => row.paisePerKg));
    if (paisePerKg === null) return null;
    return {
      orgId,
      paisePerKg: Math.round(paisePerKg),
      weight: tradeWeight(grams),
      trades: trades.length,
      grams,
    };
  }
  const paisePerKg = median(rows.map((row) => row.paisePerKg));
  if (paisePerKg === null) return null;
  return {
    orgId,
    paisePerKg: Math.round(paisePerKg),
    weight: QUOTE_WEIGHT,
    trades: 0,
    grams: 0,
  };
}

/** Groups inputs by business and reduces each to one value. */
export function orgValues(rows: readonly PriceInput[]): OrgValue[] {
  const byOrg = new Map<string, PriceInput[]>();
  // eslint-disable-next-line unicorn/prefer-group-by -- Map.groupBy isn't guaranteed in the Convex runtime; this must run in the daily cron.
  for (const row of rows) {
    const list = byOrg.get(row.orgId) ?? [];
    list.push(row);
    byOrg.set(row.orgId, list);
  }
  const values: OrgValue[] = [];
  for (const [orgId, list] of byOrg) {
    const value = orgValueOf(orgId, list);
    if (value) values.push(value);
  }
  return values;
}

/** With four or more businesses, drops values over 30% from the median. */
export function trimOutliers(values: readonly OrgValue[]): {
  kept: OrgValue[];
  dropped: OrgValue[];
} {
  if (values.length < OUTLIER_MIN_ORGS) return { kept: [...values], dropped: [] };
  const centre = weightedMedian(
    values.map((value) => ({ value: value.paisePerKg, weight: value.weight })),
  );
  if (centre === null || centre <= 0) return { kept: [...values], dropped: [] };
  const kept: OrgValue[] = [];
  const dropped: OrgValue[] = [];
  for (const value of values) {
    const distance = Math.abs(value.paisePerKg - centre) / centre;
    (distance > OUTLIER_PCT / 100 ? dropped : kept).push(value);
  }
  return { kept, dropped };
}

/** Which window to read: 7 days, or 14 when fewer than 3 businesses reported. */
export function windowDaysFor(orgsInShortWindow: number): number {
  return orgsInShortWindow < MIN_ORGS_FOR_SHORT_WINDOW
    ? LONG_WINDOW_DAYS
    : WINDOW_DAYS;
}

// --- The board line ------------------------------------------------------------------

export interface BoardInput {
  values: readonly OrgValue[];
  /** L1 only: never show a household price below it. */
  floorPaise: number | null;
  /** What Guide shows. */
  fallbackPaise: number | null;
  maxDailyMovePct: number;
  /** Yesterday's published price, for the circuit breaker. */
  previousTypical: number | null;
  /** The admin has confirmed today's move already: don't hold it again. */
  isConfirmed?: boolean;
}

export interface BoardResult {
  status: BoardStatus;
  /** Null only when there is nothing at all to show — no data and no fallback. */
  typicalPaise: number | null;
  lowPaise: number | null;
  highPaise: number | null;
  nOrgs: number;
  nTrades: number;
  /** The computed price the circuit breaker is holding, and its move. */
  heldPaise: number | null;
  heldPct: number | null;
  droppedOutliers: number;
}

/**
 * Spec §4 step 7: a Live move bigger than the band's daily limit keeps
 * yesterday's price and reports what it held back.
 */
function circuitBreaker(
  computed: number,
  input: BoardInput,
): { typical: number; heldPaise: number | null; heldPct: number | null } {
  const previous = input.previousTypical;
  if (previous === null || input.isConfirmed === true) {
    return { typical: computed, heldPaise: null, heldPct: null };
  }
  const pct = movePct(previous, computed);
  return pct !== null && Math.abs(pct) > input.maxDailyMovePct
    ? { typical: previous, heldPaise: computed, heldPct: pct }
    : { typical: computed, heldPaise: null, heldPct: null };
}

/** Spec §4 step 8: nothing on an L1 line shows below the floor. */
function atLeast(value: number | null, floor: number | null): number | null {
  if (value === null) return null;
  return floor === null ? value : Math.max(value, floor);
}

/**
 * Spec §4 steps 3–8 for one material: one value per business (given),
 * outliers dropped, the weighted median as "typical" with the low–high
 * range, Live or Guide, the circuit breaker, and never below the floor.
 */
export function computeBoard(input: BoardInput): BoardResult {
  const { kept, dropped } = trimOutliers(input.values);
  const nOrgs = kept.length;
  const nTrades = kept.reduce((sum, value) => sum + value.trades, 0);
  const computed = weightedMedian(
    kept.map((value) => ({ value: value.paisePerKg, weight: value.weight })),
  );
  const isLive =
    computed !== null && nOrgs >= LIVE_MIN_ORGS && nTrades >= LIVE_MIN_TRADES;

  const prices = kept.map((value) => value.paisePerKg);
  const low = prices.length > 0 ? Math.min(...prices) : null;
  const high = prices.length > 0 ? Math.max(...prices) : null;

  const line =
    isLive && computed !== null
      ? circuitBreaker(computed, input)
      : {
          typical: input.fallbackPaise ?? computed,
          heldPaise: null,
          heldPct: null,
        };

  return {
    status: isLive ? "live" : "guide",
    typicalPaise: atLeast(line.typical, input.floorPaise),
    lowPaise: atLeast(low, input.floorPaise),
    highPaise: atLeast(high, input.floorPaise),
    nOrgs,
    nTrades,
    heldPaise: line.heldPaise,
    heldPct: line.heldPct,
    droppedOutliers: dropped.length,
  };
}

// --- Honour rate -----------------------------------------------------------------------

export interface PaidLine {
  /** The pickup the line belongs to; several lines share one. */
  pickupRef: string;
  paidPaisePerKg: number;
  cardPaisePerKg: number;
}

export interface HonourRate {
  pickups: number;
  /** Pickups where at least one line paid over 5% under the posted card. */
  under: number;
  underPct: number;
  flagged: boolean;
}

/** Paid more than 5% under the card the shop posted. */
export function isUnderCard(
  paidPaisePerKg: number,
  cardPaisePerKg: number,
): boolean {
  return paidPaisePerKg < cardPaisePerKg * (1 - HONOUR_UNDER_PCT / 100);
}

/**
 * Spec §6: the share of a shop's pickups that paid over 5% below its posted
 * card. Over 20% and the card leaves the board.
 */
export function honourRate(lines: readonly PaidLine[]): HonourRate {
  const pickups = new Map<string, boolean>();
  for (const line of lines) {
    const isUnder = isUnderCard(line.paidPaisePerKg, line.cardPaisePerKg);
    pickups.set(
      line.pickupRef,
      (pickups.get(line.pickupRef) ?? false) || isUnder,
    );
  }
  const total = pickups.size;
  let under = 0;
  for (const isUnder of pickups.values()) if (isUnder) under += 1;
  const underPct = total === 0 ? 0 : Math.round((under / total) * 1000) / 10;
  return { pickups: total, under, underPct, flagged: underPct > HONOUR_FLAG_PCT };
}

// --- The admin's suggestions -------------------------------------------------------------

/** Fallback = the 28-day median of L1 values, rounded down to ₹0.50. */
export function suggestedFallback(values: readonly number[]): number | null {
  const middle = median(values);
  return middle === null ? null : floorToHalfRupee(middle);
}

/** Floor = 75% of the fallback, rounded down to ₹0.50. */
export function suggestedFloor(fallbackPaise: number): number {
  return Math.max(HALF_RUPEE, floorToHalfRupee(fallbackPaise * FLOOR_SHARE));
}

/** A move over 10% needs a written reason. */
export function requiresNote(fromPaise: number | null, toPaise: number): boolean {
  if (fromPaise === null) return false;
  const pct = movePct(fromPaise, toPaise);
  return pct !== null && Math.abs(pct) > WEEKLY_NOTE_PCT;
}

/** The week's change from a dated series: the last point against the 8th from last. */
export function weekChangePct(
  series: readonly { paisePerKg: number }[],
): number | null {
  const last = series.at(-1);
  const weekAgo = series.at(-8);
  return last && weekAgo ? movePct(weekAgo.paisePerKg, last.paisePerKg) : null;
}

// --- CSV paste ----------------------------------------------------------------------------

export interface CsvPriceRow {
  line: number;
  materialCode: string;
  floorPaise: number;
  fallbackPaise: number;
}

export type CsvProblem = "COLUMNS" | "INVALID_PRICE" | "FLOOR_ABOVE_FALLBACK";

export interface CsvParse {
  rows: CsvPriceRow[];
  problems: { line: number; problem: CsvProblem; text: string }[];
}

const CSV_SPLIT = /[,;\t]/;
const HEADER_WORDS = new Set(["code", "material", "materialcode"]);

/**
 * The admin's paste: one material a line as `CODE, floor, fallback` in
 * rupees (`PAPER-NEWS, 7.50, 10`). Commas, semicolons or tabs between the
 * columns; a header line and blank lines are skipped; codes are upper-cased.
 * Problems name the line so the admin can fix it before importing.
 */
export function parsePriceCsv(text: string): CsvParse {
  const rows: CsvPriceRow[] = [];
  const problems: CsvParse["problems"] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") continue;
    const cells = trimmed.split(CSV_SPLIT).map((cell) => cell.trim());
    const code = (cells[0] ?? "").toUpperCase();
    if (index === 0 && HEADER_WORDS.has(code.toLowerCase().replace(/\s/g, "")))
      continue;
    if (cells.length < 3 || code === "") {
      problems.push({ line, problem: "COLUMNS", text: trimmed });
      continue;
    }
    const floorPaise = rupeesToPaise(cells[1] ?? "");
    const fallbackPaise = rupeesToPaise(cells[2] ?? "");
    if (floorPaise === null || fallbackPaise === null || floorPaise === 0) {
      problems.push({ line, problem: "INVALID_PRICE", text: trimmed });
      continue;
    }
    if (floorPaise > fallbackPaise) {
      problems.push({ line, problem: "FLOOR_ABOVE_FALLBACK", text: trimmed });
      continue;
    }
    rows.push({ line, materialCode: code, floorPaise, fallbackPaise });
  }
  return { rows, problems };
}
