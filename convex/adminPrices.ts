import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { findProfile } from "./lib/applicationAccess";
import {
  type Band,
  bandProblem,
  isInBand,
  orgValues,
  requiresNote,
  SUGGEST_WINDOW_DAYS,
  suggestedFallback,
  suggestedFloor,
} from "./lib/priceMath";
import { priceProblem } from "./lib/review";
import { vFamily } from "./lib/validators";
import { vNames } from "./lib/views";
import { vBoardStatus } from "./tables/priceEngine";

/**
 * The admin's price tables — docs/product/pricing.md and the price engine
 * spec v0.1 §3. Per city and material: the minimum a kabadiwala may pay
 * households (the floor), the fallback used where a shop hasn't set a price
 * and the board shows as Guide, and the plausible band the engine keeps
 * observations inside. The console suggests values (fallback = 28-day
 * median, floor = 75% of it); the admin decides, and a move over 10% needs a
 * written reason. Integer paise per kilo.
 */

const MAX_MATERIALS = 200;
/** Rate cards holding one material: every shop in the pilot, with room. */
const MAX_RATE_CARDS = 2000;
const MAX_OBSERVATIONS = 2000;
/** One CSV paste covers the whole catalogue, with room. */
const MAX_IMPORT_ROWS = 200;
const NOTE_MIN_CHARS = 5;
const NOTE_MAX_CHARS = 200;
const DAY = 24 * 60 * 60 * 1000;

const vBand = v.object({
  minPaise: v.number(),
  maxPaise: v.number(),
  maxDailyMovePct: v.number(),
});

type Via = "form" | "csv";

function cityFrom(input: string): string {
  const city = input.trim();
  if (city.length < 2 || city.length > 60)
    throw new ConvexError("INVALID_CITY");
  return city;
}

/** A trimmed note, or none; too long is refused. */
function noteFrom(input: string | undefined): string | undefined {
  const note = input?.trim() ?? "";
  if (note.length > NOTE_MAX_CHARS) throw new ConvexError("NOTE_TOO_LONG");
  return note.length >= NOTE_MIN_CHARS ? note : undefined;
}

async function materialByCode(ctx: QueryCtx, code: string) {
  return ctx.db
    .query("materials")
    .withIndex("by_code", (q) => q.eq("code", code))
    .first();
}

async function referenceFor(ctx: QueryCtx, city: string, materialCode: string) {
  return ctx.db
    .query("referencePrices")
    .withIndex("by_city_material", (q) =>
      q.eq("city", city).eq("materialCode", materialCode),
    )
    .first();
}

async function bandRowFor(ctx: QueryCtx, city: string, materialCode: string) {
  return ctx.db
    .query("priceBands")
    .withIndex("by_city_material", (q) =>
      q.eq("city", city).eq("materialCode", materialCode),
    )
    .first();
}

function toBand(row: Doc<"priceBands"> | null): Band | null {
  return row
    ? {
        minPaise: row.minPaise,
        maxPaise: row.maxPaise,
        maxDailyMovePct: row.maxDailyMovePct,
      }
    : null;
}

/**
 * Spec §3: the suggested fallback is the 28-day median of household (L1)
 * values inside the band, one value per business; the floor is 75% of it.
 */
async function suggestionFor(
  ctx: QueryCtx,
  city: string,
  materialCode: string,
  band: Band | null,
  now: number,
): Promise<{
  fallbackPaise: number | null;
  floorPaise: number | null;
  orgs: number;
}> {
  const rows = await ctx.db
    .query("priceObservations")
    .withIndex("by_city_material_level_observedAt", (q) =>
      q
        .eq("city", city)
        .eq("materialCode", materialCode)
        .eq("level", "L1")
        .gte("observedAt", now - SUGGEST_WINDOW_DAYS * DAY),
    )
    .take(MAX_OBSERVATIONS);
  const values = orgValues(
    rows
      .filter((row) => isInBand(row.paisePerKg, band))
      .map((row) => ({
        orgId: row.orgId,
        paisePerKg: row.paisePerKg,
        source: row.source,
        grams: row.grams,
      })),
  );
  const fallbackPaise = suggestedFallback(
    values.map((value) => value.paisePerKg),
  );
  return {
    fallbackPaise,
    floorPaise: fallbackPaise === null ? null : suggestedFloor(fallbackPaise),
    orgs: values.length,
  };
}

