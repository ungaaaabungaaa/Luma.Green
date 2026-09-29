"use client";

import { useFormatter, useLocale } from "next-intl";

/**
 * Money and weight the same way on every screen. The database keeps paise
 * and grams (integers); people read rupees and kilograms.
 */
export function useFormat() {
  const format = useFormatter();
  const locale = useLocale();
  return {
    /** ₹1,234 — whole rupees unless there are paise to show. */
    money(paise: number) {
      return format.number(paise / 100, {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
      });
    },
    /** ₹14/kg style, for prices. */
    perKg(paise: number) {
      return format.number(paise / 100, {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
      });
    },
    /** 12.5 kg, 1,250 kg or 12.4 t. */
    weight(grams: number) {
      const kg = grams / 1000;
      if (kg >= 10_000) {
        return `${format.number(kg / 1000, { maximumFractionDigits: 1 })} t`;
      }
      return `${format.number(kg, { maximumFractionDigits: kg < 100 ? 1 : 0 })} kg`;
    },
    number(value: number, digits = 0) {
      return format.number(value, { maximumFractionDigits: digits });
    },
    date(value: string | number) {
      const date = new Date(
        typeof value === "string" ? `${value}T00:00:00+05:30` : value,
      );
      return format.dateTime(date, { day: "numeric", month: "short" });
    },
    dateTime(value: number) {
      return format.dateTime(new Date(value), {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      });
    },
    /** A material's name in the reader's language, English as the fallback. */
    material(names: Record<string, string>, code?: string) {
      const byLocale: Record<string, string | undefined> = names;
      return byLocale[locale] ?? byLocale.en ?? code ?? "";
    },
  };
}
