import { describe, expect, it } from "vitest";

import {
  areaOfAddress,
  BULK_DENSITY,
  bulkFromNote,
  canMoveLoad,
  canMoveStop,
  DEFAULT_SERVICE_RULES,
  freightFor,
  freightPerKgPaise,
  haversineKm,
  hoursOverlap,
  isBelowMinimum,
  isOpenLoad,
  litresFor,
  mapsDirectionsUrl,
  mapsSearchUrl,
  MAX_MAPS_WAYPOINTS,
  nearestNeighbourOrder,
  percentOf,
  pointForAddress,
  restrictionsFor,
  ROAD_FACTOR,
  routeKm,
  roundKm,
  SERVICE_RULE_KEYS,
  slotUsage,
  vehicleFit,
  vehicleKeyOf,
  type VehicleSpec,
  weightGap,
} from "./routing";

// Demo businesses, from convex/lib/demo.ts.
const PEENYA = { lat: 13.0285, lng: 77.519 };
const YESHWANTHPUR = { lat: 13.028, lng: 77.5409 };
const MALLESHWARAM = { lat: 13.0035, lng: 77.571 };
const HSR = { lat: 12.9116, lng: 77.6474 };

const AUTO: VehicleSpec = {
  key: "auto",
  payloadKg: 500,
  volumeLitres: 2400,
  baseFarePaise: 20_500,
  perKmPaise: 1300,
  loadingPaise: 5000,
};
const HANDCART: VehicleSpec = {
  key: "handcart",
  payloadKg: 150,
  volumeLitres: 900,
  baseFarePaise: 0,
  perKmPaise: 0,
  loadingPaise: 0,
};
const CYCLE: VehicleSpec = {
  key: "cycle",
  payloadKg: 100,
  volumeLitres: 600,
  baseFarePaise: 0,
  perKmPaise: 0,
  loadingPaise: 0,
};

describe("distance", () => {
  it("measures Peenya to Yeshwanthpur at about 2.4 km as the crow flies", () => {
    const km = haversineKm(PEENYA, YESHWANTHPUR);
    expect(km).toBeGreaterThan(2.3);
    expect(km).toBeLessThan(2.5);
    expect(haversineKm(PEENYA, PEENYA)).toBe(0);
  });

  it("rounds kilometres to one decimal for screens", () => {
    expect(roundKm(2.375)).toBe(2.4);
    expect(roundKm(0)).toBe(0);
  });

  it("stretches the straight line by the road factor, out and back", () => {
    const straight = haversineKm(PEENYA, YESHWANTHPUR);
    expect(routeKm(PEENYA, [YESHWANTHPUR])).toBe(
      roundKm(2 * straight * ROAD_FACTOR),
    );
    expect(routeKm(PEENYA, [YESHWANTHPUR], false)).toBe(
      roundKm(straight * ROAD_FACTOR),
    );
  });

  it("skips stops without a position and costs nothing for none", () => {
    expect(routeKm(PEENYA, [])).toBe(0);
    expect(routeKm(PEENYA, [undefined, YESHWANTHPUR])).toBe(
      routeKm(PEENYA, [YESHWANTHPUR]),
    );
  });
});

describe("nearest-neighbour order", () => {
  const stops = [
    { name: "HSR", at: HSR },
    { name: "Malleshwaram", at: MALLESHWARAM },
    { name: "Yeshwanthpur", at: YESHWANTHPUR },
  ];

  it("visits the closest stop next, starting from the yard", () => {
    const order = nearestNeighbourOrder(PEENYA, stops, (stop) => stop.at);
    expect(order.map((stop) => stop.name)).toEqual([
      "Yeshwanthpur",
      "Malleshwaram",
      "HSR",
    ]);
  });

  it("keeps stops with no position last, in their given order", () => {
    const withUnknown = [
      { name: "Unknown A", at: undefined },
      ...stops,
      { name: "Unknown B", at: undefined },
    ];
    const order = nearestNeighbourOrder(
      PEENYA,
      withUnknown,
      (stop) => stop.at,
    );
    expect(order.map((stop) => stop.name)).toEqual([
      "Yeshwanthpur",
      "Malleshwaram",
      "HSR",
      "Unknown A",
      "Unknown B",
    ]);
  });

  it("leaves the input alone", () => {
    const copy = [...stops];
    nearestNeighbourOrder(PEENYA, stops, (stop) => stop.at);
    expect(stops).toEqual(copy);
  });
});

