"use client";

import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { indiaToday } from "../../../convex/lib/onboarding";
import { useNow } from "../sell/states";
import { ItemsCard, MoneySection, WhenCard } from "./booking-cards";
import { CancelBooking } from "./cancel-booking";
import { NextActions } from "./next-actions";
import { ShopCard } from "./shop-card";
import { StatusHero } from "./status-hero";
import { Timeline } from "./timeline";
import type { TrackedBooking } from "./types";

/**
 * Everything about one booking, in the order a household asks: what's
 * happening, when, with whom, what's collected, and what they get.
 */
export function TrackView({ booking }: { booking: TrackedBooking }) {
  const t = useTranslations("track");
  const today = indiaToday(useNow());

  return (
    <div className="flex flex-col gap-4">
      <StatusHero booking={booking} />
      <WhenCard booking={booking} today={today} />
      {booking.dispatch && booking.dispatch.attempt > 1 ? (
        <p
          role="status"
          className="rounded-xl border border-primary/20 bg-accent p-4 text-sm text-accent-foreground"
        >
          {t("dispatchChanged")}
        </p>
      ) : null}
      <ShopCard shop={booking.shop} />
      <MoneySection booking={booking} />
      <ItemsCard booking={booking} />
      <Timeline timeline={booking.timeline} />
      <CancelBooking booking={booking} />
      <NextActions booking={booking} />
      <p className="flex justify-center gap-2 text-center text-sm text-muted-foreground">
        <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t("saved")}
      </p>
    </div>
  );
}
