import { ConvexError, type Infer, v } from "convex/values";

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
  type BookingStatus,
  canMoveBooking,
  kgToGrams,
  type OrgKind,
  paiseFor,
  requiresEwayBill,
  sellerKindFor,
} from "./lib/chain";
import { shiftDate } from "./lib/dates";
import { vSaathiTime } from "./lib/drafts";
import { SLOT_WINDOW_HOURS, type SlotWindow } from "./lib/households";
import { indiaToday } from "./lib/onboarding";
import { isIndianMobile } from "./lib/phone";
import {
  areaOfAddress,
  type Bulk,
  bulkFromNote,
  canMoveLoad,
  canMoveStop,
  DEFAULT_SERVICE_RULES,
  freightFor,
  freightPerKgPaise,
  isOpenLoad,
  litresFor,
  type LoadStatus,
  mapsDirectionsUrl,
  mapsSearchUrl,
  nearestNeighbourOrder,
  percentOf,
  type Point,
  pointForAddress,
  restrictionsFor,
  routeKm,
  roundKm,
  SERVICE_RULE_KEYS,
  type ServiceRuleKey,
  slotUsage,
  type StopStatus,
  vehicleFit as fitVehicles,
  type VehicleKey,
  type VehicleSpec,
  weightGap,
} from "./lib/routing";
import { vBookingStatus, vOrgKind } from "./lib/validators";
import { vMaterialRef } from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";
import {
  vLoadStatus,
  vPaidBy,
  vStopStatus,
  vVehicleKey,
} from "./tables/logistics";

/**
 * Logistics — docs/plan.md, "pool the business loads, not the household
 * ones". Household pickups ride on the kabadiwala's own vehicle: time slots
 * with a limit per shop, a drop-off nudge for small loads, and today's route
 * in the best order. Business loads are pooled: a yard fills one vehicle from
 * several nearby shops, each shop accepts its stop, the freight is estimated
 * from the admin's fare table, and Bengaluru's goods-vehicle bans warn when a
 * window clashes. Every write goes to the audit log.
 */

const SHOP = ["kabadiwala"] as const;
/** Businesses with someone below them to collect from. */
const BUYERS = ["yard", "recycler", "manufacturer"] as const;

/** The most stops one vehicle takes in a trip. */
const MAX_STOPS = 12;
/** How far ahead a collection can be planned, in days. */
const PLAN_DAYS_AHEAD = 14;
/** Rows one screen reads. */
const PAGE = 200;
const MIN_SLOT_LIMIT = 1;
const MAX_SLOT_LIMIT = 20;
/** Nothing on a scrap vehicle weighs more than this; a larger number is a slip. */
const MAX_LOAD_GRAMS = 50_000_000;

type Org = Doc<"orgs">;
type Load = Doc<"loads">;
type Stop = Load["stops"][number];
type Materials = Awaited<ReturnType<typeof materialIndex>>;
type Side = "buyer" | "seller";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// --- Result shapes -----------------------------------------------------------------

const vPoint = v.object({ lat: v.number(), lng: v.number() });

const vVehicleView = v.object({
  key: vVehicleKey,
  name: v.string(),
  payloadKg: v.number(),
  volumeLitres: v.number(),
  baseFarePaise: v.number(),
  perKmPaise: v.number(),
  loadingPaise: v.number(),
});

const vFreight = v.object({
  basePaise: v.number(),
  distancePaise: v.number(),
  loadingPaise: v.number(),
  totalPaise: v.number(),
});

const vRestrictionView = v.object({
  id: v.id("roadRestrictions"),
  road: v.string(),
  vehicleTypes: v.array(vVehicleKey),
  hoursFrom: v.number(),
  hoursTo: v.number(),
  from: v.string(),
  to: v.string(),
  note: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
});

const vLoadAction = v.union(
  v.literal("start"),
  v.literal("deliver"),
  v.literal("cancel"),
  v.literal("accept"),
  v.literal("decline"),
);

const vStopView = v.object({
  orgId: v.id("orgs"),
  order: v.number(),
  name: v.string(),
  area: v.string(),
  address: v.string(),
  /** The shop's number, for the driver; only on the buyer's side. */
  phone: v.optional(v.string()),
  material: vMaterialRef,
  grams: v.number(),
  litres: v.number(),
  status: vStopStatus,
  collectedGrams: v.optional(v.number()),
  isMine: v.boolean(),
  /** The buyer may weigh and mark this stop collected now. */
  canCollect: v.boolean(),
  mapsUrl: v.string(),
});

const vLoadView = v.object({
  id: v.id("loads"),
  status: vLoadStatus,
  side: v.union(v.literal("buyer"), v.literal("seller")),
  buyer: v.object({ name: v.string(), area: v.string(), kind: vOrgKind }),
  vehicle: v.object({ key: vVehicleKey, name: v.string() }),
  payloadKg: v.number(),
  volumeLitres: v.number(),
  date: v.string(),
  window: vSaathiTime,
  stops: v.array(vStopView),
  totalGrams: v.number(),
  totalLitres: v.number(),
  weightPercent: v.number(),
  volumePercent: v.number(),
  valuePaise: v.number(),
  needsEwayBill: v.boolean(),
  routeKm: v.number(),
  freight: vFreight,
  freightPerKgPaise: v.number(),
  paidBy: vPaidBy,
  driverPhone: v.optional(v.string()),
  vehicleNo: v.optional(v.string()),
  leavingGrams: v.optional(v.number()),
  arrivedGrams: v.optional(v.number()),
  weightGap: v.optional(
    v.object({
      gapGrams: v.number(),
      allowedGrams: v.number(),
      isWithinTolerance: v.boolean(),
    }),
  ),
  restrictions: v.array(vRestrictionView),
  actions: v.array(vLoadAction),
  timeline: v.array(v.object({ status: vLoadStatus, at: v.number() })),
  startedAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),
  createdAt: v.number(),
});

// --- Shared reads ---------------------------------------------------------------------

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isWholeNumber(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function materialRef(materials: Materials, code: string) {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? ("other" as const),
  };
}

/** A service rule's value, or its default when the admin hasn't set one. */
async function ruleValue(ctx: QueryCtx, key: ServiceRuleKey): Promise<number> {
  const row = await ctx.db
    .query("serviceRules")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return row?.value ?? DEFAULT_SERVICE_RULES[key].value;
}

type VehicleRow = Doc<"vehicleTypes">;

async function activeVehicles(ctx: QueryCtx): Promise<VehicleRow[]> {
  const rows = await ctx.db.query("vehicleTypes").take(50);
  return rows
    .filter((row) => row.active)
    .toSorted((a, b) => a.sortOrder - b.sortOrder);
}

