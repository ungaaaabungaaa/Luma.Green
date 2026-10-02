import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import {
  buyerKindFor,
  isInEscrow,
  type OrgKind,
  requiresEwayBill,
  safePaiseFor,
  sellerKindFor,
  type TradeAction,
  tradeActionsFor,
  tradeStep,
} from "./lib/chain";
import { stockGramsAfter } from "./lib/inventory";
import { indiaToday } from "./lib/onboarding";
import { vOrgKind, vTradeStatus } from "./lib/validators";
import {
  vListingView,
  vMaterialRef,
  vTradeAction,
  vTradeView,
} from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";

/**
 * The business-to-business market: lots offered one step up the chain
 * (kabadiwala → yard → recycler → manufacturer), and the trades that move
 * them with the money held in escrow until the buyer confirms delivery.
 *
 * Escrow is simulated in the prototype (docs/decisions/0009): a trade's
 * status says where the money is; nothing moves. Every step writes the audit
 * log, and stock moves only at dispatch (seller) and delivery (buyer).
 */

const ORG_KINDS: readonly OrgKind[] = [
  "kabadiwala",
  "yard",
  "recycler",
  "manufacturer",
];
/** Kinds with someone to sell to: kabadiwalas, yards and recyclers. */
const SELLER_KINDS = ORG_KINDS.filter((kind) => buyerKindFor(kind) !== null);
/** Kinds with someone to buy from: yards, recyclers and manufacturers. */
const BUYER_KINDS = ORG_KINDS.filter((kind) => sellerKindFor(kind) !== null);

/** The most rows one screen reads. */
const PAGE = 200;
/** Fail closed when the pilot cannot account for every stock reservation. */
const RESERVATION_LIMIT = 1000;
/** Listing closure is atomic; never decline only part of its waiting queue. */
const WAITING_TRADE_LIMIT = 1000;
/** A listing's note, in characters. The sell form uses the same limit. */
const NOTE_MAX_LENGTH = 140;

type Side = "buyer" | "seller";
type Materials = Awaited<ReturnType<typeof materialIndex>>;

interface Actor {
  profileId: Id<"profiles">;
  orgId: Id<"orgs">;
}

// --- Shared result shapes ----------------------------------------------------

const vStage = v.union(v.literal("scrap"), v.literal("recycled"));

const vParty = v.object({
  name: v.string(),
  kind: vOrgKind,
  address: v.string(),
  gstin: v.optional(v.string()),
});

const vTradeReceipt = v.object({
  id: v.id("trades"),
  /** LG-26-0001; null until the buyer pays into escrow. */
  number: v.union(v.string(), v.null()),
  status: vTradeStatus,
  side: v.union(v.literal("buyer"), v.literal("seller")),
  /** When the money went into escrow: the receipt's date. */
  issuedAt: v.union(v.number(), v.null()),
  /** When delivery was confirmed and the money released to the seller. */
  releasedAt: v.union(v.number(), v.null()),
  seller: vParty,
  buyer: vParty,
  line: v.object({
    material: vMaterialRef,
    grams: v.number(),
    paisePerKg: v.number(),
    paise: v.number(),
  }),
  totalPaise: v.number(),
  inEscrow: v.boolean(),
  needsEwayBill: v.boolean(),
});

// --- Helpers -----------------------------------------------------------------

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function materialRef(materials: Materials, code: string) {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? ("other" as const),
  };
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

function sideOf(trade: Doc<"trades">, orgId: Id<"orgs">): Side | null {
  if (trade.buyerOrgId === orgId) return "buyer";
  return trade.sellerOrgId === orgId ? "seller" : null;
}

function newestFirst<T extends { createdAt: number }>(a: T, b: T): number {
  return b.createdAt - a.createdAt;
}

/** Open lots sort before sold and withdrawn ones. */
function openRank(listing: Doc<"listings">): number {
  return listing.status === "open" ? 0 : 1;
}

