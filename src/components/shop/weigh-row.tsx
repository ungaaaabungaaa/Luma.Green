"use client";

import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Ref } from "react";

import { useFormat } from "@/components/app/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { paiseFor } from "../../../convex/lib/chain";
import { MaterialIcon } from "./material-icon";
import type { MaterialRef } from "./types";
import { kgInput, parseKg, stepGrams } from "./weigh";

export interface WeighRowValue {
  key: string;
  material: MaterialRef;
  /** What's in the kg field, as typed. */
  text: string;
  /** The household's guess, for items from the booking. */
  estGrams: number | null;
}

/**
 * One material on the scale: − / kg / + in half-kilo steps, the price per kg,
 * and what this line pays.
 */
export function WeighRow({
  row,
  paisePerKg,
  onChange,
  onRemove,
  inputRef,
}: {
  row: WeighRowValue;
  paisePerKg: number | null;
  onChange: (text: string) => void;
  onRemove: () => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const t = useTranslations("shop");
  const format = useFormat();
  const name = format.material(row.material.names, row.material.code);
  const grams = parseKg(row.text);
  const isInvalid = grams === null;
  const id = `weigh-${row.key}`;
  const paise =
    grams === null || paisePerKg === null ? null : paiseFor(grams, paisePerKg);
  const step = (direction: 1 | -1) => {
    onChange(kgInput(stepGrams(grams ?? 0, direction)));
  };

  return (
    <li className="grid items-center gap-4 border-b border-border py-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex items-center gap-3">
        <MaterialIcon family={row.material.family} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Label htmlFor={id} className="text-base font-medium">
            {name}
          </Label>
          <p
            id={`${id}-hint`}
            className="flex flex-wrap gap-x-3 text-sm text-muted-foreground"
          >
            <span>
              {paisePerKg === null
                ? t("weigh.noRate")
                : t("perKg", { price: format.perKg(paisePerKg) })}
            </span>
            {row.estGrams === null ? null : (
              <span>
                {t("weigh.estimated", { weight: format.weight(row.estGrams) })}
              </span>
            )}
          </p>
        </div>
        <span className="text-lg font-semibold tabular-nums">
          {paise === null ? null : format.money(paise)}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="size-11 text-muted-foreground"
          aria-label={t("weigh.remove", { material: name })}
          onClick={onRemove}
        >
          <Trash2Icon aria-hidden className="size-5" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="size-12"
          aria-label={t("weigh.less", { material: name })}
          disabled={(grams ?? 0) === 0}
          onClick={() => {
            step(-1);
          }}
        >
          <MinusIcon aria-hidden className="size-5" />
        </Button>
        <div className="relative flex-1">
          <Input
            id={id}
            ref={inputRef}
            inputMode="decimal"
            autoComplete="off"
            aria-label={t("weigh.inputLabel", { material: name })}
            aria-invalid={isInvalid || undefined}
            aria-describedby={isInvalid ? `${id}-error` : `${id}-hint`}
            value={row.text}
            onChange={(event) => {
              onChange(event.target.value);
            }}
            className="h-12 pe-10 text-center text-xl font-semibold tabular-nums md:text-xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-muted-foreground"
          >
            {t("weigh.kg")}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="size-12"
          aria-label={t("weigh.more", { material: name })}
          onClick={() => {
            step(1);
          }}
        >
          <PlusIcon aria-hidden className="size-5" />
        </Button>
      </div>
      {isInvalid ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm text-destructive lg:col-span-2"
        >
          {t("weigh.invalidKg")}
        </p>
      ) : null}
    </li>
  );
}
