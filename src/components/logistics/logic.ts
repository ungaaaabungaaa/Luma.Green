import { shiftDate } from "../../../convex/lib/dates";
import { SLOT_WINDOW_HOURS } from "../../../convex/lib/households";
import {
  freightFor,
  freightPerKgPaise,
  litresFor,
  nearestNeighbourOrder,
  percentOf,
  type Point,
  restrictionsFor,
  routeKm,
} from "../../../convex/lib/routing";
import { paiseFor } from "../../../convex/lib/chain";
import type {
  Candidate,
  LoadStatus,
  PlanVehicle,
  RestrictionView,
  Window,
} from "./types";

/**
 * The logistics screens' rules, kept out of the components so they can be
 * tested on their own. The load planner runs the same arithmetic as
 * convex/logistics.ts (from convex/lib/routing.ts) so the estimate on the
 * screen is the one the server records.
 */

/** How far ahead a collection can be planned, in days — as the server allows. */
export const PLAN_DAYS_AHEAD = 14;

/** The most stops one vehicle takes — as the server allows. */
export const MAX_STOPS = 12;

// --- Capacity ---------------------------------------------------------------------

export type CapacityTone = "ok" | "near" | "over";

/** Green until 85%, amber to 100%, red beyond. */
export function capacityTone(percent: number): CapacityTone {
  if (percent > 100) return "over";
  return percent >= 85 ? "near" : "ok";
}

// --- Load steps ---------------------------------------------------------------------

export const LOAD_STEPS = ["planned", "collecting", "delivered"] as const;

export type StepState = "done" | "current" | "todo";

/** Where a load stands on its way to the gate; a cancelled load has no steps. */
export function loadStepStates(status: LoadStatus): StepState[] | null {
  if (status === "cancelled") return null;
  const reached = LOAD_STEPS.indexOf(status);
  return LOAD_STEPS.map((_, index) => {
    if (index <= reached) return "done";
    return index === reached + 1 ? "current" : "todo";
  });
}

// --- Planning a load ------------------------------------------------------------------

export interface Selection {
  listingId: Candidate["listingId"];
  grams: number;
}

export interface PlanStop extends Candidate {
  /** Grams the buyer is taking from this lot. */
  takeGrams: number;
  /** Litres those grams take, at the lot's bulk. */
  takeLitres: number;
}

/**
 * The chosen lots as stops, in the buyer's order — or nearest-neighbour from
 * the yard when the buyer hasn't reordered them. Lots that are no longer on
 * offer drop out.
 */
export function plannedStops(
  buyer: Point | undefined,
  candidates: readonly Candidate[],
  selection: readonly Selection[],
  order: readonly string[] | null,
): PlanStop[] {
  const byId = new Map(candidates.map((lot) => [lot.listingId, lot]));
  const stops: PlanStop[] = [];
  for (const chosen of selection) {
    const lot = byId.get(chosen.listingId);
    if (!lot) continue;
    stops.push({
      ...lot,
      takeGrams: chosen.grams,
      takeLitres: litresFor(chosen.grams, lot.material.family, lot.bulk),
    });
  }
  if (order) {
    const rank = new Map(order.map((id, index) => [id, index]));
    return stops.toSorted(
      (a, b) =>
        (rank.get(a.listingId) ?? Infinity) - (rank.get(b.listingId) ?? Infinity),
    );
  }
  return buyer
    ? nearestNeighbourOrder(buyer, stops, (stop) => stop.seller.location)
    : stops;
}

export interface PlanSummary {
  grams: number;
  litres: number;
  weightPercent: number;
  volumePercent: number;
  fitsWeight: boolean;
  fitsVolume: boolean;
  km: number;
  freight: ReturnType<typeof freightFor>;
  perKgPaise: number;
  valuePaise: number;
}

