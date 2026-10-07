import type { Family } from "../../../convex/lib/catalogue";
import type { ApplicationStatus } from "../../../convex/lib/lifecycle";
import type {
  ApplicationKind,
  FileType,
  RADII_KM,
  SAATHI_TIMES,
  SAATHI_VEHICLES,
  SAATHI_WORK,
  SHOP_VEHICLES,
  WEEKDAYS,
} from "../../../convex/lib/onboarding";

/**
 * The console's words for the platform's codes. English only: the admin
 * console isn't translated (docs/architecture/urls.md).
 */

export const KIND_LABELS: Record<ApplicationKind, string> = {
  kabadiwala: "Kabadiwala",
  yard: "Preprocessor",
  recycler: "Recycler",
  manufacturer: "Manufacturer",
  saathi: "Saathi",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "In review",
  changes_requested: "Changes asked",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  pcb_certificate: "Consent certificate",
  machine_media: "Machine photo or video",
  id_proof: "Photo ID",
  selfie: "Selfie",
};

export const FAMILY_LABELS: Record<Family, string> = {
  paper: "Paper",
  plastic: "Plastic",
  metal: "Metal",
  glass: "Glass",
  ewaste: "E-waste",
  other: "Other",
};

export const WEEKDAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const SHOP_VEHICLE_LABELS: Record<
  (typeof SHOP_VEHICLES)[number],
  string
> = {
  handcart: "Handcart",
  cycle: "Cycle",
  auto: "Auto",
  mini_truck: "Mini-truck",
};

export const SAATHI_VEHICLE_LABELS: Record<
  (typeof SAATHI_VEHICLES)[number],
  string
> = {
  none: "None",
  cycle: "Cycle",
  two_wheeler: "Bike or scooter",
  auto: "Auto",
};

export const SAATHI_WORK_LABELS: Record<(typeof SAATHI_WORK)[number], string> =
  {
    home_pickups: "Home pickups",
    shop_help: "Help at a kabadiwala shop",
    yard_sorting: "Sorting at a yard",
    factory_shifts: "Shifts at a recycler or factory",
  };

export const SAATHI_TIME_LABELS: Record<(typeof SAATHI_TIMES)[number], string> =
  {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
  };

export function radiusLabel(radius: (typeof RADII_KM)[number]): string {
  return `Within ${String(radius)} km`;
}

/** What each audit action means, for an application's history. */
export const AUDIT_LABELS: Readonly<Record<string, string>> = {
  "application.started": "Started the application",
  "application.submitted": "Sent for verification",
  "application.approved": "Approved",
  "application.changes_requested": "Asked for changes",
  "application.rejected": "Rejected",
  "application.suspended": "Suspended",
};

export const SUPPORT_TOPIC_LABELS: Readonly<Record<string, string>> = {
  account: "Account and sign-in",
  pickup: "Pickups",
  prices: "Prices",
  payments: "Payments",
  documents: "Documents",
  trade: "Trade",
  solar: "Rooftop solar",
  other: "Other",
};

export const SUPPORT_ROLE_LABELS: Readonly<Record<string, string>> = {
  household: "Household",
  kabadiwala: "Kabadiwala",
  yard: "Preprocessor",
  recycler: "Recycler",
  manufacturer: "Manufacturer",
  saathi: "Saathi",
  other: "Other",
};

/** Days of the week in calendar order, as a short list: `Mon, Wed, Fri`. */
export function weekdaysLabel(
  days: readonly (typeof WEEKDAYS)[number][] | undefined,
): string {
  const order = Object.keys(WEEKDAY_LABELS);
  const sorted = (days ?? []).toSorted(
    (a, b) => order.indexOf(a) - order.indexOf(b),
  );
  return sorted.length > 0
    ? sorted.map((day) => WEEKDAY_LABELS[day]).join(", ")
    : "None";
}
