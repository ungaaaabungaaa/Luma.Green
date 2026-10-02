"use client";

import { StoreIcon, TruckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isLocale, localeMeta } from "@/i18n/locales";
import { cn } from "@/lib/utils";

import type { Mode } from "./draft";

const OPTIONS = [
  { value: "pickup", icon: TruckIcon, hint: "pickupHint" },
  { value: "dropoff", icon: StoreIcon, hint: "dropoffHint" },
] as const;

/** Pickup from home or drop-off, as two labelled radio rows. */
export function ModeChoice({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  const t = useTranslations("sell.shop");
  const locale = useLocale();
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend id="mode-legend" className="mb-2 font-semibold">
        {t("modeLabel")}
      </legend>
      <RadioGroup
        dir={localeMeta[isLocale(locale) ? locale : "en"].dir}
        aria-labelledby="mode-legend"
        value={mode}
        onValueChange={(value) => {
          onChange(value === "dropoff" ? "dropoff" : "pickup");
        }}
        className="grid gap-x-5 gap-y-0 sm:grid-cols-2"
      >
        {OPTIONS.map(({ value, icon: Icon, hint }) => {
          const isSelected = value === mode;
          return (
            <Label
              key={value}
              htmlFor={`mode-${value}`}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-3 border-b py-3 font-normal hover:bg-muted/40",
                isSelected ? "border-primary" : "border-border",
              )}
            >
              <RadioGroupItem id={`mode-${value}`} value={value} />
              <Icon
                aria-hidden
                className="size-5 shrink-0 text-muted-foreground"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-base leading-normal font-medium">
                  {t(value)}
                </span>
                <span className="text-sm leading-normal text-muted-foreground">
                  {t(hint)}
                </span>
              </span>
            </Label>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