async function vehicleByKey(
  ctx: QueryCtx,
  key: VehicleKey,
): Promise<VehicleRow | null> {
  return ctx.db
    .query("vehicleTypes")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
}

function vehicleView(row: VehicleRow) {
  return {
    key: row.key,
    name: row.name,
    payloadKg: row.payloadKg,
    volumeLitres: row.volumeLitres,
    baseFarePaise: row.baseFarePaise,
    perKmPaise: row.perKmPaise,
    loadingPaise: row.loadingPaise,
  };
}

function restrictionView(row: Doc<"roadRestrictions">) {
  return {
    id: row._id,
    road: row.road,
    vehicleTypes: row.vehicleTypes,
    hoursFrom: row.hoursFrom,
    hoursTo: row.hoursTo,
    from: row.from,
    to: row.to,
    note: row.note,
    sourceUrl: row.sourceUrl,
  };
}

/** Restrictions still in force on or after `date`. */
async function restrictionsFrom(ctx: QueryCtx, date: string) {
  return ctx.db
    .query("roadRestrictions")
    .withIndex("by_to", (q) => q.gte("to", date))
    .take(PAGE);
}

/** The bans that bite a vehicle during a booking window on a date. */
async function warningsFor(
  ctx: QueryCtx,
  vehicleType: VehicleKey,
  date: string,
  window: SlotWindow,
) {
  const rows = await restrictionsFrom(ctx, date);
  const hours = SLOT_WINDOW_HOURS[window];
  return restrictionsFor(rows, vehicleType, date, hours).map((row) =>
    restrictionView(row),
  );
}

/** Where a business is: its pin, or the centre of its area. */
function orgPoint(org: Org): Point | undefined {
  return org.location ?? pointForAddress(org.address, org.city);
}

/** The shop's own limit, or the default rule. */
async function slotLimitFor(ctx: QueryCtx, orgId: Id<"orgs">): Promise<number> {
  const own = await ctx.db
    .query("slotLimits")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  return own?.limit ?? ruleValue(ctx, "defaultSlotLimit");
}

/** A shop's pickups (not drop-offs) still to happen on one date. */
async function pickupsOn(ctx: QueryCtx, orgId: Id<"orgs">, date: string) {
  const open: BookingStatus[] = ["requested", "accepted", "on_the_way"];
  const bookings: Doc<"bookings">[] = [];
  for (const status of open) {
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", orgId).eq("status", status),
      )
      .order("desc")
      .take(300);
    bookings.push(
      ...rows.filter((row) => row.slotDate === date && row.mode === "pickup"),
    );
  }
  return bookings;
}

