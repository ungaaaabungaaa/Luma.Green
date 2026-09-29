"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { MaterialOption } from "./logic";

function Chip({
  isPressed,
  onPress,
  children,
}: {
  isPressed: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={isPressed}
      onClick={onPress}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        isPressed
          ? "border-primary bg-brand-50 font-medium text-primary"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      {isPressed ? <CheckIcon aria-hidden className="size-4" /> : null}
      {children}
    </button>
  );
}

/**
 * Material chips above the lots: "All", then each material on sale with how
 * many lots it has. Scrolls sideways on a phone; wraps on wider screens.
 */
export function MaterialFilter({
  options,
  value,
  onChange,
}: {
  options: readonly MaterialOption[];
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  const t = useTranslations("market.browse");
  return (
    <div
      role="group"
      aria-label={t("filterLabel")}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      <Chip
        isPressed={value === null}
        onPress={() => {
          onChange(null);
        }}
      >
        {t("all")}
      </Chip>
      {options.map((option) => (
        <Chip
          key={option.code}
          isPressed={value === option.code}
          onPress={() => {
            onChange(option.code);
          }}
        >
          {option.label}
          <span className="text-muted-foreground tabular-nums">
            {option.count}
          </span>
        </Chip>
      ))}
    </div>
  );
}
