import {
  AnvilIcon,
  CpuIcon,
  type LucideIcon,
  MilkIcon,
  NewspaperIcon,
  ShirtIcon,
  WineIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { Family } from "../../../convex/lib/catalogue";

const FAMILY_ICONS: Record<Family, LucideIcon> = {
  paper: NewspaperIcon,
  plastic: MilkIcon,
  metal: AnvilIcon,
  glass: WineIcon,
  ewaste: CpuIcon,
  other: ShirtIcon,
};

/** One icon per material family, so a lot is recognisable at a glance. */
export function MaterialIcon({
  family,
  size = "md",
}: {
  family: Family;
  size?: "sm" | "md";
}) {
  const Icon = FAMILY_ICONS[family];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800",
        size === "md" ? "size-11" : "size-9",
      )}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} />
    </span>
  );
}
