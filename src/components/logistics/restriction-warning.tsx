"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTimeFormat } from "@/components/sell/time";

import type { RestrictionView } from "./types";

function hourText(hour: number): string {
  return `${String(Math.min(hour, 23)).padStart(2, "0")}:00`;
}

/**
 * The roads this vehicle can't use in this window, from the traffic police
 * notices the admin keeps. A warning, not a block: the driver picks the way.
 */
export function RestrictionWarning({
  restrictions,
}: {
  restrictions: readonly RestrictionView[];
}) {
  const t = useTranslations("logistics.restrictions");
  const time = useTimeFormat();
  if (restrictions.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900"
    >
      <TriangleAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium">
          {t("title", { count: restrictions.length })}
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {restrictions.map((restriction) => (
            <li key={restriction.id}>
              <span className="font-medium">{restriction.road}</span>
              <span>
                {" · "}
                {restriction.hoursFrom === 0 && restriction.hoursTo === 24
                  ? t("allDay")
                  : (time.range(
                      hourText(restriction.hoursFrom),
                      hourText(restriction.hoursTo),
                    ) ?? "")}
              </span>
              {restriction.note ? (
                <span className="block text-amber-900/80">
                  {restriction.note}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
