"use client";

import { useQuery } from "convex/react";
import { SearchXIcon, StoreIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useFormat } from "@/components/app/format";
import {
  AppPageHeader,
  DemoNote,
  EmptyState,
  ListSkeleton,
  Section,
} from "@/components/app/page-parts";
import type { OrgWorkspace } from "@/components/app/use-workspace";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { api } from "../../../convex/_generated/api";
import { sellerKindFor } from "../../../convex/lib/chain";
import { BuyButton } from "./buy-dialog";
import { ListingCard } from "./listing-card";
import { materialOptions, recycledFirst } from "./logic";
import { MaterialFilter } from "./material-filter";
import { useOrg } from "./use-org";
import { useRecycledCodes } from "./use-recycled-codes";

/**
 * `/app/market`: lots on sale from the step below mine in the chain —
 * kabadiwalas for a yard, yards for a recycler, recyclers for a
 * manufacturer — filtered by material, each one tap from "Buy".
 */
export function MarketPage() {
  const t = useTranslations("market");
  const org = useOrg();
  const canBuy = org !== null && sellerKindFor(org.kind) !== null;

  return (
    <>
      <AppPageHeader
        title={t("browse.title")}
        lead={canBuy ? t("browse.lead", { kind: org.kind }) : undefined}
      />
      {canBuy ? <Lots org={org} /> : <NotForYou isShop={org !== null} />}
    </>
  );
}

function Lots({ org }: { org: OrgWorkspace }) {
  const t = useTranslations("market");
  const format = useFormat();
  const listings = useQuery(api.market.browse, {});
  const recycled = useRecycledCodes();
  const [material, setMaterial] = useState<string | null>(null);

  const ordered = useMemo(() => {
    if (!listings) return [];
    return org.kind === "manufacturer"
      ? recycledFirst(listings, recycled)
      : listings;
  }, [listings, org.kind, recycled]);

  if (listings === undefined) return <ListSkeleton rows={4} />;
  if (listings.length === 0) {
    return (
      <EmptyState
        icon={StoreIcon}
        title={t("browse.emptyTitle")}
        body={t("browse.emptyBody")}
      />
    );
  }

  const options = materialOptions(listings, (names, code) =>
    format.material(names, code),
  );
  // A material whose lots have all sold drops out of the chips; show all.
  const selected = options.find((option) => option.code === material);
  const shown = selected
    ? ordered.filter((listing) => listing.material.code === selected.code)
    : ordered;

  return (
    <>
      <DemoNote>{t("sampleData")}</DemoNote>
      <MaterialFilter
        options={options}
        value={selected?.code ?? null}
        onChange={setMaterial}
      />
      <Section title={t("browse.count", { count: shown.length })}>
        <ul className="grid gap-4 lg:grid-cols-2">
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
      </Section>
    </>
  );
}

/** Kabadiwalas sell here but buy from households; Saathis don't trade. */
function NotForYou({ isShop }: { isShop: boolean }) {
  const t = useTranslations("market");
  return (
    <EmptyState
      icon={SearchXIcon}
      title={t(isShop ? "browse.notForYouTitle" : "forBusinessesTitle")}
      body={t(isShop ? "browse.notForYouBody" : "forBusinessesBody")}
      action={
        isShop ? (
          <Button asChild size="lg" className="mt-2 h-11">
            <Link href="/app/sell">{t("browse.goSell")}</Link>
          </Button>
        ) : null
      }
    />
  );
}