describe("volume and vehicle fit", () => {
  it("turns grams into whole litres by family and bulk", () => {
    expect(litresFor(30_000, "plastic", "loose")).toBe(750);
    expect(litresFor(150_000, "paper", "baled")).toBe(334);
    expect(litresFor(1, "metal", "loose")).toBe(1);
    expect(litresFor(0, "paper", "loose")).toBe(0);
    for (const family of Object.keys(BULK_DENSITY) as (keyof typeof BULK_DENSITY)[]) {
      expect(BULK_DENSITY[family].baled).toBeGreaterThanOrEqual(
        BULK_DENSITY[family].loose,
      );
    }
  });

  it("reads 'baled', 'bundled' or 'flattened' in a note as compacted", () => {
    expect(bulkFromNote("Dry, bundled")).toBe("baled");
    expect(bulkFromNote("Baled OCC, 500 kg bales")).toBe("baled");
    expect(bulkFromNote("Flattened boxes")).toBe("baled");
    expect(bulkFromNote("Sorted clear PET")).toBe("loose");
    expect(bulkFromNote(undefined)).toBe("loose");
  });

  it("fills a handcart of PET bottles by volume long before its payload", () => {
    const fit = vehicleFit(
      [{ grams: 30_000, family: "plastic" }],
      [AUTO, HANDCART, CYCLE],
    );
    expect(fit.grams).toBe(30_000);
    expect(fit.litres).toBe(750);
    // Smallest payload first.
    expect(fit.fits.map((row) => row.key)).toEqual([
      "cycle",
      "handcart",
      "auto",
    ]);
    expect(fit.fits[0]).toMatchObject({
      fitsWeight: true,
      fitsVolume: false,
      fits: false,
      weightPercent: 30,
      volumePercent: 125,
    });
    expect(fit.smallest).toBe("handcart");
  });

  it("says when nothing fits", () => {
    const fit = vehicleFit([{ grams: 600_000, family: "metal" }], [AUTO]);
    expect(fit.fits[0]?.fitsWeight).toBe(false);
    expect(fit.smallest).toBeNull();
  });

  it("gives whole percentages and zero of nothing", () => {
    expect(percentOf(30_000, 150_000)).toBe(20);
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(10, 0)).toBe(0);
  });
});

describe("freight", () => {
  it("adds the base fare, the distance and one loading charge per stop", () => {
    const freight = freightFor(AUTO, 6.2, 2);
    expect(freight).toEqual({
      basePaise: 20_500,
      distancePaise: 8060,
      loadingPaise: 10_000,
      totalPaise: 38_560,
    });
  });

  it("costs nothing on the shop's own handcart", () => {
    expect(freightFor(HANDCART, 12, 5).totalPaise).toBe(0);
  });

  it("never charges for negative distance or stops", () => {
    expect(freightFor(AUTO, -3, -1)).toEqual({
      basePaise: 20_500,
      distancePaise: 0,
      loadingPaise: 0,
      totalPaise: 20_500,
    });
  });

  it("works out whole paise per kilo, and zero for an empty load", () => {
    expect(freightPerKgPaise(38_560, 260_000)).toBe(148);
    expect(freightPerKgPaise(38_560, 0)).toBe(0);
  });
});

