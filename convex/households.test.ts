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
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

/** The demo household, with two seeded bookings (priyademo1 and 2). */
const PRIYA = "+919000000109";
const HOME = "Flat 12, 4th Cross, Mathikere, Bengaluru";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function demoWorld() {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  return t;
}

type World = Awaited<ReturnType<typeof demoWorld>>;

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

async function rate(t: World, slug: string, code: string): Promise<number> {
  const id = await orgId(t, slug);
  const row = await t.run(async (ctx) =>
    ctx.db
      .query("rateCards")
      .withIndex("by_org_material", (q) =>
        q.eq("orgId", id).eq("materialCode", code),
      )
      .unique(),
  );
  if (!row) throw new Error(`No ${code} price at ${slug}`);
  return row.paisePerKg;
}

/** Someone new, signed in with their phone for the first time. */
async function newHousehold(t: World, phone = "+919876500001") {
  const as = await signIn(t, {
    email: `${phone.slice(1)}@phone.luma.green`,
    phoneNumber: phone,
  });
  await as.mutation(api.identity.ensureProfile, { locale: "en" });
  return as;
}

function tomorrow() {
  return shiftDate(indiaToday(), 1);
}

const basket = [
  { materialCode: "PAPER-NEWS", kg: 12 },
  { materialCode: "PLASTIC-PET", kg: 3 },
];

async function pickupAt(t: World, slug = "ramesh-kabadi-store") {
  return {
    orgId: await orgId(t, slug),
    mode: "pickup" as const,
    items: basket,
    slotDate: tomorrow(),
    slotWindow: "morning" as const,
    address: HOME,
    name: "Arjun",
  };
}

async function bookingByToken(t: World, token: string) {
  return t.run(async (ctx) =>
    ctx.db
      .query("bookings")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique(),
  );
}

async function statusOf(t: World, token: string) {
  const booking = await bookingByToken(t, token);
  return booking?.status;
}

describe("households.shops", () => {
  it("prices the basket at each shop's own rates, the city fallback for gaps", async () => {
    const t = await demoWorld();
    const shops = await t.query(api.households.shops, {
      items: [
        { materialCode: "PAPER-NEWS", kg: 10 },
        { materialCode: "METAL-IRON", kg: 5 },
      ],
    });

    const ramesh = shops.find((shop) => shop.name === "Ramesh Kabadi Store");
    expect(ramesh?.estimatePaise).toBe(
      10 * (await rate(t, "ramesh-kabadi-store", "PAPER-NEWS")) +
        5 * (await rate(t, "ramesh-kabadi-store", "METAL-IRON")),
    );
    expect(ramesh?.fallbackCodes).toEqual([]);

    // Jayanagar buys paper and plastic only: iron is at the city fallback.
    const jayanagar = shops.find(
      (shop) => shop.name === "Jayanagar Raddi Centre",
    );
    expect(jayanagar?.fallbackCodes).toEqual(["METAL-IRON"]);
    expect(jayanagar?.estimatePaise).toBe(
      10 * (await rate(t, "jayanagar-raddi-centre", "PAPER-NEWS")) + 5 * 2800,
    );
    expect(jayanagar?.offersPickup).toBe(false);
  });

  it("lists active kabadiwalas only, best offer first", async () => {
    const t = await demoWorld();
    const sriLakshmi = await orgId(t, "sri-lakshmi-scrap");
    await t.run(async (ctx) => {
      await ctx.db.patch("orgs", sriLakshmi, { status: "suspended" });
    });

    const shops = await t.query(api.households.shops, {
      items: [{ materialCode: "PAPER-NEWS", kg: 10 }],
    });
    const names = shops.map((shop) => shop.name);
    expect(names).toHaveLength(5);
    expect(names).not.toContain("Sri Lakshmi Scrap");
    expect(names).not.toContain("Peenya Paper & Plastic Yard");
    const offers = shops.map((shop) => shop.estimatePaise);
    expect(offers).toEqual(offers.toSorted((a, b) => b - a));
    expect(shops.every((shop) => shop.distanceKm === undefined)).toBe(true);
  });

  it("sorts nearest first when the household shares where they are", async () => {
    const t = await demoWorld();
    const shops = await t.query(api.households.shops, {
      items: [{ materialCode: "PAPER-NEWS", kg: 10 }],
      near: { lat: 13.028, lng: 77.5409 }, // Yeshwanthpur
    });
    expect(shops[0]).toMatchObject({
      name: "Ramesh Kabadi Store",
      distanceKm: 0,
    });
    const distances = shops.map((shop) => shop.distanceKm ?? 0);
    expect(distances).toEqual(distances.toSorted((a, b) => a - b));
  });

  it("refuses a basket it can't price", async () => {
    const t = await demoWorld();
    const shops = (items: { materialCode: string; kg: number }[]) =>
      t.query(api.households.shops, { items });
    await expect(shops([{ materialCode: "NOPE", kg: 1 }])).rejects.toThrow(
      /UNKNOWN_MATERIAL/,
    );
    // Recycled output is sold by recyclers, never by households.
    await expect(
      shops([{ materialCode: "RECYCLED-PET-FLAKE", kg: 1 }]),
    ).rejects.toThrow(/UNKNOWN_MATERIAL/);
    await expect(
      shops([{ materialCode: "PAPER-NEWS", kg: 0 }]),
    ).rejects.toThrow(/INVALID_KG/);
    await expect(
      shops([{ materialCode: "PAPER-NEWS", kg: 501 }]),
    ).rejects.toThrow(/INVALID_KG/);
    await expect(
      t.query(api.households.shops, {
        items: [],
        near: { lat: 200, lng: 77 },
      }),
    ).rejects.toThrow(/INVALID_LOCATION/);
  });
});

