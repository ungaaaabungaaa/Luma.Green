import { MATERIAL_FAMILY_ICONS } from "@/components/app/material-family";
import { cn } from "@/lib/utils";

import type { Family } from "../../../convex/lib/catalogue";

/** One icon per material family, so a lot is recognisable at a glance. */
export function MaterialIcon({
  family,
  size = "md",
}: {
  family: Family;
  size?: "sm" | "md";
}) {
  const Icon = MATERIAL_FAMILY_ICONS[family];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
        size === "md" ? "size-11" : "size-9",
      )}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} />
    </span>
  );
}
