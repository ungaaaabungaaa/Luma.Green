import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { kgToGrams, paiseFor } from "../lib/chain";
import { shiftDate } from "../lib/dates";
import type { DemoWorld } from "../lib/demoWorld";
import {
  type Bulk,
  DEFAULT_SERVICE_RULES,
  freightFor,
  litresFor,
  type LoadStatus,
  nearestNeighbourOrder,
  routeKm,
  SERVICE_RULE_KEYS,
  type StopStatus,
  vehicleKeyOf,
  type VehicleSpec,
} from "../lib/routing";

/**
 * Sample data for the "logistics" area, seeded after the base demo world:
 * vehicle types with Bengaluru sample fares (Porter-like starting fares), the
 * service rules, a slot limit per shop, three pooled loads for the demo yard
 * (one on the road right now) and the goods-vehicle bans the traffic police
 * announced for the pilot weeks. Runs once per seed; only writes this
 * area's tables.
 */

const HOUR = 60 * 60 * 1000;

/** Payload, rough volume and sample hire fares. A shop's own cart is free. */
const VEHICLES: readonly (VehicleSpec & { name: string })[] = [
  {
    key: "handcart",
    name: "Handcart",
    payloadKg: 150,
    volumeLitres: 900,
    baseFarePaise: 0,
    perKmPaise: 0,
    loadingPaise: 0,
  },
  {
    key: "cycle",
    name: "Cycle cart",
    payloadKg: 100,
    volumeLitres: 600,
    baseFarePaise: 0,
    perKmPaise: 0,
    loadingPaise: 0,
  },
  {
    key: "auto",
    name: "Goods auto",
    payloadKg: 500,
    volumeLitres: 2400,
    baseFarePaise: 20_500,
    perKmPaise: 1300,
    loadingPaise: 5000,
  },
  {
    key: "miniTruck",
    name: "Mini truck (Tata Ace)",
    payloadKg: 750,
    volumeLitres: 5000,
    baseFarePaise: 23_000,
    perKmPaise: 1600,
    loadingPaise: 10_000,
  },
  {
    key: "truck",
    name: "Truck (Tata 407)",
    payloadKg: 2500,
    volumeLitres: 12_000,
    baseFarePaise: 60_000,
    perKmPaise: 2800,
    loadingPaise: 20_000,
  },
];

/** Pickups per window a shop can manage, by the vehicle it runs. */
const SLOT_LIMIT_BY_VEHICLE = {
  handcart: 2,
  cycle: 2,
  auto: 4,
  miniTruck: 6,
  truck: 8,
} as const;

interface DemoStop {
  seller: string;
  materialCode: string;
  kg: number;
  bulk: Bulk;
  status: StopStatus;
  collectedKg?: number;
}

interface DemoLoad {
  vehicleType: VehicleSpec["key"];
  /** Days from today; the window of the collection. */
  day: number;
  window: "morning" | "afternoon" | "evening";
  status: "planned" | "collecting" | "delivered";
  paidBy: "buyer" | "seller";
  driverPhone: string;
  vehicleNo: string;
  stops: DemoStop[];
  arrivedKg?: number;
}

/** Peenya Paper & Plastic Yard's loads: done, on the road, and planned. */
const PEENYA_LOADS: readonly DemoLoad[] = [
  {
    vehicleType: "auto",
    day: 0,
    window: "morning",
    status: "collecting",
    paidBy: "buyer",
    driverPhone: "+919845000031",
    vehicleNo: "KA 05 AB 4471",
    stops: [
      {
        seller: "ramesh-kabadi-store",
        materialCode: "PAPER-NEWS",
        kg: 150,
        bulk: "baled",
        status: "collected",
        collectedKg: 148,
      },
      {
        seller: "sri-lakshmi-scrap",
        materialCode: "PAPER-NEWS",
        kg: 110,
        bulk: "baled",
        status: "accepted",
      },
    ],
  },
  {
    vehicleType: "miniTruck",
    day: 1,
    window: "morning",
    status: "planned",
    paidBy: "seller",
    driverPhone: "+919845000032",
    vehicleNo: "KA 51 C 2210",
    stops: [
      {
        seller: "hsr-waste-buyers",
        materialCode: "PAPER-CARTON",
        kg: 200,
        bulk: "baled",
        status: "accepted",
      },
      {
        seller: "indiranagar-kabadi-point",
        materialCode: "PLASTIC-PET",
        kg: 75,
        bulk: "loose",
        status: "pending",
      },
    ],
  },
  {
    vehicleType: "auto",
    day: -5,
    window: "afternoon",
    status: "delivered",
    paidBy: "buyer",
    driverPhone: "+919845000031",
    vehicleNo: "KA 05 AB 4471",
    stops: [
      {
        seller: "ramesh-kabadi-store",
        materialCode: "PAPER-CARTON",
        kg: 180,
        bulk: "baled",
        status: "collected",
        collectedKg: 180,
      },
    ],
    arrivedKg: 178,
  },
];