/** Every material in catalogue order, with the city's floor, fallback, band and suggestion. */
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
      band: v.union(vBand, v.null()),
      /** 28-day median of household values (one per business), and 75% of it. */
      suggestedFallbackPaise: v.union(v.number(), v.null()),
      suggestedFloorPaise: v.union(v.number(), v.null()),
      /** How many businesses the suggestion rests on. */
      suggestionOrgs: v.number(),
      /** The engine's latest household line, when it has published one. */
      boardStatus: v.union(vBoardStatus, v.null()),
      boardTypicalPaise: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const city = cityFrom(args.city);
    const now = Date.now();
    const materials = await ctx.db
      .query("materials")
      .withIndex("by_sortOrder")
      .take(MAX_MATERIALS);
    const rows = [];
    for (const material of materials) {
      if (!material.active) continue;
      const price = await referenceFor(ctx, city, material.code);
      const band = toBand(await bandRowFor(ctx, city, material.code));
      const isScrap = material.stage === "scrap";
      const suggestion = isScrap
        ? await suggestionFor(ctx, city, material.code, band, now)
        : { fallbackPaise: null, floorPaise: null, orgs: 0 };
      const board = isScrap
        ? await ctx.db
            .query("priceBoards")
            .withIndex("by_city_material_level_date", (q) =>
              q
                .eq("city", city)
                .eq("materialCode", material.code)
                .eq("level", "L1"),
            )
            .order("desc")
            .first()
        : null;
      rows.push({
        code: material.code,
        family: material.family,
        stage: material.stage,
        names: material.names,
        floorPaise: price?.floorPaise ?? null,
        fallbackPaise: price?.fallbackPaise ?? null,
        updatedAt: price?.updatedAt ?? null,
        band,
        suggestedFallbackPaise: suggestion.fallbackPaise,
        suggestedFloorPaise: suggestion.floorPaise,
        suggestionOrgs: suggestion.orgs,
        boardStatus: board?.status ?? null,
        boardTypicalPaise: board?.typicalPaise ?? null,
      });
    }
    return rows;
  },
});

// --- Saving a floor and fallback ------------------------------------------------

interface PriceChange {
  city: string;
  material: Doc<"materials">;
  floorPaise: number;
  fallbackPaise: number;
  note: string | undefined;
  via: Via;
  actorProfileId: Id<"profiles"> | undefined;
  now: number;
}

/**
 * One material's new floor and fallback: refused without a note when either
 * moves over 10%; unchanged values do nothing. Raising the floor above a
 * shop's price lifts that price to the floor (docs/product/pricing.md,
 * rule 2). Every save keeps the old values in the audit log.
 */
async function applyReferencePrice(
  ctx: MutationCtx,
  change: PriceChange,
): Promise<{ isChanged: boolean; lifted: number }> {
  const { city, material, now } = change;
  const next = {
    floorPaise: change.floorPaise,
    fallbackPaise: change.fallbackPaise,
  };
  const current = await referenceFor(ctx, city, material.code);
  const isUnchanged =
    current?.floorPaise === next.floorPaise &&
    current.fallbackPaise === next.fallbackPaise;
  if (isUnchanged) return { isChanged: false, lifted: 0 };

  const isBigMove =
    requiresNote(current?.floorPaise ?? null, next.floorPaise) ||
    requiresNote(current?.fallbackPaise ?? null, next.fallbackPaise);
  if (isBigMove && change.note === undefined) {
    throw new ConvexError("NOTE_REQUIRED");
  }

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
    actorProfileId: change.actorProfileId,
    now,
  });

  await ctx.db.insert("auditLog", {
    actorProfileId: change.actorProfileId,
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
      note: change.note,
      via: change.via,
    },
    createdAt: now,
  });
  return { isChanged: true, lifted };
}

/**
 * Sets one material's floor and fallback for a city; returns how many shop
 * prices were lifted to the new floor. A move over 10% needs a note.
 */
