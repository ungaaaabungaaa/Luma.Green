import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { advanceOffer } from "./lib/dispatch";

/** Each timer belongs to one offer. Stale, early and repeated calls do nothing. */
export const expireOffer = internalMutation({
  args: { bookingId: v.id("bookings"), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get("bookings", args.bookingId);
    const now = Date.now();
    if (
      booking?.status === "requested" &&
      booking.dispatch?.attempt === args.attempt &&
      booking.dispatch.expiresAt !== undefined &&
      booking.dispatch.expiresAt <= now
    ) {
      await advanceOffer(ctx, booking, "timed_out", now);
    }
    return null;
  },
});
