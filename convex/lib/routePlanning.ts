import { z } from "zod";

export const MAX_ROUTE_GRAMS = 1_000_000_000;
const label = z.string().trim().min(1).max(160);
const coordinate = {
  siteReference: label,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
};
export const routeInputSchema = z
  .object({
    title: label,
    vehicleReference: label,
    capacityGrams: z.number().int().min(1).max(MAX_ROUTE_GRAMS),
    origin: z.object(coordinate),
    stops: z
      .array(
        z.object({
          ...coordinate,
          materialId: z.string().min(1),
          grams: z.number().int().min(1).max(MAX_ROUTE_GRAMS),
        }),
      )
      .min(1)
      .max(20),
    ordering: z.enum(["entered", "geometric"]),
  })
  .refine(
    (value) =>
      value.stops.reduce((sum, stop) => sum + stop.grams, 0) <=
      value.capacityGrams,
    { message: "ROUTE_OVER_CAPACITY" },
  );
export type RouteInput = z.infer<typeof routeInputSchema>;
interface Point {
  latitude: number;
  longitude: number;
}
/** Spherical great-circle distance; never a road distance, ETA or navigation route. */
export function straightLineMeters(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * rad;
  const lon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(lon / 2) ** 2;
  return (
    6_371_000 *
    2 *
    Math.atan2(
      Math.sqrt(Math.min(1, Math.max(0, h))),
      Math.sqrt(Math.max(0, 1 - h)),
    )
  );
}
export function routeGeometry(input: RouteInput) {
  const remaining = input.stops.map((_, index) => index);
  const orderIndices: number[] = [];
  let current: Point = input.origin;
  let distance = 0;
  while (remaining.length > 0) {
    if (input.ordering === "geometric") {
      remaining.sort(
        (a, b) =>
          straightLineMeters(current, input.stops[a]) -
            straightLineMeters(current, input.stops[b]) || a - b,
      );
    }
    const index = remaining.shift();
    if (index === undefined) break;
    const stop = input.stops[index];
    distance += straightLineMeters(current, stop);
    orderIndices.push(index);
    current = stop;
  }
  return {
    orderIndices,
    straightLineMeters: Math.round(distance),
    totalGrams: input.stops.reduce((sum, stop) => sum + stop.grams, 0),
  };
}
