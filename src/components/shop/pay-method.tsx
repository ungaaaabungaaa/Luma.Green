"use client";

import { BanknoteIcon, type LucideIcon, SmartphoneIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type PayMethod = "cash" | "upi";

const METHODS: readonly { value: PayMethod; icon: LucideIcon }[] = [
  { value: "cash", icon: BanknoteIcon },
  { value: "upi", icon: SmartphoneIcon },
];

/** Cash or UPI, as two labelled radio options. Payment is recorded, not processed. */
export function PayMethodChoice({
  value,
  onChange,
}: {
  value: PayMethod;
  onChange: (method: PayMethod) => void;
}) {
  const t = useTranslations("shop");
  return (
    <fieldset className="flex flex-col gap-2">
      <legend id="pay-method-legend" className="mb-2 text-base font-medium">
        {t("weigh.method")}
      </legend>
      <RadioGroup
        aria-labelledby="pay-method-legend"
        value={value}
        onValueChange={(next) => {
          const method = METHODS.find((option) => option.value === next);
          if (method) onChange(method.value);
        }}
        className="grid grid-cols-2 gap-3"
      >
        {METHODS.map(({ value: method, icon: Icon }) => (
          <Label
            key={method}
            htmlFor={`pay-${method}`}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 border-b px-2 text-base font-medium",
              value === method
                ? "border-primary text-primary"
                : "border-border",
            )}
          >
            <RadioGroupItem id={`pay-${method}`} value={method} />
            <Icon aria-hidden className="size-5 text-primary" />
            {t(`methods.${method}`)}
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