async function audit(
  ctx: MutationCtx,
  entry: {
    orgId?: Id<"orgs">;
    actorProfileId: Id<"profiles"> | undefined;
    action: string;
    entityTable: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert("auditLog", { ...entry, createdAt: Date.now() });
}

// --- Public: what the household sell flow asks ----------------------------------------

/**
 * `/sell`, the "when" step: how many pickups a shop already has in each
 * window of a date against its limit, so full windows can be hidden, plus
 * the minimum below which a drop-off is suggested. Public, like the shop
 * list: a household hasn't signed in yet. Nothing personal is returned.
 */
export const slotAvailability = query({
  args: { orgId: v.id("orgs"), date: v.string() },
  returns: v.object({
    date: v.string(),
    limit: v.number(),
    slotMinutes: v.number(),
    minPickupGrams: v.number(),
    windows: v.array(
      v.object({
        window: vSaathiTime,
        booked: v.number(),
        limit: v.number(),
        isFull: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    if (!DATE.test(args.date)) throw new ConvexError("INVALID_DATE");
    const org = await ctx.db.get("orgs", args.orgId);
    if (org?.kind !== "kabadiwala" || org.status !== "active") {
      throw new ConvexError("NOT_FOUND");
    }
    const limit = await slotLimitFor(ctx, org._id);
    const bookings = await pickupsOn(ctx, org._id, args.date);
    return {
      date: args.date,
      limit,
      slotMinutes: await ruleValue(ctx, "slotMinutes"),
      minPickupGrams: await ruleValue(ctx, "minPickupGrams"),
      windows: slotUsage(bookings, limit),
    };
  },
});

const vBulk = v.union(v.literal("loose"), v.literal("baled"));

/**
 * Which vehicle a basket needs, from its estimated kilos and how bulky each
 * material family is: a handcart of PET bottles is full at 30 kg. Public,
 * for the estimate screen; only reads the catalogue and vehicle table.
 */
export const vehicleFit = query({
  args: {
    items: v.array(
      v.object({
        materialCode: v.string(),
        kg: v.number(),
        bulk: v.optional(vBulk),
      }),
    ),
  },
  returns: v.object({
    grams: v.number(),
    litres: v.number(),
    fits: v.array(
      v.object({
        key: vVehicleKey,
        name: v.string(),
        payloadKg: v.number(),
        volumeLitres: v.number(),
        weightPercent: v.number(),
        volumePercent: v.number(),
        fitsWeight: v.boolean(),
        fitsVolume: v.boolean(),
        fits: v.boolean(),
      }),
    ),
    smallest: v.union(vVehicleKey, v.null()),
  }),
  handler: async (ctx, args) => {
    if (args.items.length > 30) throw new ConvexError("TOO_MANY_ITEMS");
    for (const item of args.items) {
      if (!Number.isFinite(item.kg) || item.kg < 0 || item.kg > 50_000) {
        throw new ConvexError("INVALID_WEIGHT");
      }
    }
    const materials = await materialIndex(ctx);
    const vehicles = await activeVehicles(ctx);
    const names = new Map(vehicles.map((row) => [row.key, row.name]));
    const fit = fitVehicles(
      args.items.map((item) => ({
        grams: kgToGrams(item.kg),
        family: materials.get(item.materialCode)?.family ?? "other",
        bulk: item.bulk,
      })),
      vehicles,
    );
    return {
      grams: fit.grams,
      litres: fit.litres,
      fits: fit.fits.map((row) => ({ ...row, name: names.get(row.key) ?? row.key })),
      smallest: fit.smallest,
    };
  },
});

// --- The kabadiwala's day ---------------------------------------------------------------

const WINDOWS: readonly SlotWindow[] = ["morning", "afternoon", "evening"];
const WINDOW_ORDER: Record<SlotWindow, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

/**
 * Today's pickups in driving order: window by window, and within a window
 * the nearest stop next, starting from the shop and carrying on from the
 * last stop. Bookings have no pin, so their area's centre stands in.
 */
function orderStops(
  shop: Point | undefined,
  city: string,
  bookings: readonly Doc<"bookings">[],
): Doc<"bookings">[] {
  const locate = (booking: Doc<"bookings">) =>
    booking.address === undefined
      ? undefined
      : pointForAddress(booking.address, city);
  const byWindow = bookings.toSorted(
    (a, b) =>
      WINDOW_ORDER[a.slotWindow] - WINDOW_ORDER[b.slotWindow] ||
      a.createdAt - b.createdAt,
  );
  if (!shop) return byWindow;

  const ordered: Doc<"bookings">[] = [];
  let here = shop;
  for (const window of WINDOWS) {
    const group = byWindow.filter((b) => b.slotWindow === window);
    const visited = nearestNeighbourOrder(here, group, locate);
    ordered.push(...visited);
    const last = visited.at(-1);
    const lastPoint = last ? locate(last) : undefined;
    here = lastPoint ?? here;
  }
  return ordered;
}

const vRouteStop = v.object({
  bookingId: v.id("bookings"),
  order: v.number(),
  name: v.optional(v.string()),
  phone: v.string(),
  address: v.optional(v.string()),
  area: v.string(),
  window: vSaathiTime,
  hours: v.array(v.number()),
  items: v.array(v.object({ material: vMaterialRef, estKg: v.number() })),
  estimatePaise: v.number(),
  status: vBookingStatus,
  mapsUrl: v.optional(v.string()),
});

/**
 * `/app/route`: the shop's accepted and on-the-way pickups for today, in
 * driving order, with one link that opens the whole route in Google Maps.
 * Accepted bookings already show the household's phone and address.
 */
export const routeToday = query({
  args: {},
  returns: v.object({
    date: v.string(),
    shop: v.object({
      name: v.string(),
      area: v.string(),
      hasLocation: v.boolean(),
    }),
    stops: v.array(vRouteStop),
    totalEstGrams: v.number(),
    directionsUrl: v.union(v.string(), v.null()),
    /** Accepted pickups that "Start route" would set on the way. */
    toStart: v.number(),
    slotLimit: v.number(),
    defaultSlotLimit: v.number(),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, SHOP);
    const today = indiaToday();
    const materials = await materialIndex(ctx);
    const pickups = await pickupsOn(ctx, org._id, today);
    const bookings = pickups.filter(
      (b) => b.status === "accepted" || b.status === "on_the_way",
    );
    const start = orgPoint(org);
    const ordered = orderStops(start, org.city, bookings);

    const stops = ordered.map((booking, index) => ({
      bookingId: booking._id,
      order: index + 1,
      name: booking.name,
      phone: booking.phone,
      address: booking.address,
      area:
        booking.address === undefined
          ? org.area
          : areaOfAddress(booking.address, org.city),
      window: booking.slotWindow,
      hours: [...SLOT_WINDOW_HOURS[booking.slotWindow]],
      items: booking.items.map((item) => ({
        material: materialRef(materials, item.materialCode),
        estKg: item.estKg,
      })),
      estimatePaise: booking.estimatePaise,
      status: booking.status,
      mapsUrl:
        booking.address === undefined ? undefined : mapsSearchUrl(booking.address),
    }));
    const addresses = ordered
      .map((b) => b.address)
      .filter((address): address is string => address !== undefined);
    const slotLimit = await slotLimitFor(ctx, org._id);

    return {
      date: today,
      shop: { name: org.name, area: org.area, hasLocation: start !== undefined },
      stops,
      totalEstGrams: ordered.reduce(
        (sum, b) => sum + b.items.reduce((s, item) => s + kgToGrams(item.estKg), 0),
        0,
      ),
      directionsUrl: mapsDirectionsUrl(start ?? org.address, addresses),
      toStart: ordered.filter((b) => b.status === "accepted").length,
      slotLimit,
      defaultSlotLimit: await ruleValue(ctx, "defaultSlotLimit"),
    };
  },
});

/**
 * "Start route": every accepted pickup for today is now on the way, so each
 * household's tracking page says so. Pickups already on the way are left as
 * they are.
 */
export const startRoute = mutation({
  args: {},
  returns: v.object({ started: v.number() }),
  handler: async (ctx) => {
    const { profile, org } = await requireOrg(ctx, SHOP);
    const today = indiaToday();
    const pickups = await pickupsOn(ctx, org._id, today);
    const accepted = pickups.filter(
      (b) => b.status === "accepted" && canMoveBooking(b.status, "on_the_way"),
    );
    const now = Date.now();
    for (const booking of accepted) {
      await ctx.db.patch("bookings", booking._id, {
        status: "on_the_way",
        timeline: [...booking.timeline, { status: "on_the_way", at: now }],
        updatedAt: now,
      });
      await audit(ctx, {
        orgId: org._id,
        actorProfileId: profile._id,
        action: "booking.on_the_way",
        entityTable: "bookings",
        entityId: booking._id,
        metadata: { from: "accepted", to: "on_the_way", via: "route" },
      });
    }
    return { started: accepted.length };
  },
});

/** How many pickups the shop takes per window. Households see full windows as gone. */
// eslint-disable-next-line unicorn/no-non-function-verb-prefix -- a Convex mutation; its name is the API contract
export const setSlotLimit = mutation({
  args: { limit: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, SHOP);
    if (
      !Number.isSafeInteger(args.limit) ||
      args.limit < MIN_SLOT_LIMIT ||
      args.limit > MAX_SLOT_LIMIT
    ) {
      throw new ConvexError("INVALID_LIMIT");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("slotLimits")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .first();
    let id: Id<"slotLimits">;
    if (existing) {
      id = existing._id;
      await ctx.db.patch("slotLimits", id, { limit: args.limit, updatedAt: now });
    } else {
      id = await ctx.db.insert("slotLimits", {
        orgId: org._id,
        limit: args.limit,
        updatedAt: now,
      });
    }
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "slotLimit.set",
      entityTable: "slotLimits",
      entityId: id,
      metadata: { from: existing?.limit ?? null, to: args.limit },
    });
    return null;
  },
});

// --- Loads: shared views ------------------------------------------------------------------

/** Looks each business up once per request. */
function orgLookup(ctx: QueryCtx) {
  const cache = new Map<Id<"orgs">, Promise<Org | null>>();
  return (id: Id<"orgs">) => {
    let org = cache.get(id);
    if (!org) {
      org = ctx.db.get("orgs", id);
      cache.set(id, org);
    }
    return org;
  };
}

/** A number the driver can call: the shop's listed phone, else its owner's. */
async function contactPhone(
  ctx: QueryCtx,
  org: Org | null,
): Promise<string | undefined> {
  if (!org) return undefined;
  const listed = org.phones.at(0)?.number;
  if (listed !== undefined) return listed;
  if (!org.ownerProfileId) return undefined;
  const owner = await ctx.db.get("profiles", org.ownerProfileId);
  return owner?.phone;
}

function sideOf(load: Load, orgId: Id<"orgs">): Side | null {
  if (load.buyerOrgId === orgId) return "buyer";
  return load.stops.some((stop) => stop.orgId === orgId) ? "seller" : null;
}

function actionsFor(load: Load, side: Side, orgId: Id<"orgs">) {
  const actions: Infer<typeof vLoadAction>[] = [];
  if (side === "buyer") {
    if (canMoveLoad(load.status, "collecting")) actions.push("start");
    if (canMoveLoad(load.status, "delivered")) actions.push("deliver");
    if (canMoveLoad(load.status, "cancelled")) actions.push("cancel");
    return actions;
  }
  const mine = load.stops.find((stop) => stop.orgId === orgId);
  if (mine?.status === "pending" && isOpenLoad(load.status)) {
    actions.push("accept", "decline");
  }
  return actions;
}

async function stopViews(
  ctx: QueryCtx,
  load: Load,
  side: Side,
  myOrgId: Id<"orgs">,
  materials: Materials,
  lookup: ReturnType<typeof orgLookup>,
) {
  const views = [];
  const inOrder = load.stops.toSorted((a, b) => a.order - b.order);
  for (const stop of inOrder) {
    const org = await lookup(stop.orgId);
    const isMine = stop.orgId === myOrgId;
    views.push({
      orgId: stop.orgId,
      order: stop.order,
      name: org?.name ?? "",
      area: org?.area ?? "",
      address: org?.address ?? "",
      phone: side === "buyer" ? await contactPhone(ctx, org) : undefined,
      material: materialRef(materials, stop.materialCode),
      grams: stop.grams,
      litres: stop.litres,
      status: stop.status,
      collectedGrams: stop.collectedGrams,
      isMine,
      canCollect:
        side === "buyer" &&
        load.status === "collecting" &&
        canMoveStop(stop.status, "collected"),
      mapsUrl: mapsSearchUrl(org?.address ?? org?.name ?? ""),
    });
  }
  return views;
}

async function loadView(
  ctx: QueryCtx,
  load: Load,
  side: Side,
  myOrgId: Id<"orgs">,
  materials: Materials,
  lookup: ReturnType<typeof orgLookup>,
) {
  const buyer = await lookup(load.buyerOrgId);
  const vehicle = await vehicleByKey(ctx, load.vehicleType);
  const tolerance = await ruleValue(ctx, "weightTolerancePercent");
  const gap =
    load.leavingGrams !== undefined && load.arrivedGrams !== undefined
      ? weightGap(load.leavingGrams, load.arrivedGrams, tolerance)
      : undefined;
  return {
    id: load._id,
    status: load.status,
    side,
    buyer: {
      name: buyer?.name ?? "",
      area: buyer?.area ?? "",
      kind: buyer?.kind ?? ("yard" as const),
    },
    vehicle: { key: load.vehicleType, name: vehicle?.name ?? load.vehicleType },
    payloadKg: load.payloadKg,
    volumeLitres: load.volumeLitres,
    date: load.date,
    window: load.window,
    stops: await stopViews(ctx, load, side, myOrgId, materials, lookup),
    totalGrams: load.totalGrams,
    totalLitres: load.totalLitres,
    weightPercent: percentOf(load.totalGrams, load.payloadKg * 1000),
    volumePercent: percentOf(load.totalLitres, load.volumeLitres),
    valuePaise: load.valuePaise,
    needsEwayBill: requiresEwayBill(load.valuePaise),
    routeKm: load.routeKm,
    freight: { ...load.freight, totalPaise: load.freightPaise },
    freightPerKgPaise: freightPerKgPaise(load.freightPaise, load.totalGrams),
    paidBy: load.paidBy,
    driverPhone: load.driverPhone,
    vehicleNo: load.vehicleNo,
    leavingGrams: load.leavingGrams,
    arrivedGrams: load.arrivedGrams,
    weightGap: gap,
    restrictions: isOpenLoad(load.status)
      ? await warningsFor(ctx, load.vehicleType, load.date, load.window)
      : [],
    actions: actionsFor(load, side, myOrgId),
    timeline: load.timeline,
    startedAt: load.startedAt,
    deliveredAt: load.deliveredAt,
    createdAt: load.createdAt,
  };
}

/** Open loads (planned or collecting), newest first, bounded. */
async function openLoads(ctx: QueryCtx): Promise<Load[]> {
  const statuses: LoadStatus[] = ["planned", "collecting"];
  const loads: Load[] = [];
  for (const status of statuses) {
    loads.push(
      ...(await ctx.db
        .query("loads")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(PAGE)),
    );
  }
  return loads;
}

// --- Loads: the seller's side -----------------------------------------------------------------

/**
 * `/app/route`, "Yards collecting from you": open loads with a stop at this
 * shop, soonest first — to accept or decline, then to expect the vehicle.
 */
export const myStops = query({
  args: {},
  returns: v.array(vLoadView),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, SHOP);
    const materials = await materialIndex(ctx);
    const lookup = orgLookup(ctx);
    const open = await openLoads(ctx);
    const mine = open
      .filter((load) => load.stops.some((stop) => stop.orgId === org._id))
      .toSorted(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          WINDOW_ORDER[a.window] - WINDOW_ORDER[b.window],
      );
    const views = [];
    for (const load of mine) {
      views.push(await loadView(ctx, load, "seller", org._id, materials, lookup));
    }
    return views;
  },
});

/** Accept or decline the stop a buyer planned at this shop. */
export const respondToStop = mutation({
  args: { loadId: v.id("loads"), accept: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, SHOP);
    const load = await ctx.db.get("loads", args.loadId);
    const stop = load?.stops.find((row) => row.orgId === org._id);
    if (!load || !stop) throw new ConvexError("NOT_FOUND");
    if (!isOpenLoad(load.status)) throw new ConvexError("LOAD_CLOSED");
    const to: StopStatus = args.accept ? "accepted" : "declined";
    if (!canMoveStop(stop.status, to)) throw new ConvexError("WRONG_STATUS");

    const now = Date.now();
    const stops = load.stops.map((row) =>
      row.orgId === org._id ? { ...row, status: to, respondedAt: now } : row,
    );
    await ctx.db.patch("loads", load._id, { stops, updatedAt: now });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: `load.stop.${to}`,
      entityTable: "loads",
      entityId: load._id,
      metadata: { buyerOrgId: load.buyerOrgId, grams: stop.grams },
    });
    return null;
  },
});

