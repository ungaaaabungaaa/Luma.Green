/**
 * The logistics arithmetic — docs/plan.md, "pool the business loads, not the
 * household ones". Pure functions shared by the Convex functions and the
 * screens: distance, stop order, whether a load fits a vehicle, what the
 * trip costs, which time slots are full, and which roads are closed to which
 * vehicles. Money is integer paise, mass integer grams, volume whole litres.
 */

import type { Family } from "./catalogue";
import type { SlotWindow } from "./households";

export interface Point {
  lat: number;
  lng: number;
}

// --- Vehicles ------------------------------------------------------------------

export const VEHICLE_KEYS = [
  "handcart",
  "cycle",
  "auto",
  "miniTruck",
  "truck",
] as const;
export type VehicleKey = (typeof VEHICLE_KEYS)[number];

/** A row of the admin's vehicleTypes table, as the maths needs it. */
export interface VehicleSpec {
  key: VehicleKey;
  payloadKg: number;
  volumeLitres: number;
  baseFarePaise: number;
  perKmPaise: number;
  loadingPaise: number;
}

/** What a business registered as its vehicle (orgs.vehicle) → a vehicle key. */
export function vehicleKeyOf(
  vehicle: "handcart" | "cycle" | "auto" | "mini_truck" | undefined,
): VehicleKey | null {
  if (vehicle === undefined) return null;
  return vehicle === "mini_truck" ? "miniTruck" : vehicle;
}

// --- Distance --------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km, unrounded. */
export function haversineKm(from: Point, to: Point): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Distance to one decimal, for screens. */
export function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}

/**
 * City streets are longer than the straight line between two points. Road
 * distance is taken as the great-circle distance times this factor, which is
 * what freight estimates use until a routing service is wired in.
 */
export const ROAD_FACTOR = 1.3;

/**
 * Stops in nearest-neighbour order from `start`: at each step, the closest
 * stop not yet visited. Stops with no known position keep their given order
 * and come last. Good enough for a dozen stops; a solver comes later
 * (VROOM, once yards run several vehicles a day).
 */
export function nearestNeighbourOrder<T>(
  start: Point,
  stops: readonly T[],
  locate: (stop: T) => Point | undefined,
): T[] {
  const located = stops.filter((stop) => locate(stop) !== undefined);
  const unlocated = stops.filter((stop) => locate(stop) === undefined);
  const ordered: T[] = [];
  let here = start;
  while (located.length > 0) {
    let bestIndex = 0;
    let bestKm = Infinity;
    for (const [index, stop] of located.entries()) {
      const point = locate(stop);
      const km = point ? haversineKm(here, point) : Infinity;
      if (km >= bestKm) continue;
      bestKm = km;
      bestIndex = index;
    }
    const [next] = located.splice(bestIndex, 1);
    if (next === undefined) break;
    ordered.push(next);
    here = locate(next) ?? here;
  }
  return [...ordered, ...unlocated];
}

/**
 * Road kilometres of a trip: start → each point in order, and back to the
 * start when `shouldReturnToStart`. Unknown points are skipped.
 */
export function routeKm(
  start: Point,
  points: readonly (Point | undefined)[],
  shouldReturnToStart = true,
): number {
  let km = 0;
  let here = start;
  for (const point of points) {
    if (!point) continue;
    km += haversineKm(here, point);
    here = point;
  }
  if (shouldReturnToStart) km += haversineKm(here, start);
  return roundKm(km * ROAD_FACTOR);
}

// --- Volume and vehicle fit ------------------------------------------------------

export type Bulk = "loose" | "baled";

/**
 * Bulk density in grams per litre (= kg/m³), by material family, loose and
 * baled or bundled. Indicative figures for planning: PET bottles and film are
 * what fill a vehicle by volume long before its payload is reached.
 */
export const BULK_DENSITY: Record<Family, Record<Bulk, number>> = {
  paper: { loose: 120, baled: 450 },
  plastic: { loose: 40, baled: 250 },
  metal: { loose: 600, baled: 1500 },
  glass: { loose: 300, baled: 300 },
  ewaste: { loose: 200, baled: 200 },
  other: { loose: 100, baled: 300 },
};

/** Whole litres `grams` of a family take up, loose or baled. */
export function litresFor(grams: number, family: Family, bulk: Bulk): number {
  return grams <= 0 ? 0 : Math.ceil(grams / BULK_DENSITY[family][bulk]);
}

/** "Baled", "bundled" or "flattened" in a lot's note means it's compacted. */
export function bulkFromNote(note: string | undefined): Bulk {
  return note !== undefined &&
    /\b(baled?|bales?|bundled|flattened)\b/i.test(note)
    ? "baled"
    : "loose";
}

