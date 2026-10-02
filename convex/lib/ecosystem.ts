import { z } from "zod";

import { shiftDate } from "./dates";
import { indiaToday, SAATHI_TIMES, SAATHI_WORK } from "./onboarding";

export const ECOSYSTEM_PAGE = 100;
export const MAX_ADVANCE_DAYS = 90;

export function scheduleBounds() {
  const today = indiaToday();
  return { today, maxDate: shiftDate(today, MAX_ADVANCE_DAYS) };
}

const date = z.iso.date().refine((value) => {
  const { today, maxDate } = scheduleBounds();
  return value >= today && value <= maxDate;
});
const positiveInteger = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const workforceSchema = z.object({
  kind: z.enum(SAATHI_WORK),
  title: z.string().trim().min(3).max(100),
  area: z.string().trim().min(2).max(100),
  date,
  window: z.enum(SAATHI_TIMES),
  payPaise: positiveInteger.max(10_000_000),
});

export const demandSchema = z.object({
  materialCode: z.string().trim().min(1).max(80),
  quantityGrams: positiveInteger,
  area: z.string().trim().min(2).max(100),
  specification: z.string().trim().min(3).max(500),
  neededBy: date,
});