// --- Loads: the buyer's side -------------------------------------------------------------------

const vCandidate = v.object({
  listingId: v.id("listings"),
  seller: v.object({
    orgId: v.id("orgs"),
    name: v.string(),
    area: v.string(),
    distanceKm: v.union(v.number(), v.null()),
    location: v.optional(vPoint),
  }),
  material: vMaterialRef,
  grams: v.number(),
  askPaisePerKg: v.number(),
  note: v.optional(v.string()),
  bulk: vBulk,
  /** Litres the whole lot takes, at its bulk. */
  litres: v.number(),
});

/**
 * `/app/loads/new`: the open lots one step down the chain, nearest first,
 * with the buyer's position, the vehicles to choose from and the bans in
 * force — everything the planner needs to fill a vehicle on the screen.
 */
export const loadCandidates = query({
  args: {},
  returns: v.object({
    buyer: v.object({
      name: v.string(),
      area: v.string(),
      location: v.optional(vPoint),
    }),
    sellerKind: vOrgKind,
    today: v.string(),
    vehicles: v.array(vVehicleView),
    listings: v.array(vCandidate),
    restrictions: v.array(vRestrictionView),
  }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, BUYERS);
    const sellerKind = sellerKindFor(org.kind) ?? "kabadiwala";
    const today = indiaToday();
    const materials = await materialIndex(ctx);
    const lookup = orgLookup(ctx);
    const here = orgPoint(org);
    const rows = await ctx.db
      .query("listings")
      .withIndex("by_status_kind", (q) =>
        q.eq("status", "open").eq("sellerKind", sellerKind),
      )
      .order("desc")
      .take(PAGE);

    const listings = [];
    for (const listing of rows) {
      if (listing.city !== org.city || listing.orgId === org._id) continue;
      const seller = await lookup(listing.orgId);
      if (seller?.status !== "active") continue;
      const where = orgPoint(seller);
      const material = materialRef(materials, listing.materialCode);
      const bulk = bulkFromNote(listing.note);
      listings.push({
        listingId: listing._id,
        seller: {
          orgId: seller._id,
          name: seller.name,
          area: seller.area,
          distanceKm:
            here && where ? roundKm(haversineRoad(here, where)) : null,
          location: where,
        },
        material,
        grams: listing.grams,
        askPaisePerKg: listing.askPaisePerKg,
        note: listing.note,
        bulk,
        litres: litresFor(listing.grams, material.family, bulk),
      });
    }
    const vehicles = await activeVehicles(ctx);
    const restrictions = await restrictionsFrom(ctx, today);
    return {
      buyer: { name: org.name, area: org.area, location: here },
      sellerKind,
      today,
      vehicles: vehicles.map((row) => vehicleView(row)),
      listings: listings.toSorted(
        (a, b) =>
          (a.seller.distanceKm ?? Infinity) -
            (b.seller.distanceKm ?? Infinity) ||
          a.seller.name.localeCompare(b.seller.name),
      ),
      restrictions: restrictions.map((row) => restrictionView(row)),
    };
  },
});

