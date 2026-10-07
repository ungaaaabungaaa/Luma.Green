import { describe, expect, it } from "vitest";

import {
  routeGeometry,
  routeInputSchema,
  straightLineMeters,
} from "./routePlanning";

const input = {
  title: "Plan",
  vehicleReference: "Vehicle",
  capacityGrams: 2000,
  origin: { siteReference: "Origin", latitude: 0, longitude: 0 },
  stops: [
    {
      siteReference: "Far",
      latitude: 0,
      longitude: 2,
      materialId: "material",
      grams: 1000,
    },
    {
      siteReference: "Near",
      latitude: 0,
      longitude: 1,
      materialId: "material",
      grams: 1000,
    },
  ],
  ordering: "entered" as const,
};
describe("manual route planning", () => {
  it("keeps whole grams exact and rejects overflow, fractions and excess capacity", () => {
    expect(routeInputSchema.safeParse(input).success).toBe(true);
    for (const capacityGrams of [
      1999,
      0,
      1.5,
      Number.MAX_SAFE_INTEGER,
      Infinity,
    ])
      expect(
        routeInputSchema.safeParse({ ...input, capacityGrams }).success,
      ).toBe(false);
    expect(
      routeInputSchema.safeParse({
        ...input,
        stops: [{ ...input.stops[0], grams: 1.5 }],
      }).success,
    ).toBe(false);
    expect(routeGeometry(input).totalGrams).toBe(2000);
  });
  it("validates both coordinates and bounds stops", () => {
    for (const latitude of [-91, 91, NaN, Infinity])
      expect(
        routeInputSchema.safeParse({
          ...input,
          origin: { ...input.origin, latitude },
        }).success,
      ).toBe(false);
    expect(
      routeInputSchema.safeParse({
        ...input,
        origin: { ...input.origin, longitude: 181 },
      }).success,
    ).toBe(false);
    expect(routeInputSchema.safeParse({ ...input, stops: [] }).success).toBe(
      false,
    );
    expect(
      routeInputSchema.safeParse({
        ...input,
        capacityGrams: 30_000,
        stops: Array.from({ length: 21 }, () => input.stops[0]),
      }).success,
    ).toBe(false);
  });
  it("keeps entered order or chooses deterministic nearest-next without claiming optimality", () => {
    expect(routeGeometry(input).orderIndices).toEqual([0, 1]);
    expect(
      routeGeometry({ ...input, ordering: "geometric" }).orderIndices,
    ).toEqual([1, 0]);
    const tied = {
      ...input,
      ordering: "geometric" as const,
      stops: [
        { ...input.stops[0], latitude: 0, longitude: 1 },
        { ...input.stops[1], latitude: 0, longitude: -1 },
      ],
    };
    expect(routeGeometry(tied).orderIndices).toEqual([0, 1]);
  });
  it("crosses the dateline on the short arc and stays finite at antipodes/poles", () => {
    const distance = straightLineMeters(
      { latitude: 0, longitude: 179.9 },
      { latitude: 0, longitude: -179.9 },
    );
    expect(distance).toBeGreaterThan(22_000);
    expect(distance).toBeLessThan(23_000);
    expect(
      straightLineMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 180 },
      ),
    ).toBeCloseTo(Math.PI * 6_371_000, 1);
    expect(
      Number.isFinite(
        straightLineMeters(
          { latitude: 90, longitude: -180 },
          { latitude: -90, longitude: 180 },
        ),
      ),
    ).toBe(true);
    expect(straightLineMeters(input.origin, input.origin)).toBe(0);
  });
});
