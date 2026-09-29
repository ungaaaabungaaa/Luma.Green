/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signIn,
  signInAs,
} from "./lib/auth.testing";
import { shiftDate } from "./lib/dates";
import { indiaToday } from "./lib/onboarding";
import { freightFor, litresFor, routeKm } from "./lib/routing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

// Demo logins (convex/lib/demo.ts).
const SHOP = "+919000000101"; // Ramesh Kabadi Store — kabadiwala
const YARD = "+919000000102"; // Peenya Paper & Plastic Yard
const RECYCLER = "+919000000103"; // GreenLoop Polymers
const SAATHI = "+919000000105";
const ADMIN_EMAIL = "admin@luma.test";

const RAMESH = "Ramesh Kabadi Store";
const SRI_LAKSHMI = "Sri Lakshmi Scrap";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function demoWorld() {
  vi.stubEnv("ADMIN_EMAIL", ADMIN_EMAIL);
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  return t;
}

type World = Awaited<ReturnType<typeof demoWorld>>;
type Session = Awaited<ReturnType<typeof signInAs>>;

async function asAdmin(t: World) {
  const admin = await signIn(t, { email: ADMIN_EMAIL, twoFactorEnabled: true });
  await admin.mutation(api.identity.ensureProfile, { locale: "en" });
  return admin;
}

async function orgId(t: World, slug: string): Promise<Id<"orgs">> {
  const org = await t.run(async (ctx) =>
    ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique(),
  );
  if (!org) throw new Error(`No org ${slug}`);
  return org._id;
}

async function auditActions(t: World, entityTable: string, id: string) {
  return t.run(async (ctx) => {
    const rows = await ctx.db
      .query("auditLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityTable", entityTable).eq("entityId", id),
      )
      .collect();
    return rows.map((row) => row.action);
  });
}

function tomorrow() {
  return shiftDate(indiaToday(), 1);
}

/** The yard's candidate lot from one seller of one material. */
async function candidate(yard: Session, seller: string, code: string) {
  const { listings } = await yard.query(api.logistics.loadCandidates, {});
  const lot = listings.find(
    (row) => row.seller.name === seller && row.material.code === code,
  );
  if (!lot) throw new Error(`No ${code} lot from ${seller}`);
  return lot;
}

/** Plans the yard's usual load: newspaper from Ramesh and Sri Lakshmi. */
async function planNewspaperLoad(
  yard: Session,
  overrides: Partial<Parameters<typeof yard.mutation<typeof api.logistics.planLoad>>[1]> = {},
) {
  const ramesh = await candidate(yard, RAMESH, "PAPER-NEWS");
  const lakshmi = await candidate(yard, SRI_LAKSHMI, "PAPER-NEWS");
  const loadId = await yard.mutation(api.logistics.planLoad, {
    stops: [
      { listingId: lakshmi.listingId, grams: lakshmi.grams },
      { listingId: ramesh.listingId, grams: ramesh.grams },
    ],
    vehicleType: "auto",
    paidBy: "buyer",
    date: tomorrow(),
    window: "morning",
    driverPhone: "+919845000031",
    vehicleNo: "ka 05 ab 4471",
    ...overrides,
  });
  return { loadId, ramesh, lakshmi };
}

describe("slotAvailability", () => {
  it("counts a shop's pickups per window against its limit, for anyone", async () => {
    const t = await demoWorld();
    const shop = await orgId(t, "ramesh-kabadi-store");
    const slots = await t.query(api.logistics.slotAvailability, {
      orgId: shop,
      date: indiaToday(),
    });
    // Ramesh runs an auto: the seed gives him 4 pickups a window. Today he
    // has one requested (evening), one accepted (afternoon), one on the way
    // (morning) — none of the windows is full.
    expect(slots.limit).toBe(4);
    expect(slots.slotMinutes).toBe(120);
    expect(slots.minPickupGrams).toBe(15_000);
    expect(slots.windows).toEqual([
      { window: "morning", booked: 1, limit: 4, isFull: false },
      { window: "afternoon", booked: 1, limit: 4, isFull: false },
      { window: "evening", booked: 1, limit: 4, isFull: false },
    ]);
  });

  it("hides windows once the shop lowers its limit", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    await shop.mutation(api.logistics.setSlotLimit, { limit: 1 });
    const slots = await t.query(api.logistics.slotAvailability, {
      orgId: await orgId(t, "ramesh-kabadi-store"),
      date: indiaToday(),
    });
    expect(slots.limit).toBe(1);
    expect(slots.windows.every((window) => window.isFull)).toBe(true);
    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLog")
        .filter((q) => q.eq(q.field("action"), "slotLimit.set"))
        .collect(),
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.metadata).toEqual({ from: 4, to: 1 });
  });

  it("refuses a bad date, a business that isn't a shop, and silly limits", async () => {
    const t = await demoWorld();
    const shop = await orgId(t, "ramesh-kabadi-store");
    await expect(
      t.query(api.logistics.slotAvailability, { orgId: shop, date: "today" }),
    ).rejects.toThrow(/INVALID_DATE/);
    await expect(
      t.query(api.logistics.slotAvailability, {
        orgId: await orgId(t, "peenya-paper-plastic-yard"),
        date: indiaToday(),
      }),
    ).rejects.toThrow(/NOT_FOUND/);

    const asShop = await signInAs(t, SHOP);
    await expect(
      asShop.mutation(api.logistics.setSlotLimit, { limit: 0 }),
    ).rejects.toThrow(/INVALID_LIMIT/);
    await expect(
      asShop.mutation(api.logistics.setSlotLimit, { limit: 2.5 }),
    ).rejects.toThrow(/INVALID_LIMIT/);
    const yard = await signInAs(t, YARD);
    await expect(
      yard.mutation(api.logistics.setSlotLimit, { limit: 3 }),
    ).rejects.toThrow(/WRONG_ROLE/);
  });
});