function partyOf(business: Doc<"orgs">) {
  return {
    name: business.name,
    kind: business.kind,
    address: business.address,
    gstin: business.gstin,
  };
}

function toListingView(
  listing: Doc<"listings">,
  seller: Doc<"orgs">,
  materials: Materials,
  myOrgId: Id<"orgs">,
) {
  return {
    id: listing._id,
    seller: { name: seller.name, area: seller.area, kind: seller.kind },
    material: materialRef(materials, listing.materialCode),
    grams: listing.grams,
    askPaisePerKg: listing.askPaisePerKg,
    note: listing.note,
    status: listing.status,
    isMine: listing.orgId === myOrgId,
    createdAt: listing.createdAt,
  };
}

function toTradeView(
  trade: Doc<"trades">,
  side: Side,
  counterparty: Doc<"orgs">,
  materials: Materials,
) {
  return {
    id: trade._id,
    material: materialRef(materials, trade.materialCode),
    grams: trade.grams,
    paisePerKg: trade.paisePerKg,
    totalPaise: trade.totalPaise,
    status: trade.status,
    timeline: trade.timeline,
    counterparty: {
      name: counterparty.name,
      area: counterparty.area,
      kind: counterparty.kind,
    },
    invoiceNo: trade.invoiceNo,
    needsEwayBill: requiresEwayBill(trade.totalPaise),
    inEscrow: isInEscrow(trade.status),
    actions: tradeActionsFor(trade.status, side),
    createdAt: trade.createdAt,
  };
}

async function audit(
  ctx: MutationCtx,
  entry: {
    orgId: Id<"orgs">;
    actorProfileId: Id<"profiles">;
    action: string;
    entityTable: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert("auditLog", { ...entry, createdAt: Date.now() });
}

/**
 * Grams of each material a business has already promised: on open listings,
 * or sold and not yet dispatched. What's left of its stock is free to list,
 * so the same grams are never offered twice.
 */
async function promisedGrams(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
): Promise<Map<string, number>> {
  const promised = new Map<string, number>();
  const add = (code: string, grams: number) => {
    promised.set(code, (promised.get(code) ?? 0) + grams);
  };
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .filter((q) => q.eq(q.field("status"), "open"))
    .take(RESERVATION_LIMIT + 1);
  if (listings.length > RESERVATION_LIMIT) {
    throw new ConvexError("TOO_MANY_RESERVATIONS");
  }
  for (const listing of listings) {
    if (listing.status === "open") add(listing.materialCode, listing.grams);
  }
  const sales = await ctx.db
    .query("trades")
    .withIndex("by_seller", (q) => q.eq("sellerOrgId", orgId))
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "accepted"),
        q.eq(q.field("status"), "paid_to_escrow"),
      ),
    )
    .take(RESERVATION_LIMIT + 1);
  if (sales.length > RESERVATION_LIMIT) {
    throw new ConvexError("TOO_MANY_RESERVATIONS");
  }
  for (const trade of sales) {
    if (trade.status === "accepted" || trade.status === "paid_to_escrow") {
      add(trade.materialCode, trade.grams);
    }
  }
  return promised;
}

/** Stock per material, and how much of it is free to list. */
async function stockFor(ctx: QueryCtx, orgId: Id<"orgs">) {
  const rows = await ctx.db
    .query("inventory")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .take(PAGE);
  const promised = await promisedGrams(ctx, orgId);
  return new Map(
    rows.map((row) => [
      row.materialCode,
      {
        stockGrams: row.grams,
        availableGrams: Math.max(
          0,
          row.grams - (promised.get(row.materialCode) ?? 0),
        ),
      },
    ]),
  );
}

