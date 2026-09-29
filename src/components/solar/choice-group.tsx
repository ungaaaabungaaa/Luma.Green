"use client";

import type { LucideIcon } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * One of two choices: big tappable cards with an icon, or — `compact` — a
 * segmented control whose segments are the radios themselves. Both are a
 * real radio group, named by the element whose id is `labelledBy`.
 */
export function ChoiceGroup<T extends string>({
  name,
  labelledBy,
  options,
  value,
  onChange,
  compact = false,
}: {
  name: string;
  labelledBy: string;
  options: readonly { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <RadioGroup
      name={name}
      aria-labelledby={labelledBy}
      value={value}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option) onChange(option.value);
      }}
      className={cn(
        "grid grid-cols-2",
        compact ? "gap-1 rounded-xl bg-muted p-1" : "gap-2",
      )}
    >
      {options.map((option) =>
        compact ? (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            className="flex min-h-11 items-center justify-center rounded-lg px-3 text-center text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm"
          >
            {option.label}
          </RadioGroupPrimitive.Item>
        ) : (
          <ChoiceCard
            key={option.value}
            id={`${name}-${option.value}`}
            option={option}
            isSelected={option.value === value}
          />
        ),
      )}
    </RadioGroup>
  );
}

function ChoiceCard({
  id,
  option,
  isSelected,
}: {
  id: string;
  option: { value: string; label: string; icon?: LucideIcon };
  isSelected: boolean;
}) {
  const Icon = option.icon;
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 bg-card px-3 py-2 text-base font-normal",
        isSelected ? "border-primary bg-brand-50" : "border-border",
      )}
    >
      <RadioGroupItem id={id} value={option.value} />
      {Icon ? (
        <Icon aria-hidden className="size-5 shrink-0 text-primary" />
      ) : null}
      {option.label}
    </Label>
  );
}