describe("vehicleFit", () => {
  it("picks the smallest vehicle that takes the weight and the bulk", async () => {
    const t = await demoWorld();
    const fit = await t.query(api.logistics.vehicleFit, {
      items: [{ materialCode: "PLASTIC-PET", kg: 30 }],
    });
    expect(fit.grams).toBe(30_000);
    expect(fit.litres).toBe(750);
    expect(fit.smallest).toBe("handcart");
    const cycle = fit.fits.find((row) => row.key === "cycle");
    expect(cycle).toMatchObject({
      name: "Cycle cart",
      fitsWeight: true,
      fitsVolume: false,
    });
  });

  it("puts heavy iron on a truck, never a handcart", async () => {
    const t = await demoWorld();
    const fit = await t.query(api.logistics.vehicleFit, {
      items: [{ materialCode: "METAL-IRON", kg: 900 }],
    });
    expect(fit.smallest).toBe("truck");
    expect(fit.fits.find((row) => row.key === "handcart")?.fits).toBe(false);
  });

  it("refuses impossible weights", async () => {
    const t = await demoWorld();
    await expect(
      t.query(api.logistics.vehicleFit, {
        items: [{ materialCode: "METAL-IRON", kg: -1 }],
      }),
    ).rejects.toThrow(/INVALID_WEIGHT/);
  });
});

describe("today's route", () => {
  it("orders the shop's accepted and on-the-way pickups, nearest first", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    const route = await shop.query(api.logistics.routeToday, {});
    expect(route.date).toBe(indiaToday());
    expect(route.shop).toEqual({
      name: RAMESH,
      area: "Yeshwanthpur",
      hasLocation: true,
    });
    // Rahul (on the way, morning, HMT Layout) then Meena (accepted,
    // afternoon, Malleshwaram); Priya's request isn't accepted yet.
    expect(route.stops.map((stop) => [stop.name, stop.status])).toEqual([
      ["Rahul Gowda", "on_the_way"],
      ["Meena Iyer", "accepted"],
    ]);
    expect(route.stops[0]).toMatchObject({
      order: 1,
      area: "Yeshwanthpur",
      window: "morning",
      hours: [8, 12],
    });
    expect(route.stops[0]?.phone).toMatch(/^\+91/);
    expect(route.stops[0]?.mapsUrl).toContain("google.com/maps/search");
    expect(route.totalEstGrams).toBe(26_000);
    expect(route.toStart).toBe(1);
    expect(route.slotLimit).toBe(4);
    expect(route.directionsUrl).toContain("google.com/maps/dir");
    expect(route.directionsUrl).toContain("origin=13.028");
  });

  it("sets every accepted pickup on the way with one tap, and says so", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    expect(await shop.mutation(api.logistics.startRoute, {})).toEqual({
      started: 1,
    });
    const route = await shop.query(api.logistics.routeToday, {});
    expect(route.stops.every((stop) => stop.status === "on_the_way")).toBe(
      true,
    );
    expect(route.toStart).toBe(0);
    const meena = route.stops.find((stop) => stop.name === "Meena Iyer");
    expect(
      await auditActions(t, "bookings", meena?.bookingId ?? ""),
    ).toContain("booking.on_the_way");
    // Nothing left to start: a second tap is harmless.
    expect(await shop.mutation(api.logistics.startRoute, {})).toEqual({
      started: 0,
    });
  });

  it("is only for kabadiwalas who are signed in", async () => {
    const t = await demoWorld();
    await expect(t.query(api.logistics.routeToday, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const yard = await signInAs(t, YARD);
    await expect(yard.query(api.logistics.routeToday, {})).rejects.toThrow(
      /WRONG_ROLE/,
    );
    const saathi = await signInAs(t, SAATHI);
    await expect(saathi.mutation(api.logistics.startRoute, {})).rejects.toThrow(
      /NO_BUSINESS/,
    );
  });
});

