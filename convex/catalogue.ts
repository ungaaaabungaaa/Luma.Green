import { v } from "convex/values";

import { query } from "./_generated/server";
import { shiftDate } from "./lib/dates";
import { indiaToday } from "./lib/onboarding";
import { vFamily } from "./lib/validators";
import { vNames } from "./lib/views";

/** The material catalogue — public: it's the shared code list. */
export const materials = query({
  args: {},
  returns: v.array(
    v.object({
      code: v.string(),
      family: vFamily,
      stage: v.union(v.literal("scrap"), v.literal("recycled")),
      names: vNames,
      co2eFactor: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("materials")
      .withIndex("by_sortOrder")
      .collect();
    return rows
      .filter((row) => row.active)
      .map((row) => ({
        code: row.code,
        family: row.family,
        stage: row.stage,
        names: row.names,
        co2eFactor: row.co2eFactor,
      }));
  },
});

/**
 * The public price board for a city: today's price per material, the change
 * over a week, the admin's floor, and 30 days of history for the chart.
 */
export const priceBoard = query({
  args: { city: v.string() },
  returns: v.object({
    city: v.string(),
    date: v.union(v.string(), v.null()),
    rows: v.array(
      v.object({
        code: v.string(),
        family: vFamily,
        stage: v.union(v.literal("scrap"), v.literal("recycled")),
        names: vNames,
        todayPaise: v.union(v.number(), v.null()),
        weekChangePct: v.union(v.number(), v.null()),
        floorPaise: v.union(v.number(), v.null()),
        series: v.array(v.object({ date: v.string(), paisePerKg: v.number() })),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const materials = await ctx.db
      .query("materials")
      .withIndex("by_sortOrder")
      .collect();
    const since = shiftDate(indiaToday(), -29);
    let latest: string | null = null;
    const rows = [];
    for (const material of materials) {
      if (!material.active) continue;
      const series = await ctx.db
        .query("marketPrices")
        .withIndex("by_city_material_date", (q) =>
          q
            .eq("city", args.city)
            .eq("materialCode", material.code)
            .gte("date", since),
        )
        .collect();
      const reference = await ctx.db
        .query("referencePrices")
        .withIndex("by_city_material", (q) =>
          q.eq("city", args.city).eq("materialCode", material.code),
        )
        .unique();
      const last = series.at(-1);
      const weekAgo = series.at(-8);
      if (last && (latest === null || last.date > latest)) latest = last.date;
      rows.push({
        code: material.code,
        family: material.family,
        stage: material.stage,
        names: material.names,
        todayPaise: last?.paisePerKg ?? null,
        weekChangePct:
          last && weekAgo
            ? Math.round(
                ((last.paisePerKg - weekAgo.paisePerKg) / weekAgo.paisePerKg) *
                  1000,
              ) / 10
            : null,
        floorPaise: reference?.floorPaise ?? null,
        series: series.map((point) => ({
          date: point.date,
          paisePerKg: point.paisePerKg,
        })),
      });
    }
    return { city: args.city, date: latest, rows };
  },
});