/** Road distance between two points: one leg, no return. */
function haversineRoad(from: Point, to: Point): number {
  return routeKm(from, [to], false);
}

interface CheckedStop {
  listing: Doc<"listings">;
  seller: Org;
  grams: number;
  bulk: Bulk;
}

/** One requested stop against its lot: open, the right kind, the same city. */
async function checkedStop(
  ctx: QueryCtx,
  buyer: Org,
  sellerKind: OrgKind | null,
  stop: { listingId: Id<"listings">; grams: number },
): Promise<CheckedStop> {
  if (!isPositiveInteger(stop.grams) || stop.grams > MAX_LOAD_GRAMS) {
    throw new ConvexError("INVALID_WEIGHT");
  }
  const listing = await ctx.db.get("listings", stop.listingId);
  if (
    !listing ||
    sellerKind === null ||
    listing.sellerKind !== sellerKind ||
    listing.city !== buyer.city
  ) {
    throw new ConvexError("NOT_FOUND");
  }
  if (listing.status !== "open") throw new ConvexError("LISTING_NOT_OPEN");
  if (stop.grams > listing.grams) throw new ConvexError("NOT_ENOUGH_LEFT");
  const seller = await ctx.db.get("orgs", listing.orgId);
  if (seller?.status !== "active") throw new ConvexError("NOT_FOUND");
  return { listing, seller, grams: stop.grams, bulk: bulkFromNote(listing.note) };
}

/** Every requested stop, checked; refuses none, too many, or a lot twice. */
async function checkedStops(
  ctx: QueryCtx,
  buyer: Org,
  wanted: readonly { listingId: Id<"listings">; grams: number }[],
): Promise<CheckedStop[]> {
  if (wanted.length === 0) throw new ConvexError("NO_STOPS");
  if (wanted.length > MAX_STOPS) throw new ConvexError("TOO_MANY_STOPS");
  const ids = new Set(wanted.map((stop) => stop.listingId));
  if (ids.size !== wanted.length) throw new ConvexError("DUPLICATE_STOP");
  const sellerKind = sellerKindFor(buyer.kind);
  const stops: CheckedStop[] = [];
  for (const stop of wanted) {
    stops.push(await checkedStop(ctx, buyer, sellerKind, stop));
  }
  return stops;
}

/** The stops in the buyer's chosen order, or nearest-neighbour from the buyer. */
function arrangeStops(
  buyerPoint: Point | undefined,
  stops: readonly CheckedStop[],
  order: readonly Id<"listings">[] | undefined,
): CheckedStop[] {
  if (!order) {
    return buyerPoint
      ? nearestNeighbourOrder(buyerPoint, stops, (stop) => orgPoint(stop.seller))
      : [...stops];
  }
  const byId = new Map(stops.map((stop) => [stop.listing._id, stop]));
  const arranged: CheckedStop[] = [];
  for (const id of order) {
    const stop = byId.get(id);
    if (!stop) throw new ConvexError("INVALID_ORDER");
    arranged.push(stop);
  }
  if (arranged.length !== stops.length || new Set(order).size !== order.length) {
    throw new ConvexError("INVALID_ORDER");
  }
  return arranged;
}

