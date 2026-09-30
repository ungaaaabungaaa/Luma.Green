import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { findProfile } from "./lib/applicationAccess";
import { shiftDate } from "./lib/dates";
import { indiaToday } from "./lib/onboarding";
import {
  type Band,
  type BoardStatus,
  computeBoard,
  freshDaysLeft,
  type HonourRate,
  honourRate,
  isFresh,
  isInBand,
  LONG_WINDOW_DAYS,
  maxDailyMoveFor,
  mergeRelated,
  orgValues,
  POST_DAYS,
  type PriceInput,
  type PriceLevel,
  weekChangePct,
  WINDOW_DAYS,
  windowDaysFor,
} from "./lib/priceMath";
import { PILOT_CITY } from "./lib/review";
import { vFamily } from "./lib/validators";
import { vMaterialRef, vNames } from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";
import {
  vBoardStatus,
  vObservationBasis,
  vObservationSource,
  vPostBasis,
  vPostDelivery,
  vPostStatus,
  vPriceLevel,
} from "./tables/priceEngine";

/**
 * The price engine — docs/plan.md "Live pricing" and the price engine spec
 * v0.1. Every morning (06:00 IST, convex/crons.ts) `daily` gathers the last
 * week's price inputs into `priceObservations` — pickup receipts, fresh rate
 * cards, yard posts and the admin's survey quotes — and publishes one
 * `priceBoards` row per material: the weighted median as "typical", the
 * low–high range, and Live or Guide. The admin can re-run it, confirm a move
 * the circuit breaker held, and add survey quotes. The public board reads
 * `board`; kabadiwalas read yards' buying prices with `yardPostsForSeller`.
 *
 * Nothing here touches `marketPrices`: the prototype's sample series stays
 * for the charts, and the board reads `priceBoards` first.
 */

const DAY = 24 * 60 * 60 * 1000;
/** The most rows one step reads. */
const PAGE = 200;
const MAX_ORGS = 500;
const MAX_OBSERVATIONS = 2000;
/** The honour rate looks at a month of pickups. */
const HONOUR_WINDOW_DAYS = 30;
/** Floors and fallbacks are reviewed weekly. */
const REVIEW_DAYS = 7;
/** ₹10,000/kg: above any scrap price, below any typing slip. */
const MAX_RATE_PAISE = 1_000_000;
/** 100 t: no yard asks for a bigger minimum lot. */
const MAX_MIN_GRAMS = 100_000_000;
const NOTE_MAX_CHARS = 200;

type Materials = Awaited<ReturnType<typeof materialIndex>>;
type Trigger = "cron" | "admin" | "seed";

const LEVELS: readonly PriceLevel[] = ["L1", "L2"];

// --- Result shapes ---------------------------------------------------------------

const vRunSummary = v.object({
  date: v.string(),
  ranAt: v.number(),
  trigger: v.union(v.literal("cron"), v.literal("admin"), v.literal("seed")),
  live: v.number(),
  guide: v.number(),
  held: v.number(),
  flagged: v.number(),
  observations: v.number(),
  ingested: v.number(),
});

export interface RunSummary {
  date: string;
  ranAt: number;
  trigger: Trigger;
  live: number;
  guide: number;
  held: number;
  flagged: number;
  observations: number;
  ingested: number;
}

const vBoardRow = v.object({
  code: v.string(),
  family: vFamily,
  stage: v.union(v.literal("scrap"), v.literal("recycled")),
  names: vNames,
  /** Typical today: the board's figure, or the sample series' last point. */
  todayPaise: v.union(v.number(), v.null()),
  weekChangePct: v.union(v.number(), v.null()),
  floorPaise: v.union(v.number(), v.null()),
  series: v.array(v.object({ date: v.string(), paisePerKg: v.number() })),
  /** Null until the engine has published this material. */
  status: v.union(vBoardStatus, v.null()),
  lowPaise: v.union(v.number(), v.null()),
  highPaise: v.union(v.number(), v.null()),
  nOrgs: v.number(),
  nTrades: v.number(),
  computedAt: v.union(v.number(), v.null()),
  reviewDate: v.union(v.string(), v.null()),
  isHeld: v.boolean(),
});

const vHonourRow = v.object({
  orgId: v.id("orgs"),
  name: v.string(),
  area: v.string(),
  pickups: v.number(),
  under: v.number(),
  underPct: v.number(),
  flagged: v.boolean(),
  cards: v.number(),
  staleCards: v.number(),
});

const vYardPostView = v.object({
  id: v.id("yardPosts"),
  yard: v.object({ name: v.string(), area: v.string() }),
  material: vMaterialRef,
  paisePerKg: v.number(),
  minGrams: v.number(),
  basis: vPostBasis,
  delivery: vPostDelivery,
  status: vPostStatus,
  expiresAt: v.number(),
  createdAt: v.number(),
});

// --- Small helpers ---------------------------------------------------------------

function materialRef(materials: Materials, code: string) {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? ("other" as const),
  };
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/** Looks each business up once per request. */
function orgLookup(ctx: QueryCtx) {
  const cache = new Map<Id<"orgs">, Promise<Doc<"orgs"> | null>>();
  return (id: Id<"orgs">) => {
    let org = cache.get(id);
    if (!org) {
      org = ctx.db.get("orgs", id);
      cache.set(id, org);
    }
    return org;
  };
}

