"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  BellRingIcon,
  CircleCheckIcon,
  Clock3Icon,
  RecycleIcon,
  ShoppingCartIcon,
  StoreIcon,
  TagIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import {
  AppPageHeader,
  DemoNote,
  EmptyState,
  ListSkeleton,
  Section,
  StatCard,
} from "@/components/app/page-parts";
import type { OrgWorkspace } from "@/components/app/use-workspace";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

import { api } from "../../../convex/_generated/api";
import { buyerKindFor } from "../../../convex/lib/chain";
import { BuyButton } from "./buy-dialog";
import { ListingCard } from "./listing-card";
import { isAvailableTradeAction, recycledFirst, tradeTotals } from "./logic";
import { TradeCard } from "./trade-card";
import type { ListingView, TradeSide, TradeView } from "./types";
import { useOrg } from "./use-org";
import { useRecycledCodes } from "./use-recycled-codes";

type Trades = FunctionReturnType<typeof api.market.trades>;

/** How many trades and lots the home screen shows before "See all". */
const HOME_LIMIT = 4;

/**
 * `/app` for yards, recyclers and manufacturers: orders waiting for the gateway,
 * order decisions, and the newest lots I can buy. Manufacturers see
 * recycled material first.
 */
export function BusinessHome() {
  const org = useOrg();
  return org ? <Home org={org} /> : null;
}

function Home({ org }: { org: OrgWorkspace }) {
  const t = useTranslations("market.home");
  const canSell = buyerKindFor(org.kind) !== null;
  const isMaker = org.kind === "manufacturer";
  const trades = useQuery(api.market.trades);
  const offers = useQuery(api.market.browse, {});
  const mine = useQuery(api.market.myListings, canSell ? {} : "skip");
  const recycled = useRecycledCodes();

  return (
    <>
      <div className="min-w-0">
        <AppPageHeader
          title={t("greeting", { name: org.name })}
          lead={t("lead", { kind: org.kind })}
          actions={<QuickActions canSell={canSell} />}
        />
      </div>
      <Stats
        trades={trades}
        third={
          canSell
            ? { kind: "listings", listings: mine }
            : {
                kind: "recycledOffers",
                count: offers?.filter((offer) =>
                  recycled.has(offer.material.code),
                ).length,
              }
        }
      />
      <WaitingForYou trades={trades} showSide={canSell} />
      <LatestOffers offers={offers} recycled={recycled} isMaker={isMaker} />
    </>
  );
}

function QuickActions({ canSell }: { canSell: boolean }) {
  const t = useTranslations("market.home");
  return (
    <>
      <Button asChild size="lg" className="text-sm">
        <Link href="/app/market">
          <ShoppingCartIcon aria-hidden />
          {t("buy")}
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="text-sm">
        {canSell ? (
          <Link href="/app/sell">
            <TagIcon aria-hidden />
            {t("sell")}
          </Link>
        ) : (
          <Link href="/app/trades">
            <ArrowLeftRightIcon aria-hidden />
            {t("trades")}
          </Link>
        )}
      </Button>
    </>
  );
}

/** The third number: my lots on sale, or recycled lots for manufacturers. */
type ThirdStat =
  | { kind: "listings"; listings: ListingView[] | undefined }
  | { kind: "recycledOffers"; count: number | undefined };

/**
 * Three numbers: orders waiting for gateway checkout, decisions waiting for me,
 * and my lots on sale (or recycled offers for manufacturers).
 */
