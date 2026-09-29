"use client";

import {
  EqualIcon,
  type LucideIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { MarketSide } from "./prices";

const SIDE_ICONS: Record<MarketSide, LucideIcon> = {
  above: TrendingUpIcon,
  below: TrendingDownIcon,
  same: EqualIcon,
};

/** Above, below or level with the market, with an arrow. */
export function MarketSideLabel({ side }: { side: MarketSide }) {
  const t = useTranslations("shop.compare");
  const Icon = SIDE_ICONS[side];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon aria-hidden className="size-4 shrink-0" />
      {t(side)}
    </span>
  );
}