describe("planning a load", () => {
  it("offers the yard the open kabadiwala lots nearest first, with bulk and litres", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const plan = await yard.query(api.logistics.loadCandidates, {});
    expect(plan.buyer.name).toBe("Peenya Paper & Plastic Yard");
    expect(plan.sellerKind).toBe("kabadiwala");
    expect(plan.vehicles.map((vehicle) => vehicle.key)).toEqual([
      "handcart",
      "cycle",
      "auto",
      "miniTruck",
      "truck",
    ]);
    expect(plan.listings.length).toBeGreaterThan(0);
    expect(plan.listings[0]?.seller.name).toBe(RAMESH);
    const distances = plan.listings.map((row) => row.seller.distanceKm ?? 0);
    expect(distances).toEqual([...distances].toSorted((a, b) => a - b));
    const bundled = plan.listings.find(
      (row) => row.seller.name === RAMESH && row.material.code === "PAPER-NEWS",
    );
    expect(bundled).toMatchObject({
      bulk: "baled",
      litres: litresFor(150_000, "paper", "baled"),
    });
    expect(plan.restrictions.length).toBeGreaterThan(0);
  });

  it("fills one vehicle from two shops in nearest order, with the freight worked out", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { loadId, ramesh, lakshmi } = await planNewspaperLoad(yard);

    const load = await yard.query(api.logistics.load, { loadId });
    expect(load).not.toBeNull();
    if (!load) return;
    expect(load.side).toBe("buyer");
    expect(load.status).toBe("planned");
    expect(load.vehicle).toEqual({ key: "auto", name: "Goods auto" });
    // Ramesh is 2 km from Peenya, Sri Lakshmi 6 km: nearest first, whatever
    // order the yard ticked them in.
    expect(load.stops.map((stop) => stop.name)).toEqual([RAMESH, SRI_LAKSHMI]);
    expect(load.stops.map((stop) => stop.order)).toEqual([1, 2]);
    expect(load.stops.every((stop) => stop.status === "pending")).toBe(true);
    expect(load.stops[0]?.phone).toMatch(/^\+91/);
    expect(load.totalGrams).toBe(ramesh.grams + lakshmi.grams);
    expect(load.totalLitres).toBe(ramesh.litres + lakshmi.litres);
    expect(load.weightPercent).toBe(52);
    expect(load.valuePaise).toBe(
      Math.round((ramesh.grams * ramesh.askPaisePerKg) / 1000) +
        Math.round((lakshmi.grams * lakshmi.askPaisePerKg) / 1000),
    );
    expect(load.needsEwayBill).toBe(false);

    const km = routeKm(
      { lat: 13.0285, lng: 77.519 },
      [ramesh.seller.location, lakshmi.seller.location],
    );
    expect(load.routeKm).toBe(km);
    const auto = { baseFarePaise: 20_500, perKmPaise: 1300, loadingPaise: 5000 };
    expect(load.freight).toEqual(freightFor(auto, km, 2));
    expect(load.freightPerKgPaise).toBe(
      Math.round((load.freight.totalPaise * 1000) / load.totalGrams),
    );
    expect(load.paidBy).toBe("buyer");
    expect(load.vehicleNo).toBe("KA 05 AB 4471");
    expect(load.driverPhone).toBe("+919845000031");
    expect(load.actions).toEqual(["start", "cancel"]);
    expect(await auditActions(t, "loads", loadId)).toEqual(["load.planned"]);
  });

  it("keeps the order the yard chose", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const ramesh = await candidate(yard, RAMESH, "PAPER-NEWS");
    const lakshmi = await candidate(yard, SRI_LAKSHMI, "PAPER-NEWS");
    const loadId = await yard.mutation(api.logistics.planLoad, {
      stops: [
        { listingId: ramesh.listingId, grams: 50_000 },
        { listingId: lakshmi.listingId, grams: 50_000 },
      ],
      order: [lakshmi.listingId, ramesh.listingId],
      vehicleType: "auto",
      paidBy: "seller",
      date: indiaToday(),
      window: "evening",
    });
    const load = await yard.query(api.logistics.load, { loadId });
    expect(load?.stops.map((stop) => stop.name)).toEqual([SRI_LAKSHMI, RAMESH]);
    expect(load?.paidBy).toBe("seller");

    await expect(
      yard.mutation(api.logistics.planLoad, {
        stops: [{ listingId: ramesh.listingId, grams: 50_000 }],
        order: [lakshmi.listingId],
        vehicleType: "auto",
        paidBy: "buyer",
        date: indiaToday(),
        window: "evening",
      }),
    ).rejects.toThrow(/INVALID_ORDER/);
  });

  it("refuses a load that doesn't fit by weight or by volume", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const iron = await candidate(yard, "Koramangala Scrap Traders", "METAL-IRON");
    await expect(
      yard.mutation(api.logistics.planLoad, {
        stops: [{ listingId: iron.listingId, grams: iron.grams }],
        vehicleType: "handcart",
        paidBy: "buyer",
        date: tomorrow(),
        window: "morning",
      }),
    ).rejects.toThrow(/OVER_PAYLOAD/);

    // 75 kg of loose PET bottles is 1,875 litres: light, but a cycle cart's
    // 600 litres are gone long before its payload is.
    const pet = await candidate(yard, "Indiranagar Kabadi Point", "PLASTIC-PET");
    await expect(
      yard.mutation(api.logistics.planLoad, {
        stops: [{ listingId: pet.listingId, grams: pet.grams }],
        vehicleType: "cycle",
        paidBy: "buyer",
        date: tomorrow(),
        window: "morning",
      }),
    ).rejects.toThrow(/OVER_VOLUME/);
  });

  it("checks the lots, the date, the phone and the vehicle number", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const ramesh = await candidate(yard, RAMESH, "PAPER-NEWS");
    const base = {
      stops: [{ listingId: ramesh.listingId, grams: 50_000 }],
      vehicleType: "auto" as const,
      paidBy: "buyer" as const,
      date: tomorrow(),
      window: "morning" as const,
    };
    await expect(
      yard.mutation(api.logistics.planLoad, { ...base, stops: [] }),
    ).rejects.toThrow(/NO_STOPS/);
    await expect(
      yard.mutation(api.logistics.planLoad, {
        ...base,
        stops: [...base.stops, ...base.stops],
      }),
    ).rejects.toThrow(/DUPLICATE_STOP/);
    await expect(
      yard.mutation(api.logistics.planLoad, {
        ...base,
        stops: [{ listingId: ramesh.listingId, grams: ramesh.grams + 1 }],
      }),
    ).rejects.toThrow(/NOT_ENOUGH_LEFT/);
    await expect(
      yard.mutation(api.logistics.planLoad, {
        ...base,
        stops: [{ listingId: ramesh.listingId, grams: 0 }],
      }),
    ).rejects.toThrow(/INVALID_WEIGHT/);
    await expect(
      yard.mutation(api.logistics.planLoad, {
        ...base,
        date: shiftDate(indiaToday(), -1),
      }),
    ).rejects.toThrow(/INVALID_DATE/);
    await expect(
      yard.mutation(api.logistics.planLoad, {
        ...base,
        date: shiftDate(indiaToday(), 15),
      }),
    ).rejects.toThrow(/INVALID_DATE/);
    await expect(
      yard.mutation(api.logistics.planLoad, { ...base, driverPhone: "12345" }),
    ).rejects.toThrow(/INVALID_PHONE/);
    await expect(
      yard.mutation(api.logistics.planLoad, { ...base, vehicleNo: "KA" }),
    ).rejects.toThrow(/INVALID_VEHICLE_NO/);

    // A recycler buys from yards, so a kabadiwala's lot isn't for it.
    const recycler = await signInAs(t, RECYCLER);
    await expect(
      recycler.mutation(api.logistics.planLoad, base),
    ).rejects.toThrow(/NOT_FOUND/);
  });

  it("is for businesses that collect, signed in", async () => {
    const t = await demoWorld();
    await expect(t.query(api.logistics.loadCandidates, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const shop = await signInAs(t, SHOP);
    await expect(shop.query(api.logistics.loadCandidates, {})).rejects.toThrow(
      /WRONG_ROLE/,
    );
    await expect(shop.query(api.logistics.myLoads, {})).rejects.toThrow(
      /WRONG_ROLE/,
    );
  });
});

