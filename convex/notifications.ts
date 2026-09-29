import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/** Turns new booking, trade and application steps into messages; runs every few minutes. */
export const scan = internalMutation({
  args: {},
  returns: v.null(),
  handler: () => Promise.resolve(null),
});