async function activeOrgs(
  ctx: QueryCtx,
  city: string,
  kind: Doc<"orgs">["kind"],
): Promise<Doc<"orgs">[]> {
  return ctx.db
    .query("orgs")
    .withIndex("by_kind_city", (q) =>
      q.eq("kind", kind).eq("city", city).eq("status", "active"),
    )
    .take(MAX_ORGS);
}

async function referenceFor(ctx: QueryCtx, city: string, materialCode: string) {
  return ctx.db
    .query("referencePrices")
    .withIndex("by_city_material", (q) =>
      q.eq("city", city).eq("materialCode", materialCode),
    )
    .first();
}

async function bandFor(
  ctx: QueryCtx,
  city: string,
  materialCode: string,
): Promise<Band | null> {
  const row = await ctx.db
    .query("priceBands")
    .withIndex("by_city_material", (q) =>
      q.eq("city", city).eq("materialCode", materialCode),
    )
    .first();
  return row
    ? {
        minPaise: row.minPaise,
        maxPaise: row.maxPaise,
        maxDailyMovePct: row.maxDailyMovePct,
      }
    : null;
}

async function actorOf(
  ctx: QueryCtx,
  authUserId: string,
): Promise<Id<"profiles"> | undefined> {
  const profile = await findProfile(ctx, authUserId);
  return profile?._id;
}