export async function seedLogistics(
  ctx: MutationCtx,
  world: DemoWorld,
): Promise<void> {
  const { now, today } = world;
  await seedVehicleTypes(ctx, now);
  await seedServiceRules(ctx, today, now);
  await seedSlotLimits(ctx, world);
  await seedRestrictions(ctx, today, now);

  const yardId = world.orgs.get("peenya-paper-plastic-yard");
  if (!yardId) return;
  for (const load of PEENYA_LOADS) await seedLoad(ctx, world, yardId, load);
}

async function seedVehicleTypes(ctx: MutationCtx, now: number) {
  for (const [index, vehicle] of VEHICLES.entries()) {
    await ctx.db.insert("vehicleTypes", {
      ...vehicle,
      sortOrder: index,
      active: true,
      updatedAt: now,
    });
  }
}

async function seedServiceRules(ctx: MutationCtx, today: string, now: number) {
  for (const key of SERVICE_RULE_KEYS) {
    const rule = DEFAULT_SERVICE_RULES[key];
    await ctx.db.insert("serviceRules", {
      key,
      value: rule.value,
      unit: rule.unit,
      note: rule.note,
      effectiveFrom: shiftDate(today, -30),
      updatedAt: now,
    });
  }
}

/** Every kabadiwala in the world gets a limit that fits its vehicle. */
async function seedSlotLimits(ctx: MutationCtx, world: DemoWorld) {
  for (const orgId of world.orgs.values()) {
    const org = await ctx.db.get("orgs", orgId);
    if (org?.kind !== "kabadiwala") continue;
    const key = vehicleKeyOf(org.vehicle);
    await ctx.db.insert("slotLimits", {
      orgId,
      limit: key ? SLOT_LIMIT_BY_VEHICLE[key] : 2,
      updatedAt: world.now,
    });
  }
}

/** Bengaluru Traffic Police notices, September 2026, shifted onto the pilot weeks. */
async function seedRestrictions(ctx: MutationCtx, today: string, now: number) {
  const from = shiftDate(today, -10);
  const to = shiftDate(today, 21);
  const source =
    "https://btp.karnataka.gov.in/"; // the notices are published here, in Kannada
  const rows = [
    {
      road: "Peenya elevated corridor (Tumkur Road)",
      vehicleTypes: ["auto" as const],
      hoursFrom: 0,
      hoursTo: 24,
      note: "Goods autos barred all day during load tests. Use the service road below.",
    },
    {
      road: "Electronic City elevated tollway",
      vehicleTypes: ["auto" as const],
      hoursFrom: 0,
      hoursTo: 24,
      note: "Goods autos barred all day for resurfacing.",
    },
    {
      road: "Electronic City elevated tollway",
      vehicleTypes: ["miniTruck" as const, "truck" as const],
      hoursFrom: 6,
      hoursTo: 22,
      note: "Other goods vehicles barred 6 am to 10 pm.",
    },
    {
      road: "BGS flyover (Mysuru Road)",
      vehicleTypes: ["truck" as const],
      hoursFrom: 0,
      hoursTo: 24,
      note: "Heavy goods vehicles barred round the clock.",
    },
    {
      road: "BGS flyover (Mysuru Road)",
      vehicleTypes: ["miniTruck" as const],
      hoursFrom: 7,
      hoursTo: 11,
      note: "Light goods vehicles kept off in the morning peak.",
    },
    {
      road: "BGS flyover (Mysuru Road)",
      vehicleTypes: ["miniTruck" as const],
      hoursFrom: 16,
      hoursTo: 22,
      note: "Light goods vehicles kept off in the evening peak.",
    },
  ];
  for (const row of rows) {
    await ctx.db.insert("roadRestrictions", {
      ...row,
      from,
      to,
      sourceUrl: source,
      updatedAt: now,
    });
  }
}

