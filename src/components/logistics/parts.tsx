"use client";

import { MapPinIcon, PhoneIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useFormat } from "@/components/app/format";
import { useTimeFormat } from "@/components/sell/time";
import { cn } from "@/lib/utils";

import { shiftDate } from "../../../convex/lib/dates";
import { telHref } from "./logic";
import type { VehicleKey, Window } from "./types";

/** Small pieces the logistics screens share. */

/** "Tomorrow, Morning · 8 am – 12 pm" */
export function WhenLabel({
  date,
  window,
  today,
  withHours = true,
}: {
  date: string;
  window: Window;
  today: string;
  withHours?: boolean;
}) {
  const t = useTranslations("logistics");
  const time = useTimeFormat();
  const day = time.day(date, today, {
    today: t("day.today"),
    tomorrow: t("day.tomorrow"),
  });
  return (
    <span>
      {t("when", { day, window: t(`windows.${window}`) })}
      {withHours ? (
        <span className="text-muted-foreground"> · {time.window(window)}</span>
      ) : null}
    </span>
  );
}

/** Whether a YYYY-MM-DD date is today or tomorrow, for short labels. */
export function isSoon(date: string, today: string): boolean {
  return date === today || date === shiftDate(today, 1);
}

/** A vehicle's name in the reader's language. */
export function VehicleName({ vehicle }: { vehicle: VehicleKey }) {
  const t = useTranslations("logistics.vehicles");
  return <>{t(vehicle)}</>;
}

/** "up to 500 kg · 2,400 L" */
export function VehicleCapacity({
  payloadKg,
  volumeLitres,
}: {
  payloadKg: number;
  volumeLitres: number;
}) {
  const t = useTranslations("logistics");
  const format = useFormat();
  return (
    <>
      {t("vehicleCapacity", {
        weight: format.weight(payloadKg * 1000),
        litres: format.number(volumeLitres),
      })}
    </>
  );
}

const ACTION_LINK =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

/** A tap-to-call link with the icon everyone knows. */
export function CallLink({
  phone,
  label,
  className,
}: {
  phone: string;
  label: string;
  className?: string;
}) {
  return (
    <a href={telHref(phone)} className={cn(ACTION_LINK, className)}>
      <PhoneIcon aria-hidden className="size-4" />
      {label}
    </a>
  );
}

/** Opens a place in the maps app. */
export function MapLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(ACTION_LINK, className)}
    >
      <MapPinIcon aria-hidden className="size-4" />
      {label}
    </a>
  );
}

/** A label and its value, stacked, for the fact grids. */
export function Fact({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}
