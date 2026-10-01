"use client";

import { FactoryIcon, TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AppPageHeader,
  DemoNote,
  EmptyState,
} from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { buyerKindFor } from "../../../convex/lib/chain";
import { MyListings } from "./my-listings";
import { NewListingForm } from "./new-listing-form";
import { useOrg } from "./use-org";

/**
 * `/app/sell`: put stock on sale for the next business up the chain, and
 * manage what's on sale. Kabadiwalas, yards and recyclers sell here;
 * manufacturers only buy.
 */
export function SellPage() {
  const t = useTranslations("market");
  const org = useOrg();
  const buyer = org ? buyerKindFor(org.kind) : null;

  if (!org || !buyer) {
    return (
      <>
        <AppPageHeader title={t("sell.title")} />
        <EmptyState
          icon={org ? FactoryIcon : TagIcon}
          title={t(org ? "sell.notForYouTitle" : "forBusinessesTitle")}
          body={t(org ? "sell.notForYouBody" : "forBusinessesBody")}
          action={
            org ? (
              <Button asChild size="lg" className="mt-2 h-11">
                <Link href="/app/market">{t("sell.goBuy")}</Link>
              </Button>
            ) : null
          }
        />
      </>
    );
  }

  return (
    <>
      <AppPageHeader title={t("sell.title")} lead={t("sell.lead", { buyer })} />
      <DemoNote>{t("sampleData")}</DemoNote>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section
          aria-labelledby="new-listing-title"
          className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6 xl:order-2"
        >
          <h2 id="new-listing-title" className="text-lg font-semibold">
            {t("sell.form.title")}
          </h2>
          <NewListingForm sellerKind={org.kind} city={org.city} />
        </section>
        <div className="min-w-0 xl:order-1">
          <MyListings />
        </div>
      </div>
    </>
  );
}
