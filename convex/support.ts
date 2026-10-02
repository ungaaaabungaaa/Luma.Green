import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { normalizeIndianMobile } from "./lib/phone";
import { currentProfile } from "./lib/workspace";

const SUPPORT_HOUR_MS = 60 * 60 * 1000;
const SUPPORT_HOURLY_LIMIT = 3;

const TOPICS = [
  "account",
  "pickup",
  "prices",
  "payments",
  "documents",
  "trade",
  "solar",
  "other",
] as const;

const vTopic = v.union(
  v.literal("account"),
  v.literal("pickup"),
  v.literal("prices"),
  v.literal("payments"),
  v.literal("documents"),
  v.literal("trade"),
  v.literal("solar"),
  v.literal("other"),
);

const vRole = v.union(
  v.literal("household"),
  v.literal("kabadiwala"),
  v.literal("yard"),
  v.literal("recycler"),
  v.literal("manufacturer"),
  v.literal("saathi"),
  v.literal("other"),
);

/**
 * A message to the team from the help centre or the solar page. Open to
 * anyone — people who can't sign in are the ones who most need to ask.
 */
export const send = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    role: vRole,
    topic: vTopic,
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new ConvexError("INVALID_NAME");
    }
    const phone = normalizeIndianMobile(args.phone);
    if (!phone) throw new ConvexError("INVALID_PHONE");
    const message = args.message.trim();
    if (message.length < 5 || message.length > 1000) {
      throw new ConvexError("INVALID_MESSAGE");
    }
    const now = Date.now();
    const recent = await ctx.db
      .query("supportRequests")
      .withIndex("by_phone_createdAt", (q) =>
        q.eq("phone", phone).gt("createdAt", now - SUPPORT_HOUR_MS),
      )
      .take(SUPPORT_HOURLY_LIMIT);
    if (recent.length >= SUPPORT_HOURLY_LIMIT) {
      throw new ConvexError("SUPPORT_RATE_LIMITED");
    }
    const profile = await currentProfile(ctx);
    const requestId = await ctx.db.insert("supportRequests", {
      profileId: profile?._id,
      name,
      phone,
      role: args.role,
      topic: args.topic,
      message,
      status: "open",
      createdAt: now,
    });
    await ctx.db.insert("auditLog", {
      actorProfileId: profile?._id,
      action: "support.created",
      entityTable: "supportRequests",
      entityId: requestId,
      createdAt: now,
    });
    return null;
  },
});

/** The admin's inbox, newest first. */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("supportRequests"),
      name: v.string(),
      phone: v.string(),
      role: v.string(),
      topic: v.string(),
      message: v.string(),
      status: v.union(v.literal("open"), v.literal("answered")),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("supportRequests").order("desc").take(200);
    return rows.map((row) => ({
      id: row._id,
      name: row.name,
      phone: row.phone,
      role: row.role,
      topic: row.topic,
      message: row.message,
      status: row.status,
      createdAt: row.createdAt,
    }));
  },
});

export const markAnswered = mutation({
  args: { id: v.id("supportRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("supportRequests", args.id);
    if (!row) throw new ConvexError("NOT_FOUND");
    if (row.status === "answered") return null;
    const profile = await currentProfile(ctx);
    await ctx.db.patch("supportRequests", args.id, { status: "answered" });
    await ctx.db.insert("auditLog", {
      actorProfileId: profile?._id,
      action: "support.answered",
      entityTable: "supportRequests",
      entityId: args.id,
      createdAt: Date.now(),
    });
    return null;
  },
});

export { TOPICS as SUPPORT_TOPICS };
