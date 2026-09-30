import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { OrgKind } from "./chain";
import { shiftDate } from "./dates";

/**
 * The rulebook — docs/plan.md, "Law and compliance built in". Every legal
 * threshold, rate and deadline the platform uses is data the admin can edit,
 * with an effective-from date, so a notification changes a row and never the
 * code. The values below are the defaults the demo seed writes as rows; the
 * `rules` table keeps every change, and the latest row whose date has
 * arrived wins.
 *
 * Money is integer paise, rates are integer basis points (100 bp = 1%), and
 * durations are whole months, days or hours. This is research, not legal
 * advice: a lawyer and a CA review the numbers before real money moves.
 */

export type RuleValue = number | string | boolean;

export const RULE_UNITS = [
  "paise",
  "bp",
  "months",
  "days",
  "hours",
  "years",
  "count",
  "text",
  "flag",
] as const;
export type RuleUnit = (typeof RULE_UNITS)[number];

export const RULE_GROUPS = [
  "gst",
  "incomeTax",
  "weighing",
  "consent",
  "service",
  "payments",
  "prices",
  "gig",
  "platform",
] as const;
export type RuleGroup = (typeof RULE_GROUPS)[number];

export interface RuleDefault {
  key: string;
  group: RuleGroup;
  /** The console's name for the rule. */
  label: string;
  value: RuleValue;
  unit: RuleUnit;
  /** YYYY-MM-DD the default has applied from. */
  effectiveFrom: string;
  /** "Why this rule": what it does here and where it comes from. */
  note: string;
  /** The notification, rule or document behind the number. */
  sourceUrl: string;
}

const LAKH = 100_000;
const CRORE = 100 * LAKH;
const RUPEE = 100; // paise

const GST_TDS_SOURCE =
  "https://gstcouncil.gov.in/sites/default/files/2024-10/ct-25-2024.pdf";
const RULE_138 =
  "https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter16/rule138_v1.00.html";
const INCOME_TAX_2025 =
  "https://prsindia.org/files/bills_acts/bills_parliament/2025/Bill_as_passed_by_LS_Income_Tax_(No.2)_Bill.pdf";
const LEGAL_METROLOGY = "https://indiankanoon.org/doc/67045693/";
const ECOMMERCE_RULES =
  "https://consumeraffairs.gov.in/public/upload/admin/cmsfiles/whatsnews/E_Commerce_Amendment_Rules_2026_2026-09-11_18-12-39.pdf";
const GIG_FEE =
  "https://www.scconline.com/blog/post/2026/02/18/karnataka-government-notifies-gig-workers-welfare-fee-mandatory/";
const PRICING_DOC = "docs/product/pricing.md";
const ONBOARDING_DOC = "docs/product/onboarding.md";