describe("the seeded loads", () => {
  it("give the demo yard one load on the road, one planned and one delivered", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const loads = await yard.query(api.logistics.myLoads, {});
    expect(loads.active.map((load) => load.status)).toEqual([
      "collecting",
      "planned",
    ]);
    expect(loads.done.map((load) => load.status)).toEqual(["delivered"]);

    const collecting = loads.active[0];
    expect(collecting?.stops.map((stop) => stop.status)).toEqual([
      "collected",
      "accepted",
    ]);
    expect(collecting?.actions).toEqual(["deliver", "cancel"]);
    expect(collecting?.stops[1]?.canCollect).toBe(true);
    expect(collecting?.restrictions.map((row) => row.road)).toContain(
      "Peenya elevated corridor (Tumkur Road)",
    );

    const delivered = loads.done[0];
    expect(delivered?.leavingGrams).toBe(180_000);
    expect(delivered?.arrivedGrams).toBe(178_000);
    expect(delivered?.weightGap).toEqual({
      gapGrams: 2000,
      allowedGrams: 1800,
      isWithinTolerance: false,
    });
    expect(delivered?.actions).toEqual([]);
  });

  it("show each shop the loads that stop at it, with Accept and Decline", async () => {
    const t = await demoWorld();
    const shop = await signInAs(t, SHOP);
    const stops = await shop.query(api.logistics.myStops, {});
    // Ramesh is on the collecting load (already collected) but not the
    // planned one; his stop on the delivered load is history.
    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({
      side: "seller",
      status: "collecting",
      buyer: { name: "Peenya Paper & Plastic Yard", kind: "yard" },
      actions: [],
    });
    const mine = stops[0]?.stops.find((stop) => stop.isMine);
    expect(mine).toMatchObject({ name: RAMESH, status: "collected" });
    // A seller sees who else is on the route, not their phone numbers.
    expect(stops[0]?.stops.every((stop) => stop.phone === undefined)).toBe(
      true,
    );
  });
});

