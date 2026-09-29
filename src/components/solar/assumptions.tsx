"use client";

import { CalculatorIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";

import { fromSquareMetres, SOLAR } from "./calc";

/**
 * Every assumption behind the estimate, in words — the numbers come from
 * the same constants the maths uses, so the two can't drift apart.
 */
export function Assumptions() {
  const t = useTranslations("solar.assumptions");
  const format = useFormat();
  const rupees = (value: number) => format.money(value * 100);

  const items = [
    t("production", { units: format.number(SOLAR.unitsPerKwMonth) }),
    t("roof", {
      m2: format.number(SOLAR.roofM2PerKw),
      sqft: format.number(fromSquareMetres(SOLAR.roofM2PerKw, "sqft")),
    }),
    t("cost", {
      low: rupees(SOLAR.costPerKw.low),
      high: rupees(SOLAR.costPerKw.high),
    }),
    t("tariff", {
      home: rupees(SOLAR.tariff.home),
      business: rupees(SOLAR.tariff.business),
    }),
    t("subsidy", {
      first: rupees(SOLAR.subsidy.perKwFirstTwo),
      third: rupees(SOLAR.subsidy.perKwThird),
      cap: rupees(SOLAR.subsidy.cap),
    }),
    t("savings"),
  ];

  return (
    <section
      aria-labelledby="solar-assumptions"
      className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-5"
    >
      <h3
        id="solar-assumptions"
        className="flex items-center gap-2 font-semibold"
      >
        <CalculatorIcon aria-hidden className="size-5 text-primary" />
        {t("title")}
      </h3>
      <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
