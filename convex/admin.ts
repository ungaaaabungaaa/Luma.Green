import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireAdmin } from "./lib/access";

const RECENT_SIGN_INS = 20;

/**
 * The admin home: the newest people to sign in, so the pilot team can see
 * testers arrive. Admin only, authenticator required.
 */
export const overview = query({
  args: {},
  returns: v.object({
    recentSignIns: v.array(
      v.object({
        id: v.id("profiles"),
        phone: v.optional(v.string()),
        locale: v.string(),
        createdAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const newest = await ctx.db
      .query("profiles")
      .order("desc")
      .take(RECENT_SIGN_INS);
    return {
      recentSignIns: newest
        .filter((profile) => profile.kind === "member")
        .map((profile) => ({
          id: profile._id,
          phone: profile.phone,
          locale: profile.locale,
          createdAt: profile.createdAt,
        })),
    };
  },
});
