"use client";

import { CircleCheckBigIcon, PackageIcon, StarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { firstName } from "./bookings";
import { MaterialIcon } from "./material-icon";
import type { BookingView } from "./types";

type Receipt = NonNullable<BookingView["receipt"]>;

/**
 * The thank-you after weighing: what was paid and how, the points the
 * household earned, and each line at the rate used — rates a later price
 * change never rewrites.
 */
export function ReceiptView({
  receipt,
  points,
  name,
}: {
  receipt: Receipt;
  points: number | null;
  name: string | undefined;
}) {
  const t = useTranslations("shop");
  const format = useFormat();
  const formatter = useFormatter();
  const total = format.money(receipt.totalPaise);
  const first = firstName(name);
  // A receipt shows the weight to the gram, not rounded like elsewhere.
  const exactKg = (grams: number) =>
    t("receipt.kg", {
      kg: formatter.number(grams / 1000, { maximumFractionDigits: 3 }),
    });
  return (
    <section
      aria-labelledby="receipt-title"
      className="flex flex-col gap-5 rounded-2xl border bg-card p-5"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CircleCheckBigIcon aria-hidden className="size-8" />
        </span>
        <p className="font-medium text-primary">
          {first
            ? t("receipt.thanksNamed", { name: first })
            : t("receipt.thanks")}
        </p>
        <h2
          id="receipt-title"
          className="text-3xl font-semibold tracking-tight tabular-nums"
        >
          {t("receipt.title", { amount: total })}
        </h2>
        <p className="text-muted-foreground">
          {t("receipt.method", {
            method: t(`methods.${receipt.method}`),
            when: format.dateTime(receipt.paidAt),
          })}
        </p>
        {points === null ? null : (
          <div className="mt-2 flex flex-col items-center gap-1">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground">
              <StarIcon aria-hidden className="size-4" />
              {t("receipt.points", {
                name: first ?? t("household"),
                points,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("receipt.pointsHint")}
            </p>
          </div>
        )}
      </div>

      <ul className="flex flex-col divide-y border-y">
        {receipt.lines.map((line) => (
          <li key={line.material.code} className="flex items-center gap-3 py-3">
            <MaterialIcon family={line.material.family} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">
                {format.material(line.material.names, line.material.code)}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("receipt.line", {
                  weight: exactKg(line.grams),
                  price: format.perKg(line.paisePerKg),
                })}
              </span>
            </div>
            <span className="font-semibold tabular-nums">
              {format.money(line.paise)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between gap-3 text-lg font-semibold">
        <span>{t("receipt.total")}</span>
        <span className="tabular-nums">{total}</span>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <PackageIcon aria-hidden className="size-4 shrink-0 text-primary" />
        {t("receipt.stock")}
      </p>
      <Button asChild variant="outline" size="lg" className="h-12 text-base">
        <Link href="/app/requests">{t("receipt.back")}</Link>
      </Button>
    </section>
  );
}
