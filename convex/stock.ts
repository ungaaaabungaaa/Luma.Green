import { v } from "convex/values";

import { query, type QueryCtx } from "./_generated/server";
import { buyerKindFor, paiseFor } from "./lib/chain";
import { indiaToday } from "./lib/onboarding";
import { vOrgKind } from "./lib/validators";
import { vMaterialRef } from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";

/**
 * Stock on hand at a business — docs/architecture/data-model.md. Pickups
 * (convex/shop.ts) and trades add and remove grams; this file only reads.
 */

/** The market price on `date`: the latest one on or before it, if any. */
export async function marketPriceOn(
  ctx: QueryCtx,
  city: string,
  materialCode: string,
  date: string,
) {
  return ctx.db
    .query("marketPrices")
    .withIndex("by_city_material_date", (q) =>
      q.eq("city", city).eq("materialCode", materialCode).lte("date", date),
    )
    .order("desc")
    .first();
}

const vStage = v.union(v.literal("scrap"), v.literal("recycled"));

/**
 * `/app/stock` for every kind of business: what's on hand per material, its
 * worth at today's market price, and the totals. Largest value first.
 */
export const mine = query({
  args: {},
  returns: v.object({
    kind: vOrgKind,
    /** Who this business sells to; null when nobody further up buys. */
    buyerKind: v.union(vOrgKind, v.null()),
    rows: v.array(
      v.object({
        material: vMaterialRef,
        stage: vStage,
        grams: v.number(),
        /** Per kg today; null when the city has no price for it yet. */
        marketPaise: v.union(v.number(), v.null()),
        valuePaise: v.union(v.number(), v.null()),
        updatedAt: v.number(),
      }),
    ),
    totalGrams: v.number(),
    /** Sum of the rows that have a market price. */
    totalValuePaise: v.number(),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const today = indiaToday();
    const materials = await materialIndex(ctx);
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(200);

    const rows = [];
    for (const item of inventory) {
      if (item.grams <= 0) continue;
      const material = materials.get(item.materialCode);
      const market = await marketPriceOn(
        ctx,
        org.city,
        item.materialCode,
        today,
      );
      const marketPaise = market?.paisePerKg ?? null;
      rows.push({
        material: {
          code: item.materialCode,
          names: material?.names ?? { en: item.materialCode },
          family: material?.family ?? "other",
        },
        stage: material?.stage ?? "scrap",
        grams: item.grams,
        marketPaise,
        valuePaise:
          marketPaise === null ? null : paiseFor(item.grams, marketPaise),
        updatedAt: item.updatedAt,
      });
    }
    const sorted = rows.toSorted(
      (a, b) => (b.valuePaise ?? 0) - (a.valuePaise ?? 0) || b.grams - a.grams,
    );

    return {
      kind: org.kind,
      buyerKind: buyerKindFor(org.kind),
      rows: sorted,
      totalGrams: sorted.reduce((sum, row) => sum + row.grams, 0),
      totalValuePaise: sorted.reduce(
        (sum, row) => sum + (row.valuePaise ?? 0),
        0,
      ),
    };
  },
});
