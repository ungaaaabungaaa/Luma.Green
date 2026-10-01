"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { kgToGrams } from "../../../convex/lib/chain";
import { FamilyIcon } from "./family";
import type { Material } from "./types";

/**
 * One material in the "What do you have?" grid: its family's icon and
 * colour, its name and today's price. Tapping adds it; tapping again takes
 * it out.
 */
export function MaterialTile({
  material,
  pricePaise,
  kg,
  isFull,
  onToggle,
}: {
  material: Material;
  /** Today's price per kg: undefined while prices load, null if none. */
  pricePaise: number | null | undefined;
  /** The kilos in the basket, or undefined when it isn't in the basket. */
  kg: number | undefined;
  /** The basket can't take another material. */
  isFull: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("sell");
  const format = useFormat();
  const isAdded = kg !== undefined;

  return (
    <button
      type="button"
      aria-pressed={isAdded}
      disabled={!isAdded && isFull}
      onClick={onToggle}
      className={cn(
        "group flex h-full min-h-36 w-full flex-col items-start gap-4 rounded-xl border bg-card p-4 text-start transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:p-5",
        isAdded
          ? "border-primary bg-accent ring-1 ring-primary"
          : "border-border hover:border-primary/50 hover:bg-muted/40",
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <FamilyIcon family={material.family} />
        <span
          aria-hidden
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            isAdded
              ? "bg-primary text-primary-foreground"
              : "border text-muted-foreground",
          )}
        >
          {isAdded ? (
            <CheckIcon className="size-4" />
          ) : (
            <PlusIcon className="size-4" />
          )}
        </span>
      </span>
      <span className="text-base leading-snug font-semibold tracking-tight">
        {format.material(material.names, material.code)}
      </span>
      <span className="mt-auto flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
        {pricePaise === undefined ? <Skeleton className="h-4 w-14" /> : null}
        {typeof pricePaise === "number" ? (
          <span className="text-sm text-muted-foreground tabular-nums">
            {t("perKg", { price: format.perKg(pricePaise) })}
          </span>
        ) : null}
        {isAdded ? (
          <span className="font-semibold text-primary tabular-nums">
            {format.weight(kgToGrams(kg))}
          </span>
        ) : null}
      </span>
    </button>
  );
}