/** Adds (or, negative, takes) grams of one material to a business's stock. */
async function moveStock(
  ctx: MutationCtx,
  actor: Actor,
  trade: Doc<"trades">,
  deltaGrams: number,
  now: number,
) {
  const row = await ctx.db
    .query("inventory")
    .withIndex("by_org_material", (q) =>
      q.eq("orgId", actor.orgId).eq("materialCode", trade.materialCode),
    )
    .first();
  if (!isPositiveInteger(trade.grams)) throw new ConvexError("INVALID_WEIGHT");
  const grams = stockGramsAfter(row?.grams ?? 0, deltaGrams);
  let inventoryId: Id<"inventory">;
  if (row) {
    inventoryId = row._id;
    await ctx.db.patch("inventory", row._id, { grams, updatedAt: now });
  } else {
    inventoryId = await ctx.db.insert("inventory", {
      orgId: actor.orgId,
      materialCode: trade.materialCode,
      grams,
      updatedAt: now,
    });
  }
  await audit(ctx, {
    orgId: actor.orgId,
    actorProfileId: actor.profileId,
    action: "inventory.adjusted",
    entityTable: "inventory",
    entityId: inventoryId,
    metadata: {
      materialCode: trade.materialCode,
      deltaGrams,
      grams,
      tradeId: trade._id,
    },
  });
}

/**
 * Declines every request still waiting on a listing that has closed — all
 * but `keep`, the request whose acceptance just sold the lot out.
 */
async function declineWaiting(
  ctx: MutationCtx,
  actor: Actor,
  listingId: Id<"listings">,
  now: number,
  keep?: Id<"trades">,
) {
  const trades = await ctx.db
    .query("trades")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .filter((q) => q.eq(q.field("status"), "requested"))
    .take(WAITING_TRADE_LIMIT + 1);
  if (trades.length > WAITING_TRADE_LIMIT) {
    throw new ConvexError("TOO_MANY_TRADE_REQUESTS");
  }
  for (const trade of trades) {
    if (trade.status !== "requested" || trade._id === keep) continue;
    await ctx.db.patch("trades", trade._id, {
      status: "declined",
      timeline: [...trade.timeline, { status: "declined", at: now }],
      updatedAt: now,
    });
    await audit(ctx, {
      orgId: actor.orgId,
      actorProfileId: actor.profileId,
      action: "trade.declined",
      entityTable: "trades",
      entityId: trade._id,
      metadata: { from: "requested", reason: "listing_closed", listingId },
    });
  }
}

/** Accepting takes the trade's grams off the listing; at zero it's sold. */
async function takeFromListing(
  ctx: MutationCtx,
  actor: Actor,
  trade: Doc<"trades">,
  now: number,
) {
  const listing = await ctx.db.get("listings", trade.listingId);
  if (listing?.status !== "open") throw new ConvexError("LISTING_NOT_OPEN");
  if (listing.grams < trade.grams) throw new ConvexError("NOT_ENOUGH_LEFT");
  const grams = listing.grams - trade.grams;
  await ctx.db.patch("listings", listing._id, {
    grams,
    status: grams === 0 ? "sold" : "open",
    updatedAt: now,
  });
  if (grams === 0) {
    await declineWaiting(ctx, actor, listing._id, now, trade._id);
  }
}

/**
 * The next trade receipt number for the year in India: LG-26-0001, … It
 * reads every trade — fine for the pilot's volume; a counter row replaces
 * this scan when real payments arrive.
 */
async function nextReceiptNumber(ctx: QueryCtx, now: number): Promise<string> {
  const prefix = `LG-${indiaToday(now).slice(2, 4)}-`;
  let last = 0;
  for await (const trade of ctx.db.query("trades")) {
    if (!trade.invoiceNo?.startsWith(prefix)) continue;
    const sequence = Number(trade.invoiceNo.slice(prefix.length));
    if (Number.isSafeInteger(sequence)) last = Math.max(last, sequence);
  }
  return `${prefix}${String(last + 1).padStart(4, "0")}`;
}

/** What a step does to the money in escrow (simulated in the prototype). */
const ESCROW_EFFECT: Partial<Record<TradeAction, "held" | "released">> = {
  pay: "held",
  confirm: "released",
};

