"use client";

import { useQuery } from "convex/react";
import { ArrowLeftRightIcon, ShoppingCartIcon, TagIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useId, useState } from "react";

import {
  AppPageHeader,
  EmptyState,
  ListSkeleton,
} from "@/components/app/page-parts";
import type { OrgWorkspace } from "@/components/app/use-workspace";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";

import { api } from "../../../convex/_generated/api";
import { buyerKindFor, sellerKindFor } from "../../../convex/lib/chain";
import { byUrgency, isAvailableTradeAction } from "./logic";
import { TradeCard } from "./trade-card";
import type { TradeView } from "./types";
import { useOrg } from "./use-org";

type Tab = "buying" | "selling";

/**
 * `/app/trades`: every trade, with where it stands and the next step as one
 * button. Yards and recyclers get Buying and Selling tabs; kabadiwalas only
 * sell and manufacturers only buy, so they get one list.
 */
export function TradesPage() {
  const t = useTranslations("market");
  const org = useOrg();
  return (
    <>
      <AppPageHeader
        title={t("trades.title")}
        lead={t("trades.gatewayPending")}
      />
      {org ? (
        // The tab can come from the link (?tab=buying), which needs Suspense.
        <Suspense fallback={<ListSkeleton />}>
          <Trades org={org} />
        </Suspense>
      ) : (
        <EmptyState
          icon={ArrowLeftRightIcon}
          title={t("forBusinessesTitle")}
          body={t("forBusinessesBody")}
        />
      )}
    </>
  );
}

function Trades({ org }: { org: OrgWorkspace }) {
  const t = useTranslations("market");
  const trades = useQuery(api.market.trades);
  const asked = useSearchParams().get("tab");
  const [chosen, setChosen] = useState<Tab | null>(
    asked === "buying" || asked === "selling" ? asked : null,
  );

  if (trades === undefined) return <ListSkeleton />;

  const canBuy = sellerKindFor(org.kind) !== null;
  const canSell = buyerKindFor(org.kind) !== null;
  const waiting = {
    buying: trades.buying.filter((trade) =>
      trade.actions.some((action) => isAvailableTradeAction(action)),
    ).length,
    selling: trades.selling.filter((trade) =>
      trade.actions.some((action) => isAvailableTradeAction(action)),
    ).length,
  };

  if (!canBuy || !canSell) {
    const tab: Tab = canBuy ? "buying" : "selling";
    return <TradeList tab={tab} trades={trades[tab]} />;
  }

  const fallback: Tab =
    waiting.selling > 0 && waiting.buying === 0 ? "selling" : "buying";
  const tab = chosen ?? fallback;
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (value === "buying" || value === "selling") setChosen(value);
      }}
      className="gap-4"
    >
      <TabsList
        aria-label={t("trades.tabsLabel")}
        className="w-full rounded-lg group-data-horizontal/tabs:h-12 sm:w-fit"
      >
        {(["buying", "selling"] as const).map((value) => (
          <TabsTrigger key={value} value={value} className="px-4 text-sm">
            {t(`trades.${value}`)}
            {waiting[value] > 0 ? (
              <>
                <span
                  aria-hidden
                  className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums"
                >
                  {waiting[value]}
                </span>
                <span className="sr-only">
                  {t("trades.waitingBadge", { count: waiting[value] })}
                </span>
              </>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {(["buying", "selling"] as const).map((value) => (
        <TabsContent key={value} value={value}>
          <TradeList tab={value} trades={trades[value]} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TradeList({ tab, trades }: { tab: Tab; trades: TradeView[] }) {
  const t = useTranslations("market.trades");
  const headingId = useId();
  if (trades.length === 0) {
    const isBuying = tab === "buying";
    return (
      <EmptyState
        icon={isBuying ? ShoppingCartIcon : TagIcon}
        title={t(isBuying ? "emptyBuyingTitle" : "emptySellingTitle")}
        body={t(isBuying ? "emptyBuyingBody" : "emptySellingBody")}
        action={
          <Button asChild size="lg" className="mt-2 h-11">
            <Link href={isBuying ? "/app/market" : "/app/sell"}>
              {t(isBuying ? "goBuy" : "goSell")}
            </Link>
          </Button>
        }
      />
    );
  }
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        {t(tab)}
      </h2>
      <ul className="flex flex-col">
        {trades.toSorted(byUrgency).map((trade) => (
          <li key={trade.id}>
            <TradeCard
              trade={trade}
              side={tab === "buying" ? "buyer" : "seller"}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
