import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/** The daily price calculation (06:00 IST); registered in convex/crons.ts. */
export const daily = internalMutation({
  args: {},
  returns: v.null(),
  handler: () => Promise.resolve(null),
});