/** What a step moves besides the trade itself: the listing or the stock. */
async function applyStep(
  ctx: MutationCtx,
  actor: Actor,
  trade: Doc<"trades">,
  action: TradeAction,
  now: number,
): Promise<void> {
  switch (action) {
    case "accept": {
      await takeFromListing(ctx, actor, trade, now);
      break;
    }
    case "dispatch": {
      await moveStock(ctx, actor, trade, -trade.grams, now);
      break;
    }
    case "confirm": {
      // Delivered: the load joins the buyer's stock.
      await moveStock(ctx, actor, trade, trade.grams, now);
      break;
    }
    case "decline":
    case "pay": {
      break;
    }
  }
}

// --- Buying ------------------------------------------------------------------

/**
 * Open lots from the kind of business that sells to mine, in my city, newest
 * first: kabadiwalas for a yard, yards for a recycler, recyclers for a
 * manufacturer.
 */
export const browse = query({
  args: { materialCode: v.optional(v.string()) },
  returns: v.array(vListingView),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, BUYER_KINDS);
    const sellerKind = sellerKindFor(org.kind);
    if (!sellerKind) return [];
    const rows = await ctx.db
      .query("listings")
      .withIndex("by_status_kind", (q) =>
        q.eq("status", "open").eq("sellerKind", sellerKind),
      )
      .order("desc")
      .take(PAGE);
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const views = [];
    for (const listing of rows.toSorted(newestFirst)) {
      const isForMe =
        listing.grams > 0 &&
        listing.orgId !== org._id &&
        listing.city === org.city &&
        (args.materialCode === undefined ||
          listing.materialCode === args.materialCode);
      if (!isForMe) continue;
      const seller = await orgOf(listing.orgId);
      if (seller?.status !== "active") continue;
      views.push(toListingView(listing, seller, materials, org._id));
    }
    return views;
  },
});

/**
 * Asks to buy part (or all) of a lot at its asking price. Nothing is held
 * yet: the seller accepts first, then the buyer pays into escrow.
 */
export const requestTrade = mutation({
  args: { listingId: v.id("listings"), grams: v.number() },
  returns: v.id("trades"),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, BUYER_KINDS);
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing?.city !== org.city) throw new ConvexError("NOT_FOUND");
    if (listing.orgId === org._id) throw new ConvexError("OWN_LISTING");
    if (buyerKindFor(listing.sellerKind) !== org.kind) {
      throw new ConvexError("WRONG_ROLE");
    }
    const seller = await ctx.db.get("orgs", listing.orgId);
    if (seller?.status !== "active") throw new ConvexError("NOT_FOUND");
    if (listing.status !== "open") throw new ConvexError("LISTING_NOT_OPEN");
    if (!isPositiveInteger(args.grams)) throw new ConvexError("INVALID_WEIGHT");
    if (args.grams > listing.grams) throw new ConvexError("NOT_ENOUGH_LEFT");

    const now = Date.now();
    const totalPaise = safePaiseFor(args.grams, listing.askPaisePerKg);
    if (totalPaise === null) throw new ConvexError("INVALID_PRICE");
    const tradeId = await ctx.db.insert("trades", {
      listingId: listing._id,
      sellerOrgId: listing.orgId,
      buyerOrgId: org._id,
      materialCode: listing.materialCode,
      grams: args.grams,
      paisePerKg: listing.askPaisePerKg,
      totalPaise,
      status: "requested",
      timeline: [{ status: "requested", at: now }],
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "trade.requested",
      entityTable: "trades",
      entityId: tradeId,
      metadata: {
        listingId: listing._id,
        grams: args.grams,
        paisePerKg: listing.askPaisePerKg,
        totalPaise,
      },
    });
    return tradeId;
  },
});

// --- Selling -----------------------------------------------------------------

