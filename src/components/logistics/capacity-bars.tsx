"use client";

import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { capacityTone } from "./logic";

const INDICATOR: Record<ReturnType<typeof capacityTone>, string> = {
  ok: "",
  near: "[&_[data-slot=progress-indicator]]:bg-amber-500",
  over: "[&_[data-slot=progress-indicator]]:bg-destructive",
};

function Bar({
  label,
  percent,
  used,
  total,
}: {
  label: string;
  percent: number;
  used: string;
  total: string;
}) {
  const t = useTranslations("logistics.capacity");
  const format = useFormat();
  const tone = capacityTone(percent);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            "tabular-nums",
            tone === "over" ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {t("of", { used, total })}
        </span>
      </div>
      <Progress
        value={Math.min(100, percent)}
        aria-label={t("barLabel", { label, percent: format.number(percent) })}
        className={cn("h-2.5", INDICATOR[tone])}
      />
    </div>
  );
}

/**
 * How full a vehicle is by weight and by space. Light material (PET bottles,
 * film) fills the space long before the payload, so both bars matter.
 */
export function CapacityBars({
  grams,
  litres,
  payloadKg,
  volumeLitres,
  weightPercent,
  volumePercent,
}: {
  grams: number;
  litres: number;
  payloadKg: number;
  volumeLitres: number;
  weightPercent: number;
  volumePercent: number;
}) {
  const t = useTranslations("logistics.capacity");
  const format = useFormat();
  const isOver = weightPercent > 100 || volumePercent > 100;
  return (
    <div className="flex flex-col gap-3">
      <Bar
        label={t("weight")}
        percent={weightPercent}
        used={format.weight(grams)}
        total={format.weight(payloadKg * 1000)}
      />
      <Bar
        label={t("volume")}
        percent={volumePercent}
        used={t("litres", { litres: format.number(litres) })}
        total={t("litres", { litres: format.number(volumeLitres) })}
      />
      {isOver ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t("over")}
        </p>
      ) : null}
    </div>
  );
}