export const RULE_DEFAULTS = [
  // --- GST ------------------------------------------------------------------
  {
    key: "ewayBill.limitPaise",
    group: "gst",
    label: "E-way bill limit",
    value: 50_000 * RUPEE,
    unit: "paise",
    effectiveFrom: "2018-04-01",
    note: "A motor-vehicle load worth more than this needs an e-way bill before it moves, including a registered buyer's inward load from an unregistered seller. Handcarts and cycles are exempt (Rule 138(14)(b)). Trades above the limit are flagged on the trade and its receipt.",
    sourceUrl: RULE_138,
  },
  {
    key: "gst.tds.metalScrap.rateBp",
    group: "gst",
    label: "GST TDS on metal scrap",
    value: 200,
    unit: "bp",
    effectiveFrom: "2024-10-10",
    note: "When both sides are GST-registered, the buyer deducts 1% CGST + 1% SGST on metal scrap (chapters 72–81) and files GSTR-7 by the 10th. Notification 25/2024-CT with CGST s.51.",
    sourceUrl: GST_TDS_SOURCE,
  },
  {
    key: "gst.tds.metalScrap.thresholdPaise",
    group: "gst",
    label: "GST TDS threshold",
    value: 2.5 * LAKH * RUPEE,
    unit: "paise",
    effectiveFrom: "2024-10-10",
    note: "GST TDS on metal scrap applies once the contract value passes this amount. No deduction where the supplier and the place of supply are in another state.",
    sourceUrl: GST_TDS_SOURCE,
  },
  {
    key: "gst.selfInvoice.days",
    group: "gst",
    label: "Reverse-charge self-invoice deadline",
    value: 30,
    unit: "days",
    effectiveFrom: "2024-11-01",
    note: "A registered yard buying metal scrap from an unregistered kabadiwala pays the GST itself and must issue the self-invoice within this many days of receiving the goods (Rule 47A, Notification 20/2024-CT).",
    sourceUrl:
      "https://gstcouncil.gov.in/sites/default/files/2024-10/ct-20-2024.pdf",
  },
  {
    key: "gst.einvoice.turnoverPaise",
    group: "gst",
    label: "E-invoicing turnover",
    value: 5 * CRORE * RUPEE,
    unit: "paise",
    effectiveFrom: "2023-08-01",
    note: "Businesses whose aggregate turnover passed this in any year since 2017-18 must issue an IRN for every invoice (Notification 10/2023-CT). Large yards, recyclers and manufacturers.",
    sourceUrl:
      "https://www.gstcouncil.gov.in/sites/default/files/2024-05/10ct_eng.pdf",
  },
  {
    key: "gst.registration.turnoverPaise",
    group: "gst",
    label: "GST registration turnover",
    value: 40 * LAKH * RUPEE,
    unit: "paise",
    effectiveFrom: "2019-04-01",
    note: "Suppliers of goods only must register once all-India turnover passes this. Karnataka is not one of the ₹20 lakh states. Most kabadiwalas stay under it; households are outside GST altogether (CGST s.7).",
    sourceUrl:
      "https://gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/Registration_under_GST_Law_new.pdf",
  },
  {
    key: "gst.ecommerceTcs.rateBp",
    group: "gst",
    label: "E-commerce TCS (GST)",
    value: 50,
    unit: "bp",
    effectiveFrom: "2024-07-10",
    note: "0.25% CGST + 0.25% SGST that an e-commerce operator collects on supplies it takes the money for (CGST s.52; Notification 15/2024-CT). Applies only once Luma.Green collects trade money — see the escrow switch.",
    sourceUrl:
      "https://gstcouncil.gov.in/sites/default/files/2024-09/central-tax-15-2024-11072024.pdf",
  },
  // --- Income tax ---------------------------------------------------------
  {
    key: "incomeTax.scrapTcs.rateBp",
    group: "incomeTax",
    label: "Income-tax TCS on scrap",
    value: 200,
    unit: "bp",
    effectiveFrom: "2026-04-01",
    note: "The seller collects this on a sale of scrap (s.394(1) of the Income-tax Act 2025; raised from 1% by Budget 2026-27). A buyer who declares in writing that the goods are for manufacturing or processing, not trading, is not charged (s.394(2)). Sellers under ₹1 crore turnover are outside it.",
    sourceUrl: "https://www.indiabudget.gov.in/doc/memo.pdf",
  },
  {
    key: "incomeTax.ecommerceTds.rateBp",
    group: "incomeTax",
    label: "E-commerce operator TDS",
    value: 10,
    unit: "bp",
    effectiveFrom: "2024-10-01",
    note: "0.1% an e-commerce operator deducts on the gross sales it facilitates, even when the buyer pays the seller directly (s.393(1), row 8(v)). Whether this applies to Luma.Green needs a tax adviser's answer before business trades go live.",
    sourceUrl: INCOME_TAX_2025,
  },
  {
    key: "incomeTax.cashLimitPaise",
    group: "incomeTax",
    label: "Cash payment limit per person per day",
    value: 10_000 * RUPEE,
    unit: "paise",
    effectiveFrom: "2026-04-01",
    note: "A business expense paid in cash above this to one person in one day is not tax-deductible (s.36(4)). Yards paying kabadiwalas are warned before a cash payment over the limit.",
    sourceUrl: INCOME_TAX_2025,
  },
  // --- Weighing ----------------------------------------------------------------
  {
    key: "scale.electronic.months",
    group: "weighing",
    label: "Electronic scale re-verification",
    value: 12,
    unit: "months",
    effectiveFrom: "2011-04-01",
    note: "Every scale used in trade is verified and stamped by the state's Legal Metrology officer. Electronic platform scales and weighbridges are re-verified every 12 months (Legal Metrology (General) Rules 2011, r.27).",
    sourceUrl: LEGAL_METROLOGY,
  },
  {
    key: "scale.beam.months",
    group: "weighing",
    label: "Beam scale re-verification",
    value: 24,
    unit: "months",
    effectiveFrom: "2011-04-01",
    note: "Weights and beam scales are re-verified every 24 months (r.27). An unverified scale drew a ₹2,000–₹10,000 fine on a first offence; since 1 May 2026 improvement notices come first.",
    sourceUrl: LEGAL_METROLOGY,
  },
  {
    key: "scale.reminder.days",
    group: "weighing",
    label: "Scale stamp reminder",
    value: 30,
    unit: "days",
    effectiveFrom: "2026-10-13",
    note: "How far ahead of a stamp's expiry the business is reminded. The calendar shows 'scale verified until' on the shop card.",
    sourceUrl: "docs/plan.md",
  },
  // --- Pollution-board consent --------------------------------------------------
  {
    key: "consent.board",
    group: "consent",
    label: "Pollution board",
    value: "KSPCB",
    unit: "text",
    effectiveFrom: "2026-10-13",
    note: "The state board whose consent yards, recyclers and factories hold in the pilot city. Karnataka's board publishes every consent on the XGN register, where the admin checks each claim.",
    sourceUrl: "https://xgn.karnataka.gov.in/CSHARP/ALLConsentOrder.aspx",
  },
  {
    key: "consent.validity.redOrange.years",
    group: "consent",
    label: "Consent validity (Red, Orange)",
    value: 5,
    unit: "years",
    effectiveFrom: "2016-06-15",
    note: "KSPCB consents run 5 years for Red and Orange units: waste-plastic reprocessing, metal recovery from scrap, and e-waste or battery recycling (notification 1425 of 15 Jun 2016).",
    sourceUrl:
      "https://kspcb.karnataka.gov.in/consent-management/categorisation-rog",
  },
  {
    key: "consent.validity.green.years",
    group: "consent",
    label: "Consent validity (Green)",
    value: 10,
    unit: "years",
    effectiveFrom: "2016-06-15",
    note: "Green-category units get 10-year consents. Hydraulic baling of waste paper is White: not in the consent mechanism at all.",
    sourceUrl:
      "https://kspcb.karnataka.gov.in/consent-management/categorisation-rog",
  },
  {
    key: "consent.reminder.days",
    group: "consent",
    label: "Consent renewal reminder",
    value: 90,
    unit: "days",
    effectiveFrom: "2026-10-13",
    note: "How far ahead of a consent's expiry the business is reminded and the deadline lands on the calendar. Renewals take weeks, so the compliance screen turns amber at this point.",
    sourceUrl: "docs/plan.md",
  },
  // --- Service levels -------------------------------------------------------------
  {
    key: "verification.dueSoon.hours",
    group: "service",
    label: "Verification due soon",
    value: 18,
    unit: "hours",
    effectiveFrom: "2026-10-13",
    note: "An application waiting longer than this shows as due soon in the queue. The promise to applicants is a decision within 24 hours.",
    sourceUrl: ONBOARDING_DOC,
  },
  {
    key: "verification.overdue.hours",
    group: "service",
    label: "Verification overdue",
    value: 24,
    unit: "hours",
    effectiveFrom: "2026-10-13",
    note: "An application waiting longer than this is overdue and counted on the console home.",
    sourceUrl: ONBOARDING_DOC,
  },
  {
    key: "grievance.acknowledge.hours",
    group: "service",
    label: "Grievance acknowledgement",
    value: 48,
    unit: "hours",
    effectiveFrom: "2020-07-23",
    note: "The E-Commerce Rules require the grievance officer to acknowledge a complaint within 48 hours and give the complainant a copy as recorded. The IT Rules 2021 ask for 24 hours on content complaints, so the support desk times both.",
    sourceUrl: ECOMMERCE_RULES,
  },
  {
    key: "grievance.resolve.days",
    group: "service",
    label: "Grievance resolution",
    value: 30,
    unit: "days",
    effectiveFrom: "2020-07-23",
    note: "A complaint must be resolved within one month. From 1 Jan 2027 the amended rules add the National Consumer Helpline convergence programme and a yearly dark-pattern self-audit.",
    sourceUrl: ECOMMERCE_RULES,
  },
  {
    key: "data.request.days",
    group: "service",
    label: "Data rights request",
    value: 30,
    unit: "days",
    effectiveFrom: "2026-10-13",
    note: "Our target for answering a person's request to see or delete their data. The DPDP Rules 2025 allow 90 days once the core duties start (about 13 May 2027); we work to 30.",
    sourceUrl: "https://www.dpdpa.com/DPDP_Rules_2025_English_only.pdf",
  },
  // --- Payments -------------------------------------------------------------------------
  {
    key: "msme.payment.days",
    group: "payments",
    label: "MSME payment deadline",
    value: 45,
    unit: "days",
    effectiveFrom: "2006-10-02",
    note: "A buyer must pay a Udyam-registered micro or small supplier within 45 days of accepting the goods (MSMED Act s.16). After that it owes compound interest at three times the RBI bank rate. Many recyclers and yards are small enterprises.",
    sourceUrl: "https://samadhaan.msme.gov.in/MyMsme/MSEFC/MSEFC_Welcome.aspx",
  },
  {
    key: "escrow.live",
    group: "payments",
    label: "Escrow collects trade money",
    value: false,
    unit: "flag",
    effectiveFrom: "2026-10-13",
    note: "Off during the pilot (ADR 0009): buyers pay sellers directly and Luma.Green only records it, which keeps the platform outside GST TCS, GSTR-8 and RBI payment-aggregator licensing. Turning this on adds GSTR-8 to the calendar and the TCS lines to trades.",
    sourceUrl:
      "https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12896",
  },
  {
    key: "escrow.releaseToleranceBp",
    group: "payments",
    label: "Escrow release tolerance",
    value: 100,
    unit: "bp",
    effectiveFrom: "2026-10-13",
    note: "Escrow releases automatically when the weight the buyer confirms is within this share of the weight dispatched. A larger gap opens a dispute.",
    sourceUrl: "docs/plan.md",
  },
  {
    key: "escrow.releaseHours",
    group: "payments",
    label: "Escrow auto-release",
    value: 48,
    unit: "hours",
    effectiveFrom: "2026-10-13",
    note: "If the buyer confirms nothing for this long after delivery, escrow releases to the seller (the aggregator's on_hold_until).",
    sourceUrl: "docs/plan.md",
  },
  {
    key: "upi.smallMerchant.monthlyLimitPaise",
    group: "payments",
    label: "UPI small-merchant monthly limit",
    value: LAKH * RUPEE,
    unit: "paise",
    effectiveFrom: "2025-04-09",
    note: "What a small merchant without full KYC can receive by UPI in a month; a single person-to-person payment is also capped at ₹1 lakh. Household pickups fit easily; yard and recycler loads need NEFT, IMPS or RTGS.",
    sourceUrl:
      "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=60178",
  },
  // --- Prices ---------------------------------------------------------------------------
  {
    key: "points.paisePerPoint",
    group: "prices",
    label: "Rupees per point",
    value: 10 * RUPEE,
    unit: "paise",
    effectiveFrom: "2026-10-13",
    note: "Households earn one point for every ₹10 of scrap sold, as a thank-you. Points are not money and never expire during the pilot.",
    sourceUrl: PRICING_DOC,
  },
  {
    key: "floor.shareOfReferenceBp",
    group: "prices",
    label: "Floor as a share of the reference",
    value: 7500,
    unit: "bp",
    effectiveFrom: "2026-10-13",
    note: "The console suggests each material's minimum household price as 75% of the reference (the 28-day median). Floors protect households; shops price freely above them.",
    sourceUrl: PRICING_DOC,
  },
  {
    key: "floor.maxWeeklyChangeBp",
    group: "prices",
    label: "Largest weekly floor change",
    value: 1000,
    unit: "bp",
    effectiveFrom: "2026-10-13",
    note: "A floor moves at most 10% a week without the admin confirming, so a bad day on the market can't strand shops under water.",
    sourceUrl: PRICING_DOC,
  },
  // --- Gig work -------------------------------------------------------------------------
  {
    key: "gig.welfareFee.rateBp",
    group: "gig",
    label: "Karnataka gig welfare fee",
    value: 100,
    unit: "bp",
    effectiveFrom: "2026-02-18",
    note: "Karnataka's 2025 Act makes aggregators pay 1% of each payout to a gig worker into the welfare fund, capped per job by vehicle type, declared quarterly. Applies if Luma.Green pays Saathis itself.",
    sourceUrl: GIG_FEE,
  },
  {
    key: "gig.welfareFee.capTwoWheelerPaise",
    group: "gig",
    label: "Welfare fee cap: two-wheeler job",
    value: 50,
    unit: "paise",
    effectiveFrom: "2026-02-18",
    note: "The most the fee can be for one e-marketplace job done on a two-wheeler.",
    sourceUrl: GIG_FEE,
  },
  {
    key: "gig.welfareFee.capThreeWheelerPaise",
    group: "gig",
    label: "Welfare fee cap: three-wheeler job",
    value: 75,
    unit: "paise",
    effectiveFrom: "2026-02-18",
    note: "The most the fee can be for one job done by auto.",
    sourceUrl: GIG_FEE,
  },
  {
    key: "gig.welfareFee.capLcvPaise",
    group: "gig",
    label: "Welfare fee cap: light commercial vehicle job",
    value: 100,
    unit: "paise",
    effectiveFrom: "2026-02-18",
    note: "The most the fee can be for one job done with a mini-truck.",
    sourceUrl: GIG_FEE,
  },
  {
    key: "gig.platformPays",
    group: "gig",
    label: "Luma.Green pays Saathis itself",
    value: false,
    unit: "flag",
    effectiveFrom: "2026-10-13",
    note: "Off during the pilot: the shop or yard that books a Saathi pays them, so Luma.Green is not an aggregator under Karnataka's Act. Turning this on puts the quarterly welfare-fee declaration on the calendar and the 45-day board registration on the to-do list.",
    sourceUrl: GIG_FEE,
  },
  // --- Platform ---------------------------------------------------------------------------
  {
    key: "platform.darkPatternAudit.firstDue",
    group: "platform",
    label: "First dark-pattern self-audit",
    value: "2027-01-01",
    unit: "text",
    effectiveFrom: "2026-09-09",
    note: "The amended E-Commerce Rules (G.S.R. 789(E)) require a yearly dark-pattern self-audit with the certificate displayed, from 1 Jan 2027. The calendar repeats it every year from this date.",
    sourceUrl: ECOMMERCE_RULES,
  },
] as const satisfies readonly RuleDefault[];

