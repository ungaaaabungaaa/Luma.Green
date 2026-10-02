import { useTranslations } from "next-intl";
import { useState } from "react";

import { BasketStep } from "@/components/sell/basket-step";
import {
  addItem,
  EMPTY_DRAFT,
  hasItem,
  removeItem,
  type SellDraft,
  setKg,
} from "@/components/sell/draft";
import { ModeChoice } from "@/components/sell/mode-choice";
import { StepFrame } from "@/components/sell/step-frame";
import { StepIndicator } from "@/components/sell/step-indicator";
import type { Material, ShopOffer } from "@/components/sell/types";
import { WhenStep } from "@/components/sell/when-step";

import type { Id } from "../../convex/_generated/dataModel";
import { CATALOGUE } from "../../convex/lib/catalogue";
import { NOW } from "./fixtures";

const SAMPLE_CODES = new Set(["PAPER-NEWS", "PAPER-CARTON", "PLASTIC-PET"]);
const materials: Material[] = CATALOGUE.filter((material) =>
  SAMPLE_CODES.has(material.code),
);
const prices = new Map(
  CATALOGUE.filter((material) => SAMPLE_CODES.has(material.code)).map(
    (material) => [material.code, material.fallbackPaise],
  ),
);
const shop: ShopOffer = {
  id: "guide-selection-shop" as Id<"orgs">,
  name: "Demo neighbourhood shop",
  area: "Yeshwanthpur",
  address: "Sample address, Yeshwanthpur, Bengaluru",
  offersPickup: true,
  hours: { opens: "08:00", closes: "20:00" },
  estimatePaise: 7000,
  fallbackCodes: [],
};

/** Isolated real components with local state only; never submits a booking. */
export function SellSelectionFixture({
  step,
}: {
  step: "basket" | "shop" | "when";
}) {
  const t = useTranslations("sell");
  const [draft, setDraft] = useState<SellDraft>({
    ...EMPTY_DRAFT,
    items: [{ materialCode: "PAPER-NEWS", kg: 5 }],
    shopId: shop.id,
    slotDate: "2026-10-14",
    slotWindow: "afternoon",
  });
  const change = (patch: Partial<SellDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };
  const whenTitle =
    draft.mode === "pickup" ? "when.titlePickup" : "when.titleDropoff";
  const title = t(step === "when" ? whenTitle : `${step}.title`);

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator step={step} />
      <StepFrame
        title={title}
        lead={step === "when" ? undefined : t(`${step}.lead`)}
        shouldFocus={false}
      >
        {step === "basket" ? (
          <BasketStep
            materials={materials}
            prices={prices}
            items={draft.items}
            onToggle={(material) => {
              setDraft((current) =>
                hasItem(current, material.code)
                  ? removeItem(current, material.code)
                  : addItem(current, material.code, 5),
              );
            }}
            onSetKg={(code, kg) => {
              setDraft((current) => setKg(current, code, kg));
            }}
            onRemove={(code) => {
              setDraft((current) => removeItem(current, code));
            }}
          />
        ) : null}
        {step === "shop" ? (
          <ModeChoice
            mode={draft.mode}
            onChange={(mode) => {
              change({ mode });
            }}
          />
        ) : null}
        {step === "when" ? (
          <WhenStep
            draft={draft}
            shop={shop}
            today="2026-10-14"
            now={NOW}
            problems={[]}
            onChange={change}
          />
        ) : null}
      </StepFrame>
    </div>
  );
}