async function audit(
  ctx: MutationCtx,
  entry: {
    orgId?: Id<"orgs">;
    actorProfileId?: Id<"profiles">;
    action: string;
    entityTable: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert("auditLog", { ...entry, createdAt: Date.now() });
}

/** Businesses that share an owner, a phone or a GSTIN count once (spec §4.2). */
function relatedMap(orgs: readonly Doc<"orgs">[]): Map<string, string> {
  return mergeRelated(
    orgs.map((org) => ({
      id: org._id,
      keys: [
        org.gstin ? `gstin:${org.gstin}` : "",
        org.ownerProfileId ? `owner:${org.ownerProfileId}` : "",
        ...org.phones.map((phone) => `phone:${phone.number}`),
      ],
    })),
  );
}

// --- Honour rate -------------------------------------------------------------------

/**
 * A shop's posted card against what its receipts paid over the last month,
 * plus how many of its cards have gone stale.
 */
async function honourRateFor(
  ctx: QueryCtx,
  org: Doc<"orgs">,
  materials: Materials,
  now: number,
): Promise<HonourRate & { cards: number; staleCards: number }> {
  const cards = await ctx.db
    .query("rateCards")
    .withIndex("by_org_material", (q) => q.eq("orgId", org._id))
    .take(PAGE);
  const cardOf = new Map(cards.map((card) => [card.materialCode, card]));
  const receipts = await ctx.db
    .query("priceObservations")
    .withIndex("by_org_material", (q) => q.eq("orgId", org._id))
    .take(MAX_OBSERVATIONS);
  const since = now - HONOUR_WINDOW_DAYS * DAY;
  const lines = [];
  for (const row of receipts) {
    const card = cardOf.get(row.materialCode);
    if (
      !card ||
      row.source !== "receipt" ||
      row.level !== "L1" ||
      row.observedAt < since
    ) {
      continue;
    }
    lines.push({
      pickupRef: row.pickupRef ?? row.ref ?? row._id,
      paidPaisePerKg: row.paisePerKg,
      cardPaisePerKg: card.paisePerKg,
    });
  }
  const staleCards = cards.filter((card) => {
    const family = materials.get(card.materialCode)?.family ?? "other";
    return !isFresh(card.updatedAt, family, now);
  }).length;
  return { ...honourRate(lines), cards: cards.length, staleCards };
}

// --- Ingest: every price input becomes an observation -----------------------------

interface IngestContext {
  ctx: MutationCtx;
  city: string;
  now: number;
  materials: Materials;
  refs: Set<string>;
  related: Map<string, string>;
}

async function ingestObservation(
  run: IngestContext,
  row: Omit<Doc<"priceObservations">, "_id" | "_creationTime" | "city"> & {
    ref: string;
  },
): Promise<number> {
  if (run.refs.has(row.ref)) return 0;
  run.refs.add(row.ref);
  await run.ctx.db.insert("priceObservations", { city: run.city, ...row });
  return 1;
}

/** A shop's fresh rate cards (½) and its paid pickups' receipt lines (1). */
async function ingestShop(run: IngestContext, shop: Doc<"orgs">) {
  const since = run.now - LONG_WINDOW_DAYS * DAY;
  let count = 0;
  const cards = await run.ctx.db
    .query("rateCards")
    .withIndex("by_org_material", (q) => q.eq("orgId", shop._id))
    .take(PAGE);
  for (const card of cards) {
    const material = run.materials.get(card.materialCode);
    if (
      !material?.active ||
      material.stage !== "scrap" ||
      !isFresh(card.updatedAt, material.family, run.now)
    ) {
      continue;
    }
    count += await ingestObservation(run, {
      materialCode: card.materialCode,
      level: "L1",
      paisePerKg: card.paisePerKg,
      source: "rateCard",
      orgId: shop._id,
      observedAt: card.updatedAt,
      basis: "card",
      ref: `rateCard:${card._id}:${String(card.updatedAt)}`,
    });
  }
  const bookings = await run.ctx.db
    .query("bookings")
    .withIndex("by_org_status", (q) =>
      q.eq("orgId", shop._id).eq("status", "completed"),
    )
    .order("desc")
    .take(PAGE);
  for (const booking of bookings) {
    const receipt = booking.receipt;
    if (!receipt || receipt.paidAt < since) continue;
    for (const line of receipt.lines) {
      count += await ingestObservation(run, {
        materialCode: line.materialCode,
        level: "L1",
        paisePerKg: line.paisePerKg,
        grams: line.grams,
        source: "receipt",
        orgId: shop._id,
        observedAt: receipt.paidAt,
        basis: booking.mode === "pickup" ? "pickup" : "dropoff",
        ref: `booking:${booking._id}:${line.materialCode}`,
        pickupRef: `booking:${booking._id}`,
      });
    }
  }
  return count;
}

/** A yard's completed purchases from kabadiwalas (1) and its open posts (½). */
async function ingestYard(
  run: IngestContext,
  yard: Doc<"orgs">,
  orgOf: ReturnType<typeof orgLookup>,
) {
  const since = run.now - LONG_WINDOW_DAYS * DAY;
  let count = 0;
  const purchases = await run.ctx.db
    .query("trades")
    .withIndex("by_buyer", (q) => q.eq("buyerOrgId", yard._id))
    .order("desc")
    .take(PAGE);
  for (const trade of purchases) {
    if (trade.status !== "completed") continue;
    const completedAt = trade.timeline.find(
      (step) => step.status === "completed",
    )?.at;
    if (completedAt === undefined || completedAt < since) continue;
    const seller = await orgOf(trade.sellerOrgId);
    if (seller?.kind !== "kabadiwala") continue;
    // A trade between related businesses is a self-trade: it counts for nothing.
    if (run.related.get(seller._id) === run.related.get(yard._id)) continue;
    count += await ingestObservation(run, {
      materialCode: trade.materialCode,
      level: "L2",
      paisePerKg: trade.paisePerKg,
      grams: trade.grams,
      source: "receipt",
      orgId: yard._id,
      observedAt: completedAt,
      basis: "loose",
      ref: `trade:${trade._id}`,
      pickupRef: `trade:${trade._id}`,
    });
  }
  const posts = await run.ctx.db
    .query("yardPosts")
    .withIndex("by_org", (q) => q.eq("orgId", yard._id))
    .take(PAGE);
  for (const post of posts) {
    if (post.status !== "open") continue;
    if (post.expiresAt <= run.now) {
      await run.ctx.db.patch("yardPosts", post._id, {
        status: "expired",
        updatedAt: run.now,
      });
      continue;
    }
    count += await ingestObservation(run, {
      materialCode: post.materialCode,
      level: "L2",
      paisePerKg: post.paisePerKg,
      source: "post",
      orgId: yard._id,
      observedAt: post.updatedAt,
      basis: post.basis,
      ref: `post:${post._id}:${String(post.updatedAt)}`,
    });
  }
  return count;
}

// --- The daily calculation -----------------------------------------------------------

interface MaterialRun {
  ctx: MutationCtx;
  city: string;
  now: number;
  today: string;
  material: Doc<"materials">;
  level: PriceLevel;
  activeOrgIds: Set<string>;
  flaggedShops: Set<string>;
  related: Map<string, string>;
}

/** Spec §4 for one material and level. Returns what it published, if anything. */
async function computeMaterial(run: MaterialRun): Promise<{
  status: BoardStatus;
  isHeld: boolean;
  flagged: number;
} | null> {
  const { ctx, city, now, today, material, level } = run;
  const rows = await ctx.db
    .query("priceObservations")
    .withIndex("by_city_material_level_observedAt", (q) =>
      q
        .eq("city", city)
        .eq("materialCode", material.code)
        .eq("level", level)
        .gte("observedAt", now - LONG_WINDOW_DAYS * DAY),
    )
    .take(MAX_OBSERVATIONS);
  const band = await bandFor(ctx, city, material.code);

  // Step 2: drop rows outside the band, from suspended businesses, and rate
  // cards of shops whose receipts don't honour them.
  let flagged = 0;
  const usable = rows.filter((row) => {
    if (!run.activeOrgIds.has(row.orgId) || row.observedAt > now) return false;
    if (!isInBand(row.paisePerKg, band)) {
      flagged += 1;
      return false;
    }
    return !(row.source === "rateCard" && run.flaggedShops.has(row.orgId));
  });

  // Step 1: a week, or two when fewer than three businesses reported.
  const shortSince = now - WINDOW_DAYS * DAY;
  const recent = usable.filter((row) => row.observedAt >= shortSince);
  const orgsInWeek = new Set(
    recent.map((row) => run.related.get(row.orgId) ?? row.orgId),
  ).size;
  const inWindow =
    windowDaysFor(orgsInWeek) === WINDOW_DAYS ? recent : usable;

  const inputs: PriceInput[] = inWindow.map((row) => ({
    orgId: run.related.get(row.orgId) ?? row.orgId,
    paisePerKg: row.paisePerKg,
    source: row.source,
    grams: row.grams,
  }));

  const reference =
    level === "L1" ? await referenceFor(ctx, city, material.code) : null;
  if (level === "L2" && inputs.length === 0) return null;

  const previous = await ctx.db
    .query("priceBoards")
    .withIndex("by_city_material_level_date", (q) =>
      q
        .eq("city", city)
        .eq("materialCode", material.code)
        .eq("level", level)
        .lt("date", today),
    )
    .order("desc")
    .first();
  const existing = await ctx.db
    .query("priceBoards")
    .withIndex("by_city_material_level_date", (q) =>
      q
        .eq("city", city)
        .eq("materialCode", material.code)
        .eq("level", level)
        .eq("date", today),
    )
    .first();

  const result = computeBoard({
    values: orgValues(inputs),
    floorPaise: reference?.floorPaise ?? null,
    fallbackPaise: reference?.fallbackPaise ?? null,
    maxDailyMovePct:
      band?.maxDailyMovePct ?? maxDailyMoveFor(material.family),
    previousTypical: previous?.typicalPaise ?? null,
    isConfirmed: existing?.confirmedAt !== undefined,
  });
  if (result.typicalPaise === null) return null;

  const reviewDate =
    reference && result.status === "guide"
      ? shiftDate(indiaToday(reference.updatedAt), REVIEW_DAYS)
      : undefined;
  const board = {
    city,
    materialCode: material.code,
    level,
    date: today,
    lowPaise: result.lowPaise,
    typicalPaise: result.typicalPaise,
    highPaise: result.highPaise,
    nOrgs: result.nOrgs,
    nTrades: result.nTrades,
    status: result.status,
    computedAt: now,
    reviewDate,
    heldPaise: result.heldPaise ?? undefined,
    heldPct: result.heldPct ?? undefined,
    confirmedAt: existing?.confirmedAt,
  };
  if (existing) await ctx.db.replace("priceBoards", existing._id, board);
  else await ctx.db.insert("priceBoards", board);

  return {
    status: result.status,
    isHeld: result.heldPaise !== null,
    flagged,
  };
}

/** Step 0: every price input of the last fortnight becomes an observation, once. */
async function ingestAll(
  ctx: MutationCtx,
  input: {
    city: string;
    now: number;
    materials: Materials;
    shops: readonly Doc<"orgs">[];
    yards: readonly Doc<"orgs">[];
    related: Map<string, string>;
  },
): Promise<{ known: number; ingested: number }> {
  const { city, now } = input;
  const known = await ctx.db
    .query("priceObservations")
    .withIndex("by_city_observedAt", (q) =>
      q.eq("city", city).gte("observedAt", now - LONG_WINDOW_DAYS * DAY),
    )
    .take(MAX_OBSERVATIONS);
  const run: IngestContext = {
    ctx,
    city,
    now,
    materials: input.materials,
    refs: new Set(known.flatMap((row) => (row.ref ? [row.ref] : []))),
    related: input.related,
  };
  const orgOf = orgLookup(ctx);
  let ingested = 0;
  for (const shop of input.shops) ingested += await ingestShop(run, shop);
  for (const yard of input.yards) {
    ingested += await ingestYard(run, yard, orgOf);
  }
  return { known: known.length, ingested };
}

/** Shops whose receipts don't honour their card: their cards leave the board. */
async function flaggedShopsAmong(
  ctx: QueryCtx,
  shops: readonly Doc<"orgs">[],
  materials: Materials,
  now: number,
): Promise<Set<string>> {
  const flagged = new Set<string>();
  for (const shop of shops) {
    const rate = await honourRateFor(ctx, shop, materials, now);
    if (rate.flagged) flagged.add(shop._id);
  }
  return flagged;
}

/**
 * The whole run: ingest, then one board line per scrap material and level.
 * Shared by the cron, the admin's "run now" and the demo seed.
 */
export async function runEngine(
  ctx: MutationCtx,
  options: { city: string; now: number; trigger: Trigger },
): Promise<RunSummary> {
  const { city, now, trigger } = options;
  const today = indiaToday(now);
  const materials = await materialIndex(ctx);
  const shops = await activeOrgs(ctx, city, "kabadiwala");
  const yards = await activeOrgs(ctx, city, "yard");
  const related = relatedMap([...shops, ...yards]);

  const { known, ingested } = await ingestAll(ctx, {
    city,
    now,
    materials,
    shops,
    yards,
    related,
  });
  const flaggedShops = await flaggedShopsAmong(ctx, shops, materials, now);
  const activeOrgIds = new Set<string>(
    [...shops, ...yards].map((org) => org._id),
  );

  const summary: RunSummary = {
    date: today,
    ranAt: now,
    trigger,
    live: 0,
    guide: 0,
    held: 0,
    flagged: 0,
    observations: known + ingested,
    ingested,
  };
  for (const material of materials.values()) {
    if (!material.active || material.stage !== "scrap") continue;
    for (const level of LEVELS) {
      const published = await computeMaterial({
        ctx,
        city,
        now,
        today,
        material,
        level,
        activeOrgIds,
        flaggedShops,
        related,
      });
      if (!published) continue;
      summary[published.status] += 1;
      if (published.isHeld) summary.held += 1;
      summary.flagged += published.flagged;
    }
  }
  await ctx.db.insert("priceRuns", { city, ...summary });
  return summary;
}

/** The daily price calculation (06:00 IST); registered in convex/crons.ts. */
export const daily = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await runEngine(ctx, { city: PILOT_CITY, now: Date.now(), trigger: "cron" });
    return null;
  },
});

