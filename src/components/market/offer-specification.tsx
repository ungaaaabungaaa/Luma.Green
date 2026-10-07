"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { useFormat } from "@/components/app/format";
import { LotField } from "@/components/lots/form-parts";
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
import type { ListingView } from "./types";

export function OfferSpecificationFields({
  materialCode,
  grade,
  specification,
  lotId,
  onLotChange,
  invalid,
}: {
  materialCode: string;
  grade: UseFormRegisterReturn;
  specification: UseFormRegisterReturn;
  lotId: Id<"materialLots"> | undefined;
  onLotChange: (id: Id<"materialLots"> | undefined) => void;
  invalid: boolean;
}) {
  const t = useTranslations("marketSpecification");
  const common = useTranslations("common");
  const format = useFormat();
  const locale = useLocale();
  const id = useId();
  const rows = useQuery(api.market.listingLotOptions, { materialCode });
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 border-y py-4">
      <legend className="text-sm font-medium">{t("title")}</legend>
      <p className="text-sm text-muted-foreground">{t("source")}</p>
      <LotField
        label={t("grade")}
        registration={grade}
        invalid={invalid}
        required
        maxLength={120}
      />
      <LotField
        label={t("specification")}
        registration={specification}
        invalid={invalid}
        required
        maxLength={500}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {t("lot")}
        </label>
        <Select
          dir={isLocale(locale) ? localeDirection(locale) : "ltr"}
          value={lotId ?? "none"}
          onValueChange={(value) => {
            onLotChange(rows?.find((row) => row.id === value)?.id);
          }}
        >
          <SelectTrigger
            id={id}
            className="w-full"
            disabled={rows === undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("noLot")}</SelectItem>
            {rows?.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.state} · {format.weight(row.grams)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {invalid ? (
        <p role="alert" className="text-sm text-destructive">
          {common("error")}
        </p>
      ) : null}
    </fieldset>
  );
}

export function OfferSpecification({
  value,
}: {
  value: ListingView["specification"];
}) {
  const t = useTranslations("marketSpecification");
  if (!value) return null;
  return (
    <section className="min-w-0 border-s ps-4 text-sm" aria-label={t("title")}>
      <dl className="space-y-2">
        <div>
          <dt className="text-muted-foreground">{t("grade")}</dt>
          <dd className="break-words">{value.grade}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("specification")}</dt>
          <dd className="break-words">{value.specification}</dd>
        </div>
        {value.lotState ? (
          <div>
            <dt className="text-muted-foreground">{t("lotState")}</dt>
            <dd className="break-words">{value.lotState}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">{t("source")}</p>
    </section>
  );
}