export const set = mutation({
  args: {
    city: v.string(),
    materialCode: v.string(),
    floorPaise: v.number(),
    fallbackPaise: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.object({ lifted: v.number() }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const city = cityFrom(args.city);
    const problem = priceProblem(args.floorPaise, args.fallbackPaise);
    if (problem) throw new ConvexError(problem);
    const note = noteFrom(args.note);
    const material = await materialByCode(ctx, args.materialCode);
    if (!material) throw new ConvexError("UNKNOWN_MATERIAL");
    const adminProfile = await findProfile(ctx, admin._id);
    const { lifted } = await applyReferencePrice(ctx, {
      city,
      material,
      floorPaise: args.floorPaise,
      fallbackPaise: args.fallbackPaise,
      note,
      via: "form",
      actorProfileId: adminProfile?._id,
      now: Date.now(),
    });
    return { lifted };
  },
});

const vImportProblem = v.union(
  v.literal("UNKNOWN_MATERIAL"),
  v.literal("INVALID_PRICE"),
  v.literal("FLOOR_ABOVE_FALLBACK"),
  v.literal("PRICE_TOO_HIGH"),
  v.literal("NOTE_REQUIRED"),
);

/**
 * The CSV paste: many materials' floors and fallbacks in one go. Rows that
 * can't be saved are reported by material, the rest are saved one by one
 * (each with its own audit entry), and one entry records the import.
 */
export const importPrices = mutation({
  args: {
    city: v.string(),
    rows: v.array(
      v.object({
        materialCode: v.string(),
        floorPaise: v.number(),
        fallbackPaise: v.number(),
      }),
    ),
    note: v.optional(v.string()),
  },
  returns: v.object({
    saved: v.number(),
    unchanged: v.number(),
    lifted: v.number(),
    skipped: v.array(
      v.object({ materialCode: v.string(), problem: vImportProblem }),
    ),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const city = cityFrom(args.city);
    if (args.rows.length === 0 || args.rows.length > MAX_IMPORT_ROWS) {
      throw new ConvexError("INVALID_ROWS");
    }
    const note = noteFrom(args.note);
    const adminProfile = await findProfile(ctx, admin._id);
    const now = Date.now();
    const result = {
      saved: 0,
      unchanged: 0,
      lifted: 0,
      skipped: [] as { materialCode: string; problem: string }[],
    };
    const seen = new Set<string>();
    for (const row of args.rows) {
      const code = row.materialCode.trim().toUpperCase();
      if (seen.has(code)) continue;
      seen.add(code);
      const problem = priceProblem(row.floorPaise, row.fallbackPaise);
      if (problem) {
        result.skipped.push({ materialCode: code, problem });
        continue;
      }
      const material = await materialByCode(ctx, code);
      if (!material?.active) {
        result.skipped.push({ materialCode: code, problem: "UNKNOWN_MATERIAL" });
        continue;
      }
      try {
        const saved = await applyReferencePrice(ctx, {
          city,
          material,
          floorPaise: row.floorPaise,
          fallbackPaise: row.fallbackPaise,
          note,
          via: "csv",
          actorProfileId: adminProfile?._id,
          now,
        });
        if (saved.isChanged) result.saved += 1;
        else result.unchanged += 1;
        result.lifted += saved.lifted;
      } catch (error) {
        if (error instanceof ConvexError && error.data === "NOTE_REQUIRED") {
          result.skipped.push({ materialCode: code, problem: "NOTE_REQUIRED" });
          continue;
        }
        throw error;
      }
    }
    await ctx.db.insert("auditLog", {
      actorProfileId: adminProfile?._id,
      action: "referencePrices.imported",
      entityTable: "referencePrices",
      entityId: city,
      metadata: {
        city,
        rows: args.rows.length,
        saved: result.saved,
        unchanged: result.unchanged,
        lifted: result.lifted,
        skipped: result.skipped,
        note,
      },
      createdAt: now,
    });
    return {
      ...result,
      skipped: result.skipped.filter(
        (
          entry,
        ): entry is {
          materialCode: string;
          problem:
            | "UNKNOWN_MATERIAL"
            | "INVALID_PRICE"
            | "FLOOR_ABOVE_FALLBACK"
            | "PRICE_TOO_HIGH"
            | "NOTE_REQUIRED";
        } =>
          [
            "UNKNOWN_MATERIAL",
            "INVALID_PRICE",
            "FLOOR_ABOVE_FALLBACK",
            "PRICE_TOO_HIGH",
            "NOTE_REQUIRED",
          ].includes(entry.problem),
      ),
    };
  },
});

// --- Bands ----------------------------------------------------------------------

/**
 * Sets a material's plausible band for a city: observations outside it are
 * dropped and queued for the admin, and a daily move over the limit is held
 * until confirmed (spec §3, §4.7).
 */
export const setBand = mutation({
  args: {
    city: v.string(),
    materialCode: v.string(),
    minPaise: v.number(),
    maxPaise: v.number(),
    maxDailyMovePct: v.number(),
  },
  returns: v.id("priceBands"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const city = cityFrom(args.city);
    const band: Band = {
      minPaise: args.minPaise,
      maxPaise: args.maxPaise,
      maxDailyMovePct: args.maxDailyMovePct,
    };
    const problem = bandProblem(band);
    if (problem) throw new ConvexError(problem);
    const material = await materialByCode(ctx, args.materialCode);
    if (!material) throw new ConvexError("UNKNOWN_MATERIAL");
    const now = Date.now();
    const current = await bandRowFor(ctx, city, material.code);
    let bandId: Id<"priceBands">;
    if (current) {
      bandId = current._id;
      await ctx.db.patch("priceBands", bandId, { ...band, updatedAt: now });
    } else {
      bandId = await ctx.db.insert("priceBands", {
        city,
        materialCode: material.code,
        ...band,
        updatedAt: now,
      });
    }
    const adminProfile = await findProfile(ctx, admin._id);
    await ctx.db.insert("auditLog", {
      actorProfileId: adminProfile?._id,
      action: "priceBand.updated",
      entityTable: "priceBands",
      entityId: bandId,
      metadata: {
        city,
        materialCode: material.code,
        from: toBand(current),
        to: band,
      },
      createdAt: now,
    });
    return bandId;
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