/** Everything the planner shows about the load as it stands. */
export function planSummary(
  stops: readonly PlanStop[],
  vehicle: PlanVehicle,
  buyer: Point | undefined,
): PlanSummary {
  const grams = stops.reduce((sum, stop) => sum + stop.takeGrams, 0);
  const litres = stops.reduce((sum, stop) => sum + stop.takeLitres, 0);
  const km = buyer
    ? routeKm(
        buyer,
        stops.map((stop) => stop.seller.location),
      )
    : 0;
  const freight = freightFor(vehicle, km, stops.length);
  return {
    grams,
    litres,
    weightPercent: percentOf(grams, vehicle.payloadKg * 1000),
    volumePercent: percentOf(litres, vehicle.volumeLitres),
    fitsWeight: grams <= vehicle.payloadKg * 1000,
    fitsVolume: litres <= vehicle.volumeLitres,
    km,
    freight,
    perKgPaise: freightPerKgPaise(freight.totalPaise, grams),
    valuePaise: stops.reduce(
      (sum, stop) => sum + paiseFor(stop.takeGrams, stop.askPaisePerKg),
      0,
    ),
  };
}

/** The bans in force for this vehicle in this window, to warn about. */
export function planWarnings(
  restrictions: readonly RestrictionView[],
  vehicleType: PlanVehicle["key"],
  date: string,
  window: Window,
): RestrictionView[] {
  return restrictionsFor(
    restrictions,
    vehicleType,
    date,
    SLOT_WINDOW_HOURS[window],
  );
}

/** A stop moved one place up or down the list; out of range leaves it alone. */
export function moveStop<T>(
  order: readonly T[],
  index: number,
  direction: -1 | 1,
): T[] {
  const target = index + direction;
  if (index < 0 || index >= order.length || target < 0 || target >= order.length) {
    return [...order];
  }
  const next = [...order];
  const [moved] = next.splice(index, 1);
  if (moved === undefined) return [...order];
  next.splice(target, 0, moved);
  return next;
}

/** Every day a collection can be planned for, today first. */
export function planDates(today: string): string[] {
  return Array.from({ length: PLAN_DAYS_AHEAD + 1 }, (_, day) =>
    shiftDate(today, day),
  );
}

/** The one thing stopping the plan from being sent, if any. */
export type PlanProblem = "noStops" | "tooManyStops" | "overWeight" | "overVolume";

export function planProblem(
  stops: readonly PlanStop[],
  summary: PlanSummary,
): PlanProblem | null {
  if (stops.length === 0) return "noStops";
  if (stops.length > MAX_STOPS) return "tooManyStops";
  if (!summary.fitsWeight) return "overWeight";
  if (!summary.fitsVolume) return "overVolume";
  return null;
}

/**
 * The smallest vehicle that takes the chosen lots, if any — offered when the
 * chosen one is too small.
 */
export function smallestVehicleFor(
  vehicles: readonly PlanVehicle[],
  grams: number,
  litres: number,
): PlanVehicle | null {
  return (
    vehicles
      .toSorted((a, b) => a.payloadKg - b.payloadKg)
      .find(
        (vehicle) =>
          grams <= vehicle.payloadKg * 1000 && litres <= vehicle.volumeLitres,
      ) ?? null
  );
}

// --- Reading what people type -----------------------------------------------------------

const KG_PATTERN = /^(?:\d+(?:\.\d{0,3})?|\.\d{1,3})$/;

/** "12.5" kg → 12500 grams; null unless it's a weight above zero. */
export function parseKg(input: string): number | null {
  const text = input.trim();
  if (!KG_PATTERN.test(text)) return null;
  const grams = Math.round(Number(text) * 1000);
  return grams > 0 ? grams : null;
}

/** Grams as the plain number a kg field holds: 12500 → "12.5". */
export function kgFieldValue(grams: number): string {
  return String(grams / 1000);
}

/** A phone number for `tel:` links: digits and a leading plus only. */
export function telHref(phone: string): string {
  return `tel:${phone.replaceAll(/[^\d+]/g, "")}`;
}