export interface FitItem {
  grams: number;
  family: Family;
  bulk?: Bulk;
}

export interface VehicleFit {
  key: VehicleKey;
  payloadKg: number;
  volumeLitres: number;
  /** Whole percent of the payload and of the volume the items take. */
  weightPercent: number;
  volumePercent: number;
  fitsWeight: boolean;
  fitsVolume: boolean;
  fits: boolean;
}

export function percentOf(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.round((part / whole) * 100);
}

export function totalGrams(items: readonly FitItem[]): number {
  return items.reduce((sum, item) => sum + item.grams, 0);
}

export function totalLitres(items: readonly FitItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum + litresFor(item.grams, item.family, item.bulk ?? "loose"),
    0,
  );
}

/**
 * How the items sit in each vehicle, smallest payload first, and the smallest
 * vehicle they fit in (null when nothing does). Both weight and volume must
 * fit: a handcart of PET bottles is full at 30 kg.
 */
export function vehicleFit(
  items: readonly FitItem[],
  vehicles: readonly VehicleSpec[],
): {
  grams: number;
  litres: number;
  fits: VehicleFit[];
  smallest: VehicleKey | null;
} {
  const grams = totalGrams(items);
  const litres = totalLitres(items);
  const fits = vehicles
    .toSorted((a, b) => a.payloadKg - b.payloadKg)
    .map((vehicle) => {
      const isWithinPayload = grams <= vehicle.payloadKg * 1000;
      const isWithinVolume = litres <= vehicle.volumeLitres;
      return {
        key: vehicle.key,
        payloadKg: vehicle.payloadKg,
        volumeLitres: vehicle.volumeLitres,
        weightPercent: percentOf(grams, vehicle.payloadKg * 1000),
        volumePercent: percentOf(litres, vehicle.volumeLitres),
        fitsWeight: isWithinPayload,
        fitsVolume: isWithinVolume,
        fits: isWithinPayload && isWithinVolume,
      };
    });
  return {
    grams,
    litres,
    fits,
    smallest: fits.find((fit) => fit.fits)?.key ?? null,
  };
}

// --- Freight ----------------------------------------------------------------------

export interface Freight {
  basePaise: number;
  distancePaise: number;
  loadingPaise: number;
  totalPaise: number;
}

/**
 * What hiring `vehicle` for `km` with `stops` pickups costs: the base fare,
 * the per-km charge, and one loading charge per stop. Whole paise. A shop's
 * own handcart or cycle has zero fares and costs nothing to hire.
 */
export function freightFor(
  vehicle: Pick<VehicleSpec, "baseFarePaise" | "perKmPaise" | "loadingPaise">,
  km: number,
  stops: number,
): Freight {
  const basePaise = vehicle.baseFarePaise;
  const distancePaise = Math.round(Math.max(0, km) * vehicle.perKmPaise);
  const loadingPaise = vehicle.loadingPaise * Math.max(0, stops);
  return {
    basePaise,
    distancePaise,
    loadingPaise,
    totalPaise: basePaise + distancePaise + loadingPaise,
  };
}

/** Freight per kilo of load, whole paise; 0 for an empty load. */
export function freightPerKgPaise(totalPaise: number, grams: number): number {
  return grams <= 0 ? 0 : Math.round((totalPaise * 1000) / grams);
}

// --- Pickup slots -------------------------------------------------------------------

export const SERVICE_RULE_KEYS = [
  "slotMinutes",
  "defaultSlotLimit",
  "minPickupGrams",
  "weightTolerancePercent",
] as const;
export type ServiceRuleKey = (typeof SERVICE_RULE_KEYS)[number];

/** What the rules table starts with, and what applies when a row is missing. */
export const DEFAULT_SERVICE_RULES: Record<
  ServiceRuleKey,
  { value: number; unit: string; note: string }
> = {
  slotMinutes: {
    value: 120,
    unit: "minutes",
    note: "How long one pickup window is.",
  },
  defaultSlotLimit: {
    value: 4,
    unit: "pickups",
    note: "Pickups a shop takes per window unless it sets its own limit.",
  },
  minPickupGrams: {
    value: 15_000,
    unit: "grams",
    note: "Below this estimate a household is offered a drop-off instead.",
  },
  weightTolerancePercent: {
    value: 1,
    unit: "percent",
    note: "Gap between leaving and arriving weight that needs no explanation.",
  },
};

export interface SlotUsage {
  window: SlotWindow;
  booked: number;
  limit: number;
  isFull: boolean;
}

