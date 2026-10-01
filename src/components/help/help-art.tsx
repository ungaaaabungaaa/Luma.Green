import type { LucideIcon } from "lucide-react";

import {
  type IllustrationName,
  illustrations,
} from "@/components/illustrations";
import { cn } from "@/lib/utils";

/** A spot illustration picked by name in `content.ts`. Decorative. */
export function HelpArt({
  name,
  className,
}: {
  name: IllustrationName;
  className?: string;
}) {
  const Art = illustrations[name];
  return <Art className={className} />;
}

/** An icon on a neutral tile: the fallback where a step has no picture. */
export function IconTile({
  icon: Icon,
  className,
  size = "md",
}: {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-muted text-primary",
        size === "sm" && "size-11",
        size === "md" && "size-12",
        size === "lg" && "size-24 rounded-xl",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          size === "sm" && "size-5",
          size === "md" && "size-6",
          size === "lg" && "size-8",
        )}
      />
    </span>
  );
}
