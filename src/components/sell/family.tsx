import {
  CookingPotIcon,
  CpuIcon,
  type LucideIcon,
  MilkIcon,
  NewspaperIcon,
  ShirtIcon,
  WineIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { Family } from "../../../convex/lib/catalogue";

/** Families in the order households see them. */
export const FAMILIES: readonly Family[] = [
  "paper",
  "plastic",
  "metal",
  "ewaste",
  "glass",
  "other",
];

/**
 * One colour and one icon per material family, the same everywhere a
 * material appears (docs/architecture/frontend.md, "Material colours").
 * Built only from the palette the design system allows — amber, sky, the
 * brand scale and neutrals — until the `--material-*` tokens land.
 */
export const FAMILY_STYLE: Record<
  Family,
  { icon: LucideIcon; chip: string; defaultKg: number }
> = {
  paper: {
    icon: NewspaperIcon,
    chip: "bg-amber-50 text-amber-800",
    defaultKg: 5,
  },
  plastic: { icon: MilkIcon, chip: "bg-sky-50 text-sky-800", defaultKg: 2 },
  metal: {
    icon: CookingPotIcon,
    chip: "bg-muted text-foreground",
    defaultKg: 2,
  },
  ewaste: {
    icon: CpuIcon,
    chip: "bg-brand-100 text-brand-900",
    defaultKg: 1,
  },
  glass: {
    icon: WineIcon,
    chip: "bg-card text-sky-700 ring-1 ring-sky-200 ring-inset",
    defaultKg: 2,
  },
  other: {
    icon: ShirtIcon,
    chip: "bg-card text-muted-foreground ring-1 ring-border ring-inset",
    defaultKg: 2,
  },
};

/** A material's family icon on its family colour. */
export function FamilyIcon({
  family,
  size = "md",
}: {
  family: Family;
  size?: "sm" | "md";
}) {
  const { icon: Icon, chip } = FAMILY_STYLE[family];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        size === "md" ? "size-11" : "size-9",
        chip,
      )}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} />
    </span>
  );
}
