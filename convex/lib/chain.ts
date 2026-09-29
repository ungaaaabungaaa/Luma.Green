/**
 * The rules of the chain: who sells to whom, what a booking or a trade can
 * move to next, and the money arithmetic. Pure functions, shared by Convex
 * and the screens.
 */

export type OrgKind = "kabadiwala" | "yard" | "recycler" | "manufacturer";

/** Who buys what each kind of business sells. */
const BUYER_OF: Record<OrgKind, OrgKind | null> = {
  kabadiwala: "yard",
  yard: "recycler",
  recycler: "manufacturer",
  manufacturer: null,
};

/** The kind of business whose listings a buyer sees. */
export function sellerKindFor(buyer: OrgKind): OrgKind | null {
  const entry = Object.entries(BUYER_OF).find(([, next]) => next === buyer);
  return entry ? (entry[0] as OrgKind) : null;
}

export function buyerKindFor(seller: OrgKind): OrgKind | null {
  return BUYER_OF[seller];
}

// --- Money ---------------------------------------------------------------

/** What `grams` cost at `paisePerKg`, rounded to the paisa. */
export function paiseFor(grams: number, paisePerKg: number): number {
  return Math.round((grams * paisePerKg) / 1000);
}

export function kgToGrams(kg: number): number {
  return Math.round(kg * 1000);
}

/** One point per ₹10 earned, as the household's thank-you. */
export function pointsFor(totalPaise: number): number {
  return Math.floor(totalPaise / 1000);
}

// --- Bookings (household pickups) ---------------------------------------

export type BookingStatus =
  | "requested"
  | "accepted"
  | "on_the_way"
  | "completed"
  | "declined"
  | "cancelled";

const BOOKING_NEXT: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["accepted", "declined", "cancelled"],
  accepted: ["on_the_way", "completed", "cancelled"],
  on_the_way: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
};

export function canMoveBooking(from: BookingStatus, to: BookingStatus) {
  return BOOKING_NEXT[from].includes(to);
}

// --- Trades (business to business, escrow) --------------------------------

export type TradeStatus =
  | "requested"
  | "accepted"
  | "paid_to_escrow"
  | "dispatched"
  | "completed"
  | "declined";

export type TradeAction = "accept" | "decline" | "pay" | "dispatch" | "confirm";

/** Which side acts at each step, and where the action takes the trade. */
const TRADE_ACTIONS: Record<
  TradeAction,
  { from: TradeStatus; to: TradeStatus; by: "buyer" | "seller" }
> = {
  accept: { from: "requested", to: "accepted", by: "seller" },
  decline: { from: "requested", to: "declined", by: "seller" },
  pay: { from: "accepted", to: "paid_to_escrow", by: "buyer" },
  dispatch: { from: "paid_to_escrow", to: "dispatched", by: "seller" },
  confirm: { from: "dispatched", to: "completed", by: "buyer" },
};

/** The status an action leads to, or null if this side can't take it now. */
export function tradeStep(
  status: TradeStatus,
  action: TradeAction,
  side: "buyer" | "seller",
): TradeStatus | null {
  const step = TRADE_ACTIONS[action];
  return step.from === status && step.by === side ? step.to : null;
}

/** The actions open to one side of a trade right now. */
export function tradeActionsFor(
  status: TradeStatus,
  side: "buyer" | "seller",
): TradeAction[] {
  return (Object.keys(TRADE_ACTIONS) as TradeAction[]).filter(
    (action) => tradeStep(status, action, side) !== null,
  );
}

/** Money is in escrow from payment until the buyer confirms delivery. */
export function isInEscrow(status: TradeStatus): boolean {
  return status === "paid_to_escrow" || status === "dispatched";
}

/**
 * GST e-way bills are needed to move goods worth more than ₹50,000 (the
 * general limit; some states differ).
 */
export const EWAY_BILL_LIMIT_PAISE = 50_000 * 100;

export function requiresEwayBill(totalPaise: number): boolean {
  return totalPaise > EWAY_BILL_LIMIT_PAISE;
}

/** A readable, unguessable token for a booking's tracking link. */
export function bookingToken(random: () => number): string {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz"; // no 0/o, 1/l/i
  let token = "";
  for (let index = 0; index < 10; index += 1) {
    token += alphabet[Math.floor(random() * alphabet.length)];
  }
  return token;
}
