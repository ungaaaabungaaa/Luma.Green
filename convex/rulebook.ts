import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/** Daily reminders from the compliance calendar (consents, scales, filings). */
export const reminders = internalMutation({
  args: {},
  returns: v.null(),
  handler: () => Promise.resolve(null),
});
