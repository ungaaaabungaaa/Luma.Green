"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { PackageIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useFormat } from "@/components/app/format";
import { EmptyState } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

import { api } from "../../../convex/_generated/api";
import {
  buyerKindFor,
  type OrgKind,
  safePaiseFor,
} from "../../../convex/lib/chain";
import { type MarketErrorKey, marketErrorKey } from "./errors";
import {
  KgField,
  MaterialChoice,
  NoteField,
  PriceField,
} from "./listing-fields";
import {
  kgFieldValue,
  NOTE_MAX_LENGTH,
  parseKg,
  parseRupees,
  rupeeFieldValue,
  suggestedAskPaise,
} from "./logic";
import type { SellableItem } from "./types";

/**
 * "New listing" on the sell page: pick a material from stock (only what
 * isn't already listed or sold), how much, and a price — started at today's
 * market price marked up for this step in the chain.
 */
export function NewListingForm({
  sellerKind,
  city,
}: {
  sellerKind: OrgKind;
  city: string;
}) {
  const t = useTranslations("market.sell.form");
  const items = useQuery(api.market.sellable);
  const board = useQuery(api.catalogue.priceQuotes, { city, source: "market" });
  const todayPrices = useMemo(
    () => new Map(board?.rows.map((row) => [row.code, row.paisePerKg])),
    [board],
  );

  if (items === undefined) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }
  if (items.every((item) => item.availableGrams <= 0)) {
    return (
      <EmptyState
        icon={PackageIcon}
        title={t("nothingTitle")}
        body={t("nothingBody")}
        action={
          <Button asChild variant="outline" size="lg" className="mt-2 h-11">
            <Link href="/app/stock">{t("goStock")}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ListingForm
      items={items}
      todayPrices={todayPrices}
      sellerKind={sellerKind}
    />
  );
}

interface Values {
  materialCode: string;
  kg: string;
  price: string;
  note: string;
}

type FormErrorKey =
  | "pickMaterial"
  | "kgInvalid"
  | "kgTooMuch"
  | "priceInvalid"
  | "noteTooLong"
  | "totalInvalid";

const EMPTY: Values = { materialCode: "", kg: "", price: "", note: "" };

/** The form's rules; `kg` is checked against what's free of the material. */
function listingSchema(
  byCode: ReadonlyMap<string, SellableItem>,
  locale: string,
) {
  return z
    .object({
      materialCode: z.string().min(1, "pickMaterial"),
      kg: z.string(),
      price: z
        .string()
        .refine((value) => parseRupees(value, locale) !== null, "priceInvalid"),
      note: z.string().max(NOTE_MAX_LENGTH, "noteTooLong"),
    })
    .superRefine((values, context) => {
      const grams = parseKg(values.kg, locale);
      const available = byCode.get(values.materialCode)?.availableGrams;
      const price = parseRupees(values.price, locale);
      if (
        grams !== null &&
        price !== null &&
        safePaiseFor(grams, price) === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["price"],
          message: "totalInvalid",
        });
      }
      if (grams === null) {
        context.addIssue({
          code: "custom",
          path: ["kg"],
          message: "kgInvalid",
        });
      } else if (available !== undefined && grams > available) {
        context.addIssue({
          code: "custom",
          path: ["kg"],
          message: "kgTooMuch",
        });
      }
    });
}

function ListingForm({
  items,
  todayPrices,
  sellerKind,
}: {
  items: readonly SellableItem[];
  todayPrices: ReadonlyMap<string, number | null>;
  sellerKind: OrgKind;
}) {
  const t = useTranslations("market");
  const locale = useLocale();
  const format = useFormat();
  const createListing = useMutation(api.market.createListing);
  const [failure, setFailure] = useState<MarketErrorKey | null>(null);
  const byCode = useMemo(
    () => new Map(items.map((item) => [item.material.code, item])),
    [items],
  );
  const schema = useMemo(() => listingSchema(byCode, locale), [byCode, locale]);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const [materialCode, kg, price, note] = useWatch({
    control,
    name: ["materialCode", "kg", "price", "note"],
  });

  const suggestionFor = (code: string) => {
    const item = byCode.get(code);
    return item
      ? suggestedAskPaise(todayPrices.get(code), item.stage, sellerKind)
      : null;
  };
  const item = byCode.get(materialCode);
  const grams = parseKg(kg, locale);
  const paise = parseRupees(price, locale);
  const total =
    grams !== null && paise !== null ? safePaiseFor(grams, paise) : 0;

  const errorText = (field: keyof Values) => {
    const key = errors[field]?.message as FormErrorKey | undefined;
    if (key === "totalInvalid") return t("totalInvalid");
    const weight = item ? format.weight(item.availableGrams) : "";
    return key ? t(`sell.form.errors.${key}`, { weight }) : undefined;
  };

  function pickMaterial(code: string) {
    setValue("materialCode", code, { shouldValidate: true });
    const suggestion = suggestionFor(code);
    if (suggestion !== null) setValue("price", rupeeFieldValue(suggestion));
  }

  async function onSubmit(values: Values) {
    const wanted = parseKg(values.kg, locale);
    const ask = parseRupees(values.price, locale);
    if (wanted === null || ask === null) return;
    const trimmed = values.note.trim();
    setFailure(null);
    try {
      await createListing({
        materialCode: values.materialCode,
        grams: wanted,
        askPaisePerKg: ask,
        note: trimmed === "" ? undefined : trimmed,
      });
      toast.success(
        t("sell.form.listed", { buyer: buyerKindFor(sellerKind) ?? "other" }),
      );
      reset(EMPTY);
    } catch (error) {
      const key = marketErrorKey(error);
      setFailure(key);
      toast.error(t(`errors.${key}`));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-6"
    >
      <MaterialChoice
        items={items}
        value={materialCode}
        error={errorText("materialCode")}
        onChange={pickMaterial}
      />
      <KgField
        input={register("kg")}
        error={errorText("kg")}
        availableGrams={item?.availableGrams ?? null}
        onAll={() => {
          if (!item) return;
          setValue("kg", kgFieldValue(item.availableGrams), {
            shouldValidate: true,
          });
        }}
      />
      <PriceField
        input={register("price")}
        error={errorText("price")}
        todayPaise={todayPrices.get(materialCode) ?? null}
        suggestion={suggestionFor(materialCode)}
        paise={paise}
        onUse={(suggestion) => {
          setValue("price", rupeeFieldValue(suggestion), {
            shouldValidate: true,
          });
        }}
      />
      <NoteField
        input={register("note")}
        error={errorText("note")}
        length={note.length}
      />

      <div
        className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-4"
        aria-live="polite"
      >
        <span className="text-sm text-muted-foreground">
          {t("sell.form.value")}
        </span>
        <span className="text-xl font-semibold tracking-tight tabular-nums">
          {total === null ? t("totalInvalid") : format.money(total)}
        </span>
      </div>

      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${failure}`)}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="h-12 text-base"
        disabled={isSubmitting}
      >
        {t(isSubmitting ? "sell.form.submitting" : "sell.form.submit")}
      </Button>
    </form>
  );
}
