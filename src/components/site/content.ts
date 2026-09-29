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
 * The roles the public site describes, in the order material flows through
 * them. Site copy only — the app's roles live in convex/lib/chain.ts.
 */
export const roles = [
  { key: "collector", icon: TruckIcon },
  { key: "aggregator", icon: BoxesIcon },
  { key: "recycler", icon: RecycleIcon },
  { key: "factory", icon: FactoryIcon },
  { key: "verifier", icon: ShieldCheckIcon },
] as const satisfies readonly { key: string; icon: LucideIcon }[];
