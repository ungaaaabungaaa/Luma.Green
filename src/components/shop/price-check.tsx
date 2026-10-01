"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { Section } from "@/components/app/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

import { MarketSideLabel } from "./market-side";
import { MaterialIcon } from "./material-icon";
import { compareToMarket, effectivePaise, pickPriceCheck } from "./prices";
import type { RateCard, RateCardRow, Stock } from "./types";

function PriceCheckItem({ row }: { row: RateCardRow }) {
  const t = useTranslations("shop.home");
  const format = useFormat();
  const mine = effectivePaise(row) ?? 0;
  const market = row.marketPaise ?? 0;
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <MaterialIcon family={row.material.family} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {format.material(row.material.names, row.material.code)}
          </span>
          <span className="text-xs text-muted-foreground">{t("perKg")}</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">{t("you")}</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {format.perKg(mine)}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">{t("market")}</dt>
          <dd className="text-xl font-semibold text-muted-foreground tabular-nums">
            {format.perKg(market)}
          </dd>
        </div>
      </dl>
      <MarketSideLabel side={compareToMarket(mine, market)} />
    </li>
  );
}

/** Three materials the shop buys most: its price next to today's market. */
export function PriceCheck({
  card,
  stock,
}: {
  card: RateCard | undefined;
  stock: Stock | undefined;
}) {
  const t = useTranslations("shop.home");
  const picks =
    card && stock
      ? pickPriceCheck(
          card.rows,
          new Map(stock.rows.map((row) => [row.material.code, row.grams])),
        )
      : undefined;
  if (picks?.length === 0) return null;
  return (
    <Section
      title={t("priceCheck")}
      action={
        <Link
          href="/app/prices"
          className="rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t("allPrices")}
        </Link>
      }
    >
      {picks ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {picks.map((row) => (
            <PriceCheckItem key={row.material.code} row={row} />
          ))}
        </ul>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      )}
    </Section>
  );
}
