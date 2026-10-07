"use client";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isLocale, localeDirection } from "@/i18n/locales";

import { api } from "../../../convex/_generated/api";
type Destination = FunctionReturnType<
  typeof api.complianceReview.destinations
>[number];
export function ReviewedDestinationPicker({
  materialCode,
  value,
  onSelect,
}: {
  materialCode: string;
  value: string;
  onSelect: (destination: Destination) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("operations");
  const id = useId();
  const rows = useQuery(api.complianceReview.destinations, {});
  const choices =
    rows?.filter(
      (d) =>
        d.effective &&
        d.materialCodes.includes(materialCode) &&
        d.processes.includes("residual_handling"),
    ) ?? [];
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("destinations")}</Label>
      <Select
        dir={isLocale(locale) ? localeDirection(locale) : "ltr"}
        value={value}
        onValueChange={(value) => {
          const selected = choices.find((d) => d.id === value);
          if (selected) onSelect(selected);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={t("choose")} />
        </SelectTrigger>
        <SelectContent>
          {choices.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        {t(choices.length > 0 ? "destinationHint" : "empty")}
      </p>
    </div>
  );
}
