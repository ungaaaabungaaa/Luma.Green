import { describe, expect, it } from "vitest";

import type { Id } from "../../../../convex/_generated/dataModel";
import { ruleDefault } from "../../../../convex/lib/rules";
import {
  formatRuleValue,
  inputAdornment,
  isWebSource,
  parseRuleInput,
  ruleInputValue,
  sourceLabel,
} from "./rule-format";
import { proposedChange } from "./rule-sheet";
import type { RuleItem } from "./rule-types";
import { isSearchMatch, ruleTally } from "./rulebook";

const ewayDefault = ruleDefault("ewayBill.limitPaise");
const escrowDefault = ruleDefault("escrow.live");

const ewayBill: RuleItem = {
  key: "ewayBill.limitPaise",
  group: "gst",
  label: "E-way bill limit",
  unit: "paise",
  type: "number",
  defaultNote: ewayDefault.note,
  active: {
    id: null,
    value: 5_000_000,
    effectiveFrom: "2018-04-01",
    note: ewayDefault.note,
    sourceUrl: "https://taxinformation.cbic.gov.in/rule138",
    updatedAt: 0,
    byAdmin: false,
  },
  upcoming: [],
  history: [],
};

const escrow: RuleItem = {
  ...ewayBill,
  key: "escrow.live",
  group: "payments",
  label: "Escrow collects trade money",
  unit: "flag",
  type: "flag",
  defaultNote: escrowDefault.note,
  active: {
    id: "rule1" as Id<"rules">,
    value: false,
    effectiveFrom: "2026-10-13",
    note: undefined,
    sourceUrl: "docs/plan.md",
    updatedAt: 1_700_000_000_000,
    byAdmin: true,
  },
  upcoming: [
    {
      id: "rule2" as Id<"rules">,
      value: true,
      effectiveFrom: "2027-04-01",
      note: undefined,
      sourceUrl: undefined,
      updatedAt: 1_700_000_000_001,
      byAdmin: true,
    },
  ],
};

describe("how the console shows a rule's value", () => {
  it("turns paise, basis points and whole units into words", () => {
    expect(formatRuleValue(5_000_000, "paise")).toBe("₹50,000");
    expect(formatRuleValue(200, "bp")).toBe("2%");
    expect(formatRuleValue(50, "bp")).toBe("0.5%");
    expect(formatRuleValue(7500, "bp")).toBe("75%");
    expect(formatRuleValue(12, "months")).toBe("12 months");
    expect(formatRuleValue(1, "days")).toBe("1 day");
    expect(formatRuleValue(true, "flag")).toBe("On");
    expect(formatRuleValue(false, "flag")).toBe("Off");
    expect(formatRuleValue("KSPCB", "text")).toBe("KSPCB");
  });

  it("fills the input with rupees and percentages, not paise and bp", () => {
    expect(ruleInputValue(5_000_000, "paise")).toBe("50000");
    expect(ruleInputValue(1450, "paise")).toBe("14.50");
    expect(ruleInputValue(250, "bp")).toBe("2.5");
    expect(ruleInputValue(45, "days")).toBe("45");
    expect(ruleInputValue("KSPCB", "text")).toBe("KSPCB");
  });

  it("puts ₹ before rupees and % after a rate", () => {
    expect(inputAdornment("paise")).toEqual({ prefix: "₹" });
    expect(inputAdornment("bp")).toEqual({ suffix: "%" });
    expect(inputAdornment("hours")).toEqual({ suffix: "hours" });
    expect(inputAdornment("text")).toEqual({});
  });

  it("names a source by its host, or by its path in the docs", () => {
    expect(isWebSource("https://www.gstcouncil.gov.in/x.pdf")).toBe(true);
    expect(isWebSource("docs/plan.md")).toBe(false);
    expect(sourceLabel("https://www.gstcouncil.gov.in/x.pdf")).toBe(
      "gstcouncil.gov.in",
    );
    expect(sourceLabel("docs/plan.md")).toBe("docs/plan.md");
  });
});

