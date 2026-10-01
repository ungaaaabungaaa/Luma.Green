"use client";

import {
  type LucideIcon,
  MapPinIcon,
  StoreIcon,
  SunIcon,
  SunriseIcon,
  SunsetIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { StatusPill } from "@/components/app/page-parts";

import { type BookingStatus, kgToGrams } from "../../../convex/lib/chain";
import { areaOf, relativeDay } from "./bookings";
import { MaterialIcon } from "./material-icon";
import type { BookingView } from "./types";

/** Pieces every request card and the detail page share. */

const WINDOW_ICONS: Record<BookingView["slotWindow"], LucideIcon> = {
  morning: SunriseIcon,
  afternoon: SunIcon,
  evening: SunsetIcon,
};

const STATUS_TONES: Record<
  BookingStatus,
  "neutral" | "info" | "good" | "warn" | "bad"
> = {
  requested: "warn",
  accepted: "info",
  on_the_way: "info",
  completed: "good",
  declined: "neutral",
  cancelled: "neutral",
};

/** "Today, Evening" with a sun for the time of day. */
export function SlotLabel({
  date,
  window,
  today,
}: {
  date: string;
  window: BookingView["slotWindow"];
  today: string;
}) {
  const t = useTranslations("shop");
  const format = useFormat();
  const Icon = WINDOW_ICONS[window];
  const relative = relativeDay(date, today);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      {t("slot", {
        day: relative ? t(`days.${relative}`) : format.date(date),
        window: t(`windows.${window}`),
      })}
    </span>
  );
}

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  const t = useTranslations("shop.status");
  return <StatusPill tone={STATUS_TONES[status]}>{t(status)}</StatusPill>;
}

/** Where the pickup is (the area only), or "brings it to your shop". */
export function PlaceLine({
  booking,
  city,
}: {
  booking: BookingView;
  city: string;
}) {
  const t = useTranslations("shop");
  const address = booking.mode === "pickup" ? booking.address : undefined;
  const Icon = address ? MapPinIcon : StoreIcon;
  return (
    <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="line-clamp-2">
        {address ? areaOf(address, city) : t("dropoff")}
      </span>
    </p>
  );
}

/** The household's materials with their estimated weight, as chips. */
export function ItemChips({ items }: { items: BookingView["items"] }) {
  const format = useFormat();
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li
          key={`${item.material.code}-${String(index)}`}
          className="inline-flex items-center gap-2 rounded-md bg-muted py-1 ps-1 pe-3 text-sm"
        >
          <MaterialIcon family={item.material.family} size="sm" />
          <span>
            {format.material(item.material.names, item.material.code)}
          </span>
          <span className="font-semibold tabular-nums">
            {format.weight(kgToGrams(item.estKg))}
          </span>
        </li>
      ))}
    </ul>
  );
}
