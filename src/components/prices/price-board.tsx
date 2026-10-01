"use client";

import { useQuery } from "convex/react";
import {
  CalendarDaysIcon,
  CircleAlertIcon,
  CloudOffIcon,
  FactoryIcon,
  InfoIcon,
  type LucideIcon,
  TagIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormat } from "@/components/app/format";
import { DemoNote, EmptyState } from "@/components/app/page-parts";
import { isConvexConfigured } from "@/components/providers/convex-provider";
import { DataBoundary } from "@/components/site/data-boundary";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "../../../convex/_generated/api";
import {
  groupBoard,
  PRICE_CITY,
  type PriceBoardData,
  type PriceRow,
} from "./board";
import { FAMILY_ICONS } from "./family-icon";
import { PriceDetail } from "./price-detail";
import { BoardColumns, PriceRowButton } from "./price-row";

/**
 * The public price board for Bengaluru: live from Convex, grouped by family,
 * with recycled material in its own factory-gate section.
 */
export function PriceBoard() {
  const t = useTranslations("prices");
  if (!isConvexConfigured) {
    return (
      <EmptyState
        icon={CloudOffIcon}
        title={t("unavailable.title")}
        body={t("unavailable.body")}
      />
    );
  }
  return (
    <DataBoundary
      fallback={(retry) => (
        <EmptyState
          icon={CircleAlertIcon}
          title={t("error.title")}
          body={t("error.body")}
          action={
            <Button variant="outline" className="mt-2 h-11" onClick={retry}>
              {t("error.retry")}
            </Button>
          }
        />
      )}
    >
      <LiveBoard />
    </DataBoundary>
  );
}

function LiveBoard() {
  const t = useTranslations("prices");
  const board = useQuery(api.catalogue.priceBoard, { city: PRICE_CITY });

  if (board === undefined) return <BoardSkeleton />;
  if (board.rows.length === 0) {
    return (
      <EmptyState
        icon={TagIcon}
        title={t("empty.title")}
        body={t("empty.body")}
      />
    );
  }
  return <BoardView board={board} />;
}

/** The board itself, given its data. */
export function BoardView({ board }: { board: PriceBoardData }) {
  const t = useTranslations("prices");
  const format = useFormat();
  const [openCode, setOpenCode] = useState<string | null>(null);
  const { scrap, recycled } = groupBoard(board.rows);
  const selected = board.rows.find((row) => row.code === openCode);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          {board.date ? (
            <p className="flex items-center gap-2 font-medium text-foreground">
              <CalendarDaysIcon aria-hidden className="size-4 text-primary" />
              {t("date", { date: format.date(board.date) })}
            </p>
          ) : null}
          <p className="flex items-start gap-2">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t("floorHelp")}
          </p>
        </div>
        <DemoNote>{t("demoNote")}</DemoNote>
      </div>

      {scrap.map((group) => (
        <RowsSection
          key={group.family}
          id={`prices-${group.family}`}
          title={t(`families.${group.family}`)}
          icon={FAMILY_ICONS[group.family]}
          rows={group.rows}
          onOpen={setOpenCode}
        />
      ))}

      {recycled.length > 0 ? (
        <RowsSection
          id="prices-factory-gate"
          title={t("factoryGate.title")}
          intro={t("factoryGate.body")}
          icon={FactoryIcon}
          rows={recycled}
          onOpen={setOpenCode}
        />
      ) : null}

      <Dialog
        open={selected !== undefined}
        onOpenChange={(open) => {
          if (!open) setOpenCode(null);
        }}
      >
        {selected ? <PriceDetail row={selected} /> : null}
      </Dialog>
    </div>
  );
}

function RowsSection({
  id,
  title,
  intro,
  icon: Icon,
  rows,
  onOpen,
}: {
  id: string;
  title: string;
  intro?: string;
  icon: LucideIcon;
  rows: PriceRow[];
  onOpen: (code: string) => void;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2
          id={id}
          className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon aria-hidden className="size-5" />
          </span>
          {title}
        </h2>
        {intro ? <p className="text-muted-foreground">{intro}</p> : null}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <BoardColumns />
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.code}>
              <PriceRowButton row={row} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BoardSkeleton() {
  const t = useTranslations("common");
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("loading")}
      className="flex flex-col gap-7"
    >
      <Skeleton className="h-5 w-64" />
      {[4, 3].map((count, section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-8 w-40" />
          <div className="flex flex-col gap-px overflow-hidden rounded-2xl border">
            {Array.from({ length: count }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-none" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