/** A seller's open lot of one material, if the base world listed one. */
async function openListing(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  materialCode: string,
): Promise<Doc<"listings"> | undefined> {
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .take(50);
  return listings.find(
    (listing) =>
      listing.materialCode === materialCode && listing.status === "open",
  );
}

async function seedLoad(
  ctx: MutationCtx,
  world: DemoWorld,
  buyerOrgId: Id<"orgs">,
  load: DemoLoad,
) {
  const buyer = await ctx.db.get("orgs", buyerOrgId);
  const vehicle = VEHICLES.find((row) => row.key === load.vehicleType);
  if (!buyer?.location || !vehicle) return;

  // Each stop: the seller, its lot when the base world listed one, and the
  // material's family for the volume estimate.
  const stops = [];
  for (const stop of load.stops) {
    const orgId = world.orgs.get(stop.seller);
    if (!orgId) continue;
    const seller = await ctx.db.get("orgs", orgId);
    if (!seller) continue;
    const listing = await openListing(ctx, orgId, stop.materialCode);
    const material = await ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", stop.materialCode))
      .first();
    const grams = kgToGrams(stop.kg);
    stops.push({
      seller,
      askPaisePerKg: listing?.askPaisePerKg ?? 0,
      stop: {
        orgId,
        listingId: listing?._id,
        materialCode: stop.materialCode,
        grams,
        litres: litresFor(grams, material?.family ?? "other", stop.bulk),
        status: stop.status,
        collectedGrams:
          stop.collectedKg === undefined ? undefined : kgToGrams(stop.collectedKg),
        respondedAt: stop.status === "pending" ? undefined : world.now - HOUR,
      },
    });
  }
  if (stops.length === 0) return;

  const start = buyer.location;
  const ordered = nearestNeighbourOrder(
    start,
    stops,
    (entry) => entry.seller.location,
  );
  const km = routeKm(
    start,
    ordered.map((entry) => entry.seller.location),
  );
  const freight = freightFor(vehicle, km, ordered.length);
  const totalGrams = ordered.reduce((sum, entry) => sum + entry.stop.grams, 0);
  const totalLitres = ordered.reduce(
    (sum, entry) => sum + entry.stop.litres,
    0,
  );
  const valuePaise = ordered.reduce(
    (sum, entry) => sum + paiseFor(entry.stop.grams, entry.askPaisePerKg),
    0,
  );
  const collected = ordered
    .map((entry) => entry.stop.collectedGrams)
    .filter((grams): grams is number => grams !== undefined);

  const createdAt = world.now - (load.day + 1) * 24 * HOUR;
  const startedAt =
    load.status === "planned" ? undefined : world.now + load.day * 24 * HOUR - HOUR;
  const deliveredAt =
    load.status === "delivered" ? world.now + load.day * 24 * HOUR + 3 * HOUR : undefined;
  const timeline: { status: LoadStatus; at: number }[] = [
    { status: "planned", at: createdAt },
  ];
  if (startedAt !== undefined) {
    timeline.push({ status: "collecting", at: startedAt });
  }
  if (deliveredAt !== undefined) {
    timeline.push({ status: "delivered", at: deliveredAt });
  }

  await ctx.db.insert("loads", {
    buyerOrgId,
    vehicleType: vehicle.key,
    payloadKg: vehicle.payloadKg,
    volumeLitres: vehicle.volumeLitres,
    date: shiftDate(world.today, load.day),
    window: load.window,
    stops: ordered.map((entry, index) => ({ ...entry.stop, order: index + 1 })),
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
    paidBy: load.paidBy,
    status: load.status,
    timeline,
    driverPhone: load.driverPhone,
    vehicleNo: load.vehicleNo,
    leavingGrams:
      load.status === "delivered"
        ? collected.reduce((sum, grams) => sum + grams, 0)
        : undefined,
    arrivedGrams:
      load.arrivedKg === undefined ? undefined : kgToGrams(load.arrivedKg),
    startedAt,
    deliveredAt,
    createdAt,
    updatedAt: world.now,
  });
}