describe("households.book", () => {
  it("books a pickup for the signed-in household at the shop's prices", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    const token = await arjun.mutation(api.households.book, {
      ...(await pickupAt(t)),
      address: "  Flat 12, 4th Cross,\n Mathikere ",
      name: "  Arjun Nair ",
    });
    expect(token).toMatch(/^[2-9a-z]{10}$/);

    const booking = await bookingByToken(t, token);
    expect(booking).toMatchObject({
      status: "requested",
      mode: "pickup",
      phone: "+919876500001",
      name: "Arjun Nair",
      address: "Flat 12, 4th Cross, Mathikere",
      slotDate: tomorrow(),
      slotWindow: "morning",
      items: [
        { materialCode: "PAPER-NEWS", estKg: 12 },
        { materialCode: "PLASTIC-PET", estKg: 3 },
      ],
      estimatePaise:
        12 * (await rate(t, "ramesh-kabadi-store", "PAPER-NEWS")) +
        3 * (await rate(t, "ramesh-kabadi-store", "PLASTIC-PET")),
    });
    expect(booking?.householdProfileId).toBeDefined();
    expect(booking?.timeline.map((step) => step.status)).toEqual(["requested"]);

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entityTable", "bookings").eq("entityId", booking?._id ?? ""),
        )
        .collect(),
    );
    expect(audit.map((row) => row.action)).toEqual(["booking.requested"]);
  });

  it("needs a signed-in household", async () => {
    const t = await demoWorld();
    await expect(
      t.mutation(api.households.book, await pickupAt(t)),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });

  it("needs an address for a pickup", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    const noAddress = { ...(await pickupAt(t)), address: undefined };
    await expect(
      arjun.mutation(api.households.book, noAddress),
    ).rejects.toThrow(/ADDRESS_REQUIRED/);
    await expect(
      arjun.mutation(api.households.book, {
        ...noAddress,
        address: "Flat 4",
      }),
    ).rejects.toThrow(/INVALID_ADDRESS/);
  });

  it("books a pickup only with a shop that picks up; a drop-off with any", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    const jayanagar = await pickupAt(t, "jayanagar-raddi-centre");
    await expect(
      arjun.mutation(api.households.book, jayanagar),
    ).rejects.toThrow(/SHOP_NO_PICKUP/);

    const token = await arjun.mutation(api.households.book, {
      ...jayanagar,
      mode: "dropoff",
    });
    const booking = await bookingByToken(t, token);
    expect(booking?.mode).toBe("dropoff");
    // A drop-off never keeps the household's address.
    expect(booking?.address).toBeUndefined();
  });

  it("books only an active kabadiwala", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    await expect(
      arjun.mutation(
        api.households.book,
        await pickupAt(t, "peenya-paper-plastic-yard"),
      ),
    ).rejects.toThrow(/SHOP_NOT_FOUND/);
  });

  it("books from today up to seven days ahead", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    const today = indiaToday();
    const booking = await pickupAt(t);
    for (const slotDate of [shiftDate(today, -1), shiftDate(today, 8), "x"]) {
      await expect(
        arjun.mutation(api.households.book, { ...booking, slotDate }),
      ).rejects.toThrow(/INVALID_DATE/);
    }
    await expect(
      arjun.mutation(api.households.book, {
        ...booking,
        slotDate: shiftDate(today, 7),
        slotWindow: "evening",
      }),
    ).resolves.toMatch(/^[2-9a-z]{10}$/);
  });

  it("checks the basket and the name", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    const booking = await pickupAt(t);
    const attempt = (changes: Partial<typeof booking>) =>
      arjun.mutation(api.households.book, { ...booking, ...changes });

    await expect(attempt({ items: [] })).rejects.toThrow(/EMPTY_BASKET/);
    await expect(
      attempt({ items: [{ materialCode: "PAPER-NEWS", kg: 0 }] }),
    ).rejects.toThrow(/INVALID_KG/);
    await expect(
      attempt({ items: [{ materialCode: "PAPER-NEWS", kg: 500.5 }] }),
    ).rejects.toThrow(/INVALID_KG/);
    await expect(
      attempt({ items: [{ materialCode: "GOLD", kg: 1 }] }),
    ).rejects.toThrow(/UNKNOWN_MATERIAL/);
    const tooMany = Array.from({ length: 21 }, (_, index) => ({
      materialCode: `M${String(index)}`,
      kg: 1,
    }));
    await expect(attempt({ items: tooMany })).rejects.toThrow(/TOO_MANY_ITEMS/);
    await expect(attempt({ name: " A " })).rejects.toThrow(/INVALID_NAME/);
  });

  it("counts older open bookings even after fifty newer cancellations", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    const booking = await pickupAt(t);
    const tokens = [];
    for (let index = 0; index < 5; index += 1) {
      tokens.push(await arjun.mutation(api.households.book, booking));
    }
    const original = await bookingByToken(t, tokens[0]);
    if (!original) throw new Error("Missing booking");
    await t.run(async (ctx) => {
      const { _id, _creationTime, ...data } = original;
      for (let index = 0; index < 50; index += 1) {
        await ctx.db.insert("bookings", {
          ...data,
          token: `closed-${String(index)}`,
          status: "cancelled",
        });
      }
    });
    const before = await t.run((ctx) => ctx.db.query("bookings").collect());
    await expect(arjun.mutation(api.households.book, booking)).rejects.toThrow(
      /TOO_MANY_OPEN/,
    );
    expect(await t.run((ctx) => ctx.db.query("bookings").collect())).toEqual(
      before,
    );
  });

  it("keeps a household to five open bookings at once", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    const booking = await pickupAt(t);
    for (let index = 0; index < 5; index += 1) {
      await arjun.mutation(api.households.book, booking);
    }
    await expect(arjun.mutation(api.households.book, booking)).rejects.toThrow(
      /TOO_MANY_OPEN/,
    );
  });
});

