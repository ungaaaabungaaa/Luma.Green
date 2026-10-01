"use client";

import { Building2Icon, HouseIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  type AreaUnit,
  type SolarKind,
  USAGE_LIMITS,
  type UsageMode,
} from "./calc";
import { ChoiceGroup } from "./choice-group";

export interface SolarFormState {
  kind: SolarKind;
  mode: UsageMode;
  /** Exactly as typed; read with `readUsage`. */
  amount: string;
  /** Exactly as typed; read with `readRoof`. */
  roof: string;
  areaUnit: AreaUnit;
}

function Note({
  id,
  error,
  hint,
}: {
  id: string;
  error: string | null;
  hint: string;
}) {
  return (
    <p
      id={id}
      role={error ? "alert" : undefined}
      className={cn(
        "text-sm",
        error ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {error ?? hint}
    </p>
  );
}

/**
 * What the calculator needs: home or business, the bill or units, and the
 * roof if they know it. Errors show once a field has been left.
 */
export function SolarInputs({
  state,
  onChange,
  onLeave,
  amountError,
  roofError,
}: {
  state: SolarFormState;
  onChange: (next: SolarFormState) => void;
  onLeave: (field: "amount" | "roof") => void;
  amountError: boolean;
  roofError: boolean;
}) {
  const t = useTranslations("solar.form");
  const format = useFormat();
  const limits = USAGE_LIMITS[state.mode];
  const isBill = state.mode === "bill";
  const limitText = isBill
    ? t("errors.bill", {
        min: format.money(limits.min * 100),
        max: format.money(limits.max * 100),
      })
    : t("errors.units", {
        min: format.number(limits.min),
        max: format.number(limits.max),
      });

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend id="solar-kind-legend" className="mb-3 text-base font-medium">
          {t("kind")}
        </legend>
        <ChoiceGroup
          name="solar-kind"
          labelledBy="solar-kind-legend"
          value={state.kind}
          onChange={(kind) => {
            onChange({ ...state, kind });
          }}
          options={[
            { value: "home", label: t("kinds.home"), icon: HouseIcon },
            {
              value: "business",
              label: t("kinds.business"),
              icon: Building2Icon,
            },
          ]}
        />
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend id="solar-mode-legend" className="mb-3 text-base font-medium">
          {t("mode")}
        </legend>
        <ChoiceGroup
          compact
          name="solar-mode"
          labelledBy="solar-mode-legend"
          value={state.mode}
          onChange={(mode) => {
            // A bill and a unit count aren't the same number: start fresh.
            onChange({ ...state, mode, amount: "" });
          }}
          options={[
            { value: "bill", label: t("modes.bill") },
            { value: "units", label: t("modes.units") },
          ]}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="solar-amount" className="flex flex-wrap text-sm">
            {t(isBill ? "bill" : "units")}
          </Label>
          <div className="relative" dir="ltr">
            {isBill ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-lg text-muted-foreground"
              >
                ₹
              </span>
            ) : null}
            <Input
              id="solar-amount"
              inputMode="decimal"
              autoComplete="off"
              value={state.amount}
              onChange={(event) => {
                onChange({ ...state, amount: event.target.value });
              }}
              onBlur={() => {
                onLeave("amount");
              }}
              aria-invalid={amountError || undefined}
              aria-describedby="solar-amount-note"
              className={cn("h-12 text-lg", isBill ? "ps-8" : "pe-16")}
            />
            {isBill ? null : (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-muted-foreground"
              >
                {t("unitsSuffix")}
              </span>
            )}
          </div>
          <Note
            id="solar-amount-note"
            error={amountError ? limitText : null}
            hint={t(isBill ? "billHint" : "unitsHint")}
          />
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="solar-roof" className="flex flex-wrap text-sm">
          {t("roof")}
          <span className="font-normal text-muted-foreground">
            ({t("optional")})
          </span>
        </Label>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            id="solar-roof"
            inputMode="decimal"
            autoComplete="off"
            value={state.roof}
            onChange={(event) => {
              onChange({ ...state, roof: event.target.value });
            }}
            onBlur={() => {
              onLeave("roof");
            }}
            aria-invalid={roofError || undefined}
            aria-describedby="solar-roof-note"
            className="h-full min-h-12 text-lg"
          />
          <span id="solar-roof-unit" className="sr-only">
            {t("roofUnit")}
          </span>
          <ChoiceGroup
            compact
            name="solar-roof-unit"
            labelledBy="solar-roof-unit"
            value={state.areaUnit}
            onChange={(areaUnit) => {
              onChange({ ...state, areaUnit });
            }}
            options={[
              { value: "sqft", label: t("areaUnits.sqft") },
              { value: "m2", label: t("areaUnits.m2") },
            ]}
          />
        </div>
        <Note
          id="solar-roof-note"
          error={roofError ? t("errors.roof") : null}
          hint={t("roofHint")}
        />
      </div>
    </div>
  );
}
