"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isLocale, localeDirection } from "@/i18n/locales";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  HANDLING_CLASSES,
  type PROCESS_KINDS,
  STREAM_CLASSES,
} from "../../../convex/lib/industrialClassification";

type Stream = (typeof STREAM_CLASSES)[number];
type Handling = (typeof HANDLING_CLASSES)[number];
type Process = (typeof PROCESS_KINDS)[number];

export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const locale = useLocale();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select
        value={value}
        onValueChange={onChange}
        dir={isLocale(locale) ? localeDirection(locale) : "ltr"}
      >
        <SelectTrigger id={id} className="min-h-11 w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ClassificationFields({
  streamClass,
  handlingClass,
  onStream,
  onHandling,
}: {
  streamClass?: Stream;
  handlingClass?: Handling;
  onStream: (value: Stream) => void;
  onHandling: (value: Handling) => void;
}) {
  const t = useTranslations("lots");
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Choice
        label={t("streamClass")}
        value={streamClass ?? "unspecified"}
        options={STREAM_CLASSES.map((value) => ({
          value,
          label: t(`streams.${value}`),
        }))}
        onChange={(value) => {
          const next = STREAM_CLASSES.find((item) => item === value);
          if (next) onStream(next);
        }}
      />
      <Choice
        label={t("handlingClass")}
        value={handlingClass ?? "unassessed"}
        options={HANDLING_CLASSES.map((value) => ({
          value,
          label: t(`handling.${value}`),
        }))}
        onChange={(value) => {
          const next = HANDLING_CLASSES.find((item) => item === value);
          if (next) onHandling(next);
        }}
      />
    </div>
  );
}

export function FacilityProcessFields({
  facilityId,
  processKind,
  onChange,
}: {
  facilityId?: Id<"industrialFacilities">;
  processKind?: Process;
  onChange: (
    facilityId: Id<"industrialFacilities"> | undefined,
    processKind: Process | undefined,
  ) => void;
}) {
  const t = useTranslations("lots");
  const facility = useTranslations("facility");
  const rows = useQuery(api.industrialProfiles.mine, {});
  const selected = rows?.find((row) => row._id === facilityId);
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Choice
        label={t("facility")}
        value={facilityId ?? "none"}
        options={[
          { value: "none", label: t("noFacility") },
          ...(rows ?? []).map((row) => ({ value: row._id, label: row.name })),
        ]}
        onChange={(value) => {
          onChange(rows?.find((row) => row._id === value)?._id, undefined);
        }}
      />
      {selected ? (
        <Choice
          label={t("processKind")}
          value={processKind ?? ""}
          options={selected.capabilities.map((value) => ({
            value,
            label: facility(`processKinds.${value}`),
          }))}
          onChange={(value) => {
            const next = selected.capabilities.find((item) => item === value);
            if (next) onChange(selected._id, next);
          }}
        />
      ) : null}
    </div>
  );
}