describe("pickup slots", () => {
  it("ships the four rules the plan asks for, with their defaults", () => {
    expect([...SERVICE_RULE_KEYS]).toEqual([
      "slotMinutes",
      "defaultSlotLimit",
      "minPickupGrams",
      "weightTolerancePercent",
    ]);
    expect(DEFAULT_SERVICE_RULES.slotMinutes.value).toBe(120);
    expect(DEFAULT_SERVICE_RULES.defaultSlotLimit.value).toBe(4);
    expect(DEFAULT_SERVICE_RULES.minPickupGrams.value).toBe(15_000);
    expect(DEFAULT_SERVICE_RULES.weightTolerancePercent.value).toBe(1);
  });

  it("marks a window full once the shop's limit is reached", () => {
    const usage = slotUsage(
      [
        { slotWindow: "morning" },
        { slotWindow: "morning" },
        { slotWindow: "evening" },
      ],
      2,
    );
    expect(usage).toEqual([
      { window: "morning", booked: 2, limit: 2, isFull: true },
      { window: "afternoon", booked: 0, limit: 2, isFull: false },
      { window: "evening", booked: 1, limit: 2, isFull: false },
    ]);
  });

  it("nudges small pickups to a drop-off", () => {
    expect(isBelowMinimum(14_999, 15_000)).toBe(true);
    expect(isBelowMinimum(15_000, 15_000)).toBe(false);
  });

  it("flags a weight gap above the tolerance, to the gram", () => {
    expect(weightGap(100_000, 99_500, 1)).toEqual({
      gapGrams: 500,
      allowedGrams: 1000,
      isWithinTolerance: true,
    });
    expect(weightGap(148_000, 146_000, 1)).toEqual({
      gapGrams: 2000,
      allowedGrams: 1480,
      isWithinTolerance: false,
    });
    // The allowance rounds down, so 1% of 99 g is 0 g.
    expect(weightGap(99, 100, 1).isWithinTolerance).toBe(false);
  });
});

describe("road restrictions", () => {
  const rows = [
    {
      road: "Peenya elevated corridor",
      vehicleTypes: ["auto" as const],
      hoursFrom: 0,
      hoursTo: 24,
      from: "2026-10-01",
      to: "2026-10-31",
    },
    {
      road: "BGS flyover",
      vehicleTypes: ["miniTruck" as const],
      hoursFrom: 7,
      hoursTo: 11,
      from: "2026-10-01",
      to: "2026-10-31",
    },
  ];

  it("overlaps half-open hour ranges", () => {
    expect(hoursOverlap([7, 11], [8, 12])).toBe(true);
    expect(hoursOverlap([7, 11], [11, 15])).toBe(false);
    expect(hoursOverlap([0, 24], [16, 20])).toBe(true);
  });

  it("returns the bans that bite this vehicle in this window", () => {
    expect(
      restrictionsFor(rows, "auto", "2026-10-13", [8, 12]).map((r) => r.road),
    ).toEqual(["Peenya elevated corridor"]);
    expect(
      restrictionsFor(rows, "miniTruck", "2026-10-13", [12, 16]),
    ).toEqual([]);
    expect(
      restrictionsFor(rows, "miniTruck", "2026-10-13", [8, 12]).map(
        (r) => r.road,
      ),
    ).toEqual(["BGS flyover"]);
  });

  it("ignores bans outside their dates", () => {
    expect(restrictionsFor(rows, "auto", "2026-11-01", [8, 12])).toEqual([]);
    expect(restrictionsFor(rows, "auto", "2026-09-30", [8, 12])).toEqual([]);
    expect(restrictionsFor(rows, "auto", "2026-10-31", [8, 12])).toHaveLength(
      1,
    );
  });
});

