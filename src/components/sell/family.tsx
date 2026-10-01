import type { LucideIcon } from "lucide-react";

import { MATERIAL_FAMILY_ICONS } from "@/components/app/material-family";
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
 * Neutral icon surfaces keep selection and status colours distinct.
 */
export const FAMILY_STYLE: Record<
  Family,
  { icon: LucideIcon; chip: string; defaultKg: number }
> = {
  paper: {
    icon: MATERIAL_FAMILY_ICONS.paper,
    chip: "bg-muted text-muted-foreground",
    defaultKg: 5,
  },
  plastic: {
    icon: MATERIAL_FAMILY_ICONS.plastic,
    chip: "bg-muted text-muted-foreground",
    defaultKg: 2,
  },
  metal: {
    icon: MATERIAL_FAMILY_ICONS.metal,
    chip: "bg-muted text-muted-foreground",
    defaultKg: 2,
  },
  ewaste: {
    icon: MATERIAL_FAMILY_ICONS.ewaste,
    chip: "bg-muted text-muted-foreground",
    defaultKg: 1,
  },
  glass: {
    icon: MATERIAL_FAMILY_ICONS.glass,
    chip: "bg-muted text-muted-foreground",
    defaultKg: 2,
  },
  other: {
    icon: MATERIAL_FAMILY_ICONS.other,
    chip: "bg-muted text-muted-foreground",
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
        "flex shrink-0 items-center justify-center rounded-lg",
        size === "md" ? "size-11" : "size-9",
        chip,
      )}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} />
    </span>
  );
}