function checkCollectionDate(date: string, today: string) {
  if (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new ConvexError("INVALID_DATE");
  }
  if (date < today || date > shiftDate(today, PLAN_DAYS_AHEAD)) {
    throw new ConvexError("INVALID_DATE");
  }
}

function checkVehicleNo(vehicleNo: string | undefined): string | undefined {
  const cleaned = vehicleNo?.trim().toUpperCase();
  if (cleaned === undefined || cleaned === "") return;
  if (cleaned.length < 6 || cleaned.length > 14) {
    throw new ConvexError("INVALID_VEHICLE_NO");
  }
  return cleaned;
}

function checkDriverPhone(phone: string | undefined): string | undefined {
  if (phone === undefined || phone.trim() === "") return;
  if (!isIndianMobile(phone)) throw new ConvexError("INVALID_PHONE");
  return phone;
}

/**
 * Plans one vehicle filled from several sellers' lots. The load must fit the
 * vehicle by weight and by volume; stops are visited nearest first from the
 * buyer's yard unless the buyer gave an order; the freight comes from the
 * fare table and the round trip. Each seller then accepts its stop.
 */
export const planLoad = mutation({
  args: {
    stops: v.array(v.object({ listingId: v.id("listings"), grams: v.number() })),
    vehicleType: vVehicleKey,
    paidBy: vPaidBy,
    date: v.string(),
    window: vSaathiTime,
    driverPhone: v.optional(v.string()),
    vehicleNo: v.optional(v.string()),
    /** Listing ids in visiting order; omitted = nearest neighbour. */
    order: v.optional(v.array(v.id("listings"))),
  },
  returns: v.id("loads"),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, BUYERS);
    const today = indiaToday();
    checkCollectionDate(args.date, today);
    const vehicleNo = checkVehicleNo(args.vehicleNo);
    const driverPhone = checkDriverPhone(args.driverPhone);
    const vehicle = await vehicleByKey(ctx, args.vehicleType);
    if (!vehicle?.active) throw new ConvexError("UNKNOWN_VEHICLE");

    const materials = await materialIndex(ctx);
    const checked = await checkedStops(ctx, org, args.stops);
    const here = orgPoint(org);
    const ordered = arrangeStops(here, checked, args.order);

    const stops = ordered.map((stop, index) => ({
      orgId: stop.seller._id,
      listingId: stop.listing._id,
      materialCode: stop.listing.materialCode,
      grams: stop.grams,
      litres: litresFor(
        stop.grams,
        materials.get(stop.listing.materialCode)?.family ?? "other",
        stop.bulk,
      ),
      order: index + 1,
      status: "pending" as const,
    }));
    const totalGrams = stops.reduce((sum, stop) => sum + stop.grams, 0);
    if (totalGrams > vehicle.payloadKg * 1000) throw new ConvexError("OVER_PAYLOAD");
    const totalLitres = stops.reduce((sum, stop) => sum + stop.litres, 0);
    if (totalLitres > vehicle.volumeLitres) throw new ConvexError("OVER_VOLUME");

    const km = here
      ? routeKm(
          here,
          ordered.map((stop) => orgPoint(stop.seller)),
        )
      : 0;
    const freight = freightFor(vehicle, km, stops.length);
    const valuePaise = ordered.reduce(
      (sum, stop) => sum + paiseFor(stop.grams, stop.listing.askPaisePerKg),
      0,
    );
    const now = Date.now();
    const loadId = await ctx.db.insert("loads", {
      buyerOrgId: org._id,
      vehicleType: vehicle.key,
      payloadKg: vehicle.payloadKg,
      volumeLitres: vehicle.volumeLitres,
      date: args.date,
      window: args.window,
      stops,
      totalGrams,
      totalLitres,
      valuePaise,
      routeKm: km,
      freightPaise: freight.totalPaise,
      freight: {
        basePaise: freight.basePaise,
        distancePaise: freight.distancePaise,
        loadingPaise: freight.loadingPaise,
      },
      paidBy: args.paidBy,
      status: "planned",
      timeline: [{ status: "planned", at: now }],
      driverPhone,
      vehicleNo,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "load.planned",
      entityTable: "loads",
      entityId: loadId,
      metadata: {
        vehicleType: vehicle.key,
        stops: stops.length,
        totalGrams,
        totalLitres,
        routeKm: km,
        freightPaise: freight.totalPaise,
        paidBy: args.paidBy,
        date: args.date,
        window: args.window,
      },
    });
    return loadId;
  },
});

/** `/app/loads`: the buyer's open loads soonest first, and the last ones done. */
export const myLoads = query({
  args: {},
  returns: v.object({ active: v.array(vLoadView), done: v.array(vLoadView) }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx, BUYERS);
    const materials = await materialIndex(ctx);
    const lookup = orgLookup(ctx);
    const loads = await ctx.db
      .query("loads")
      .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
      .order("desc")
      .take(PAGE);
    const active = loads
      .filter((load) => isOpenLoad(load.status))
      .toSorted(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          WINDOW_ORDER[a.window] - WINDOW_ORDER[b.window] ||
          a.createdAt - b.createdAt,
      );
    const done = loads
      .filter((load) => !isOpenLoad(load.status))
      .toSorted((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20);
    const view = (load: Load) =>
      loadView(ctx, load, "buyer", org._id, materials, lookup);
    const activeViews = [];
    for (const load of active) activeViews.push(await view(load));
    const doneViews = [];
    for (const load of done) doneViews.push(await view(load));
    return { active: activeViews, done: doneViews };
  },
});

/** One load, for its buyer or any shop with a stop on it; null otherwise. */
export const load = query({
  args: { loadId: v.string() },
  returns: v.union(v.null(), vLoadView),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const loadId = ctx.db.normalizeId("loads", args.loadId);
    const load = loadId ? await ctx.db.get("loads", loadId) : null;
    const side = load ? sideOf(load, org._id) : null;
    if (!load || !side) return null;
    const materials = await materialIndex(ctx);
    return loadView(ctx, load, side, org._id, materials, orgLookup(ctx));
  },
});

/** One of this buyer's loads, or NOT_FOUND — never another business's. */
async function myLoad(ctx: QueryCtx, org: Org, loadId: Id<"loads">): Promise<Load> {
  const load = await ctx.db.get("loads", loadId);
  if (load?.buyerOrgId !== org._id) throw new ConvexError("NOT_FOUND");
  return load;
}

/** Grams collected so far, for the leaving weight. */
function collectedGrams(stops: readonly Stop[]): number | undefined {
  const weighed = stops.filter((stop) => stop.collectedGrams !== undefined);
  return weighed.length === 0
    ? undefined
    : weighed.reduce((sum, stop) => sum + (stop.collectedGrams ?? 0), 0);
}