const WINDOWS: readonly SlotWindow[] = ["morning", "afternoon", "evening"];

/** Bookings per window against the shop's limit; full windows are hidden. */
export function slotUsage(
  bookings: readonly { slotWindow: SlotWindow }[],
  limit: number,
): SlotUsage[] {
  return WINDOWS.map((window) => {
    const booked = bookings.filter((b) => b.slotWindow === window).length;
    return { window, booked, limit, isFull: booked >= limit };
  });
}

/** A pickup smaller than the minimum: suggest a drop-off at the shop. */
export function isBelowMinimum(grams: number, minPickupGrams: number): boolean {
  return grams < minPickupGrams;
}

/**
 * Whether the arriving weight is within tolerance of the leaving weight.
 * Percent is whole (1 = 1%); grams are integers, so the allowed gap is
 * rounded down to the gram.
 */
export function weightGap(
  leavingGrams: number,
  arrivedGrams: number,
  tolerancePercent: number,
): { gapGrams: number; allowedGrams: number; isWithinTolerance: boolean } {
  const gapGrams = Math.abs(leavingGrams - arrivedGrams);
  const allowedGrams = Math.floor((leavingGrams * tolerancePercent) / 100);
  return {
    gapGrams,
    allowedGrams,
    isWithinTolerance: gapGrams <= allowedGrams,
  };
}

// --- Road restrictions --------------------------------------------------------------

export interface Restriction {
  road: string;
  vehicleTypes: readonly VehicleKey[];
  /** Hours of the day the ban applies, India time: 0–24. 0 to 24 = all day. */
  hoursFrom: number;
  hoursTo: number;
  /** YYYY-MM-DD, inclusive. */
  from: string;
  to: string;
  note?: string;
}

/** Whether two [from, to) hour ranges overlap. */
export function areHoursOverlapping(
  a: readonly [number, number],
  b: readonly [number, number],
): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

/**
 * The restrictions that bite a `vehicleType` trip on `date` during `hours`
 * — the ones to warn about when planning a collection window.
 */
export function restrictionsFor<T extends Restriction>(
  restrictions: readonly T[],
  vehicleType: VehicleKey,
  date: string,
  hours: readonly [number, number],
): T[] {
  return restrictions.filter(
    (restriction) =>
      restriction.vehicleTypes.includes(vehicleType) &&
      restriction.from <= date &&
      date <= restriction.to &&
      areHoursOverlapping([restriction.hoursFrom, restriction.hoursTo], hours),
  );
}

// --- Load and stop states -----------------------------------------------------------

export type LoadStatus = "planned" | "collecting" | "delivered" | "cancelled";

