import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";

/** Result shapes of the logistics functions, as the screens use them. */

export type RouteView = FunctionReturnType<typeof api.logistics.routeToday>;
export type RouteStop = RouteView["stops"][number];

export type LoadView = NonNullable<
  FunctionReturnType<typeof api.logistics.load>
>;
export type LoadStopView = LoadView["stops"][number];
export type LoadStatus = LoadView["status"];
export type StopStatus = LoadStopView["status"];
export type LoadAction = LoadView["actions"][number];
export type LoadSide = LoadView["side"];
export type RestrictionView = LoadView["restrictions"][number];

export type Candidates = FunctionReturnType<
  typeof api.logistics.loadCandidates
>;
export type Candidate = Candidates["listings"][number];
export type PlanVehicle = Candidates["vehicles"][number];
export type VehicleKey = PlanVehicle["key"];
export type PaidBy = LoadView["paidBy"];
export type Window = LoadView["window"];