describe("what the admin types", () => {
  it("becomes exact paise and basis points", () => {
    expect(parseRuleInput("50,000", "paise")).toEqual({
      ok: true,
      value: 5_000_000,
    });
    expect(parseRuleInput("₹ 14.50", "paise")).toEqual({
      ok: true,
      value: 1450,
    });
    expect(parseRuleInput("2.5%", "bp")).toEqual({ ok: true, value: 250 });
    expect(parseRuleInput("100", "bp")).toEqual({ ok: true, value: 10_000 });
  });

  it("stays a whole number for days, months and hours", () => {
    expect(parseRuleInput("45", "days")).toEqual({ ok: true, value: 45 });
    expect(parseRuleInput("4.5", "days")).toEqual({
      ok: false,
      problem: "NOT_A_NUMBER",
    });
  });

  it("says what's wrong", () => {
    expect(parseRuleInput(" ".repeat(3), "paise")).toEqual({
      ok: false,
      problem: "EMPTY",
    });
    expect(parseRuleInput("fifty", "paise")).toEqual({
      ok: false,
      problem: "NOT_A_NUMBER",
    });
    expect(parseRuleInput("101", "bp")).toEqual({
      ok: false,
      problem: "OVER_100",
    });
  });

  it("passes text and flags through", () => {
    expect(parseRuleInput("  KSPCB ", "text")).toEqual({
      ok: true,
      value: "KSPCB",
    });
    expect(parseRuleInput("true", "flag")).toEqual({ ok: true, value: true });
    expect(parseRuleInput("false", "flag")).toEqual({ ok: true, value: false });
  });
});

describe("a proposed change", () => {
  const draft = {
    rule: ewayBill,
    text: "50000",
    flag: false,
    effectiveFrom: "2026-10-13",
    note: ewayBill.active.note ?? "",
    sourceUrl: ewayBill.active.sourceUrl ?? "",
  };

  it("knows when nothing has changed", () => {
    expect(proposedChange(draft)).toEqual({
      ok: true,
      value: 5_000_000,
      isDifferent: false,
    });
  });

  it("sees a new value, note or source as a change", () => {
    expect(proposedChange({ ...draft, text: "1,00,000" })).toMatchObject({
      ok: true,
      value: 10_000_000,
      isDifferent: true,
    });
    expect(proposedChange({ ...draft, note: "Doubled." })).toMatchObject({
      isDifferent: true,
    });
    expect(proposedChange({ ...draft, sourceUrl: "" })).toMatchObject({
      isDifferent: true,
    });
  });

  it("reads a flag from the switch, not the text", () => {
    const flagDraft = {
      ...draft,
      rule: escrow,
      text: "",
      note: "",
      sourceUrl: "docs/plan.md",
    };
    expect(proposedChange({ ...flagDraft, flag: false })).toMatchObject({
      isDifferent: false,
    });
    expect(proposedChange({ ...flagDraft, flag: true })).toMatchObject({
      value: true,
      isDifferent: true,
    });
  });

  it("refuses a bad value or date before the server does", () => {
    expect(proposedChange({ ...draft, text: "lots" })).toEqual({
      ok: false,
      message: "Use digits only, like 50000 or 2.5.",
    });
    expect(proposedChange({ ...draft, effectiveFrom: "2026-02-30" })).toEqual({
      ok: false,
      message: "Pick a real date.",
    });
    expect(proposedChange({ ...draft, note: "x".repeat(601) })).toEqual({
      ok: false,
      message: "Keep the note under 600 characters.",
    });
  });
});

describe("the rules table", () => {
  it("finds a rule by any word in its name, key or note", () => {
    expect(isSearchMatch(ewayBill, "")).toBe(true);
    expect(isSearchMatch(ewayBill, "e-way")).toBe(true);
    expect(isSearchMatch(ewayBill, "ewaybill")).toBe(true);
    expect(isSearchMatch(ewayBill, "motor load")).toBe(true);
    expect(isSearchMatch(ewayBill, "escrow")).toBe(false);
  });

  it("counts what the admin changed and what is coming", () => {
    expect(ruleTally([ewayBill, escrow])).toBe(
      "2 rules · 1 changed by you · 1 with a change coming",
    );
  });
});
