"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { cn } from "@/lib/utils";

import type { PriceRow } from "./board";
import { PriceChange } from "./price-change";
import { Sparkline } from "./sparkline";

/**
 * The board's columns. Phones get three — material, trend, price — with the
 * week's change under the price and the floor under the name; wider screens
 * give each figure its own column.
 */
export const BOARD_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 md:grid-cols-[minmax(0,1fr)_7rem_7.5rem_5rem_6.5rem] md:gap-x-4";

/** Column titles for wide screens; each row reads out its own labels. */
export function BoardColumns() {
  const t = useTranslations("prices.columns");
  return (
    <div
      aria-hidden
      className={cn(
        BOARD_GRID,
        "hidden border-b bg-muted/60 px-5 py-3 text-xs font-medium text-muted-foreground md:grid",
      )}
    >
      <span>{t("material")}</span>
      <span>{t("today")}</span>
      <span>{t("week")}</span>
      <span>{t("month")}</span>
      <span>{t("floor")}</span>
    </div>
  );
}

/** One material on the board. Tapping it opens the 30-day chart. */
export function PriceRowButton({
  row,
  onOpen,
}: {
  row: PriceRow;
  onOpen: (code: string) => void;
}) {
  const t = useTranslations("prices");
  const format = useFormat();
  const floor =
    row.floorPaise === null
      ? null
      : t("floor", { price: format.perKg(row.floorPaise) });

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => {
        onOpen(row.code);
      }}
      className={cn(
        BOARD_GRID,
        "min-h-20 w-full px-5 py-4 text-start transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
      )}
    >
      <span className="flex min-w-0 flex-col md:order-1">
        <span className="font-medium">
          {format.material(row.names, row.code)}
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="font-mono">{row.code}</span>
          {floor ? <span className="md:hidden"> · {floor}</span> : null}
        </span>
      </span>
      <Sparkline
        series={row.series}
        width={64}
        height={28}
        className="md:order-4"
      />
      <span className="flex flex-col items-end gap-1 md:contents">
        <span className="md:order-2">
          {row.todayPaise === null ? (
            <span className="text-sm text-muted-foreground">
              {t("noPrice")}
            </span>
          ) : (
            <span className="font-semibold tabular-nums">
              {t("perKg", { price: format.perKg(row.todayPaise) })}
            </span>
          )}
        </span>
        <PriceChange
          changePct={row.weekChangePct}
          className="md:order-3 md:justify-self-start"
        />
      </span>
      <span className="hidden text-sm text-muted-foreground tabular-nums md:order-5 md:block">
        {row.floorPaise === null ? null : (
          <>
            <span aria-hidden>{format.perKg(row.floorPaise)}</span>
            <span className="sr-only">{floor}</span>
          </>
        )}
      </span>
    </button>
  );
}
