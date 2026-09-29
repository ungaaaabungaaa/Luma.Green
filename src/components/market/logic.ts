import { CHAIN_MARKUP } from "../../../convex/lib/catalogue";
import { kgToGrams, type OrgKind } from "../../../convex/lib/chain";
import { indiaToday } from "../../../convex/lib/onboarding";
import type { ListingView, TradeStatus, TradeView } from "./types";

/**
 * The market's screen rules, kept out of the components so they can be
 * tested on their own. Amounts stay integers: grams and paise.
 */

/** A listing's note, in characters — the same limit convex/market.ts checks. */
export const NOTE_MAX_LENGTH = 140;

/** The steps of a trade that goes through, in order. */
export const TRADE_STEPS = [
  "requested",
  "accepted",
  "paid_to_escrow",
  "dispatched",
  "completed",
] as const satisfies readonly TradeStatus[];

// --- Reading what people type ---------------------------------------------------

const KG_PATTERN = /^(?:\d+(?:\.\d{0,3})?|\.\d{1,3})$/;
const RUPEE_PATTERN = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;

/** "12.5" kg → 12500 grams; null unless it's a weight above zero. */
export function parseKg(input: string): number | null {
  const text = input.trim();
  if (!KG_PATTERN.test(text)) return null;
  const grams = kgToGrams(Number(text));
  return grams > 0 ? grams : null;
}

/** "17.5" rupees → 1750 paise; null unless it's a price above zero. */
export function parseRupees(input: string): number | null {
  const text = input.trim();
  if (!RUPEE_PATTERN.test(text)) return null;
  const paise = Math.round(Number(text) * 100);
  return paise > 0 ? paise : null;
}

/** Grams as the plain number a kg field holds: 12500 → "12.5". */
export function kgFieldValue(grams: number): string {
  return String(grams / 1000);
}

/** Paise as the plain number a rupee field holds: 1750 → "17.5". */
export function rupeeFieldValue(paise: number): string {
  return String(paise / 100);
}

// --- Prices -------------------------------------------------------------------

/**
 * A starting price for a new lot: today's market price, marked up for the
 * seller's step in the chain (CHAIN_MARKUP). Recycled material is already
 * priced at the factory gate, so it isn't marked up again. Rounded to 50
 * paise, like the demo prices.
 */
export function suggestedAskPaise(
  todayPaise: number | null | undefined,
  stage: "scrap" | "recycled",
  sellerKind: OrgKind,
): number | null {
  if (sellerKind === "manufacturer" || todayPaise == null || todayPaise <= 0) {
    return null;
  }
  const factor = stage === "recycled" ? 1 : CHAIN_MARKUP[sellerKind];
  return Math.max(50, Math.round((todayPaise * factor) / 50) * 50);
}

// --- Lots on the market -----------------------------------------------------------

export interface MaterialOption {
  code: string;
  label: string;
  count: number;
}

/**
 * The materials on sale, for the filter chips: each once, with how many lots
 * it has — the most lots first, then by name.
 */
export function materialOptions(
  listings: readonly Pick<ListingView, "material">[],
  nameOf: (names: Record<string, string>, code: string) => string,
): MaterialOption[] {
  const options: MaterialOption[] = [];
  for (const { material } of listings) {
    const option = options.find((known) => known.code === material.code);
    if (option) {
      option.count += 1;
      continue;
    }
    options.push({
      code: material.code,
      label: nameOf(material.names, material.code),
      count: 1,
    });
  }
  return options.toSorted(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

/** Recycled material first (what manufacturers come for), order kept otherwise. */
export function recycledFirst<T extends Pick<ListingView, "material">>(
  listings: readonly T[],
  recycled: ReadonlySet<string>,
): T[] {
  return listings.toSorted(
    (a, b) =>
      Number(recycled.has(b.material.code)) -
      Number(recycled.has(a.material.code)),
  );
}

/** True when a price is less than half or more than twice the suggestion. */
export function isFarFromSuggestion(
  paise: number | null,
  suggestion: number | null,
): boolean {
  return (
    paise !== null &&
    suggestion !== null &&
    (paise < suggestion / 2 || paise > suggestion * 2)
  );
}

// --- Trades ---------------------------------------------------------------------

export type StepState = "done" | "current" | "todo";

/**
 * Where a trade stands on its way to delivery: steps that happened, the one
 * it's waiting for, and the rest. A declined trade has no steps to show.
 */
export function stepStates(status: TradeStatus): StepState[] | null {
  if (status === "declined") return null;
  const reached = TRADE_STEPS.indexOf(status);
  return TRADE_STEPS.map((_, index) => {
    if (index <= reached) return "done";
    return index === reached + 1 ? "current" : "todo";
  });
}

export function isOpenTrade(status: TradeStatus): boolean {
  return status !== "completed" && status !== "declined";
}

type Ordered = Pick<TradeView, "status" | "actions" | "createdAt">;

function rank(trade: Ordered): number {
  if (trade.actions.length > 0) return 0;
  return isOpenTrade(trade.status) ? 1 : 2;
}

/** Trades that need me first, then those under way, then finished ones. */
export function byUrgency(a: Ordered, b: Ordered): number {
  return rank(a) - rank(b) || b.createdAt - a.createdAt;
}

/** When a trade reached a status, if it has. */
export function reachedAt(
  trade: Pick<TradeView, "timeline">,
  status: TradeStatus,
): number | null {
  return trade.timeline.find((entry) => entry.status === status)?.at ?? null;
}

export interface TradeTotals {
  /** Money held in escrow on my trades, either side. */
  escrowPaise: number;
  /** Trades waiting for a step from me. */
  waiting: number;
  /** Trades completed this calendar month, India time. */
  completedThisMonth: number;
  completedValuePaise: number;
}

export function tradeTotals(
  trades: readonly TradeView[],
  now: number,
): TradeTotals {
  const month = indiaToday(now).slice(0, 7);
  const totals: TradeTotals = {
    escrowPaise: 0,
    waiting: 0,
    completedThisMonth: 0,
    completedValuePaise: 0,
  };
  for (const trade of trades) {
    if (trade.inEscrow) totals.escrowPaise += trade.totalPaise;
    if (trade.actions.length > 0) totals.waiting += 1;
    const completedAt = reachedAt(trade, "completed");
    if (completedAt === null || !indiaToday(completedAt).startsWith(month)) {
      continue;
    }
    totals.completedThisMonth += 1;
    totals.completedValuePaise += trade.totalPaise;
  }
  return totals;
}
