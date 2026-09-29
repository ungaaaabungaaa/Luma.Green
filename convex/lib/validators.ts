import { v } from "convex/values";

/** Validators shared by the schema and the functions. */

export const vOrgKind = v.union(
  v.literal("kabadiwala"),
  v.literal("yard"),
  v.literal("recycler"),
  v.literal("manufacturer"),
);

export const vFamily = v.union(
  v.literal("paper"),
  v.literal("plastic"),
  v.literal("metal"),
  v.literal("glass"),
  v.literal("ewaste"),
  v.literal("other"),
);

export const vBookingStatus = v.union(
  v.literal("requested"),
  v.literal("accepted"),
  v.literal("on_the_way"),
  v.literal("completed"),
  v.literal("declined"),
  v.literal("cancelled"),
);

export const vTradeStatus = v.union(
  v.literal("requested"),
  v.literal("accepted"),
  v.literal("paid_to_escrow"),
  v.literal("dispatched"),
  v.literal("completed"),
  v.literal("declined"),
);
