import {
  ArrowLeftRightIcon,
  BoxesIcon,
  FactoryIcon,
  LeafIcon,
  type LucideIcon,
  PackageOpenIcon,
  RecycleIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react";

import type { PublicRoute } from "@/i18n/paths";

import type { Doc } from "../../../convex/_generated/dataModel";

/** Primary navigation. `key` is the label in the `nav` namespace. */
export const navItems = [
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/participants", key: "participants" },
  { href: "/contact", key: "contact" },
] as const satisfies readonly { href: PublicRoute; key: string }[];

/** The three stages of the loop, in order. Copy lives under `loop.<key>`. */
export const loopSteps = [
  { key: "recover", icon: PackageOpenIcon },
  { key: "trade", icon: ArrowLeftRightIcon },
  { key: "retire", icon: LeafIcon },
] as const satisfies readonly { key: string; icon: LucideIcon }[];

/**
 * Org roles, in the order material flows through them. Typed against the
 * Convex schema so a role added there fails the build here until it has copy.
 */
export const roles = [
  { key: "collector", icon: TruckIcon },
  { key: "aggregator", icon: BoxesIcon },
  { key: "recycler", icon: RecycleIcon },
  { key: "factory", icon: FactoryIcon },
  { key: "verifier", icon: ShieldCheckIcon },
] as const satisfies readonly { key: Doc<"orgs">["role"]; icon: LucideIcon }[];

/** Compile error if the schema gains a role that `roles` does not list. */
type Covers<Missing extends never> = Missing;
export type RolesCoverSchema = Covers<
  Exclude<Doc<"orgs">["role"], (typeof roles)[number]["key"]>
>;
