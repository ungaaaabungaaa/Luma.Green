"use client";

import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { DemoNote } from "@/components/app/page-parts";
import { isConvexConfigured } from "@/components/providers/convex-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { basketPaise } from "../../../convex/lib/households";
import { ActionBar } from "./action-bar";
import { BasketStep } from "./basket-step";
import { ConfirmStep } from "./confirm-step";
import { isComplete, previousStep, totalGrams, whenProblems } from "./draft";
import { PhotoEstimate } from "./photo-estimate";
import { ShopStep } from "./shop-step";
import {
  ErrorBoundary,
  LoadError,
  SellSkeleton,
  SellUnavailable,
} from "./states";
import { StepFrame } from "./step-frame";
import { StepIndicator } from "./step-indicator";
import type { ShopOffer } from "./types";
import { clearSellDraft } from "./use-draft";
import { type SellState, useSellState } from "./use-sell-state";
import { WhenStep } from "./when-step";

/**
 * /sell: what they have → who buys it → when → confirm the phone and book.
 * Everything chosen is kept in the tab's session storage until the booking
 * is made, and the step is in the address so the back button works.
 */
export function SellFlow() {
  if (!isConvexConfigured) return <SellUnavailable />;
  return (
    <ErrorBoundary
      fallback={(reset) => (
        <LoadError
          onRetry={() => {
            clearSellDraft();
            reset();
          }}
        />
      )}
    >
      <LiveSellFlow />
    </ErrorBoundary>
  );
}

function LiveSellFlow() {
  const state = useSellState();
  if (!state.isLoaded) return <SellSkeleton />;
  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step={state.step} />
      <CurrentStep state={state} />
      <StepActions state={state} />
    </div>
  );
}

function CurrentStep({ state }: { state: SellState }) {
  const t = useTranslations("sell");
  const { step, draft } = state;
  const frame = {
    shouldFocus: state.hasMoved,
    onBack:
      step === "basket"
        ? undefined
        : () => {
            state.moveTo(previousStep(step));
          },
  };

  switch (step) {
    case "basket": {
      return (
        <StepFrame
          key={step}
          title={t("basket.title")}
          lead={t("basket.lead")}
          {...frame}
        >
          <PhotoEstimate
            materials={state.scrap}
            prices={state.prices}
            onApply={(items) => {
              state.change({ items, shopId: undefined });
            }}
          />
          <BasketStep
            materials={state.scrap}
            prices={state.prices}
            items={state.items}
            onToggle={state.toggle}
            onSetKg={state.setItemKg}
            onRemove={state.dropItem}
          />
          <p className="text-sm text-muted-foreground">
            {t("basket.weighNote")}
          </p>
          <DemoNote>{t("demoNote")}</DemoNote>
        </StepFrame>
      );
    }
    case "shop": {
      return (
        <StepFrame
          key={step}
          title={t("shop.title")}
          lead={t("shop.lead")}
          {...frame}
        >
          <ShopStep
            mode={draft.mode}
            shopId={draft.shopId}
            shops={state.shops}
            location={state.location.state}
            onMode={(mode) => {
              state.change({ mode });
            }}
            onShop={(shopId) => {
              state.change({ shopId });
            }}
            onLocate={state.location.locate}
            onStopLocation={state.location.stop}
          />
          <DemoNote>{t("demoNote")}</DemoNote>
        </StepFrame>
      );
    }
    case "when": {
      return (
        <StepFrame
          key={step}
          title={t(
            draft.mode === "pickup" ? "when.titlePickup" : "when.titleDropoff",
          )}
          {...frame}
        >
          <WhenStep
            draft={draft}
            shop={state.shop}
            today={state.today}
            now={state.now}
            problems={state.hasTriedWhen ? whenProblems(draft) : []}
            onChange={state.change}
          />
        </StepFrame>
      );
    }
    case "confirm": {
      return (
        <StepFrame key={step} title={t("confirm.title")} {...frame}>
          {state.shop && isComplete(draft) ? (
            <ConfirmStep
              draft={draft}
              location={state.location.point}
              items={state.items}
              materials={state.scrap}
              shop={state.shop}
              today={state.today}
              onEdit={state.moveTo}
            />
          ) : (
            <Skeleton className="h-64 w-full rounded-2xl" />
          )}
        </StepFrame>
      );
    }
  }
}

/** The bottom bar: a summary and the way on. The last step has its own. */
function StepActions({ state }: { state: SellState }) {
  const t = useTranslations("sell");
  const { step, items, prices } = state;

  switch (step) {
    case "basket": {
      return (
        <ActionBar
          summary={
            <BasketSummary
              estimatePaise={
                prices
                  ? basketPaise(items, (code) => prices.get(code))
                  : undefined
              }
              itemCount={items.length}
              grams={totalGrams(items)}
            />
          }
        >
          <NextButton
            label={t("basket.next")}
            isDisabled={items.length === 0}
            onClick={() => {
              state.moveTo("shop");
            }}
          />
        </ActionBar>
      );
    }
    case "shop": {
      return (
        <ActionBar summary={<ShopSummary shop={state.shop} />}>
          <NextButton
            label={t("shop.next")}
            isDisabled={state.shop === undefined}
            onClick={() => {
              state.moveTo("when");
            }}
          />
        </ActionBar>
      );
    }
    case "when": {
      return (
        <ActionBar summary={<ShopSummary shop={state.shop} />}>
          <NextButton
            label={t("when.next")}
            onClick={() => {
              const problems = whenProblems(state.draft);
              if (problems.length === 0) {
                state.moveTo("confirm");
                return;
              }
              state.tryWhen();
              document
                .querySelector(`[data-field="${CSS.escape(problems[0])}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        </ActionBar>
      );
    }
    case "confirm": {
      return null;
    }
  }
}

function NextButton({
  label,
  isDisabled = false,
  onClick,
}: {
  label: string;
  isDisabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="lg"
      className="h-12 shrink-0 px-5 text-base"
      disabled={isDisabled}
      onClick={onClick}
    >
      {label}
      <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
    </Button>
  );
}

function BasketSummary({
  estimatePaise,
  itemCount,
  grams,
}: {
  estimatePaise: number | undefined;
  itemCount: number;
  grams: number;
}) {
  const t = useTranslations("sell.basket");
  const format = useFormat();
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{t("worth")}</span>
      {estimatePaise === undefined ? (
        <Skeleton className="my-1 h-6 w-20" />
      ) : (
        <span className="text-xl leading-tight font-semibold tabular-nums">
          {format.money(estimatePaise)}
        </span>
      )}
      <span className="truncate text-xs text-muted-foreground">
        {t("summary", { items: itemCount, weight: format.weight(grams) })}
      </span>
    </div>
  );
}

function ShopSummary({ shop }: { shop: ShopOffer | undefined }) {
  const t = useTranslations("sell.shop");
  const format = useFormat();
  if (!shop) {
    return (
      <span className="text-sm text-muted-foreground">{t("pickOne")}</span>
    );
  }
  return (
    <div className="flex flex-col">
      <span className="truncate text-xs text-muted-foreground">
        {shop.name}
      </span>
      <span className="text-xl leading-tight font-semibold tabular-nums">
        {format.money(shop.estimatePaise)}
      </span>
      <span className="text-xs text-muted-foreground">{t("offerFor")}</span>
    </div>
  );
}