/**
 * The buyer moves a load along: planned → collecting (the vehicle has left)
 * → delivered (weighed at the gate), or cancelled while still open. The
 * arrival weight is recorded at delivery and compared with what left.
 */
// eslint-disable-next-line unicorn/no-non-function-verb-prefix -- a Convex mutation; its name is the API contract
export const setLoadStatus = mutation({
  args: {
    loadId: v.id("loads"),
    status: v.union(
      v.literal("collecting"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    arrivedGrams: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, BUYERS);
    const load = await myLoad(ctx, org, args.loadId);
    if (!canMoveLoad(load.status, args.status)) {
      throw new ConvexError("WRONG_STATUS");
    }
    if (
      args.arrivedGrams !== undefined &&
      (!isPositiveInteger(args.arrivedGrams) || args.arrivedGrams > MAX_LOAD_GRAMS)
    ) {
      throw new ConvexError("INVALID_WEIGHT");
    }
    const now = Date.now();
    const isDelivery = args.status === "delivered";
    await ctx.db.patch("loads", load._id, {
      status: args.status,
      timeline: [...load.timeline, { status: args.status, at: now }],
      startedAt: args.status === "collecting" ? now : load.startedAt,
      deliveredAt: isDelivery ? now : load.deliveredAt,
      leavingGrams: isDelivery ? collectedGrams(load.stops) : load.leavingGrams,
      arrivedGrams: isDelivery ? args.arrivedGrams : load.arrivedGrams,
      updatedAt: now,
    });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: `load.${args.status}`,
      entityTable: "loads",
      entityId: load._id,
      metadata: {
        from: load.status,
        to: args.status,
        arrivedGrams: args.arrivedGrams ?? null,
      },
    });
    return null;
  },
});

/** The driver weighed a stop and took it: the shop's scale reading, in grams. */
export const collectStop = mutation({
  args: { loadId: v.id("loads"), orgId: v.id("orgs"), grams: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx, BUYERS);
    const load = await myLoad(ctx, org, args.loadId);
    if (load.status !== "collecting") throw new ConvexError("WRONG_STATUS");
    if (!isPositiveInteger(args.grams) || args.grams > MAX_LOAD_GRAMS) {
      throw new ConvexError("INVALID_WEIGHT");
    }
    const stop = load.stops.find((row) => row.orgId === args.orgId);
    if (!stop) throw new ConvexError("NOT_FOUND");
    if (!canMoveStop(stop.status, "collected")) throw new ConvexError("WRONG_STATUS");

    const now = Date.now();
    const stops = load.stops.map((row) =>
      row.orgId === args.orgId
        ? { ...row, status: "collected" as const, collectedGrams: args.grams }
        : row,
    );
    await ctx.db.patch("loads", load._id, { stops, updatedAt: now });
    await audit(ctx, {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "load.stop.collected",
      entityTable: "loads",
      entityId: load._id,
      metadata: {
        sellerOrgId: args.orgId,
        plannedGrams: stop.grams,
        collectedGrams: args.grams,
      },
    });
    return null;
  },
});

/** The bans that bite this vehicle in this window: a warning while planning. */
export const checkRestrictions = query({
  args: { vehicleType: vVehicleKey, date: v.string(), window: vSaathiTime },
  returns: v.array(vRestrictionView),
  handler: async (ctx, args) => {
    await requireOrg(ctx);
    if (!DATE.test(args.date)) throw new ConvexError("INVALID_DATE");
    return warningsFor(ctx, args.vehicleType, args.date, args.window);
  },
});

// --- Admin: the tables behind it all ---------------------------------------------------

const vServiceRuleView = v.object({
  key: v.string(),
  value: v.number(),
  unit: v.string(),
  note: v.optional(v.string()),
  effectiveFrom: v.union(v.string(), v.null()),
  updatedAt: v.union(v.number(), v.null()),
});

