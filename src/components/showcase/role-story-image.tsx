import Image from "next/image";

import { cn } from "@/lib/utils";

import workshop from "../../../public/images/showcase/circular-workshop.webp";
import collection from "../../../public/images/showcase/collection-partners.webp";
import household from "../../../public/images/showcase/household-sorting.webp";
import weighing from "../../../public/images/showcase/kabadiwala-weighing.webp";
import yard from "../../../public/images/showcase/material-yard.webp";
import operations from "../../../public/images/showcase/operations-desk.webp";
import recycling from "../../../public/images/showcase/recycling-line.webp";
import solar from "../../../public/images/showcase/solar-rooftop.webp";

export type StoryRole =
  | "household"
  | "kabadiwala"
  | "yard"
  | "recycler"
  | "manufacturer"
  | "saathi"
  | "admin"
  | "solar";
const scenes = {
  household,
  kabadiwala: weighing,
  yard,
  recycler: recycling,
  manufacturer: workshop,
  saathi: collection,
  admin: operations,
  solar,
} satisfies Record<StoryRole, typeof household>;

/** Decorative editorial art, separate from the localized app preview. */
export function RoleStoryImage({
  scene,
  compact = false,
  className,
  frameClassName,
  imageClassName,
  sizes = "(min-width: 1280px) 560px, (min-width: 768px) 45vw, 92vw",
}: {
  scene: StoryRole;
  compact?: boolean;
  className?: string;
  frameClassName?: string;
  imageClassName?: string;
  sizes?: string;
}) {
  return (
    <figure className={cn("min-w-0", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-muted",
          compact ? "aspect-[2/1]" : "aspect-[4/3]",
          frameClassName,
        )}
      >
        <Image
          src={scenes[scene]}
          alt=""
          fill
          sizes={sizes}
          className={cn("object-cover", imageClassName)}
        />
      </div>
    </figure>
  );
}
