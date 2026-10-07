import { fixedDecimalInput } from "@/lib/number-input";

import { CHAIN_MARKUP } from "../../../convex/lib/catalogue";
import type { OrgKind } from "../../../convex/lib/chain";
import type { ListingView, TradeStatus, TradeView } from "./types";

/**
 * The market's screen rules, kept out of the components so they can be
 * tested on their own. Amounts stay integers: grams and paise.
 */

/** A listing's note, in characters — the same limit convex/market.ts checks. */
export const NOTE_MAX_LENGTH = 140;

// --- Reading what people type ---------------------------------------------------

/** Kilograms in the selected language to exact grams, above zero. */
export function parseKg(input: string, locale = "en"): number | null {
  const grams = fixedDecimalInput(input, 3, locale);
  return grams !== null && grams > 0 ? grams : null;
}

/** Rupees in the selected language to exact paise, above zero. */
export function parseRupees(input: string, locale = "en"): number | null {
  const paise = fixedDecimalInput(input, 2, locale);
  return paise !== null && paise > 0 ? paise : null;
}

/** Format integer digits without rounding at the safe-integer boundary. */
function scaledFieldValue(value: number, places: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(value)).padStart(places + 1, "0");
  let fraction = digits.slice(-places);
  while (fraction.endsWith("0")) fraction = fraction.slice(0, -1);
  const suffix = fraction ? "." + fraction : "";
  return `${sign}${digits.slice(0, -places)}${suffix}`;
}

/** Grams as the plain number a kg field holds: 12500 → "12.5". */
export function kgFieldValue(grams: number): string {
  return scaledFieldValue(grams, 3);
}

/** Paise as the plain number a rupee field holds: 1750 → "17.5". */
export function rupeeFieldValue(paise: number): string {
  return scaledFieldValue(paise, 2);
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

export function isOpenTrade(status: TradeStatus): boolean {
  return status !== "completed" && status !== "declined";
}

/** Only order decisions remain available before gateway checkout is connected. */
export function isAvailableTradeAction(action: TradeView["actions"][number]) {
  return action === "accept" || action === "decline";
}

type Ordered = Pick<TradeView, "status" | "actions" | "createdAt">;

function rank(trade: Ordered): number {
  if (trade.actions.some((action) => isAvailableTradeAction(action))) return 0;
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
  /** Accepted orders paused until a payment gateway is connected. */
  pendingGateway: number;
  /** Orders waiting for an accept or decline decision. */
  waiting: number;
}

export function tradeTotals(trades: readonly TradeView[]): TradeTotals {
  const totals: TradeTotals = {
    pendingGateway: 0,
    waiting: 0,
  };
  for (const trade of trades) {
    if (trade.status === "accepted") totals.pendingGateway += 1;
    if (trade.actions.some((action) => isAvailableTradeAction(action))) {
      totals.waiting += 1;
    }
  }
  return totals;
}
