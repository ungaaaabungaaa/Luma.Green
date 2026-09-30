"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type { RuleUnit } from "../../../../convex/lib/rules";
import { inputAdornment } from "./rule-format";

/**
 * The input for a rule's new value, shaped by its unit: a switch for an
 * on/off rule, plain text for a name, and a number with ₹ or % beside it
 * for everything else. The admin types rupees and percentages; the parent
 * turns them into paise and basis points.
 */
export function RuleValueField({
  id,
  unit,
  text,
  isOn,
  onText,
  onFlag,
  isInvalid,
  describedBy,
}: {
  id: string;
  unit: RuleUnit;
  text: string;
  isOn: boolean;
  onText: (text: string) => void;
  onFlag: (isOn: boolean) => void;
  isInvalid: boolean;
  describedBy: string | undefined;
}) {
  if (unit === "flag") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
        <Label htmlFor={id}>{isOn ? "On" : "Off"}</Label>
        <Switch
          id={id}
          checked={isOn}
          onCheckedChange={onFlag}
          aria-describedby={describedBy}
        />
      </div>
    );
  }
  const { prefix, suffix } = inputAdornment(unit);
  const isNumber = unit !== "text";
  const numberClass = cn(
    "tabular-nums",
    prefix !== undefined && "ps-7",
    suffix !== undefined && "pe-16",
  );
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>New value</Label>
      <div className="relative">
        {prefix ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm text-muted-foreground"
          >
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          inputMode={isNumber ? "decimal" : "text"}
          autoComplete="off"
          value={text}
          onChange={(event) => {
            onText(event.target.value);
          }}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          className={isNumber ? numberClass : undefined}
        />
        {suffix ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground"
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
