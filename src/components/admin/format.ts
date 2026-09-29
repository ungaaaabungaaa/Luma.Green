import { formatIndianMobile, isIndianMobile } from "../../../convex/lib/phone";

/**
 * Numbers and times in the admin console: English with Indian conventions,
 * and always India time, whatever zone the laptop is in. The console isn't
 * translated, so it formats with `Intl` directly instead of next-intl.
 */

const TIME_ZONE = "Asia/Kolkata";

const whenFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const rupeesAndPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** `29 Sept, 2:05 pm` */
export function formatWhen(ms: number): string {
  return whenFormat.format(ms);
}

/** `2028-03-31` → `31 Mar 2028` */
export function formatDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? isoDate : dayFormat.format(date);
}

/** `₹14`, or `₹14.50` when there are paise. */
export function formatRupees(paise: number): string {
  return (paise % 100 === 0 ? wholeRupees : rupeesAndPaise).format(paise / 100);
}

/** `340 KB`, `2.4 MB` */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  return bytes < 1024 * 1024
    ? `${decimal.format(bytes / 1024)} KB`
    : `${decimal.format(bytes / (1024 * 1024))} MB`;
}

/** `under 1 h`, `19 h`, `2 d 5 h` */
export function formatWaiting(hours: number): string {
  if (hours < 48) return hours < 1 ? "under 1 h" : `${String(hours)} h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0
    ? `${String(days)} d`
    : `${String(days)} d ${String(rest)} h`;
}

/** `+91 98765 43210`, or the number as stored if it isn't a mobile. */
export function formatPhone(e164: string | undefined): string {
  if (!e164) return "—";
  return isIndianMobile(e164) ? formatIndianMobile(e164) : e164;
}
