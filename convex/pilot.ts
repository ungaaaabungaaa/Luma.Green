import { ConvexError, v } from "convex/values";

import { query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { applicationMetrics, bookingMetrics } from "./lib/pilot";

/** A bounded pilot report. Larger cohorts must be split into shorter periods. */
export const PILOT_SAMPLE_LIMIT = 1000;
const MAX_PERIOD_MS = 31 * 24 * 60 * 60 * 1000;

export const summary = query({
  args: { from: v.number(), to: v.number() },
  returns: v.object({
    from: v.number(),
    to: v.number(),
    sampleLimit: v.number(),
    bookingsTruncated: v.boolean(),
    applicationsTruncated: v.boolean(),
    bookings: v.object({
      count: v.number(),
      outcomes: v.object({
        requested: v.number(),
        accepted: v.number(),
        on_the_way: v.number(),
        completed: v.number(),
        declined: v.number(),
        cancelled: v.number(),
      }),
      acceptedCount: v.number(),
      averageAcceptMs: v.union(v.number(), v.null()),
      reassignedCount: v.number(),
      completedWithReceipt: v.number(),
      paidPaise: v.number(),
      estimatedPaise: v.number(),
      weighedGrams: v.number(),
      materials: v.array(
        v.object({
          code: v.string(),
          estimatedGrams: v.number(),
          weighedGrams: v.number(),
        }),
      ),
    }),
    applications: v.object({
      count: v.number(),
      decidedCount: v.number(),
      awaitingDecisionCount: v.number(),
      averageDecisionMs: v.union(v.number(), v.null()),
    }),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (
      !Number.isSafeInteger(args.from) ||
      !Number.isSafeInteger(args.to) ||
      args.from < 0 ||
      args.to <= args.from ||
      args.to - args.from > MAX_PERIOD_MS
    )
      throw new ConvexError("INVALID_PERIOD");
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_createdAt", (q) =>
        q.gte("createdAt", args.from).lt("createdAt", args.to),
      )
      .order("desc")
      .take(PILOT_SAMPLE_LIMIT + 1);
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_submittedAt", (q) =>
        q.gte("submittedAt", args.from).lt("submittedAt", args.to),
      )
      .order("desc")
      .take(PILOT_SAMPLE_LIMIT + 1);
    return {
      ...args,
      sampleLimit: PILOT_SAMPLE_LIMIT,
      bookingsTruncated: bookings.length > PILOT_SAMPLE_LIMIT,
      applicationsTruncated: applications.length > PILOT_SAMPLE_LIMIT,
      bookings: bookingMetrics(bookings.slice(0, PILOT_SAMPLE_LIMIT)),
      applications: applicationMetrics(
        applications.slice(0, PILOT_SAMPLE_LIMIT),
      ),
    };
  },
});