describe("households.track", () => {
  it("shows the booking to anyone with the link, without the household's phone or address", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t, "+919876512345");
    const token = await arjun.mutation(api.households.book, await pickupAt(t));

    const view = await t.query(api.households.track, { token });
    expect(view).toMatchObject({
      token,
      status: "requested",
      mode: "pickup",
      slotDate: tomorrow(),
      slotWindow: "morning",
      isMine: false,
      canCancel: true,
      shop: {
        name: "Ramesh Kabadi Store",
        area: "Yeshwanthpur",
        // The shop's own number, so the household can call.
        phone: "+919000000101",
      },
    });
    expect(view?.items.map((row) => row.material.names.en)).toEqual([
      "Newspaper",
      "PET bottles",
    ]);

    const everything = JSON.stringify(view);
    expect(everything).not.toContain("9876512345");
    expect(everything).not.toContain("Mathikere");
    expect(everything).not.toContain("Arjun");
  });

  it("shows the receipt and points of a finished pickup", async () => {
    const t = await demoWorld();
    const view = await t.query(api.households.track, { token: "priyademo2" });
    expect(view?.status).toBe("completed");
    expect(view?.canCancel).toBe(false);
    expect(view?.receipt?.lines.map((line) => line.material.names.en)).toEqual([
      "Newspaper",
      "Cardboard boxes",
    ]);
    expect(view?.receipt?.totalPaise).toBe(
      view?.receipt?.lines.reduce((sum, line) => sum + line.paise, 0),
    );
    expect(view?.points).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toContain("Rose Apartments");
  });

  it("knows whether the viewer is the household that booked", async () => {
    const t = await demoWorld();
    const priya = await signInAs(t, PRIYA);
    const stranger = await newHousehold(t);
    const token = "priyademo1";
    const asPriya = await priya.query(api.households.track, { token });
    const asStranger = await stranger.query(api.households.track, { token });
    const signedOut = await t.query(api.households.track, { token });
    expect(asPriya?.isMine).toBe(true);
    expect(asStranger?.isMine).toBe(false);
    expect(signedOut?.isMine).toBe(false);
  });

  it("finds nothing for an unknown link", async () => {
    const t = await demoWorld();
    expect(
      await t.query(api.households.track, { token: "nosuchbook" }),
    ).toBeNull();
    expect(await t.query(api.households.track, { token: "" })).toBeNull();
  });
});

