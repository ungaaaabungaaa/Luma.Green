import type { FunctionReturnType } from "convex/server";
import {
  FactoryIcon,
  HouseIcon,
  type LucideIcon,
  StoreIcon,
  SunIcon,
  SunriseIcon,
  SunsetIcon,
  WarehouseIcon,
} from "lucide-react";

import type { api } from "../../../convex/_generated/api";

export type Board = FunctionReturnType<typeof api.saathi.board>;
export type Job = Board["open"][number];

/** One picture per kind of work, for people who read little. */
export const WORK_ICONS: Record<Job["kind"], LucideIcon> = {
  home_pickups: HouseIcon,
  shop_help: StoreIcon,
  yard_sorting: WarehouseIcon,
  factory_shifts: FactoryIcon,
};

/** And one per time of day: sunrise, sun, sunset. */
export const WINDOW_ICONS: Record<Job["window"], LucideIcon> = {
  morning: SunriseIcon,
  afternoon: SunIcon,
  evening: SunsetIcon,
};