export type RuleKey = (typeof RULE_DEFAULTS)[number]["key"];

export const RULE_KEYS: readonly RuleKey[] = RULE_DEFAULTS.map(
  (rule) => rule.key,
);

export function isRuleKey(key: string): key is RuleKey {
  return (RULE_KEYS as readonly string[]).includes(key);
}

export function ruleDefault(key: RuleKey): RuleDefault {
  const found = RULE_DEFAULTS.find((rule) => rule.key === key);
  if (!found) throw new Error(`No default for rule ${key}`);
  return found;
}

// --- Values ------------------------------------------------------------------

export type RuleType = "number" | "text" | "flag";

/** What kind of value a unit takes. */
export function ruleType(unit: RuleUnit): RuleType {
  if (unit === "text") return "text";
  return unit === "flag" ? "flag" : "number";
}

export type RuleProblem =
  "INVALID_VALUE" | "INVALID_DATE" | "NOTE_TOO_LONG" | "INVALID_SOURCE";

export const NOTE_MAX_CHARS = 600;
export const TEXT_MAX_CHARS = 80;
export const SOURCE_MAX_CHARS = 400;
/** 100% — a rate can't be more than the whole. */
const MAX_BP = 10_000;

/** Whether `value` is a well-formed value for a rule with `unit`. */
export function isValidRuleValue(value: RuleValue, unit: RuleUnit): boolean {
  switch (ruleType(unit)) {
    case "flag": {
      return typeof value === "boolean";
    }
    case "text": {
      return (
        typeof value === "string" &&
        value.trim().length > 0 &&
        value.length <= TEXT_MAX_CHARS
      );
    }
    case "number": {
      return (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0 &&
        (unit !== "bp" || value <= MAX_BP)
      );
    }
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real YYYY-MM-DD calendar date. */
export function isIsoDate(date: string): boolean {
  const match = ISO_DATE.exec(date);
  if (!match) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

/** A web link, or a path into this repo's docs. */
export function isValidSource(url: string): boolean {
  return (
    url.length > 0 &&
    url.length <= SOURCE_MAX_CHARS &&
    (/^https?:\/\/\S+$/.test(url) || /^docs\/[\w./-]+$/.test(url))
  );
}

/** The first thing wrong with a proposed change, or null. */
export function ruleChangeProblem(change: {
  unit: RuleUnit;
  value: RuleValue;
  effectiveFrom: string;
  note?: string;
  sourceUrl?: string;
}): RuleProblem | null {
  if (!isValidRuleValue(change.value, change.unit)) return "INVALID_VALUE";
  if (!isIsoDate(change.effectiveFrom)) return "INVALID_DATE";
  if ((change.note ?? "").length > NOTE_MAX_CHARS) return "NOTE_TOO_LONG";
  return change.sourceUrl !== undefined && !isValidSource(change.sourceUrl)
    ? "INVALID_SOURCE"
    : null;
}

// --- Which row applies -----------------------------------------------------

export interface RuleRow {
  value: RuleValue;
  effectiveFrom: string;
  updatedAt: number;
}

/**
 * The row in force on `today` (YYYY-MM-DD): the latest effective date that
 * has arrived; among rows with the same date, the one saved last. Rows
 * dated in the future wait their turn.
 */
export function activeRule<Row extends RuleRow>(
  rows: readonly Row[],
  today: string,
): Row | undefined {
  let winner: Row | undefined;
  for (const row of rows) {
    if (row.effectiveFrom > today) continue;
    if (
      !winner ||
      row.effectiveFrom > winner.effectiveFrom ||
      (row.effectiveFrom === winner.effectiveFrom &&
        row.updatedAt > winner.updatedAt)
    ) {
      winner = row;
    }
  }
  return winner;
}

/** YYYY-MM-DD in India for a moment in time. */
export function indiaDate(now: number): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const MAX_ROWS_PER_KEY = 200;

/**
 * The value of one rule on `today` (default: now, India time). Reads the
 * `rules` table and falls back to the default when nothing has been saved
 * yet, so every area can call it without caring whether the seed ran.
 */
export async function ruleValue(
  ctx: QueryCtx,
  key: RuleKey,
  today: string = indiaDate(Date.now()),
): Promise<RuleValue> {
  const rows = await ctx.db
    .query("rules")
    .withIndex("by_key", (q) => q.eq("key", key))
    .take(MAX_ROWS_PER_KEY);
  return activeRule(rows, today)?.value ?? ruleDefault(key).value;
}

/** `ruleValue` for a rule that holds a number (paise, bp, days, …). */
export async function ruleNumber(
  ctx: QueryCtx,
  key: RuleKey,
  today?: string,
): Promise<number> {
  const value = await ruleValue(ctx, key, today);
  if (typeof value !== "number") {
    throw new TypeError(`Rule ${key} is not a number`);
  }
  return value;
}

/** `ruleValue` for an on/off rule. */
export async function isRuleOn(
  ctx: QueryCtx,
  key: RuleKey,
  today?: string,
): Promise<boolean> {
  return (await ruleValue(ctx, key, today)) === true;
}

/** `ruleValue` for a text rule. */
export async function ruleText(
  ctx: QueryCtx,
  key: RuleKey,
  today?: string,
): Promise<string> {
  return String(await ruleValue(ctx, key, today));
}

// --- Calendar: kinds and states ---------------------------------------------

export const CALENDAR_KINDS = [
  "consent",
  "scale",
  "gstr7",
  "gstr8",
  "eprReturn",
  "eprQuarterly",
  "msmeDue",
  "darkPatternAudit",
  "tradeLicence",
  "custom",
] as const;
export type CalendarKind = (typeof CALENDAR_KINDS)[number];

export function isCalendarKind(kind: string): kind is CalendarKind {
  return (CALENDAR_KINDS as readonly string[]).includes(kind);
}

export type DeadlineState = "done" | "overdue" | "due_soon" | "ok";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

/** Where a deadline stands on `today`: late, close (within `soonDays`), or fine. */
export function deadlineState(
  event: { dueAt: string; done: boolean },
  today: string,
  soonDays = 30,
): DeadlineState {
  if (event.done) return "done";
  const daysLeft = daysBetween(today, event.dueAt);
  if (daysLeft < 0) return "overdue";
  return daysLeft <= soonDays ? "due_soon" : "ok";
}

// --- Calendar: generated deadlines --------------------------------------------

/** What the generator needs to know about a business. */
export interface CalendarOrg {
  id: Id<"orgs">;
  kind: OrgKind;
  name: string;
  gstin?: string;
  families: readonly string[];
  consent?: { board: string; number: string; validUntil: string };
}

/** A trade whose seller hasn't been paid in full yet. */
export interface OpenTrade {
  id: Id<"trades">;
  buyerOrgId: Id<"orgs">;
  sellerName: string;
  materialName: string;
  /** When the goods were accepted (the MSME clock starts here), ms. */
  acceptedAt: number;
}

export interface GeneratedEvent {
  /** Stable across runs, so a stored row can take over from the generated one. */
  sourceKey: string;
  kind: CalendarKind;
  title: string;
  dueAt: string;
  orgId?: Id<"orgs">;
  note?: string;
}

export interface DateRange {
  /** YYYY-MM-DD, inclusive. */
  from: string;
  /** YYYY-MM-DD, inclusive. */
  to: string;
}

/** The numbers in a well-formed YYYY-MM-DD date. */
function parts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function lastDayOf(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year)}-${pad(month)}-${pad(day)}`;
}

/** Every month in the range, as [year, month]. */
function monthsIn(range: DateRange): [number, number][] {
  const start = parts(range.from);
  const end = parts(range.to);
  const first = start.year * 12 + (start.month - 1);
  const last = end.year * 12 + (end.month - 1);
  const months: [number, number][] = [];
  for (let index = first; index <= last; index += 1) {
    months.push([Math.floor(index / 12), (index % 12) + 1]);
  }
  return months;
}

function isInRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

/** The `day`th of every month in the range (clamped to short months). */
export function monthlyOn(day: number, range: DateRange): string[] {
  return monthsIn(range)
    .map(([year, month]) =>
      isoDate(year, month, Math.min(day, lastDayOf(year, month))),
    )
    .filter((date) => isInRange(date, range));
}

/** `month`/`day` of every year in the range. */
export function yearlyOn(
  month: number,
  day: number,
  range: DateRange,
): string[] {
  const start = parts(range.from).year;
  const end = parts(range.to).year;
  const dates: string[] = [];
  for (let year = start; year <= end; year += 1) {
    const date = isoDate(year, month, Math.min(day, lastDayOf(year, month)));
    if (isInRange(date, range)) dates.push(date);
  }
  return dates;
}

/**
 * Quarterly EPR returns are due by the end of the month after each quarter:
 * 31 Jan, 30 Apr, 31 Jul and 31 Oct.
 */
export function quarterlyReturnDates(range: DateRange): string[] {
  return [1, 4, 7, 10]
    .flatMap((month) => yearlyOn(month, 31, range))
    .toSorted((a, b) => a.localeCompare(b));
}

/** Yearly on `anchor`'s month and day, from `anchor`'s year on. */
export function yearlyFrom(anchor: string, range: DateRange): string[] {
  const { month, day } = parts(anchor);
  return yearlyOn(month, day, range).filter((date) => date >= anchor);
}

/**
 * Which kinds of business owe which filing. Keyed by name rather than by
 * `OrgKind` so the refined chain's kinds (ADR 0014: pre-processors,
 * compounders, brands, dry-waste centres, authorised handlers) start
 * getting their filings the day they exist, with no change here.
 */
export const FILING_KINDS = {
  /** Registered buyers of metal scrap deduct GST TDS and file GSTR-7. */
  gstr7: new Set<string>(["yard", "preprocessor", "recycler"]),
  /** Registered plastic waste processors file the EPR annual return by 30 April. */
  eprPlasticProcessor: new Set<string>(["recycler", "preprocessor"]),
  /** Producers, importers and brand owners file by 30 June. */
  eprBrand: new Set<string>(["manufacturer", "brand"]),
  /** E-waste, battery, tyre and used-oil recyclers file every quarter. */
  eprQuarterly: new Set<string>(["recycler", "preprocessor", "handler"]),
} as const;

/** Businesses that deduct GST TDS on metal scrap and file GSTR-7. */
function isGstr7Filer(org: CalendarOrg): boolean {
  return (
    Boolean(org.gstin) &&
    FILING_KINDS.gstr7.has(org.kind) &&
    org.families.includes("metal")
  );
}

/** The values the generator reads from the rulebook. */
export interface CalendarRules {
  escrowLive: boolean;
  msmeDays: number;
  board: string;
  darkPatternFirstDue: string;
  /** Luma.Green pays Saathis itself, so it owes the gig welfare fee. */
  gigFeeLive: boolean;
}

/** A recurring filing for one business: the same text on every date. */
function filings(
  org: CalendarOrg,
  kind: CalendarKind,
  dates: readonly string[],
  text: { title: string; note: string },
): GeneratedEvent[] {
  return dates.map((dueAt) => ({
    sourceKey: `${kind}:${org.id}:${dueAt}`,
    kind,
    title: text.title,
    dueAt,
    orgId: org.id,
    note: text.note,
  }));
}

/** What one business owes in the range, from its consent, GSTIN and materials. */
function orgDeadlines(org: CalendarOrg, range: DateRange): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const { consent } = org;
  if (consent && isInRange(consent.validUntil, range)) {
    events.push({
      sourceKey: `consent:${org.id}:${consent.validUntil}`,
      kind: "consent",
      title: `${consent.board} consent expires`,
      dueAt: consent.validUntil,
      orgId: org.id,
      note: `Consent ${consent.number}. Apply for renewal well ahead: it can take weeks.`,
    });
  }
  if (isGstr7Filer(org)) {
    events.push(
      ...filings(org, "gstr7", monthlyOn(10, range), {
        title: "GSTR-7: deposit GST TDS on metal scrap",
        note: "2% deducted on metal scrap bought from GST-registered sellers over ₹2.5 lakh, deposited with the return by the 10th.",
      }),
    );
  }
  const hasPlastic = org.families.includes("plastic");
  if (hasPlastic && FILING_KINDS.eprPlasticProcessor.has(org.kind)) {
    events.push(
      ...filings(org, "eprReturn", yearlyOn(4, 30, range), {
        title: "EPR annual return (plastic processor)",
        note: "Registered plastic waste processors file their annual return on eprplastic.cpcb.gov.in by 30 April.",
      }),
    );
  }
  if (hasPlastic && FILING_KINDS.eprBrand.has(org.kind)) {
    events.push(
      ...filings(org, "eprReturn", yearlyOn(6, 30, range), {
        title: "EPR annual return (brand owner)",
        note: "Producers, importers and brand owners file by 30 June, naming the recyclers whose certificates they used.",
      }),
    );
  }
  if (
    org.families.includes("ewaste") &&
    FILING_KINDS.eprQuarterly.has(org.kind)
  ) {
    events.push(
      ...filings(org, "eprQuarterly", quarterlyReturnDates(range), {
        title: "EPR quarterly return (e-waste)",
        note: "E-waste, battery, tyre and used-oil recyclers file quarterly returns by the end of the month after the quarter.",
      }),
    );
  }
  return events;
}

/** The MSME payment deadline on every trade whose seller is still owed. */
function tradeDeadlines(
  openTrades: readonly OpenTrade[],
  range: DateRange,
  rules: CalendarRules,
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  for (const trade of openTrades) {
    const dueAt = shiftDate(indiaDate(trade.acceptedAt), rules.msmeDays);
    if (!isInRange(dueAt, range)) continue;
    events.push({
      sourceKey: `msme:${trade.id}`,
      kind: "msmeDue",
      title: `Pay ${trade.sellerName} for ${trade.materialName}`,
      dueAt,
      orgId: trade.buyerOrgId,
      note: `${String(rules.msmeDays)} days from accepting the goods, if the seller is a Udyam-registered micro or small enterprise. After that, compound interest at three times the bank rate.`,
    });
  }
  return events;
}

/**
 * The platform's own duties: GSTR-8 once escrow collects money, the gig
 * welfare fee once Luma.Green pays Saathis itself, the yearly audit.
 */
function platformDeadlines(
  range: DateRange,
  rules: CalendarRules,
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  if (rules.escrowLive) {
    for (const dueAt of monthlyOn(10, range)) {
      events.push({
        sourceKey: `gstr8:${dueAt}`,
        kind: "gstr8",
        title: "GSTR-8: e-commerce TCS return",
        dueAt,
        note: "0.5% TCS collected on trades paid through the platform, deposited with the return by the 10th of the next month.",
      });
    }
  }
  if (rules.gigFeeLive) {
    for (const dueAt of quarterlyReturnDates(range)) {
      events.push({
        sourceKey: `gigFee:${dueAt}`,
        kind: "custom",
        title: "Karnataka gig welfare fee: declare and pay the quarter",
        dueAt,
        note: "1% of every Saathi payout, capped per job by vehicle, declared quarterly to the gig-workers welfare board. The Act says quarterly; confirm the board's exact day before the first one.",
      });
    }
  }
  if (isIsoDate(rules.darkPatternFirstDue)) {
    for (const dueAt of yearlyFrom(rules.darkPatternFirstDue, range)) {
      events.push({
        sourceKey: `darkPatternAudit:${dueAt}`,
        kind: "darkPatternAudit",
        title: "Dark-pattern self-audit and certificate",
        dueAt,
        note: "Yearly self-audit against the 13 dark patterns in the 2023 Guidelines, with the certificate displayed (E-Commerce Rules as amended, from 1 Jan 2027).",
      });
    }
  }
  return events;
}

/**
 * The deadlines that follow from who a business is, computed for a range
 * rather than stored: consent expiry, monthly and yearly filings, payment
 * limits on open trades and the platform's own dates. Stored rows with the
 * same `sourceKey` (marked done, or written by the reminders cron) win.
 */
export function generatedDeadlines(input: {
  range: DateRange;
  orgs: readonly CalendarOrg[];
  openTrades: readonly OpenTrade[];
  rules: CalendarRules;
}): GeneratedEvent[] {
  const { range, orgs, openTrades, rules } = input;
  return [
    ...orgs.flatMap((org) => orgDeadlines(org, range)),
    ...tradeDeadlines(openTrades, range, rules),
    ...platformDeadlines(range, rules),
  ].toSorted((a, b) => a.dueAt.localeCompare(b.dueAt));
}
