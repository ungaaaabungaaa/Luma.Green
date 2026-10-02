import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Global provider spending bound; reservations survive a failed or timed-out fetch. */
export const reserveQuota = internalMutation({
  args: { dailyLimit: v.number() },
  returns: v.boolean(),
  handler: async (ctx, { dailyLimit }) => {
    if (
      !Number.isSafeInteger(dailyLimit) ||
      dailyLimit < 1 ||
      dailyLimit > 1000
    )
      return false;
    const now = Date.now();
    const quota = await ctx.db
      .query("integrationNewsQuota")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    const isCurrent = quota && now < quota.startedAt + DAY_MS;
    const count = isCurrent ? quota.count : 0;
    if (count >= dailyLimit) return false;
    const next = {
      key: "global" as const,
      startedAt: isCurrent ? quota.startedAt : now,
      count: count + 1,
    };
    const id = quota
      ? quota._id
      : await ctx.db.insert("integrationNewsQuota", next);
    if (quota) await ctx.db.patch("integrationNewsQuota", quota._id, next);
    await ctx.db.insert("auditLog", {
      action: "integration.news_provider_requested",
      entityTable: "integrationNewsQuota",
      entityId: id,
      createdAt: now,
    });
    return true;
  },
});