describe("a stop on a load", () => {
  it("is accepted or declined by the shop it's planned at", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { loadId } = await planNewspaperLoad(yard);

    const shop = await signInAs(t, SHOP);
    const waiting = await shop.query(api.logistics.myStops, {});
    const planned = waiting.find((load) => load.id === loadId);
    expect(planned?.actions).toEqual(["accept", "decline"]);

    await shop.mutation(api.logistics.respondToStop, { loadId, accept: true });
    const afterAccept = await shop.query(api.logistics.load, { loadId });
    expect(afterAccept?.side).toBe("seller");
    expect(afterAccept?.stops.find((stop) => stop.isMine)?.status).toBe(
      "accepted",
    );
    expect(afterAccept?.actions).toEqual([]);
    expect(await auditActions(t, "loads", loadId)).toContain(
      "load.stop.accepted",
    );

    // Accepted is final for the shop.
    await expect(
      shop.mutation(api.logistics.respondToStop, { loadId, accept: false }),
    ).rejects.toThrow(/WRONG_STATUS/);
  });

  it("can't be answered by a shop that isn't on the load, or by the buyer", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const hsr = await candidate(yard, "HSR Waste Buyers", "PAPER-CARTON");
    const loadId = await yard.mutation(api.logistics.planLoad, {
      stops: [{ listingId: hsr.listingId, grams: 100_000 }],
      vehicleType: "auto",
      paidBy: "buyer",
      date: tomorrow(),
      window: "morning",
    });
    const shop = await signInAs(t, SHOP);
    await expect(
      shop.mutation(api.logistics.respondToStop, { loadId, accept: true }),
    ).rejects.toThrow(/NOT_FOUND/);
    expect(await shop.query(api.logistics.load, { loadId })).toBeNull();
    await expect(
      yard.mutation(api.logistics.respondToStop, { loadId, accept: true }),
    ).rejects.toThrow(/WRONG_ROLE/);
  });

  it("is weighed and collected by the buyer while the vehicle is out", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { loadId, ramesh } = await planNewspaperLoad(yard);

    // Not before the vehicle has left.
    await expect(
      yard.mutation(api.logistics.collectStop, {
        loadId,
        orgId: ramesh.seller.orgId,
        grams: 148_000,
      }),
    ).rejects.toThrow(/WRONG_STATUS/);

    await yard.mutation(api.logistics.setLoadStatus, {
      loadId,
      status: "collecting",
    });
    await yard.mutation(api.logistics.collectStop, {
      loadId,
      orgId: ramesh.seller.orgId,
      grams: 148_000,
    });
    const load = await yard.query(api.logistics.load, { loadId });
    expect(load?.stops[0]).toMatchObject({
      name: RAMESH,
      status: "collected",
      collectedGrams: 148_000,
      canCollect: false,
    });
    expect(load?.stops[1]?.canCollect).toBe(true);
    expect(await auditActions(t, "loads", loadId)).toContain(
      "load.stop.collected",
    );

    await expect(
      yard.mutation(api.logistics.collectStop, {
        loadId,
        orgId: ramesh.seller.orgId,
        grams: 1000,
      }),
    ).rejects.toThrow(/WRONG_STATUS/);
    await expect(
      yard.mutation(api.logistics.collectStop, {
        loadId,
        orgId: await orgId(t, "hsr-waste-buyers"),
        grams: 1000,
      }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

describe("a load's status", () => {
  it("goes planned → collecting → delivered, weighing the gap at the gate", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { loadId, ramesh, lakshmi } = await planNewspaperLoad(yard);

    await expect(
      yard.mutation(api.logistics.setLoadStatus, {
        loadId,
        status: "delivered",
      }),
    ).rejects.toThrow(/WRONG_STATUS/);

    await yard.mutation(api.logistics.setLoadStatus, {
      loadId,
      status: "collecting",
    });
    let load = await yard.query(api.logistics.load, { loadId });
    expect(load?.status).toBe("collecting");
    expect(load?.startedAt).toBeTypeOf("number");
    expect(load?.actions).toEqual(["deliver", "cancel"]);

    await yard.mutation(api.logistics.collectStop, {
      loadId,
      orgId: ramesh.seller.orgId,
      grams: 150_000,
    });
    await yard.mutation(api.logistics.collectStop, {
      loadId,
      orgId: lakshmi.seller.orgId,
      grams: 110_000,
    });
    await yard.mutation(api.logistics.setLoadStatus, {
      loadId,
      status: "delivered",
      arrivedGrams: 259_000,
    });
    load = await yard.query(api.logistics.load, { loadId });
    expect(load).toMatchObject({
      status: "delivered",
      leavingGrams: 260_000,
      arrivedGrams: 259_000,
      weightGap: { gapGrams: 1000, allowedGrams: 2600, isWithinTolerance: true },
      actions: [],
      restrictions: [],
    });
    expect(load?.timeline.map((step) => step.status)).toEqual([
      "planned",
      "collecting",
      "delivered",
    ]);
    expect(await auditActions(t, "loads", loadId)).toEqual([
      "load.planned",
      "load.collecting",
      "load.stop.collected",
      "load.stop.collected",
      "load.delivered",
    ]);

    // Delivered is final.
    await expect(
      yard.mutation(api.logistics.setLoadStatus, {
        loadId,
        status: "cancelled",
      }),
    ).rejects.toThrow(/WRONG_STATUS/);
    const loads = await yard.query(api.logistics.myLoads, {});
    expect(loads.done.map((load) => load.id)).toContain(loadId);
  });

  it("can be cancelled while open, and never touched by another business", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { loadId } = await planNewspaperLoad(yard);

    const recycler = await signInAs(t, RECYCLER);
    expect(await recycler.query(api.logistics.load, { loadId })).toBeNull();
    await expect(
      recycler.mutation(api.logistics.setLoadStatus, {
        loadId,
        status: "cancelled",
      }),
    ).rejects.toThrow(/NOT_FOUND/);
    expect(await recycler.query(api.logistics.load, { loadId: "nonsense" })).toBeNull();

    await yard.mutation(api.logistics.setLoadStatus, {
      loadId,
      status: "cancelled",
    });
    const load = await yard.query(api.logistics.load, { loadId });
    expect(load?.status).toBe("cancelled");
    expect(load?.actions).toEqual([]);
    // A cancelled load no longer asks the shops anything.
    const shop = await signInAs(t, SHOP);
    const stops = await shop.query(api.logistics.myStops, {});
    expect(stops.map((row) => row.id)).not.toContain(loadId);
  });

  it("refuses a nonsense arrival weight", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const { loadId } = await planNewspaperLoad(yard);
    await yard.mutation(api.logistics.setLoadStatus, {
      loadId,
      status: "collecting",
    });
    await expect(
      yard.mutation(api.logistics.setLoadStatus, {
        loadId,
        status: "delivered",
        arrivedGrams: 0,
      }),
    ).rejects.toThrow(/INVALID_WEIGHT/);
  });
});

