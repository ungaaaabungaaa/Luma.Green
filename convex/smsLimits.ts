import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { SMS_DAY_MS, smsAllowance } from "./lib/smsLimits";

/** Reserves a request atomically before Better Auth creates or sends a code. */
export const reserve = internalMutation({
  args: { phoneHash: v.string() },
  returns: v.object({ allowed: v.boolean(), retryAfterSeconds: v.number() }),
  handler: async (ctx, { phoneHash }) => {
    if (!/^[a-f\d]{64}$/.test(phoneHash))
      throw new ConvexError("INVALID_PHONE_HASH");
    const now = Date.now();
    const row = await ctx.db
      .query("smsRateLimits")
      .withIndex("by_phone_hash", (q) => q.eq("phoneHash", phoneHash))
      .unique();
    const allowance = smsAllowance(row?.sentAt ?? [], now);
    if (allowance.allowed) {
      const sentAt = [...allowance.recent, now];
      const id = row
        ? (await ctx.db.patch(row._id, { sentAt }), row._id)
        : await ctx.db.insert("smsRateLimits", { phoneHash, sentAt });
      await ctx.scheduler.runAfter(SMS_DAY_MS, internal.smsLimits.expire, {
        id,
      });
    }
    return {
      allowed: allowance.allowed,
      retryAfterSeconds: allowance.retryAfterSeconds,
    };
  },
});

/** Remove an inactive limiter; old timers never delete a newer reservation. */
export const expire = internalMutation({
  args: { id: v.id("smsRateLimits") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (row?.sentAt.every((at) => at <= Date.now() - SMS_DAY_MS)) {
      await ctx.db.delete(id);
    }
    return null;
  },
});