describe("load and stop states", () => {
  it("moves a load forward or cancels it, never backwards", () => {
    expect(canMoveLoad("planned", "collecting")).toBe(true);
    expect(canMoveLoad("planned", "cancelled")).toBe(true);
    expect(canMoveLoad("planned", "delivered")).toBe(false);
    expect(canMoveLoad("collecting", "delivered")).toBe(true);
    expect(canMoveLoad("collecting", "planned")).toBe(false);
    expect(canMoveLoad("delivered", "cancelled")).toBe(false);
    expect(canMoveLoad("cancelled", "collecting")).toBe(false);
    expect(isOpenLoad("planned")).toBe(true);
    expect(isOpenLoad("collecting")).toBe(true);
    expect(isOpenLoad("delivered")).toBe(false);
  });

  it("lets a driver collect from a shop that never tapped Accept", () => {
    expect(canMoveStop("pending", "accepted")).toBe(true);
    expect(canMoveStop("pending", "declined")).toBe(true);
    expect(canMoveStop("pending", "collected")).toBe(true);
    expect(canMoveStop("accepted", "collected")).toBe(true);
    expect(canMoveStop("accepted", "declined")).toBe(false);
    expect(canMoveStop("declined", "collected")).toBe(false);
    expect(canMoveStop("collected", "pending")).toBe(false);
  });
});

describe("places", () => {
  it("reads the area as the last part of an address before the city", () => {
    expect(
      areaOfAddress(
        "Flat 4B, Rose Apartments, Yeshwanthpur, Bengaluru",
        "Bengaluru",
      ),
    ).toBe("Yeshwanthpur");
    expect(areaOfAddress("Nandini Layout", "Bengaluru")).toBe(
      "Nandini Layout",
    );
    expect(areaOfAddress("5, Sampige Road, Malleshwaram", "Bengaluru")).toBe(
      "Malleshwaram",
    );
  });

  it("places an address at its area's centre, or by any area it names", () => {
    expect(pointForAddress("HMT Layout, Yeshwanthpur", "Bengaluru")).toEqual({
      lat: 13.028,
      lng: 77.5409,
    });
    expect(pointForAddress("Tumkur Road, Goraguntepalya", "Bengaluru")).toEqual(
      { lat: 13.028, lng: 77.53 },
    );
    // "Rose Apartments" is not an area; the address still names Yeshwanthpur.
    expect(
      pointForAddress("Rose Apartments near Yeshwanthpur station", "Bengaluru"),
    ).toEqual({ lat: 13.028, lng: 77.5409 });
    expect(pointForAddress("Somewhere new", "Bengaluru")).toBeUndefined();
  });

  it("maps a business's registered vehicle onto a vehicle key", () => {
    expect(vehicleKeyOf("mini_truck")).toBe("miniTruck");
    expect(vehicleKeyOf("auto")).toBe("auto");
    expect(vehicleKeyOf(undefined)).toBeNull();
  });
});

describe("maps links", () => {
  it("opens a place by name", () => {
    expect(mapsSearchUrl("8th Main, Malleshwaram")).toBe(
      "https://www.google.com/maps/search/?api=1&query=8th%20Main%2C%20Malleshwaram",
    );
  });

  it("drives from the shop through every stop, the last one the destination", () => {
    const url = mapsDirectionsUrl(PEENYA, ["A", "B", "C"]);
    expect(url).not.toBeNull();
    const params = new URL(url ?? "").searchParams;
    expect(params.get("origin")).toBe("13.0285,77.519");
    expect(params.get("destination")).toBe("C");
    expect(params.get("waypoints")).toBe("A|B");
    expect(params.get("travelmode")).toBe("driving");
  });

  it("takes an address as the origin, and has no link for no stops", () => {
    const url = mapsDirectionsUrl("Plot 7, Peenya", ["A"]);
    const params = new URL(url ?? "").searchParams;
    expect(params.get("origin")).toBe("Plot 7, Peenya");
    expect(params.has("waypoints")).toBe(false);
    expect(mapsDirectionsUrl(PEENYA, [])).toBeNull();
  });

  it("stops at Google's waypoint limit", () => {
    const stops = Array.from({ length: 14 }, (_, index) => `S${String(index)}`);
    const url = mapsDirectionsUrl(PEENYA, stops);
    const params = new URL(url ?? "").searchParams;
    expect(params.get("waypoints")?.split("|")).toHaveLength(
      MAX_MAPS_WAYPOINTS,
    );
    expect(params.get("destination")).toBe(`S${String(MAX_MAPS_WAYPOINTS)}`);
  });
});