function Stats({
  trades,
  third,
}: {
  trades: Trades | undefined;
  third: ThirdStat;
}) {
  const t = useTranslations("market");
  const format = useFormat();

  const isThirdLoading =
    (third.kind === "listings" ? third.listings : third.count) === undefined;
  if (trades === undefined || isThirdLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }
  const totals = tradeTotals([...trades.buying, ...trades.selling]);

  return (
    <section aria-labelledby="home-stats" className="flex flex-col gap-3">
      <h2 id="home-stats" className="sr-only">
        {t("home.statsTitle")}
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={t("home.stats.gatewayPending")}
          value={format.number(totals.pendingGateway)}
          hint={t("trades.gatewayPending")}
          icon={Clock3Icon}
          tone="neutral"
        />
        <StatCard
          label={t("home.stats.waiting")}
          value={format.number(totals.waiting)}
          hint={t("home.stats.waitingHint", { count: totals.waiting })}
          icon={BellRingIcon}
          tone={totals.waiting > 0 ? "warn" : "neutral"}
        />
        {third.kind === "listings" ? (
          <OnSaleStat listings={third.listings ?? []} />
        ) : (
          <StatCard
            label={t("home.stats.offers")}
            value={format.number(third.count ?? 0)}
            hint={t("home.stats.offersHint")}
            icon={RecycleIcon}
            tone="good"
          />
        )}
      </div>
      <DemoNote>{t("sampleData")}</DemoNote>
    </section>
  );
}

function OnSaleStat({ listings }: { listings: ListingView[] }) {
  const t = useTranslations("market.home.stats");
  const format = useFormat();
  const open = listings.filter((listing) => listing.status === "open");
  const grams = open.reduce((sum, listing) => sum + listing.grams, 0);
  return (
    <StatCard
      label={t("listings")}
      value={format.number(open.length)}
      hint={t("listingsHint", { weight: format.weight(grams) })}
      icon={TagIcon}
    />
  );
}

/** Trades waiting for a step from me, newest first, each one tap away. */
function WaitingForYou({
  trades,
  showSide,
}: {
  trades: Trades | undefined;
  showSide: boolean;
}) {
  const t = useTranslations("market.home");
  const waiting: { trade: TradeView; side: TradeSide }[] = trades
    ? [
        ...trades.buying.map((trade) => ({ trade, side: "buyer" as const })),
        ...trades.selling.map((trade) => ({ trade, side: "seller" as const })),
      ]
        .filter(({ trade }) =>
          trade.actions.some((action) => isAvailableTradeAction(action)),
        )
        .toSorted((a, b) => b.trade.createdAt - a.trade.createdAt)
    : [];

  return (
    <Section
      title={t("waitingTitle")}
      action={<SeeAll href="/app/trades" label={t("allTrades")} />}
    >
      {trades === undefined ? <ListSkeleton rows={2} /> : null}
      {trades !== undefined && waiting.length === 0 ? (
        <EmptyState
          icon={CircleCheckIcon}
          title={t("caughtUpTitle")}
          body={t("caughtUpBody")}
        />
      ) : null}
      {waiting.length > 0 ? (
        <ul className="flex flex-col">
          {waiting.slice(0, HOME_LIMIT).map(({ trade, side }) => (
            <li key={trade.id}>
              <TradeCard
                trade={trade}
                side={side}
                compact
                showSide={showSide}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

/** The newest lots on sale to me; recycled material first for manufacturers. */
function LatestOffers({
  offers,
  recycled,
  isMaker,
}: {
  offers: ListingView[] | undefined;
  recycled: ReadonlySet<string>;
  isMaker: boolean;
}) {
  const t = useTranslations("market.home");
  const ordered = isMaker ? recycledFirst(offers ?? [], recycled) : offers;
  const shown = ordered?.slice(0, HOME_LIMIT) ?? [];

  return (
    <Section
      title={t(isMaker ? "recycledTitle" : "offersTitle")}
      action={<SeeAll href="/app/market" label={t("seeAll")} />}
    >
      {isMaker ? (
        <p className="flex gap-3 border-s-2 border-primary ps-4 text-sm text-muted-foreground">
          <RecycleIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
          {t("recycledBody")}
        </p>
      ) : null}
      {offers === undefined ? <ListSkeleton rows={2} /> : null}
      {offers?.length === 0 ? (
        <EmptyState
          icon={StoreIcon}
          title={t("noOffersTitle")}
          body={t("noOffersBody")}
        />
      ) : null}
      {shown.length > 0 ? (
        <ul className="flex flex-col">
          {shown.map((listing) => (
            <li key={listing.id}>
              <ListingCard
                listing={listing}
                isRecycled={recycled.has(listing.material.code)}
                action={<BuyButton listing={listing} />}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
      <ArrowRightIcon aria-hidden className="size-4 rtl:rotate-180" />
    </Link>
  );
}
