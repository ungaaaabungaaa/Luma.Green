import { MATERIAL_FAMILY_ICONS } from "@/components/app/material-family";
import { cn } from "@/lib/utils";

import type { Family } from "../../../convex/lib/catalogue";

/**
 * One icon and one tint per material family, the same on every screen — the
 * picture carries the meaning; the name confirms it (docs/product/kabadiwala.md).
 */

const SIZES = {
  sm: { box: "size-7 rounded-lg", icon: "size-4" },
  md: { box: "size-11 rounded-lg", icon: "size-5" },
} as const;

export function MaterialIcon({
  family,
  size = "md",
  className,
}: {
  family: Family;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = MATERIAL_FAMILY_ICONS[family];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        SIZES[size].box,
        "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className={SIZES[size].icon} />
    </span>
  );
}
