"use client";

import { StoreIcon, TruckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

import type { Mode } from "./draft";

const OPTIONS = [
  { value: "pickup", icon: TruckIcon, hint: "pickupHint" },
  { value: "dropoff", icon: StoreIcon, hint: "dropoffHint" },
] as const;

/** Pickup from home, or drop it off at the shop: two big cards. */
export function ModeChoice({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  const t = useTranslations("sell.shop");
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend id="mode-legend" className="mb-2 font-semibold">
        {t("modeLabel")}
      </legend>
      <RadioGroup
        aria-labelledby="mode-legend"
        value={mode}
        onValueChange={(value) => {
          onChange(value === "dropoff" ? "dropoff" : "pickup");
        }}
        className="grid grid-cols-2 gap-2"
      >
        {OPTIONS.map(({ value, icon: Icon, hint }) => {
          const isSelected = value === mode;
          return (
            <Label
              key={value}
              htmlFor={`mode-${value}`}
              className={cn(
                "flex min-h-20 cursor-pointer flex-col items-start gap-2 rounded-2xl border-2 bg-card p-3 font-normal",
                isSelected ? "border-primary bg-brand-50" : "border-border",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <Icon aria-hidden className="size-6 text-primary" />
                <RadioGroupItem id={`mode-${value}`} value={value} />
              </span>
              <span className="text-base font-semibold">{t(value)}</span>
              <span className="text-sm text-muted-foreground">{t(hint)}</span>
            </Label>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
