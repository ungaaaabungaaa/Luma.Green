import {
  BottleWineIcon,
  CogIcon,
  CupSodaIcon,
  type LucideIcon,
  NewspaperIcon,
  ShirtIcon,
  SmartphoneIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { Family } from "../../../convex/lib/catalogue";

/**
 * One icon and one tint per material family, the same on every screen — the
 * picture carries the meaning; the name confirms it (docs/product/kabadiwala.md).
 */
const ICONS: Record<Family, LucideIcon> = {
  paper: NewspaperIcon,
  plastic: CupSodaIcon,
  metal: CogIcon,
  glass: BottleWineIcon,
  ewaste: SmartphoneIcon,
  other: ShirtIcon,
};

const TINTS: Record<Family, string> = {
  paper: "bg-accent text-accent-foreground",
  plastic: "bg-primary/10 text-primary",
  metal: "bg-muted text-foreground",
  glass: "bg-accent text-accent-foreground",
  ewaste: "bg-primary/20 text-foreground",
  other: "bg-muted text-muted-foreground",
};

const SIZES = {
  sm: { box: "size-7 rounded-lg", icon: "size-4" },
  md: { box: "size-11 rounded-xl", icon: "size-5" },
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
  const Icon = ICONS[family];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        SIZES[size].box,
        TINTS[family],
        className,
      )}
    >
      <Icon className={SIZES[size].icon} />
    </span>
  );
}
