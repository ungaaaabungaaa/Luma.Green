import { z } from "zod";

import { asciiDigits } from "@/lib/number-input";

const siteFields = {
  siteReference: z.string(),
  latitude: z.string(),
  longitude: z.string(),
};
const stopSchema = z.object({
  ...siteFields,
  materialId: z.string(),
  grams: z.string(),
});
export const logisticsFormSchema = z.object({
  title: z.string(),
  reference: z.string(),
  vehicleReference: z.string(),
  capacityGrams: z.string(),
  origin: z.object(siteFields),
  stops: z.array(stopSchema).min(1).max(20),
  ordering: z.enum(["entered", "geometric"]),
  reason: z.string(),
});
export type LogisticsFormValues = z.infer<typeof logisticsFormSchema>;
export function coordinateInput(text: string, locale: string): number {
  const decimal =
    new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value ?? ".";
  const normalized = asciiDigits(text.trim())
    .replaceAll(decimal, ".")
    .replaceAll("٫", ".")
    .replaceAll("−", "-");
  return /^[+-]?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}
export function gramsInput(text: string): number {
  const normalized = asciiDigits(text.trim());
  return /^\d+$/.test(normalized) && Number.isSafeInteger(Number(normalized))
    ? Number(normalized)
    : NaN;
}
export const blankSite = { siteReference: "", latitude: "", longitude: "" };
export const blankStop = { ...blankSite, materialId: "", grams: "" };