describe("households.mine", () => {
  it("lists the signed-in household's own bookings, newest first", async () => {
    const t = await demoWorld();
    const priya = await signInAs(t, PRIYA);
    const token = await priya.mutation(api.households.book, {
      ...(await pickupAt(t)),
      name: "Priya",
    });

    const mine = await priya.query(api.households.mine, {});
    expect(mine?.map((row) => row.token)).toEqual([
      token,
      "priyademo1",
      "priyademo2",
    ]);
    expect(mine?.[0]).toMatchObject({
      status: "requested",
      shopName: "Ramesh Kabadi Store",
      itemCount: 2,
      estGrams: 15_000,
    });
    expect(mine?.[2]?.paidPaise).toBeGreaterThan(0);
  });

  it("shows nobody else's bookings, and nothing when signed out", async () => {
    const t = await demoWorld();
    const stranger = await newHousehold(t);
    expect(await stranger.query(api.households.mine, {})).toEqual([]);
    expect(await t.query(api.households.mine, {})).toBeNull();
  });
});

describe("households.cancel", () => {
  it("lets the household cancel while it's requested", async () => {
    const t = await demoWorld();
    const priya = await signInAs(t, PRIYA);
    await priya.mutation(api.households.cancel, { token: "priyademo1" });

    const booking = await bookingByToken(t, "priyademo1");
    expect(booking?.status).toBe("cancelled");
    expect(booking?.timeline.map((step) => step.status)).toEqual([
      "requested",
      "cancelled",
    ]);
    const view = await priya.query(api.households.track, {
      token: "priyademo1",
    });
    expect(view?.canCancel).toBe(false);
  });

  it("lets the household cancel an accepted pickup, but not once it's on the way", async () => {
    const t = await demoWorld();
    const arjun = await newHousehold(t);
    const token = await arjun.mutation(api.households.book, await pickupAt(t));
    const booking = await bookingByToken(t, token);
    if (!booking) throw new Error("not booked");

    await t.run(async (ctx) => {
      await ctx.db.patch("bookings", booking._id, { status: "accepted" });
    });
    await arjun.mutation(api.households.cancel, { token });
    expect(await statusOf(t, token)).toBe("cancelled");

    const second = await arjun.mutation(api.households.book, await pickupAt(t));
    const onTheWay = await bookingByToken(t, second);
    if (!onTheWay) throw new Error("not booked");
    await t.run(async (ctx) => {
      await ctx.db.patch("bookings", onTheWay._id, { status: "on_the_way" });
    });
    await expect(
      arjun.mutation(api.households.cancel, { token: second }),
    ).rejects.toThrow(/CANNOT_CANCEL/);
  });

  it("refuses a finished pickup, someone else's booking and signed-out visitors", async () => {
    const t = await demoWorld();
    const priya = await signInAs(t, PRIYA);
    await expect(
      priya.mutation(api.households.cancel, { token: "priyademo2" }),
    ).rejects.toThrow(/CANNOT_CANCEL/);

    const stranger = await newHousehold(t);
    await expect(
      stranger.mutation(api.households.cancel, { token: "priyademo1" }),
    ).rejects.toThrow(/NOT_YOURS/);
    await expect(
      t.mutation(api.households.cancel, { token: "priyademo1" }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
    await expect(
      priya.mutation(api.households.cancel, { token: "nosuchbook" }),
    ).rejects.toThrow(/NOT_FOUND/);
    expect(await statusOf(t, "priyademo1")).toBe("requested");
  });
});