// --- The public board ------------------------------------------------------------------

/**
 * The public price board: per material, what the engine published (Live or
 * Guide, the range, how many shops and pickups) on top of the 30-day series.
 * Sample points come from `marketPrices` until the day the engine first
 * published that material; from then on the series is the engine's own.
 */
/** One material's line on the public board: the engine's row on top of the sample series. */
async function boardRowFor(
  ctx: QueryCtx,
  city: string,
  material: Doc<"materials">,
  since: string,
) {
  const sample = await ctx.db
    .query("marketPrices")
    .withIndex("by_city_material_date", (q) =>
      q.eq("city", city).eq("materialCode", material.code).gte("date", since),
    )
    .take(60);
  const boards =
    material.stage === "scrap"
      ? await ctx.db
          .query("priceBoards")
          .withIndex("by_city_material_level_date", (q) =>
            q
              .eq("city", city)
              .eq("materialCode", material.code)
              .eq("level", "L1")
              .gte("date", since),
          )
          .take(60)
      : [];
  const reference = await referenceFor(ctx, city, material.code);
  const firstBoardDate = boards.at(0)?.date;
  const series = [
    ...sample
      .filter(
        (point) => firstBoardDate === undefined || point.date < firstBoardDate,
      )
      .map((point) => ({ date: point.date, paisePerKg: point.paisePerKg })),
    ...boards.map((row) => ({ date: row.date, paisePerKg: row.typicalPaise })),
  ].toSorted((a, b) => a.date.localeCompare(b.date));
  const latest = boards.at(-1);
  return {
    row: {
      code: material.code,
      family: material.family,
      stage: material.stage,
      names: material.names,
      todayPaise: latest?.typicalPaise ?? series.at(-1)?.paisePerKg ?? null,
      weekChangePct: weekChangePct(series),
      floorPaise: reference?.floorPaise ?? null,
      series,
      status: latest?.status ?? null,
      lowPaise: latest?.lowPaise ?? null,
      highPaise: latest?.highPaise ?? null,
      nOrgs: latest?.nOrgs ?? 0,
      nTrades: latest?.nTrades ?? 0,
      computedAt: latest?.computedAt ?? null,
      reviewDate: latest?.reviewDate ?? null,
      isHeld:
        latest?.heldPaise !== undefined && latest.confirmedAt === undefined,
    },
    boardDate: latest?.date ?? null,
    computedAt: latest?.computedAt ?? null,
    sampleDate: sample.at(-1)?.date ?? null,
  };
}

