import { ConvexError, v } from "convex/values";

import manifest from "../scripts/demo-seed/manifest.json";
import { manifestSchema } from "../scripts/demo-seed/model";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";

const KEY = "luma-green-demo-v2";
const LABEL = "DEMO — isolated examples, not live operations";
const countsValidator = v.object({
  businesses: v.number(),
  users: v.number(),
  bookings: v.number(),
  trades: v.number(),
  jobs: v.number(),
  prices: v.number(),
  support: v.number(),
});

/** No operational tables, auth identities, storage files or providers are used. */
export const seed = internalAction({
  args: {},
  returns: v.object({ changed: v.boolean(), checksum: v.string() }),
  handler: async (ctx): Promise<{ changed: boolean; checksum: string }> => {
    const data = manifestSchema.parse(manifest);
    const payload = JSON.stringify(data);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(payload),
    );
    const checksum = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const isChanged: boolean = await ctx.runMutation(
      internal.demoWorkspace.save,
      { payload, checksum },
    );
    return { changed: isChanged, checksum };
  },
});

export const save = internalMutation({
  args: { payload: v.string(), checksum: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (args.payload.length > 700_000 || !/^[a-f0-9]{64}$/u.test(args.checksum))
      throw new ConvexError("INVALID_DEMO_DATA");
    const parsed = manifestSchema.safeParse(JSON.parse(args.payload));
    if (!parsed.success) throw new ConvexError("INVALID_DEMO_DATA");
    // Only the repository's fixed synthetic manifest can enter this store.
    if (
      JSON.stringify(parsed.data) !==
      JSON.stringify(manifestSchema.parse(manifest))
    )
      throw new ConvexError("UNREVIEWED_DEMO_DATA");
    const existing = await ctx.db
      .query("demoWorkspaces")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    if (
      existing?.checksum === args.checksum &&
      existing.payload === args.payload
    )
      return false;
    const now = Date.now();
    const fields = {
      key: KEY,
      version: 1,
      label: LABEL,
      payload: args.payload,
      checksum: args.checksum,
      updatedAt: now,
    };
    const id =
      existing?._id ??
      (await ctx.db.insert("demoWorkspaces", { ...fields, createdAt: now }));
    if (existing) await ctx.db.patch("demoWorkspaces", existing._id, fields);
    await ctx.db.insert("auditLog", {
      action: "demo.workspace.seeded",
      entityTable: "demoWorkspaces",
      entityId: id,
      metadata: { key: KEY, checksum: args.checksum, operationalWrites: false },
      createdAt: now,
    });
    return true;
  },
});

export const preview = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      label: v.string(),
      checksum: v.string(),
      updatedAt: v.number(),
      counts: countsValidator,
      businesses: v.array(
        v.object({ name: v.string(), kind: v.string(), family: v.string() }),
      ),
      gaps: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("demoWorkspaces")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    if (!row) return null;
    const data = manifestSchema.parse(JSON.parse(row.payload));
    return {
      label: row.label,
      checksum: row.checksum,
      updatedAt: row.updatedAt,
      counts: {
        businesses: data.businesses.length,
        users: data.users.length,
        bookings: data.bookings.length,
        trades: data.trades.length,
        jobs: data.jobs.length,
        prices: data.prices.length,
        support: data.support.length,
      },
      businesses: data.businesses
        .slice(0, 48)
        .map(({ name, kind, family }) => ({ name, kind, family })),
      gaps: data.gaps.map((gap) => gap.detail),
    };
  },
});
