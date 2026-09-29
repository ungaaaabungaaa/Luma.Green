import type {
  RuleGroup,
  RuleUnit,
  RuleValue,
} from "../../../../convex/lib/rules";
import { formatRupees } from "../format";

/**
 * How the console shows and reads rule values. The database keeps paise,
 * basis points and whole units; the admin types rupees, percentages and
 * plain numbers. English only: the console isn't translated.
 */

export const GROUP_LABELS: Record<RuleGroup, { title: string; lead: string }> =
  {
    gst: {
      title: "GST",
      lead: "Registration, e-way bills, metal-scrap TDS and e-commerce TCS.",
    },
    incomeTax: {
      title: "Income tax",
      lead: "TCS on scrap, e-commerce TDS and the cash limit.",
    },
    weighing: {
      title: "Weighing",
      lead: "Legal Metrology stamps on every scale used in trade.",
    },
    consent: {
      title: "Pollution-board consent",
      lead: "How long a consent runs and when to start renewing.",
    },
    service: {
      title: "Service levels",
      lead: "What we promise applicants, complainants and people asking for their data.",
    },
    payments: {
      title: "Payments",
      lead: "MSME deadlines, escrow and the UPI limit.",
    },
    prices: {
      title: "Prices and points",
      lead: "How floors are suggested and how points are earned.",
    },
    gig: {
      title: "Gig work",
      lead: "Karnataka's welfare fee if Luma.Green pays Saathis itself.",
    },
    platform: {
      title: "Platform duties",
      lead: "Dates the platform itself owes under the E-Commerce Rules.",
    },
  };

export const GROUP_ORDER = Object.keys(GROUP_LABELS) as RuleGroup[];

export const UNIT_LABELS: Record<RuleUnit, string> = {
  paise: "Rupees",
  bp: "Percent",
  months: "Months",
  days: "Days",
  hours: "Hours",
  years: "Years",
  count: "Number",
  text: "Text",
  flag: "On or off",
};

const percent = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat("en-IN");

function plural(value: number, unit: string): string {
  return `${plain.format(value)} ${value === 1 ? unit.replace(/s$/, "") : unit}`;
}

/** `₹50,000`, `2%`, `12 months`, `On`. */
export function formatRuleValue(value: RuleValue, unit: RuleUnit): string {
  switch (unit) {
    case "paise": {
      return typeof value === "number" ? formatRupees(value) : String(value);
    }
    case "bp": {
      return typeof value === "number"
        ? `${percent.format(value / 100)}%`
        : String(value);
    }
    case "months":
    case "days":
    case "hours":
    case "years": {
      return typeof value === "number" ? plural(value, unit) : String(value);
    }
    case "count": {
      return typeof value === "number" ? plain.format(value) : String(value);
    }
    case "flag": {
      return value === true ? "On" : "Off";
    }
    case "text": {
      return String(value);
    }
  }
}

/** What the admin sees in the input for a stored value: rupees for paise, percent for bp. */
export function ruleInputValue(value: RuleValue, unit: RuleUnit): string {
  if (typeof value !== "number") return String(value);
  if (unit === "paise") {
    return value % 100 === 0
      ? String(value / 100)
      : (value / 100).toFixed(2);
  }
  if (unit === "bp") return String(value / 100);
  return String(value);
}

export type RuleInputProblem = "EMPTY" | "NOT_A_NUMBER" | "NEGATIVE" | "OVER_100";

export const INPUT_PROBLEM_MESSAGES: Record<RuleInputProblem, string> = {
  EMPTY: "Type a value.",
  NOT_A_NUMBER: "Use digits only, like 50000 or 2.5.",
  NEGATIVE: "The value can't be negative.",
  OVER_100: "A rate can't be more than 100%.",
};

/**
 * The stored value for what the admin typed, or what's wrong with it.
 * Rupees become paise and percentages basis points, both exact integers;
 * whole-unit rules take whole numbers only.
 */
export function parseRuleInput(
  text: string,
  unit: RuleUnit,
): { ok: true; value: RuleValue } | { ok: false; problem: RuleInputProblem } {
  if (unit === "flag") {
    return { ok: true, value: text === "true" };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, problem: "EMPTY" };
  if (unit === "text") return { ok: true, value: trimmed };

  const cleaned = trimmed.replaceAll(/[,\s₹%]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { ok: false, problem: "NOT_A_NUMBER" };
  }
  const number = Number(cleaned);
  if (number < 0) return { ok: false, problem: "NEGATIVE" };

  if (unit === "paise" || unit === "bp") {
    const scaled = Math.round(number * 100);
    if (unit === "bp" && scaled > 10_000) {
      return { ok: false, problem: "OVER_100" };
    }
    return { ok: true, value: scaled };
  }
  if (!Number.isInteger(number)) return { ok: false, problem: "NOT_A_NUMBER" };
  return { ok: true, value: number };
}

/** The character shown beside the input: ₹ before rupees, % after a rate. */
export function inputAdornment(
  unit: RuleUnit,
): { prefix?: string; suffix?: string } {
  switch (unit) {
    case "paise": {
      return { prefix: "₹" };
    }
    case "bp": {
      return { suffix: "%" };
    }
    case "months":
    case "days":
    case "hours":
    case "years": {
      return { suffix: unit };
    }
    case "count":
    case "text":
    case "flag": {
      return {};
    }
  }
}

/** A source the browser can open, as against a path into this repo's docs. */
export function isWebSource(url: string): boolean {
  return /^https?:\/\//.test(url);
}

/** `gstcouncil.gov.in` for a link, the path itself for a docs file. */
export function sourceLabel(url: string): string {
  if (!isWebSource(url)) return url;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Codes `rulebook.saveRule` can refuse with, in the admin's words. */
export const SAVE_ERRORS: Readonly<Record<string, string>> = {
  UNKNOWN_RULE: "This rule isn't in the rulebook any more.",
  INVALID_VALUE: "That value doesn't fit this rule's unit.",
  INVALID_DATE: "Pick a real date.",
  NOTE_TOO_LONG: "Keep the note under 600 characters.",
  INVALID_SOURCE: "The source must be a web link or a docs/ path.",
};