const LOAD_NEXT: Record<LoadStatus, readonly LoadStatus[]> = {
  planned: ["collecting", "cancelled"],
  collecting: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canMoveLoad(from: LoadStatus, to: LoadStatus): boolean {
  return LOAD_NEXT[from].includes(to);
}

export function isOpenLoad(status: LoadStatus): boolean {
  return status === "planned" || status === "collecting";
}

export type StopStatus = "pending" | "accepted" | "declined" | "collected";

/** A driver may collect from a shop that never tapped Accept. */
const STOP_NEXT: Record<StopStatus, readonly StopStatus[]> = {
  pending: ["accepted", "declined", "collected"],
  accepted: ["collected"],
  declined: [],
  collected: [],
};

export function canMoveStop(from: StopStatus, to: StopStatus): boolean {
  return STOP_NEXT[from].includes(to);
}

// --- Places -------------------------------------------------------------------------

/**
 * Rough centres of Bengaluru areas, for pickups whose address has no
 * coordinates: enough to order a route, not to navigate by. A booking's area
 * is the last part of its address before the city.
 */
export const BENGALURU_AREAS: Readonly<Record<string, Point>> = {
  yeshwanthpur: { lat: 13.028, lng: 77.5409 },
  malleshwaram: { lat: 13.0035, lng: 77.571 },
  mathikere: { lat: 13.033, lng: 77.556 },
  "hmt layout": { lat: 13.043, lng: 77.535 },
  "nandini layout": { lat: 13.014, lng: 77.534 },
  goraguntepalya: { lat: 13.028, lng: 77.53 },
  "tumkur road": { lat: 13.03, lng: 77.522 },
  rajajinagar: { lat: 12.991, lng: 77.552 },
  peenya: { lat: 13.0285, lng: 77.519 },
  "peenya industrial area": { lat: 13.0285, lng: 77.519 },
  jalahalli: { lat: 13.047, lng: 77.547 },
  hebbal: { lat: 13.0358, lng: 77.597 },
  "rt nagar": { lat: 13.022, lng: 77.594 },
  sanjaynagar: { lat: 13.035, lng: 77.575 },
  sadashivanagar: { lat: 13.0068, lng: 77.5813 },
  vijayanagar: { lat: 12.9719, lng: 77.533 },
  nagarbhavi: { lat: 12.96, lng: 77.513 },
  kengeri: { lat: 12.908, lng: 77.485 },
  basavanagudi: { lat: 12.9422, lng: 77.576 },
  jayanagar: { lat: 12.925, lng: 77.5938 },
  "jp nagar": { lat: 12.9063, lng: 77.5857 },
  banashankari: { lat: 12.9255, lng: 77.5468 },
  "btm layout": { lat: 12.9166, lng: 77.6101 },
  koramangala: { lat: 12.9352, lng: 77.6245 },
  "hsr layout": { lat: 12.9116, lng: 77.6474 },
  bellandur: { lat: 12.926, lng: 77.6762 },
  indiranagar: { lat: 12.9784, lng: 77.6408 },
  ulsoor: { lat: 12.9816, lng: 77.6187 },
  shivajinagar: { lat: 12.9857, lng: 77.6057 },
  majestic: { lat: 12.9767, lng: 77.5713 },
  chickpet: { lat: 12.968, lng: 77.576 },
  "frazer town": { lat: 12.9985, lng: 77.6152 },
  kammanahalli: { lat: 13.014, lng: 77.637 },
  hennur: { lat: 13.028, lng: 77.643 },
  "hegde nagar": { lat: 13.06, lng: 77.63 },
  yelahanka: { lat: 13.1007, lng: 77.5963 },
  marathahalli: { lat: 12.9569, lng: 77.7011 },
  whitefield: { lat: 12.9698, lng: 77.75 },
  sarjapur: { lat: 12.86, lng: 77.78 },
  "electronic city": { lat: 12.8452, lng: 77.6602 },
  bommasandra: { lat: 12.8155, lng: 77.697 },
  jigani: { lat: 12.785, lng: 77.638 },
  nelamangala: { lat: 13.099, lng: 77.393 },
  kumbalgodu: { lat: 12.872, lng: 77.441 },
  bidadi: { lat: 12.797, lng: 77.388 },
};

/**
 * The area of an address: the last part before the city. "Flat 4B, Rose
 * Apartments, Yeshwanthpur, Bengaluru" → "Yeshwanthpur".
 */
export function areaOfAddress(address: string, city: string): string {
  const cityAt = address.toLowerCase().indexOf(`, ${city.toLowerCase()}`);
  const beforeCity = cityAt === -1 ? address : address.slice(0, cityAt);
  const parts = beforeCity
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  return parts.at(-1) ?? address;
}

/**
 * A rough position for an address: its area's centre, when the area is one
 * we know; else the first known area named anywhere in the address.
 */
export function pointForAddress(
  address: string,
  city: string,
  areas: Readonly<Record<string, Point>> = BENGALURU_AREAS,
): Point | undefined {
  const area = areaOfAddress(address, city).toLowerCase();
  if (Object.hasOwn(areas, area)) return areas[area];
  const lower = address.toLowerCase();
  const named = Object.keys(areas).find((name) => lower.includes(name));
  return named === undefined ? undefined : areas[named];
}

// --- Maps links -------------------------------------------------------------------------

const MAPS = "https://www.google.com/maps";

/** Opens a place by name or address. */
export function mapsSearchUrl(place: string): string {
  return `${MAPS}/search/?api=1&query=${encodeURIComponent(place)}`;
}

/** Google Maps takes the destination plus at most this many waypoints. */
export const MAX_MAPS_WAYPOINTS = 9;

/**
 * Turn-by-turn directions through every stop in order, starting at the
 * shop. Google Maps takes at most nine waypoints plus the destination, so
 * longer routes open with their first ten stops.
 */
export function mapsDirectionsUrl(
  origin: Point | string,
  stops: readonly string[],
): string | null {
  if (stops.length === 0) return null;
  const shown = stops.slice(0, MAX_MAPS_WAYPOINTS + 1);
  const destination = shown.at(-1) ?? "";
  const waypoints = shown.slice(0, -1);
  const from =
    typeof origin === "string"
      ? origin
      : `${String(origin.lat)},${String(origin.lng)}`;
  const params = new URLSearchParams({
    api: "1",
    origin: from,
    destination,
    travelmode: "driving",
  });
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `${MAPS}/dir/?${params.toString()}`;
}