function laterOf<T extends string | number>(a: T | null, b: T | null): T | null {
  if (a === null) return b;
  if (b === null) return a;
  return b > a ? b : a;
}

export const board = query({
  args: { city: v.string() },
  returns: v.object({
    city: v.string(),
    date: v.union(v.string(), v.null()),
    computedAt: v.union(v.number(), v.null()),
    rows: v.array(vBoardRow),
  }),
  handler: async (ctx, args) => {
    const materials = await ctx.db
      .query("materials")
      .withIndex("by_sortOrder")
      .take(PAGE);
    const since = shiftDate(indiaToday(), -29);
    let boardDate: string | null = null;
    let sampleDate: string | null = null;
    let computedAt: number | null = null;
    const rows = [];
    for (const material of materials) {
      if (!material.active) continue;
      const line = await boardRowFor(ctx, args.city, material, since);
      boardDate = laterOf(boardDate, line.boardDate);
      sampleDate = laterOf(sampleDate, line.sampleDate);
      computedAt = laterOf(computedAt, line.computedAt);
      rows.push(line.row);
    }
    return {
      city: args.city,
      date: boardDate ?? sampleDate,
      computedAt,
      rows,
    };
  },
});

// --- The admin's engine console ---------------------------------------------------------

/** Everything `/admin/prices/engine` shows: the last run, today's lines, flags, honour rates. */
export const engine = query({
  args: { city: v.string() },
  returns: v.object({
    lastRun: v.union(vRunSummary, v.null()),
    boards: v.array(
      v.object({
        id: v.id("priceBoards"),
        material: vMaterialRef,
        level: vPriceLevel,
        date: v.string(),
        status: vBoardStatus,
        typicalPaise: v.number(),
        lowPaise: v.union(v.number(), v.null()),
        highPaise: v.union(v.number(), v.null()),
        nOrgs: v.number(),
        nTrades: v.number(),
        computedAt: v.number(),
        heldPaise: v.union(v.number(), v.null()),
        heldPct: v.union(v.number(), v.null()),
        isConfirmed: v.boolean(),
        reviewDate: v.union(v.string(), v.null()),
      }),
    ),
    flags: v.array(
      v.object({
        id: v.id("priceObservations"),
        material: vMaterialRef,
        level: vPriceLevel,
        source: vObservationSource,
        orgName: v.string(),
        paisePerKg: v.number(),
        observedAt: v.number(),
        band: v.object({ minPaise: v.number(), maxPaise: v.number() }),
      }),
    ),
    honour: v.array(vHonourRow),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);

    const lastRunRow = await ctx.db
      .query("priceRuns")
      .withIndex("by_city_ranAt", (q) => q.eq("city", args.city))
      .order("desc")
      .first();
    const lastRun = lastRunRow
      ? {
          date: lastRunRow.date,
          ranAt: lastRunRow.ranAt,
          trigger: lastRunRow.trigger,
          live: lastRunRow.live,
          guide: lastRunRow.guide,
          held: lastRunRow.held,
          flagged: lastRunRow.flagged,
          observations: lastRunRow.observations,
          ingested: lastRunRow.ingested,
        }
      : null;

    // The latest published line per material and level.
    const boardDate = lastRunRow?.date ?? indiaToday(now);
    const boardRows = await ctx.db
      .query("priceBoards")
      .withIndex("by_city_date", (q) =>
        q.eq("city", args.city).eq("date", boardDate),
      )
      .take(PAGE);
    const boards = boardRows
      .map((row) => ({
        id: row._id,
        material: materialRef(materials, row.materialCode),
        level: row.level,
        date: row.date,
        status: row.status,
        typicalPaise: row.typicalPaise,
        lowPaise: row.lowPaise,
        highPaise: row.highPaise,
        nOrgs: row.nOrgs,
        nTrades: row.nTrades,
        computedAt: row.computedAt,
        heldPaise: row.heldPaise ?? null,
        heldPct: row.heldPct ?? null,
        isConfirmed: row.confirmedAt !== undefined,
        reviewDate: row.reviewDate ?? null,
      }))
      .toSorted(
        (a, b) =>
          (materials.get(a.material.code)?.sortOrder ?? 0) -
            (materials.get(b.material.code)?.sortOrder ?? 0) ||
          a.level.localeCompare(b.level),
      );

    // Observations outside the band, for the admin to look at.
    const recent = await ctx.db
      .query("priceObservations")
      .withIndex("by_city_observedAt", (q) =>
        q.eq("city", args.city).gte("observedAt", now - LONG_WINDOW_DAYS * DAY),
      )
      .order("desc")
      .take(MAX_OBSERVATIONS);
    const bands = new Map<string, Band | null>();
    const flags = [];
    for (const row of recent) {
      let band = bands.get(row.materialCode);
      if (band === undefined) {
        band = await bandFor(ctx, args.city, row.materialCode);
        bands.set(row.materialCode, band);
      }
      if (!band || isInBand(row.paisePerKg, band)) continue;
      const org = await orgOf(row.orgId);
      flags.push({
        id: row._id,
        material: materialRef(materials, row.materialCode),
        level: row.level,
        source: row.source,
        orgName: org?.name ?? "Unknown business",
        paisePerKg: row.paisePerKg,
        observedAt: row.observedAt,
        band: { minPaise: band.minPaise, maxPaise: band.maxPaise },
      });
    }

    const honour = [];
    const shops = await activeOrgs(ctx, args.city, "kabadiwala");
    for (const shop of shops) {
      const rate = await honourRateFor(ctx, shop, materials, now);
      honour.push({
        orgId: shop._id,
        name: shop.name,
        area: shop.area,
        ...rate,
      });
    }
    honour.sort(
      (a, b) =>
        Number(b.flagged) - Number(a.flagged) ||
        b.underPct - a.underPct ||
        b.pickups - a.pickups,
    );

    return { lastRun, boards, flags, honour };
  },
});