/** My lots on the market: open ones first, then sold and withdrawn. */
export const myListings = query({
  args: {},
  returns: v.array(vListingView),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, SELLER_KINDS);
    const rows = await ctx.db
      .query("listings")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(PAGE);
    const materials = await materialIndex(ctx);
    return rows
      .toSorted((a, b) => openRank(a) - openRank(b) || newestFirst(a, b))
      .map((listing) => toListingView(listing, org, materials, org._id));
  },
});

/**
 * What I can put on sale: each material in stock, with the grams not already
 * listed or sold. Feeds the sell form.
 */
export const sellable = query({
  args: {},
  returns: v.array(
    v.object({
      material: vMaterialRef,
      stage: vStage,
      stockGrams: v.number(),
      availableGrams: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, SELLER_KINDS);
    const stock = await stockFor(ctx, org._id);
    const materials = await materialIndex(ctx);
    // The material index is in catalogue order, so the form is too.
    const items = [];
    for (const material of materials.values()) {
      const held = stock.get(material.code);
      if (!held || held.stockGrams <= 0 || !material.active) continue;
      items.push({
        material: materialRef(materials, material.code),
        stage: material.stage,
        stockGrams: held.stockGrams,
        availableGrams: held.availableGrams,
      });
    }
    return items;
  },
});

/** Offers a lot to the next business up the chain. */
// eslint-disable-next-line unicorn/no-non-function-verb-prefix -- a registered Convex mutation is a const, and its name is the public API (api.market.createListing)
export const createListing = mutation({
  args: {
    materialCode: v.string(),
    grams: v.number(),
    askPaisePerKg: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, SELLER_KINDS);
    if (!isPositiveInteger(args.grams)) throw new ConvexError("INVALID_WEIGHT");
    if (
      !isPositiveInteger(args.askPaisePerKg) ||
      safePaiseFor(args.grams, args.askPaisePerKg) === null
    ) {
      throw new ConvexError("INVALID_PRICE");
    }
    const trimmed = args.note?.trim();
    const note = trimmed === "" ? undefined : trimmed;
    if (note !== undefined && note.length > NOTE_MAX_LENGTH) {
      throw new ConvexError("NOTE_TOO_LONG");
    }
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", args.materialCode))
      .first();
    if (!material?.active) throw new ConvexError("UNKNOWN_MATERIAL");
    const stock = await stockFor(ctx, org._id);
    const available = stock.get(args.materialCode)?.availableGrams ?? 0;
    if (args.grams > available) throw new ConvexError("NOT_ENOUGH_STOCK");

    const now = Date.now();
    const listingId = await ctx.db.insert("listings", {
      orgId: org._id,
      sellerKind: org.kind,
      materialCode: args.materialCode,
      grams: args.grams,
      askPaisePerKg: args.askPaisePerKg,
      city: org.city,
      note,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "listing.created",
      entityTable: "listings",
      entityId: listingId,
      metadata: {
        materialCode: args.materialCode,
        grams: args.grams,
        askPaisePerKg: args.askPaisePerKg,
      },
    });
    return listingId;
  },
});

/** Takes an open lot off the market; requests waiting on it are declined. */
export const withdraw = mutation({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx);
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing?.orgId !== org._id) throw new ConvexError("NOT_FOUND");
    if (listing.status !== "open") throw new ConvexError("LISTING_NOT_OPEN");
    const now = Date.now();
    const actor = { profileId: profile._id, orgId: org._id };
    await ctx.db.patch("listings", listing._id, {
      status: "withdrawn",
      updatedAt: now,
    });
    await declineWaiting(ctx, actor, listing._id, now);
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "listing.withdrawn",
      entityTable: "listings",
      entityId: listing._id,
      metadata: { gramsLeft: listing.grams },
    });
    return null;
  },
});

// --- Trades --------------------------------------------------------------------

