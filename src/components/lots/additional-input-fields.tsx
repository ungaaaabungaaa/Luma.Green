"use client";

import type { FunctionReturnType } from "convex/server";
import { useTranslations } from "next-intl";
import { useFieldArray, type UseFormReturn, useWatch } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";

import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { requiresControlledRoute } from "../../../convex/lib/industrialClassification";
import { Choice } from "./classification-fields";
import { LotField, Mass } from "./form-parts";
import { combinedInputGrams, formIndex, type transformSchema } from "./logic";

export function AdditionalInputFields({
  form,
  lotId,
  sourceLots,
}: {
  form: UseFormReturn<z.infer<typeof transformSchema>>;
  lotId: Id<"materialLots">;
  sourceLots: FunctionReturnType<typeof api.traceability.mine> | undefined;
}) {
  const t = useTranslations("lots");
  const additional = useFieldArray({
    control: form.control,
    name: "additionalInputs",
  });
  const [watchedPrimary, watchedInputs] = useWatch({
    control: form.control,
    name: ["inputGrams", "additionalInputs"],
  });
  const combined = combinedInputGrams({
    inputGrams: watchedPrimary,
    additionalInputs: watchedInputs,
  });
  return (
    <section
      aria-label={t("additionalInputs")}
      className="flex min-w-0 flex-col gap-3 border-y py-4"
    >
      <h3 className="font-medium">{t("additionalInputs")}</h3>
      <p className="text-sm text-muted-foreground">{t("multiInputHint")}</p>
      {additional.fields.map((field, index) => {
        const selected = watchedInputs?.[index]?.lotId ?? "";
        const choices = (sourceLots?.rows ?? []).filter(
          (row) =>
            row.id !== lotId &&
            row.status === "available" &&
            !requiresControlledRoute(row) &&
            (row.id === selected ||
              !watchedInputs?.some((input) => input.lotId === row.id)),
        );
        return (
          <fieldset
            key={field.id}
            className="flex min-w-0 flex-col gap-3 border-t pt-3"
          >
            <Choice
              label={t("chooseInput")}
              value={selected}
              options={choices.map((row) => ({
                value: row.id,
                label: `${row.materialCode} · ${row.state}`,
              }))}
              onChange={(value) => {
                if (choices.some((row) => row.id === value))
                  form.setValue(
                    `additionalInputs.${formIndex(index)}.lotId`,
                    value,
                  );
              }}
            />
            <LotField
              label={t("mass")}
              inputMode="numeric"
              registration={form.register(
                `additionalInputs.${formIndex(index)}.grams`,
              )}
              invalid={Boolean(
                form.formState.errors.additionalInputs?.[index]?.grams,
              )}
            />
            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={() => {
                additional.remove(index);
              }}
            >
              {t("remove")}
            </Button>
          </fieldset>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={additional.fields.length >= 19}
        onClick={() => {
          additional.append({ lotId: "", grams: "" });
        }}
      >
        {t("addInput")}
      </Button>
      {sourceLots?.hasMore ? <p className="text-sm">{t("limit")}</p> : null}
      <p>
        {t("combinedInput")}:{" "}
        {combined === null ? "—" : <Mass grams={combined} />}
      </p>
    </section>
  );
}
