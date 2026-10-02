"use client";

import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useFormat } from "@/components/app/format";
import { StatusPill } from "@/components/app/page-parts";

import { safePaiseFor } from "../../../convex/lib/chain";
import { MaterialIcon } from "./material-icon";
import type { ListingView } from "./types";

/**
 * One lot on the market: what, from whom and where, how much, at what price.
 * `meta` replaces the seller line (my own lots show when they were listed);
 * `action` is the card's button row.
 */
export function ListingCard({
  listing,
  isRecycled = false,
  meta,
  badge,
  action,
}: {
  listing: ListingView;
  isRecycled?: boolean;
  meta?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  const t = useTranslations("market");
  const format = useFormat();
  const total = safePaiseFor(listing.grams, listing.askPaisePerKg);
  const name = format.material(listing.material.names, listing.material.code);

  return (
    <article className="flex h-full flex-col gap-4 border-b border-border py-6">
      <div className="flex flex-wrap items-start gap-4">
        <MaterialIcon family={listing.material.family} />
        <div className="flex min-w-32 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{name}</h3>
            {isRecycled ? (
              <StatusPill tone="good">{t("recycled")}</StatusPill>
            ) : null}
            {badge}
          </div>
          {meta ?? (
            <p className="flex items-start gap-1 text-sm text-muted-foreground">
              <MapPinIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                {t("listing.seller", {
                  name: listing.seller.name,
                  area: listing.seller.area,
                })}
              </span>
            </p>
          )}
        </div>
        <p className="shrink-0 text-lg font-semibold whitespace-nowrap tabular-nums">
          {t("perKg", { price: format.perKg(listing.askPaisePerKg) })}
        </p>
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <dl className="grid grid-cols-2 gap-6 border-s border-border ps-4 text-sm sm:max-w-md">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">{t("listing.available")}</dt>
            <dd className="font-medium tabular-nums">
              {format.weight(listing.grams)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">{t("listing.lotValue")}</dt>
            <dd className="font-medium tabular-nums">
              {total === null ? t("totalInvalid") : format.money(total)}
            </dd>
          </div>
        </dl>
        {action ? <div className="flex flex-col">{action}</div> : null}
      </div>

      {listing.note ? (
        <p className="text-sm break-words text-muted-foreground">
          {listing.note}
        </p>
      ) : null}
    </article>
  );
}