/** `/admin/logistics`: vehicle types, service rules and road restrictions. */
export const adminTables = query({
  args: {},
  returns: v.object({
    vehicleTypes: v.array(
      v.object({
        id: v.id("vehicleTypes"),
        ...vVehicleView.fields,
        active: v.boolean(),
        updatedAt: v.number(),
      }),
    ),
    serviceRules: v.array(vServiceRuleView),
    roadRestrictions: v.array(
      v.object({ ...vRestrictionView.fields, updatedAt: v.number() }),
    ),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const vehicleRows = await ctx.db.query("vehicleTypes").take(50);
    const vehicles = vehicleRows.toSorted((a, b) => a.sortOrder - b.sortOrder);
    const rules = [];
    for (const key of SERVICE_RULE_KEYS) {
      const row = await ctx.db
        .query("serviceRules")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      const fallback = DEFAULT_SERVICE_RULES[key];
      rules.push({
        key,
        value: row?.value ?? fallback.value,
        unit: row?.unit ?? fallback.unit,
        note: row?.note ?? fallback.note,
        effectiveFrom: row?.effectiveFrom ?? null,
        updatedAt: row?.updatedAt ?? null,
      });
    }
    const restrictionRows = await ctx.db.query("roadRestrictions").take(PAGE);
    const restrictions = restrictionRows.toSorted(
      (a, b) => b.to.localeCompare(a.to) || a.road.localeCompare(b.road),
    );
    return {
      vehicleTypes: vehicles.map((row) => ({
        id: row._id,
        ...vehicleView(row),
        active: row.active,
        updatedAt: row.updatedAt,
      })),
      serviceRules: rules,
      roadRestrictions: restrictions.map((row) => ({
        ...restrictionView(row),
        updatedAt: row.updatedAt,
      })),
    };
  },
});

async function adminActor(ctx: QueryCtx) {
  const admin = await requireAdmin(ctx);
  const profile = await findProfile(ctx, admin._id);
  return profile?._id;
}

function checkVehicleSpec(spec: VehicleSpec & { name: string }) {
  const name = spec.name.trim();
  if (name.length < 2 || name.length > 40) throw new ConvexError("INVALID_NAME");
  if (!isPositiveInteger(spec.payloadKg) || spec.payloadKg > 50_000) {
    throw new ConvexError("INVALID_CAPACITY");
  }
  if (!isPositiveInteger(spec.volumeLitres) || spec.volumeLitres > 200_000) {
    throw new ConvexError("INVALID_CAPACITY");
  }
  for (const paise of [spec.baseFarePaise, spec.perKmPaise, spec.loadingPaise]) {
    if (!isWholeNumber(paise) || paise > 10_000_000) {
      throw new ConvexError("INVALID_FARE");
    }
  }
  return name;
}

/** Sets a vehicle type's capacity and fares; creates it when new. */
export const adminSetVehicleType = mutation({
  args: {
    key: vVehicleKey,
    name: v.string(),
    payloadKg: v.number(),
    volumeLitres: v.number(),
    baseFarePaise: v.number(),
    perKmPaise: v.number(),
    loadingPaise: v.number(),
    active: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actorProfileId = await adminActor(ctx);
    const name = checkVehicleSpec(args);
    const now = Date.now();
    const existing = await vehicleByKey(ctx, args.key);
    const next = {
      name,
      payloadKg: args.payloadKg,
      volumeLitres: args.volumeLitres,
      baseFarePaise: args.baseFarePaise,
      perKmPaise: args.perKmPaise,
      loadingPaise: args.loadingPaise,
      active: args.active,
    };
    let id: Id<"vehicleTypes">;
    if (existing) {
      id = existing._id;
      await ctx.db.patch("vehicleTypes", id, { ...next, updatedAt: now });
    } else {
      const others = await ctx.db.query("vehicleTypes").take(50);
      id = await ctx.db.insert("vehicleTypes", {
        key: args.key,
        ...next,
        sortOrder: others.length,
        updatedAt: now,
      });
    }
    await audit(ctx, {
      actorProfileId,
      action: "vehicleType.set",
      entityTable: "vehicleTypes",
      entityId: id,
      metadata: {
        key: args.key,
        from: existing ? vehicleView(existing) : null,
        to: next,
      },
    });
    return null;
  },
});

/** Sets one service rule's number; unknown keys are refused. */
export const adminSetServiceRule = mutation({
  args: { key: v.string(), value: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actorProfileId = await adminActor(ctx);
    const key = SERVICE_RULE_KEYS.find((known) => known === args.key);
    if (!key) throw new ConvexError("UNKNOWN_RULE");
    if (!isPositiveInteger(args.value) || args.value > 10_000_000) {
      throw new ConvexError("INVALID_VALUE");
    }
    const now = Date.now();
    const today = indiaToday(now);
    const existing = await ctx.db
      .query("serviceRules")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    let id: Id<"serviceRules">;
    if (existing) {
      id = existing._id;
      await ctx.db.patch("serviceRules", id, {
        value: args.value,
        effectiveFrom: today,
        updatedAt: now,
      });
    } else {
      const fallback = DEFAULT_SERVICE_RULES[key];
      id = await ctx.db.insert("serviceRules", {
        key,
        value: args.value,
        unit: fallback.unit,
        note: fallback.note,
        effectiveFrom: today,
        updatedAt: now,
      });
    }
    await audit(ctx, {
      actorProfileId,
      action: "serviceRule.set",
      entityTable: "serviceRules",
      entityId: id,
      metadata: { key, from: existing?.value ?? null, to: args.value },
    });
    return null;
  },
});

function isHour(hour: number): boolean {
  return Number.isSafeInteger(hour) && hour >= 0 && hour <= 24;
}

function checkHours(hoursFrom: number, hoursTo: number) {
  if (!isHour(hoursFrom) || !isHour(hoursTo) || hoursFrom >= hoursTo) {
    throw new ConvexError("INVALID_HOURS");
  }
}

function checkDateRange(from: string, to: string) {
  if (!DATE.test(from) || !DATE.test(to) || from > to) {
    throw new ConvexError("INVALID_DATES");
  }
}

/** Trimmed text, or undefined when blank; refused above `max` characters. */
function optionalText(
  text: string | undefined,
  max: number,
  code: string,
): string | undefined {
  const trimmed = text?.trim();
  if (trimmed === undefined || trimmed === "") return;
  if (trimmed.length > max) throw new ConvexError(code);
  return trimmed;
}

function checkRestriction(args: {
  road: string;
  vehicleTypes: VehicleKey[];
  hoursFrom: number;
  hoursTo: number;
  from: string;
  to: string;
  note?: string;
  sourceUrl?: string;
}) {
  const road = args.road.trim();
  if (road.length < 3 || road.length > 80) throw new ConvexError("INVALID_ROAD");
  if (args.vehicleTypes.length === 0) throw new ConvexError("NO_VEHICLES");
  checkHours(args.hoursFrom, args.hoursTo);
  checkDateRange(args.from, args.to);
  return {
    road,
    vehicleTypes: [...new Set(args.vehicleTypes)],
    hoursFrom: args.hoursFrom,
    hoursTo: args.hoursTo,
    from: args.from,
    to: args.to,
    note: optionalText(args.note, 200, "NOTE_TOO_LONG"),
    sourceUrl: optionalText(args.sourceUrl, 300, "URL_TOO_LONG"),
  };
}

/** Adds a road restriction, or changes one when `id` is given. */
export const adminSaveRestriction = mutation({
  args: {
    id: v.optional(v.id("roadRestrictions")),
    road: v.string(),
    vehicleTypes: v.array(vVehicleKey),
    hoursFrom: v.number(),
    hoursTo: v.number(),
    from: v.string(),
    to: v.string(),
    note: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.id("roadRestrictions"),
  handler: async (ctx, args) => {
    const actorProfileId = await adminActor(ctx);
    const clean = checkRestriction(args);
    const now = Date.now();
    let id: Id<"roadRestrictions">;
    if (args.id) {
      const existing = await ctx.db.get("roadRestrictions", args.id);
      if (!existing) throw new ConvexError("NOT_FOUND");
      id = existing._id;
      await ctx.db.patch("roadRestrictions", id, { ...clean, updatedAt: now });
    } else {
      id = await ctx.db.insert("roadRestrictions", { ...clean, updatedAt: now });
    }
    await audit(ctx, {
      actorProfileId,
      action: args.id ? "roadRestriction.updated" : "roadRestriction.added",
      entityTable: "roadRestrictions",
      entityId: id,
      metadata: clean,
    });
    return id;
  },
});

/** Removes a restriction (the notice was withdrawn or the works are done). */
export const adminDeleteRestriction = mutation({
  args: { id: v.id("roadRestrictions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actorProfileId = await adminActor(ctx);
    const existing = await ctx.db.get("roadRestrictions", args.id);
    if (!existing) throw new ConvexError("NOT_FOUND");
    await ctx.db.delete("roadRestrictions", args.id);
    await audit(ctx, {
      actorProfileId,
      action: "roadRestriction.removed",
      entityTable: "roadRestrictions",
      entityId: args.id,
      metadata: { road: existing.road, from: existing.from, to: existing.to },
    });
    return null;
  },
});
