import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { findProfile } from "./lib/applicationAccess";
import { priceProblem } from "./lib/review";
import { vFamily } from "./lib/validators";
import { vNames } from "./lib/views";

/**
 * The admin's price tables — docs/product/pricing.md. Per city and material:
 * the minimum a kabadiwala may pay households (the floor), and the fallback
 * used where a shop hasn't set a price. Integer paise per kilo.
 */

const MAX_MATERIALS = 200;
/** Rate cards holding one material: every shop in the pilot, with room. */
const MAX_RATE_CARDS = 2000;

function cityFrom(input: string): string {
  const city = input.trim();
  if (city.length < 2 || city.length > 60)
    throw new ConvexError("INVALID_CITY");
  return city;
}

/** Every material in catalogue order, with the city's floor and fallback. */
export const list = query({
  args: { city: v.string() },
  returns: v.array(
    v.object({
      code: v.string(),
      family: vFamily,
      stage: v.union(v.literal("scrap"), v.literal("recycled")),
      names: vNames,
      floorPaise: v.union(v.number(), v.null()),
      fallbackPaise: v.union(v.number(), v.null()),
      updatedAt: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const city = cityFrom(args.city);
    const materials = await ctx.db
      .query("materials")
      .withIndex("by_sortOrder")
      .take(MAX_MATERIALS);
    const rows = [];
    for (const material of materials) {
      if (!material.active) continue;
      const price = await ctx.db
        .query("referencePrices")
        .withIndex("by_city_material", (q) =>
          q.eq("city", city).eq("materialCode", material.code),
        )
        .first();
      rows.push({
        code: material.code,
        family: material.family,
        stage: material.stage,
        names: material.names,
        floorPaise: price?.floorPaise ?? null,
        fallbackPaise: price?.fallbackPaise ?? null,
        updatedAt: price?.updatedAt ?? null,
      });
    }
    return rows;
  },
});

/**
 * Sets one material's floor and fallback for a city. Raising the floor above
 * a shop's price lifts that price to the floor (docs/product/pricing.md,
 * rule 2); returns how many shop prices were lifted.
 */
export const set = mutation({
  args: {
    city: v.string(),
    materialCode: v.string(),
    floorPaise: v.number(),
    fallbackPaise: v.number(),
  },
  returns: v.object({ lifted: v.number() }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const city = cityFrom(args.city);
    const problem = priceProblem(args.floorPaise, args.fallbackPaise);
    if (problem) throw new ConvexError(problem);
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", args.materialCode))
      .first();
    if (!material) throw new ConvexError("UNKNOWN_MATERIAL");

    const adminProfile = await findProfile(ctx, admin._id);
    const actorProfileId = adminProfile?._id;
    const now = Date.now();
    const next = {
      floorPaise: args.floorPaise,
      fallbackPaise: args.fallbackPaise,
    };
    const current = await ctx.db
      .query("referencePrices")
      .withIndex("by_city_material", (q) =>
        q.eq("city", city).eq("materialCode", material.code),
      )
      .first();
    const isUnchanged =
      current?.floorPaise === next.floorPaise &&
      current.fallbackPaise === next.fallbackPaise;
    if (isUnchanged) return { lifted: 0 };

    // One row per city and material (the price board reads it as unique);
    // the audit log keeps every earlier value.
    let priceId: Id<"referencePrices">;
    if (current) {
      priceId = current._id;
      await ctx.db.patch("referencePrices", priceId, {
        ...next,
        updatedAt: now,
      });
    } else {
      priceId = await ctx.db.insert("referencePrices", {
        city,
        materialCode: material.code,
        ...next,
        updatedAt: now,
      });
    }

    const lifted = await liftRatesToFloor(ctx, {
      city,
      materialCode: material.code,
      floorPaise: next.floorPaise,
      actorProfileId,
      now,
    });

    await ctx.db.insert("auditLog", {
      actorProfileId,
      action: "referencePrice.updated",
      entityTable: "referencePrices",
      entityId: priceId,
      metadata: {
        city,
        materialCode: material.code,
        from: current
          ? {
              floorPaise: current.floorPaise,
              fallbackPaise: current.fallbackPaise,
            }
          : null,
        to: next,
        lifted,
      },
      createdAt: now,
    });
    return { lifted };
  },
});

/** Lifts every shop price in the city that's now under the floor. */
async function liftRatesToFloor(
  ctx: MutationCtx,
  change: {
    city: string;
    materialCode: string;
    floorPaise: number;
    actorProfileId: Id<"profiles"> | undefined;
    now: number;
  },
): Promise<number> {
  const rates = await ctx.db
    .query("rateCards")
    .withIndex("by_material", (q) => q.eq("materialCode", change.materialCode))
    .take(MAX_RATE_CARDS);
  const cityOf = new Map<Id<"orgs">, Doc<"orgs">["city"] | null>();
  let lifted = 0;
  for (const rate of rates) {
    if (rate.paisePerKg >= change.floorPaise) continue;
    if (!cityOf.has(rate.orgId)) {
      const org = await ctx.db.get("orgs", rate.orgId);
      cityOf.set(rate.orgId, org?.city ?? null);
    }
    if (cityOf.get(rate.orgId) !== change.city) continue;
    await ctx.db.patch("rateCards", rate._id, {
      paisePerKg: change.floorPaise,
      updatedAt: change.now,
    });
    await ctx.db.insert("auditLog", {
      orgId: rate.orgId,
      actorProfileId: change.actorProfileId,
      action: "rateCard.liftedToFloor",
      entityTable: "rateCards",
      entityId: rate._id,
      metadata: {
        materialCode: change.materialCode,
        from: rate.paisePerKg,
        to: change.floorPaise,
      },
      createdAt: change.now,
    });
    lifted += 1;
  }
  return lifted;
}