describe("road restrictions", () => {
  it("warn about the bans that bite a vehicle in a window", async () => {
    const t = await demoWorld();
    const yard = await signInAs(t, YARD);
    const autos = await yard.query(api.logistics.checkRestrictions, {
      vehicleType: "auto",
      date: indiaToday(),
      window: "morning",
    });
    expect(autos.map((row) => row.road)).toEqual(
      expect.arrayContaining(["Peenya elevated corridor (Tumkur Road)"]),
    );
    // The BGS flyover keeps mini trucks off only in the peaks.
    const midday = await yard.query(api.logistics.checkRestrictions, {
      vehicleType: "miniTruck",
      date: indiaToday(),
      window: "afternoon",
    });
    expect(midday.map((row) => row.road)).not.toContain(
      "BGS flyover (Mysuru Road)",
    );
    const evening = await yard.query(api.logistics.checkRestrictions, {
      vehicleType: "miniTruck",
      date: indiaToday(),
      window: "evening",
    });
    expect(evening.map((row) => row.road)).toContain("BGS flyover (Mysuru Road)");
    // Handcarts are never banned.
    expect(
      await yard.query(api.logistics.checkRestrictions, {
        vehicleType: "handcart",
        date: indiaToday(),
        window: "morning",
      }),
    ).toEqual([]);
  });

  it("need a signed-in business and a real date", async () => {
    const t = await demoWorld();
    await expect(
      t.query(api.logistics.checkRestrictions, {
        vehicleType: "auto",
        date: indiaToday(),
        window: "morning",
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
    const yard = await signInAs(t, YARD);
    await expect(
      yard.query(api.logistics.checkRestrictions, {
        vehicleType: "auto",
        date: "soon",
        window: "morning",
      }),
    ).rejects.toThrow(/INVALID_DATE/);
  });
});

describe("the admin's tables", () => {
  it("list vehicles, rules and restrictions for the admin only", async () => {
    const t = await demoWorld();
    const admin = await asAdmin(t);
    const tables = await admin.query(api.logistics.adminTables, {});
    expect(tables.vehicleTypes.map((row) => row.key)).toEqual([
      "handcart",
      "cycle",
      "auto",
      "miniTruck",
      "truck",
    ]);
    expect(tables.serviceRules.map((row) => [row.key, row.value])).toEqual([
      ["slotMinutes", 120],
      ["defaultSlotLimit", 4],
      ["minPickupGrams", 15_000],
      ["weightTolerancePercent", 1],
    ]);
    expect(tables.roadRestrictions.length).toBeGreaterThan(0);

    await expect(t.query(api.logistics.adminTables, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const yard = await signInAs(t, YARD);
    await expect(yard.query(api.logistics.adminTables, {})).rejects.toThrow(
      /NOT_ADMIN/,
    );
  });

  it("change a vehicle's fares, and the next load is priced with them", async () => {
    const t = await demoWorld();
    const admin = await asAdmin(t);
    await admin.mutation(api.logistics.adminSetVehicleType, {
      key: "auto",
      name: "Goods auto",
      payloadKg: 500,
      volumeLitres: 2400,
      baseFarePaise: 25_000,
      perKmPaise: 1500,
      loadingPaise: 5000,
      active: true,
    });
    const tables = await admin.query(api.logistics.adminTables, {});
    expect(tables.vehicleTypes.find((row) => row.key === "auto")).toMatchObject(
      { baseFarePaise: 25_000, perKmPaise: 1500 },
    );
    const yard = await signInAs(t, YARD);
    const { loadId } = await planNewspaperLoad(yard);
    const load = await yard.query(api.logistics.load, { loadId });
    expect(load?.freight.basePaise).toBe(25_000);

    await expect(
      admin.mutation(api.logistics.adminSetVehicleType, {
        key: "auto",
        name: "G",
        payloadKg: 500,
        volumeLitres: 2400,
        baseFarePaise: 0,
        perKmPaise: 0,
        loadingPaise: 0,
        active: true,
      }),
    ).rejects.toThrow(/INVALID_NAME/);
    await expect(
      admin.mutation(api.logistics.adminSetVehicleType, {
        key: "auto",
        name: "Goods auto",
        payloadKg: 0,
        volumeLitres: 2400,
        baseFarePaise: 0,
        perKmPaise: 0,
        loadingPaise: 0,
        active: true,
      }),
    ).rejects.toThrow(/INVALID_CAPACITY/);
    await expect(
      admin.mutation(api.logistics.adminSetVehicleType, {
        key: "auto",
        name: "Goods auto",
        payloadKg: 500,
        volumeLitres: 2400,
        baseFarePaise: -1,
        perKmPaise: 0,
        loadingPaise: 0,
        active: true,
      }),
    ).rejects.toThrow(/INVALID_FARE/);
  });

  it("set a service rule that the shops' slots then follow", async () => {
    const t = await demoWorld();
    const admin = await asAdmin(t);
    await admin.mutation(api.logistics.adminSetServiceRule, {
      key: "minPickupGrams",
      value: 10_000,
    });
    const slots = await t.query(api.logistics.slotAvailability, {
      orgId: await orgId(t, "ramesh-kabadi-store"),
      date: indiaToday(),
    });
    expect(slots.minPickupGrams).toBe(10_000);
    const tables = await admin.query(api.logistics.adminTables, {});
    expect(
      tables.serviceRules.find((row) => row.key === "minPickupGrams"),
    ).toMatchObject({ value: 10_000, effectiveFrom: indiaToday() });

    await expect(
      admin.mutation(api.logistics.adminSetServiceRule, {
        key: "somethingElse",
        value: 1,
      }),
    ).rejects.toThrow(/UNKNOWN_RULE/);
    await expect(
      admin.mutation(api.logistics.adminSetServiceRule, {
        key: "slotMinutes",
        value: 0,
      }),
    ).rejects.toThrow(/INVALID_VALUE/);
    const yard = await signInAs(t, YARD);
    await expect(
      yard.mutation(api.logistics.adminSetServiceRule, {
        key: "slotMinutes",
        value: 60,
      }),
    ).rejects.toThrow(/NOT_ADMIN/);
  });

  it("add, change and remove a road restriction", async () => {
    const t = await demoWorld();
    const admin = await asAdmin(t);
    const id = await admin.mutation(api.logistics.adminSaveRestriction, {
      road: "  Hosur Road  ",
      vehicleTypes: ["truck", "truck"],
      hoursFrom: 8,
      hoursTo: 20,
      from: indiaToday(),
      to: shiftDate(indiaToday(), 3),
      note: "Metro works",
    });
    let tables = await admin.query(api.logistics.adminTables, {});
    expect(tables.roadRestrictions.find((row) => row.id === id)).toMatchObject({
      road: "Hosur Road",
      vehicleTypes: ["truck"],
      note: "Metro works",
    });
    const yard = await signInAs(t, YARD);
    expect(
      (
        await yard.query(api.logistics.checkRestrictions, {
          vehicleType: "truck",
          date: indiaToday(),
          window: "morning",
        })
      ).map((row) => row.road),
    ).toContain("Hosur Road");

    await admin.mutation(api.logistics.adminSaveRestriction, {
      id,
      road: "Hosur Road",
      vehicleTypes: ["truck"],
      hoursFrom: 22,
      hoursTo: 24,
      from: indiaToday(),
      to: shiftDate(indiaToday(), 3),
    });
    expect(
      (
        await yard.query(api.logistics.checkRestrictions, {
          vehicleType: "truck",
          date: indiaToday(),
          window: "morning",
        })
      ).map((row) => row.road),
    ).not.toContain("Hosur Road");

    await admin.mutation(api.logistics.adminDeleteRestriction, { id });
    tables = await admin.query(api.logistics.adminTables, {});
    expect(tables.roadRestrictions.map((row) => row.id)).not.toContain(id);
    expect(await auditActions(t, "roadRestrictions", id)).toEqual([
      "roadRestriction.added",
      "roadRestriction.updated",
      "roadRestriction.removed",
    ]);
    await expect(
      admin.mutation(api.logistics.adminDeleteRestriction, { id }),
    ).rejects.toThrow(/NOT_FOUND/);
  });

  it("refuse a restriction with bad hours, dates or no vehicles", async () => {
    const t = await demoWorld();
    const admin = await asAdmin(t);
    const base = {
      road: "Hosur Road",
      vehicleTypes: ["truck" as const],
      hoursFrom: 8,
      hoursTo: 20,
      from: indiaToday(),
      to: shiftDate(indiaToday(), 3),
    };
    await expect(
      admin.mutation(api.logistics.adminSaveRestriction, {
        ...base,
        hoursFrom: 20,
        hoursTo: 8,
      }),
    ).rejects.toThrow(/INVALID_HOURS/);
    await expect(
      admin.mutation(api.logistics.adminSaveRestriction, {
        ...base,
        from: shiftDate(indiaToday(), 5),
      }),
    ).rejects.toThrow(/INVALID_DATES/);
    await expect(
      admin.mutation(api.logistics.adminSaveRestriction, {
        ...base,
        vehicleTypes: [],
      }),
    ).rejects.toThrow(/NO_VEHICLES/);
    await expect(
      admin.mutation(api.logistics.adminSaveRestriction, { ...base, road: "A" }),
    ).rejects.toThrow(/INVALID_ROAD/);
    const yard = await signInAs(t, YARD);
    await expect(
      yard.mutation(api.logistics.adminSaveRestriction, base),
    ).rejects.toThrow(/NOT_ADMIN/);
  });
});
