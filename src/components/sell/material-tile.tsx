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
        "flex h-full w-full flex-col items-start gap-2 rounded-2xl border-2 bg-card p-3 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        isAdded
          ? "border-primary bg-brand-50"
          : "border-border hover:border-primary/40",
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <FamilyIcon family={material.family} />
        <span
          aria-hidden
          className={cn(
            "flex size-7 items-center justify-center rounded-full",
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
      <span className="leading-snug font-semibold">
        {format.material(material.names, material.code)}
      </span>
      <span className="mt-auto flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
        {pricePaise === undefined ? <Skeleton className="h-4 w-14" /> : null}
        {typeof pricePaise === "number" ? (
          <span className="text-muted-foreground tabular-nums">
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
