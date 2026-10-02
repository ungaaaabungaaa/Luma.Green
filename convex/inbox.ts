import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { vNotificationEvent } from "./lib/notificationConfig";
import { pushAudit, requireNotificationProfile } from "./lib/push";

const item = v.object({
  id: v.id("inbox"),
  event: vNotificationEvent,
  read: v.boolean(),
  createdAt: v.number(),
});

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(item),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const profile = await requireNotificationProfile(ctx);
    const result = await ctx.db
      .query("inbox")
      .withIndex("by_profile_created", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.max(1, Math.min(50, args.paginationOpts.numItems)),
      });
    return {
      isDone: result.isDone,
      continueCursor: result.continueCursor,
      page: result.page.map((row) => ({
        id: row._id,
        event: row.event,
        read: row.read,
        createdAt: row.createdAt,
      })),
    };
  },
});

export const unreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const profile = await requireNotificationProfile(ctx);
    const rows = await ctx.db
      .query("inbox")
      .withIndex("by_profile_read", (q) =>
        q.eq("profileId", profile._id).eq("read", false),
      )
      .take(100);
    return rows.length;
  },
});

export const markRead = mutation({
  args: { id: v.id("inbox") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const profile = await requireNotificationProfile(ctx);
    const row = await ctx.db.get("inbox", id);
    if (row?.profileId !== profile._id) throw new ConvexError("NOT_FOUND");
    if (!row.read) {
      await ctx.db.patch(id, { read: true });
      await pushAudit(ctx, "inbox.read", "inbox", id, profile._id);
    }
    return null;
  },
});

/** One button press changes at most 100 entries; the count drives another batch. */
export const markAllRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const profile = await requireNotificationProfile(ctx);
    const rows = await ctx.db
      .query("inbox")
      .withIndex("by_profile_read", (q) =>
        q.eq("profileId", profile._id).eq("read", false),
      )
      .take(100);
    for (const row of rows) await ctx.db.patch(row._id, { read: true });
    if (rows.length > 0)
      await pushAudit(
        ctx,
        "inbox.read_batch",
        "profiles",
        profile._id,
        profile._id,
      );
    return null;
  },
});
