"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { toast } from "sonner";

import { EvidenceDialog, LotField } from "@/components/lots/form-parts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isLocale, localeDirection } from "@/i18n/locales";

import { api } from "../../../convex/_generated/api";
import { routeInputSchema } from "../../../convex/lib/routePlanning";
import {
  blankSite,
  blankStop,
  coordinateInput,
  gramsInput,
  logisticsFormSchema,
  type LogisticsFormValues,
} from "./form-logic";

function indexString(index: number): `${number}` {
  return String(index) as `${number}`;
}
type Detail = FunctionReturnType<typeof api.routePlans.detail>;
function SiteFields({
  prefix,
  register,
}: {
  prefix: "origin" | `stops.${number}`;
  register: UseFormRegister<LogisticsFormValues>;
}) {
  const t = useTranslations("logistics");
  const f = useTranslations("facility");
  return (
    <>
      <LotField
        label={f("siteReference")}
        registration={register(`${prefix}.siteReference`)}
        maxLength={160}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <LotField
          label={t("latitude")}
          registration={register(`${prefix}.latitude`)}
          inputMode="decimal"
          required
        />
        <LotField
          label={t("longitude")}
          registration={register(`${prefix}.longitude`)}
          inputMode="decimal"
          required
        />
      </div>
    </>
  );
}
export function PlanForm({ detail }: { detail?: Detail }) {
  const t = useTranslations("logistics");
  const common = useTranslations("common");
  const lots = useTranslations("lots");
  const locale = useLocale();
  const direction = isLocale(locale) ? localeDirection(locale) : "ltr";
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expectedRevision, setExpectedRevision] = useState<number>();
  const [invalid, setInvalid] = useState(false);
  const materials = useQuery(api.routePlans.options, open ? {} : "skip");
  const save = useMutation(api.routePlans.save);
  const form = useForm<LogisticsFormValues>({
    resolver: zodResolver(logisticsFormSchema),
    defaultValues: {
      title: "",
      reference: "",
      vehicleReference: "",
      capacityGrams: "",
      origin: blankSite,
      stops: [blankStop],
      ordering: "entered",
      reason: "",
    },
  });
  const stops = useFieldArray({ control: form.control, name: "stops" });
  function begin() {
    setFailed(false);
    setInvalid(false);
    setExpectedRevision(detail?.plan.revision);
    if (detail) {
      const latest = detail.latest;
      form.reset({
        title: latest.title,
        reference: detail.plan.reference,
        vehicleReference: latest.vehicleReference,
        capacityGrams: String(latest.capacityGrams),
        origin: {
          ...latest.origin,
          latitude: String(latest.origin.latitude),
          longitude: String(latest.origin.longitude),
        },
        stops: latest.stops.map((stop) => ({
          ...stop,
          latitude: String(stop.latitude),
          longitude: String(stop.longitude),
          grams: String(stop.grams),
        })),
        ordering: latest.ordering,
        reason: "",
      });
    }
    setOpen(true);
  }
  async function submit(values: LogisticsFormValues) {
    setInvalid(false);
    setFailed(false);
    const origin = {
      siteReference: values.origin.siteReference,
      latitude: coordinateInput(values.origin.latitude, locale),
      longitude: coordinateInput(values.origin.longitude, locale),
    };
    const chosen = values.stops.map((stop) => {
      const material = materials?.find((row) => row.id === stop.materialId);
      return material
        ? {
            siteReference: stop.siteReference,
            latitude: coordinateInput(stop.latitude, locale),
            longitude: coordinateInput(stop.longitude, locale),
            grams: gramsInput(stop.grams),
            materialId: material.id,
          }
        : null;
    });
    const validStops = chosen.filter((stop) => stop !== null);
    const input = {
      title: values.title,
      vehicleReference: values.vehicleReference,
      capacityGrams: gramsInput(values.capacityGrams),
      origin,
      stops: validStops,
      ordering: values.ordering,
    };
    if (
      validStops.length !== chosen.length ||
      !routeInputSchema.safeParse(input).success ||
      values.reference.trim().length < 3 ||
      values.reason.trim().length < 3
    ) {
      setInvalid(true);
      return;
    }
    try {
      await save({
        ...input,
        reference: values.reference,
        reason: values.reason,
        planId: detail?.plan._id,
        expectedRevision,
      });
      toast.success(lots("saved"));
      setOpen(false);
      if (!detail) form.reset();
    } catch {
      setFailed(true);
      toast.error(common("error"));
    }
  }
  return (
    <EvidenceDialog
      open={open}
      onClose={() => {
        setOpen(false);
      }}
      onOpen={begin}
      title={t(detail ? "correct" : "add")}
      hint={t("lead")}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          void form.handleSubmit(submit)(event);
        }}
      >
        <LotField
          label={t("titleLabel")}
          registration={form.register("title")}
          maxLength={160}
          required
        />
        <LotField
          label={t("reference")}
          registration={form.register("reference")}
          maxLength={80}
          required
          readOnly={Boolean(detail)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <LotField
            label={t("vehicle")}
            registration={form.register("vehicleReference")}
            maxLength={160}
            required
          />
          <LotField
            label={t("capacity")}
            registration={form.register("capacityGrams")}
            inputMode="numeric"
            required
          />
        </div>
        <fieldset className="space-y-3 border-t pt-4">
          <legend className="font-medium">{t("origin")}</legend>
          <SiteFields prefix="origin" register={form.register} />
        </fieldset>
        {stops.fields.map((stop, index) => (
          <fieldset key={stop.id} className="space-y-3 border-t pt-4">
            <legend className="font-medium">
              {t("stop", { number: index + 1 })}
            </legend>
            <SiteFields
              prefix={`stops.${indexString(index)}`}
              register={form.register}
            />
            <Select
              dir={direction}
              value={form.watch(`stops.${indexString(index)}.materialId`)}
              onValueChange={(value) => {
                form.setValue(`stops.${indexString(index)}.materialId`, value);
              }}
            >
              <SelectTrigger
                aria-label={lots("material")}
                className="h-11 w-full"
              >
                <SelectValue placeholder={lots("material")} />
              </SelectTrigger>
              <SelectContent>
                {materials?.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.names[locale] || row.names.en || row.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <LotField
              label={lots("mass")}
              registration={form.register(`stops.${indexString(index)}.grams`)}
              inputMode="numeric"
              required
            />
            <Button
              type="button"
              variant="ghost"
              disabled={stops.fields.length === 1}
              onClick={() => {
                stops.remove(index);
              }}
            >
              {lots("remove")}
            </Button>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={stops.fields.length >= 20}
          onClick={() => {
            stops.append(blankStop);
          }}
        >
          {t("addStop")}
        </Button>
        <Select
          dir={direction}
          value={form.watch("ordering")}
          onValueChange={(value) => {
            if (value === "entered" || value === "geometric")
              form.setValue("ordering", value);
          }}
        >
          <SelectTrigger aria-label={t("geometric")} className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entered">{t("entered")}</SelectItem>
            <SelectItem value="geometric">{t("geometric")}</SelectItem>
          </SelectContent>
        </Select>
        <LotField
          label={t("reason")}
          registration={form.register("reason")}
          maxLength={200}
          required
        />
        <p className="text-sm text-muted-foreground">{lots("integerHint")}</p>
        {invalid || failed ? (
          <p role="alert" className="text-sm text-destructive">
            {t(invalid ? "invalid" : "conflict")}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || !materials}
        >
          {lots(form.formState.isSubmitting ? "saving" : "save")}
        </Button>
      </form>
    </EvidenceDialog>
  );
}