/** My trades, newest first, with the steps open to me on each. */
export const trades = query({
  args: {},
  returns: v.object({
    buying: v.array(vTradeView),
    selling: v.array(vTradeView),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const bought = await ctx.db
      .query("trades")
      .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
      .order("desc")
      .take(PAGE);
    const sold = await ctx.db
      .query("trades")
      .withIndex("by_seller", (q) => q.eq("sellerOrgId", org._id))
      .order("desc")
      .take(PAGE);
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);

    const views = async (rows: Doc<"trades">[], side: Side) => {
      const result = [];
      for (const trade of rows.toSorted(newestFirst)) {
        const counterparty = await orgOf(
          side === "buyer" ? trade.sellerOrgId : trade.buyerOrgId,
        );
        if (counterparty) {
          result.push(toTradeView(trade, side, counterparty, materials));
        }
      }
      return result;
    };
    return {
      buying: await views(bought, "buyer"),
      selling: await views(sold, "seller"),
    };
  },
});

/**
 * One step of a trade, by the side whose turn it is: the seller accepts or
 * declines, the buyer pays into escrow, the seller dispatches, the buyer
 * confirms delivery.
 */
export const act = mutation({
  args: { tradeId: v.id("trades"), action: vTradeAction },
  returns: v.object({
    status: vTradeStatus,
    invoiceNo: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx);
    const trade = await ctx.db.get("trades", args.tradeId);
    const side = trade ? sideOf(trade, org._id) : null;
    if (!trade || !side) throw new ConvexError("NOT_FOUND");
    const next = tradeStep(trade.status, args.action, side);
    if (!next) throw new ConvexError("WRONG_STEP");

    const now = Date.now();
    const actor = { profileId: profile._id, orgId: org._id };
    await applyStep(ctx, actor, trade, args.action, now);
    // Paying into escrow is what issues the trade receipt.
    const invoiceNo =
      args.action === "pay"
        ? await nextReceiptNumber(ctx, now)
        : trade.invoiceNo;
    await ctx.db.patch("trades", trade._id, {
      status: next,
      timeline: [...trade.timeline, { status: next, at: now }],
      invoiceNo,
      updatedAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: `trade.${next}`,
      entityTable: "trades",
      entityId: trade._id,
      metadata: {
        from: trade.status,
        to: next,
        side,
        grams: trade.grams,
        totalPaise: trade.totalPaise,
        invoiceNo,
        escrow: ESCROW_EFFECT[args.action],
      },
    });
    return { status: next, invoiceNo };
  },
});

/**
 * A trade's receipt, for either side: both businesses, the line, the total
 * and the e-way-bill note. A trade receipt, not a GST tax invoice — those
 * come with real payments. Null when the trade isn't found or isn't mine.
 */
export const receipt = query({
  args: { tradeId: v.string() },
  returns: v.union(v.null(), vTradeReceipt),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const tradeId = ctx.db.normalizeId("trades", args.tradeId);
    const trade = tradeId ? await ctx.db.get("trades", tradeId) : null;
    const side = trade ? sideOf(trade, org._id) : null;
    if (!trade || !side) return null;
    const seller = await ctx.db.get("orgs", trade.sellerOrgId);
    const buyer = await ctx.db.get("orgs", trade.buyerOrgId);
    if (!seller || !buyer) return null;
    const materials = await materialIndex(ctx);
    const at = (status: Doc<"trades">["status"]) =>
      trade.timeline.find((entry) => entry.status === status)?.at ?? null;
    return {
      id: trade._id,
      number: trade.invoiceNo ?? null,
      status: trade.status,
      side,
      issuedAt: at("paid_to_escrow"),
      releasedAt: at("completed"),
      seller: partyOf(seller),
      buyer: partyOf(buyer),
      line: {
        material: materialRef(materials, trade.materialCode),
        grams: trade.grams,
        paisePerKg: trade.paisePerKg,
        paise: trade.totalPaise,
      },
      totalPaise: trade.totalPaise,
      inEscrow: isInEscrow(trade.status),
      needsEwayBill: requiresEwayBill(trade.totalPaise),
    };
  },
});
