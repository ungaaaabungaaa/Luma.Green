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

/** Exact integer-paisa pricing, or null when the inputs/result are unsafe. */
export function safePaiseFor(grams: number, paisePerKg: number): number | null {
  if (!Number.isSafeInteger(grams) || !Number.isSafeInteger(paisePerKg))
    return null;
  const product = BigInt(grams) * BigInt(paisePerKg);
  // Preserve Math.round's half-toward-positive-infinity rule, including refunds.
  // eslint-disable-next-line unicorn/prefer-bigint-literals -- ES2017 TypeScript source target forbids BigInt literals; the runtime supports the constructor.
  const scale = BigInt(1000);
  const rounded = (product + BigInt(product >= 0 ? 500 : -499)) / scale;
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  if (rounded > limit || rounded < -limit) return null;
  const amount = Number(rounded);
  return amount === 0 && product < 0 ? -0 : amount;
}

/** Pricing for already validated amounts. Never return an imprecise total. */
export function paiseFor(grams: number, paisePerKg: number): number {
  const amount = safePaiseFor(grams, paisePerKg);
  if (amount === null)
    throw new RangeError("Money values must be safe integers.");
  return amount;
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

// --- Trades (business to business, gateway required) ----------------------

export type TradeStatus =
  | "requested"
  | "accepted"
  | "paid_to_escrow"
  | "dispatched"
  | "completed"
  | "declined";

export type TradeAction = "accept" | "decline" | "pay" | "dispatch" | "confirm";

/**
 * Old payment, dispatch and completion statuses remain readable. No caller
 * may reach them through a user action until a gateway verifies payment.
 */
const TRADE_ACTIONS: Partial<
  Record<
    TradeAction,
    { from: TradeStatus; to: TradeStatus; by: "buyer" | "seller" }
  >
> = {
  accept: { from: "requested", to: "accepted", by: "seller" },
  decline: { from: "requested", to: "declined", by: "seller" },
};

export type PaymentVerification =
  "not_applicable" | "gateway_required" | "legacy_unverified";

/** A status alone never proves that money reached a gateway. */
export function paymentVerificationFor(
  status: TradeStatus,
): PaymentVerification {
  switch (status) {
    case "accepted": {
      return "gateway_required";
    }
    case "paid_to_escrow":
    case "dispatched":
    case "completed": {
      return "legacy_unverified";
    }
    case "requested":
    case "declined": {
      return "not_applicable";
    }
  }
}

/** The status an action leads to, or null if this side can't take it now. */
export function tradeStep(
  status: TradeStatus,
  action: TradeAction,
  side: "buyer" | "seller",
): TradeStatus | null {
  const step = TRADE_ACTIONS[action];
  return step?.from === status && step.by === side ? step.to : null;
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

/** Legacy simulated status is not evidence of funds held by Luma or a gateway. */
export function isInEscrow(_status: TradeStatus): boolean {
  return false;
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