/** The last two weeks of price inputs, newest first. */
export const observations = query({
  args: { city: v.string() },
  returns: v.array(
    v.object({
      id: v.id("priceObservations"),
      material: vMaterialRef,
      level: vPriceLevel,
      source: vObservationSource,
      basis: vObservationBasis,
      paisePerKg: v.number(),
      grams: v.union(v.number(), v.null()),
      orgName: v.string(),
      observedAt: v.number(),
      note: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const rows = await ctx.db
      .query("priceObservations")
      .withIndex("by_city_observedAt", (q) =>
        q
          .eq("city", args.city)
          .gte("observedAt", Date.now() - LONG_WINDOW_DAYS * DAY),
      )
      .order("desc")
      .take(PAGE);
    const views = [];
    for (const row of rows) {
      const org = await orgOf(row.orgId);
      views.push({
        id: row._id,
        material: materialRef(materials, row.materialCode),
        level: row.level,
        source: row.source,
        basis: row.basis,
        paisePerKg: row.paisePerKg,
        grams: row.grams ?? null,
        orgName: org?.name ?? "Unknown business",
        observedAt: row.observedAt,
        note: row.note ?? null,
      });
    }
    return views;
  },
});

/** Runs the daily calculation again, now. */
export const runNow = mutation({
  args: { city: v.string() },
  returns: vRunSummary,
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const summary = await runEngine(ctx, {
      city: args.city,
      now,
      trigger: "admin",
    });
    await audit(ctx, {
      actorProfileId: await actorOf(ctx, admin._id),
      action: "priceBoard.run",
      entityTable: "priceRuns",
      entityId: `${args.city}:${summary.date}`,
      metadata: { ...summary },
    });
    return summary;
  },
});

/** Lets a move the circuit breaker held through: the board shows the computed price. */
export const confirmHold = mutation({
  args: { boardId: v.id("priceBoards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get("priceBoards", args.boardId);
    if (!row) throw new ConvexError("NOT_FOUND");
    if (row.heldPaise === undefined || row.confirmedAt !== undefined) {
      throw new ConvexError("NOTHING_HELD");
    }
    const now = Date.now();
    const reference = await referenceFor(ctx, row.city, row.materialCode);
    const floor = row.level === "L1" ? (reference?.floorPaise ?? 0) : 0;
    const typicalPaise = Math.max(row.heldPaise, floor);
    await ctx.db.patch("priceBoards", row._id, {
      typicalPaise,
      heldPaise: undefined,
      heldPct: undefined,
      confirmedAt: now,
    });
    await audit(ctx, {
      actorProfileId: await actorOf(ctx, admin._id),
      action: "priceBoard.holdConfirmed",
      entityTable: "priceBoards",
      entityId: row._id,
      metadata: {
        city: row.city,
        materialCode: row.materialCode,
        level: row.level,
        date: row.date,
        fromPaise: row.typicalPaise,
        toPaise: typicalPaise,
        heldPct: row.heldPct,
      },
    });
    return null;
  },
});

/** The businesses the admin can quote in a survey: shops (L1) and yards (L2). */
export const businesses = query({
  args: { city: v.string() },
  returns: v.array(
    v.object({
      id: v.id("orgs"),
      name: v.string(),
      area: v.string(),
      level: vPriceLevel,
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const shops = await activeOrgs(ctx, args.city, "kabadiwala");
    const yards = await activeOrgs(ctx, args.city, "yard");
    return [
      ...shops.map((org) => ({ org, level: "L1" as const })),
      ...yards.map((org) => ({ org, level: "L2" as const })),
    ].map(({ org, level }) => ({
      id: org._id,
      name: org.name,
      area: org.area,
      level,
    }));
  },
});

/** Records a quote from the admin's weekly phone survey (weight ½; spec T3). */
export const survey = mutation({
  args: {
    city: v.string(),
    materialCode: v.string(),
    orgId: v.id("orgs"),
    level: vPriceLevel,
    paisePerKg: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.id("priceObservations"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!isPositiveInteger(args.paisePerKg) || args.paisePerKg > MAX_RATE_PAISE) {
      throw new ConvexError("INVALID_PRICE");
    }
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", args.materialCode))
      .first();
    if (!material?.active || material.stage !== "scrap") {
      throw new ConvexError("UNKNOWN_MATERIAL");
    }
    const org = await ctx.db.get("orgs", args.orgId);
    if (org?.status !== "active" || org.city !== args.city) {
      throw new ConvexError("UNKNOWN_BUSINESS");
    }
    const expectedKind = args.level === "L1" ? "kabadiwala" : "yard";
    if (org.kind !== expectedKind) throw new ConvexError("WRONG_LEVEL");
    const note = args.note?.trim();
    if (note !== undefined && note.length > NOTE_MAX_CHARS) {
      throw new ConvexError("NOTE_TOO_LONG");
    }
    const now = Date.now();
    const id = await ctx.db.insert("priceObservations", {
      city: args.city,
      materialCode: material.code,
      level: args.level,
      paisePerKg: args.paisePerKg,
      source: "survey",
      orgId: org._id,
      observedAt: now,
      basis: "survey",
      ref: `survey:${org._id}:${material.code}:${String(now)}`,
      note: note === "" ? undefined : note,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: await actorOf(ctx, admin._id),
      action: "priceSurvey.added",
      entityTable: "priceObservations",
      entityId: id,
      metadata: {
        city: args.city,
        materialCode: material.code,
        level: args.level,
        paisePerKg: args.paisePerKg,
      },
    });
    return id;
  },
});

// --- The shop: honour rate and freshness --------------------------------------------------

/**
 * How a kabadiwala's card stands: the honour rate over the last month, and
 * each price's freshness (14 days for paper and plastic, 7 for metals).
 */
export const myHonourRate = query({
  args: {},
  returns: v.object({
    pickups: v.number(),
    under: v.number(),
    underPct: v.number(),
    flagged: v.boolean(),
    cards: v.array(
      v.object({
        material: vMaterialRef,
        paisePerKg: v.number(),
        updatedAt: v.number(),
        daysLeft: v.number(),
        isFresh: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, ["kabadiwala"]);
    const now = Date.now();
    const materials = await materialIndex(ctx);
    const rate = await honourRateFor(ctx, org, materials, now);
    const cards = await ctx.db
      .query("rateCards")
      .withIndex("by_org_material", (q) => q.eq("orgId", org._id))
      .take(PAGE);
    return {
      pickups: rate.pickups,
      under: rate.under,
      underPct: rate.underPct,
      flagged: rate.flagged,
      cards: cards
        .toSorted(
          (a, b) =>
            (materials.get(a.materialCode)?.sortOrder ?? 0) -
            (materials.get(b.materialCode)?.sortOrder ?? 0),
        )
        .map((card) => {
          const family = materials.get(card.materialCode)?.family ?? "other";
          return {
            material: materialRef(materials, card.materialCode),
            paisePerKg: card.paisePerKg,
            updatedAt: card.updatedAt,
            daysLeft: freshDaysLeft(card.updatedAt, family, now),
            isFresh: isFresh(card.updatedAt, family, now),
          };
        }),
    };
  },
});

// --- Yard buy posts ------------------------------------------------------------------------

function toPostView(
  post: Doc<"yardPosts">,
  yard: Doc<"orgs">,
  materials: Materials,
) {
  return {
    id: post._id,
    yard: { name: yard.name, area: yard.area },
    material: materialRef(materials, post.materialCode),
    paisePerKg: post.paisePerKg,
    minGrams: post.minGrams,
    basis: post.basis,
    delivery: post.delivery,
    status: post.status,
    expiresAt: post.expiresAt,
    createdAt: post.createdAt,
  };
}

/**
 * A yard posts what it pays kabadiwalas for a material: price, minimum lot,
 * loose or baled, collected or delivered. Lives 7 days; posting the same
 * material again renews it.
 */
export const postYardPrice = mutation({
  args: {
    materialCode: v.string(),
    paisePerKg: v.number(),
    minGrams: v.number(),
    basis: vPostBasis,
    delivery: vPostDelivery,
  },
  returns: v.id("yardPosts"),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, ["yard"]);
    if (!isPositiveInteger(args.paisePerKg) || args.paisePerKg > MAX_RATE_PAISE) {
      throw new ConvexError("INVALID_PRICE");
    }
    if (!isPositiveInteger(args.minGrams) || args.minGrams > MAX_MIN_GRAMS) {
      throw new ConvexError("INVALID_WEIGHT");
    }
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", args.materialCode))
      .first();
    if (
      !material?.active ||
      material.stage !== "scrap" ||
      !org.families.includes(material.family)
    ) {
      throw new ConvexError("NOT_MY_MATERIAL");
    }
    const now = Date.now();
    const posts = await ctx.db
      .query("yardPosts")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .take(PAGE);
    const open = posts.find(
      (post) => post.status === "open" && post.materialCode === material.code,
    );
    const next = {
      paisePerKg: args.paisePerKg,
      minGrams: args.minGrams,
      basis: args.basis,
      delivery: args.delivery,
      expiresAt: now + POST_DAYS * DAY,
      status: "open" as const,
      updatedAt: now,
    };
    let postId: Id<"yardPosts">;
    if (open) {
      postId = open._id;
      await ctx.db.patch("yardPosts", postId, next);
    } else {
      postId = await ctx.db.insert("yardPosts", {
        orgId: org._id,
        city: org.city,
        materialCode: material.code,
        createdAt: now,
        ...next,
      });
    }
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: open ? "yardPost.renewed" : "yardPost.posted",
      entityTable: "yardPosts",
      entityId: postId,
      metadata: {
        materialCode: material.code,
        paisePerKg: args.paisePerKg,
        minGrams: args.minGrams,
        basis: args.basis,
        delivery: args.delivery,
      },
    });
    return postId;
  },
});

/** Takes a yard's own post down before it expires. */
export const withdrawYardPost = mutation({
  args: { postId: v.id("yardPosts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, ["yard"]);
    const post = await ctx.db.get("yardPosts", args.postId);
    if (post?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (post.status !== "open") throw new ConvexError("NOT_OPEN");
    const now = Date.now();
    await ctx.db.patch("yardPosts", post._id, {
      status: "withdrawn",
      updatedAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "yardPost.withdrawn",
      entityTable: "yardPosts",
      entityId: post._id,
      metadata: { materialCode: post.materialCode },
    });
    return null;
  },
});

/** A yard's own posts, open ones first, newest first. */
export const myYardPosts = query({
  args: {},
  returns: v.array(vYardPostView),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, ["yard"]);
    const materials = await materialIndex(ctx);
    const now = Date.now();
    const posts = await ctx.db
      .query("yardPosts")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(PAGE);
    const rank = (post: Doc<"yardPosts">) =>
      post.status === "open" && post.expiresAt > now ? 0 : 1;
    return posts
      .toSorted((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt)
      .map((post) => toPostView(post, org, materials));
  },
});

/**
 * What yards in the city are paying kabadiwalas right now: every open post
 * (expiring within a week), and the L2 board line where enough yards report.
 */
export const yardPostsForSeller = query({
  args: {},
  returns: v.object({
    posts: v.array(vYardPostView),
    boards: v.array(
      v.object({
        material: vMaterialRef,
        status: vBoardStatus,
        typicalPaise: v.number(),
        lowPaise: v.union(v.number(), v.null()),
        highPaise: v.union(v.number(), v.null()),
        nOrgs: v.number(),
        computedAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, ["kabadiwala"]);
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const now = Date.now();
    const open = await ctx.db
      .query("yardPosts")
      .withIndex("by_city_status", (q) =>
        q.eq("city", org.city).eq("status", "open"),
      )
      .take(PAGE);
    const posts = [];
    for (const post of open) {
      if (post.expiresAt <= now) continue;
      const yard = await orgOf(post.orgId);
      if (yard?.status !== "active") continue;
      posts.push(toPostView(post, yard, materials));
    }
    posts.sort(
      (a, b) =>
        a.material.code.localeCompare(b.material.code) ||
        b.paisePerKg - a.paisePerKg,
    );

    const lastRun = await ctx.db
      .query("priceRuns")
      .withIndex("by_city_ranAt", (q) => q.eq("city", org.city))
      .order("desc")
      .first();
    const boardRows = lastRun
      ? await ctx.db
          .query("priceBoards")
          .withIndex("by_city_date", (q) =>
            q.eq("city", org.city).eq("date", lastRun.date),
          )
          .take(PAGE)
      : [];
    const boards = boardRows
      .filter((row) => row.level === "L2")
      .map((row) => ({
        material: materialRef(materials, row.materialCode),
        status: row.status,
        typicalPaise: row.typicalPaise,
        lowPaise: row.lowPaise,
        highPaise: row.highPaise,
        nOrgs: row.nOrgs,
        computedAt: row.computedAt,
      }));
    return { posts, boards };
  },
});
