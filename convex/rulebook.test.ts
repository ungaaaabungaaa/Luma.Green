/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signIn,
  signInAs,
} from "./lib/auth.testing";
import { shiftDate } from "./lib/dates";
import {
  activeRule,
  deadlineState,
  generatedDeadlines,
  indiaDate,
  isValidRuleValue,
  monthlyOn,
  quarterlyReturnDates,
  RULE_DEFAULTS,
  ruleChangeProblem,
  yearlyFrom,
} from "./lib/rules";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

const ADMIN_EMAIL = "admin@luma.test";
const KABADIWALA = "+919000000101";
const YARD = "+919000000102";
const RECYCLER = "+919000000103";
const SAATHI = "+919000000105";

afterEach(() => {
  vi.unstubAllEnvs();
});

/** The demo world and its admin, authenticator enrolled. */
async function demoWorld() {
  vi.stubEnv("ADMIN_EMAIL", ADMIN_EMAIL);
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const admin = await signIn(t, { email: ADMIN_EMAIL, twoFactorEnabled: true });
  await admin.mutation(api.identity.ensureProfile, { locale: "en" });
  return { t, admin };
}

type World = Awaited<ReturnType<typeof demoWorld>>;

async function auditRows(t: World["t"], action: string) {
  return t.run(async (ctx) =>
    ctx.db
      .query("auditLog")
      .filter((q) => q.eq(q.field("action"), action))
      .collect(),
  );
}

// --- Pure rules ----------------------------------------------------------------

describe("which rule row applies", () => {
  const rows = [
    { value: 100, effectiveFrom: "2018-10-01", updatedAt: 1 },
    { value: 50, effectiveFrom: "2024-07-10", updatedAt: 2 },
    { value: 25, effectiveFrom: "2027-01-01", updatedAt: 3 },
  ];

  it("picks the latest effective date that has arrived", () => {
    expect(activeRule(rows, "2026-09-29")?.value).toBe(50);
    expect(activeRule(rows, "2018-12-01")?.value).toBe(100);
    expect(activeRule(rows, "2027-01-01")?.value).toBe(25);
  });

  it("has no answer before the first row", () => {
    expect(activeRule(rows, "2018-01-01")).toBeUndefined();
  });

  it("lets the row saved last win a tie on the same date", () => {
    const tied = [
      { value: "a", effectiveFrom: "2026-01-01", updatedAt: 10 },
      { value: "b", effectiveFrom: "2026-01-01", updatedAt: 20 },
    ];
    expect(activeRule(tied, "2026-06-01")?.value).toBe("b");
  });
});

describe("a rule's value", () => {
  it("must match its unit", () => {
    expect(isValidRuleValue(5_000_000, "paise")).toBe(true);
    expect(isValidRuleValue(12.5, "paise")).toBe(false);
    expect(isValidRuleValue(-1, "days")).toBe(false);
    expect(isValidRuleValue(10_001, "bp")).toBe(false);
    expect(isValidRuleValue(10_000, "bp")).toBe(true);
    expect(isValidRuleValue(true, "flag")).toBe(true);
    expect(isValidRuleValue("yes", "flag")).toBe(false);
    expect(isValidRuleValue("KSPCB", "text")).toBe(true);
    expect(isValidRuleValue("   ", "text")).toBe(false);
  });

  it("needs a real date and a real source", () => {
    const base = { unit: "days" as const, value: 30 };
    expect(ruleChangeProblem({ ...base, effectiveFrom: "2026-02-30" })).toBe(
      "INVALID_DATE",
    );
    expect(
      ruleChangeProblem({
        ...base,
        effectiveFrom: "2026-02-28",
        sourceUrl: "ftp://x",
      }),
    ).toBe("INVALID_SOURCE");
    expect(
      ruleChangeProblem({
        ...base,
        effectiveFrom: "2026-02-28",
        sourceUrl: "docs/plan.md",
      }),
    ).toBeNull();
  });
});

describe("deadline states and recurrences", () => {
  it("call a date late, close or fine", () => {
    const today = "2026-09-29";
    expect(deadlineState({ dueAt: "2026-09-28", done: false }, today)).toBe(
      "overdue",
    );
    expect(deadlineState({ dueAt: today, done: false }, today)).toBe(
      "due_soon",
    );
    expect(deadlineState({ dueAt: "2026-10-29", done: false }, today)).toBe(
      "due_soon",
    );
    expect(deadlineState({ dueAt: "2026-10-30", done: false }, today)).toBe(
      "ok",
    );
    expect(deadlineState({ dueAt: "2026-01-01", done: true }, today)).toBe(
      "done",
    );
  });

  it("repeat monthly, clamped to short months", () => {
    expect(monthlyOn(10, { from: "2026-09-01", to: "2026-11-30" })).toEqual([
      "2026-09-10",
      "2026-10-10",
      "2026-11-10",
    ]);
    expect(monthlyOn(31, { from: "2027-02-01", to: "2027-02-28" })).toEqual([
      "2027-02-28",
    ]);
    expect(monthlyOn(10, { from: "2026-09-11", to: "2026-09-30" })).toEqual(
      [],
    );
  });

  it("put quarterly returns at the end of the month after each quarter", () => {
    expect(
      quarterlyReturnDates({ from: "2026-01-01", to: "2026-12-31" }),
    ).toEqual(["2026-01-31", "2026-04-30", "2026-07-31", "2026-10-31"]);
  });

  it("repeat yearly from an anchor, never before it", () => {
    expect(
      yearlyFrom("2027-01-01", { from: "2026-01-01", to: "2028-12-31" }),
    ).toEqual(["2027-01-01", "2028-01-01"]);
  });
});

describe("generated deadlines", () => {
  const yard = {
    id: "yard1" as Id<"orgs">,
    kind: "yard" as const,
    name: "Metal Yard",
    gstin: "29X",
    families: ["metal"],
    consent: { board: "KSPCB", number: "1", validUntil: "2026-10-15" },
  };
  const recycler = {
    id: "rec1" as Id<"orgs">,
    kind: "recycler" as const,
    name: "Plastic Recycler",
    gstin: "29Y",
    families: ["plastic", "ewaste"],
  };
  const brand = {
    id: "brand1" as Id<"orgs">,
    kind: "manufacturer" as const,
    name: "Brand",
    gstin: "29Z",
    families: ["plastic"],
  };
  const rules = {
    escrowLive: false,
    msmeDays: 45,
    board: "KSPCB",
    darkPatternFirstDue: "2027-01-01",
  };
  const year = { from: "2026-10-01", to: "2027-09-30" };

  it("follow from who a business is", () => {
    const events = generatedDeadlines({
      range: year,
      orgs: [yard, recycler, brand],
      openTrades: [],
      rules,
    });
    const of = (kind: string, orgId?: string) =>
      events.filter(
        (event) => event.kind === kind && (!orgId || event.orgId === orgId),
      );
    expect(of("consent", yard.id).map((e) => e.dueAt)).toEqual(["2026-10-15"]);
    expect(of("gstr7", yard.id)).toHaveLength(12);
    expect(of("gstr7", recycler.id)).toHaveLength(0); // no metal
    expect(of("eprReturn", recycler.id).map((e) => e.dueAt)).toEqual([
      "2027-04-30",
    ]);
    expect(of("eprReturn", brand.id).map((e) => e.dueAt)).toEqual([
      "2027-06-30",
    ]);
    expect(of("eprQuarterly", recycler.id)).toHaveLength(4);
    expect(of("gstr8")).toHaveLength(0);
    expect(of("darkPatternAudit").map((e) => e.dueAt)).toEqual(["2027-01-01"]);
  });

  it("add GSTR-8 only once escrow collects money", () => {
    const events = generatedDeadlines({
      range: year,
      orgs: [],
      openTrades: [],
      rules: { ...rules, escrowLive: true },
    });
    expect(events.filter((event) => event.kind === "gstr8")).toHaveLength(12);
    expect(events.every((event) => event.orgId === undefined)).toBe(true);
  });

  it("give a buyer 45 days from accepting the goods", () => {
    const acceptedAt = Date.parse("2026-10-01T10:00:00+05:30");
    const events = generatedDeadlines({
      range: year,
      orgs: [],
      openTrades: [
        {
          id: "trade1" as Id<"trades">,
          buyerOrgId: yard.id,
          sellerName: "Ramesh Kabadi Store",
          materialName: "Cartons",
          acceptedAt,
        },
      ],
      rules,
    });
    expect(events).toMatchObject([
      {
        kind: "msmeDue",
        orgId: yard.id,
        dueAt: "2026-11-15",
        sourceKey: "msme:trade1",
      },
    ]);
    expect(events[0]?.title).toContain("Ramesh Kabadi Store");
  });
});

// --- The rulebook --------------------------------------------------------------

describe("the rulebook", () => {
  it("lists every rule with the value in force and its history", async () => {
    const { admin } = await demoWorld();
    const rules = await admin.query(api.rulebook.listRules, {});
    expect(rules.map((rule) => rule.key)).toEqual(
      RULE_DEFAULTS.map((rule) => rule.key),
    );

    const tcs = rules.find((rule) => rule.key === "gst.ecommerceTcs.rateBp");
    expect(tcs?.active).toMatchObject({
      value: 50,
      effectiveFrom: "2024-07-10",
      byAdmin: false,
    });
    expect(tcs?.history.map((row) => row.value)).toEqual([50, 100]);
    expect(tcs?.upcoming).toEqual([]);

    const scrap = rules.find((rule) => rule.key === "incomeTax.scrapTcs.rateBp");
    expect(scrap?.active.value).toBe(200);
    expect(scrap?.history).toHaveLength(2);
  });

  it("is the admin's alone to read in full", async () => {
    const { t } = await demoWorld();
    await expect(t.query(api.rulebook.listRules, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const shop = await signInAs(t, KABADIWALA);
    await expect(shop.query(api.rulebook.listRules, {})).rejects.toThrow(
      /NOT_ADMIN/,
    );
    await expect(
      shop.mutation(api.rulebook.setRule, {
        key: "msme.payment.days",
        value: 60,
        effectiveFrom: "2026-10-01",
      }),
    ).rejects.toThrow(/NOT_ADMIN/);
  });

  it("keeps a future change waiting until its date, in the audit log", async () => {
    const { t, admin } = await demoWorld();
    const key = "ewayBill.limitPaise";
    const result = await admin.mutation(api.rulebook.setRule, {
      key,
      value: 10_000_000,
      effectiveFrom: "2099-01-01",
      note: "Proposal to double the limit.",
    });
    expect(result.id).not.toBeNull();

    const rule = (await admin.query(api.rulebook.listRules, {})).find(
      (row) => row.key === key,
    );
    expect(rule?.active.value).toBe(5_000_000);
    expect(rule?.upcoming).toMatchObject([
      { value: 10_000_000, effectiveFrom: "2099-01-01", byAdmin: true },
    ]);

    expect(await t.query(api.rulebook.ruleValue, { key })).toMatchObject({
      value: 5_000_000,
      unit: "paise",
    });
    expect(
      await t.query(api.rulebook.ruleValue, { key, on: "2099-06-01" }),
    ).toMatchObject({ value: 10_000_000, effectiveFrom: "2099-01-01" });

    const audit = await auditRows(t, "rule.set");
    expect(audit).toHaveLength(1);
    expect(audit[0]?.metadata).toMatchObject({
      key,
      from: 5_000_000,
      to: 10_000_000,
      effectiveFrom: "2099-01-01",
    });

    // The same change again is not a change.
    const again = await admin.mutation(api.rulebook.setRule, {
      key,
      value: 10_000_000,
      effectiveFrom: "2099-01-01",
      note: "Proposal to double the limit.",
    });
    expect(again.id).toBeNull();
    expect(await auditRows(t, "rule.set")).toHaveLength(1);
  });

  it("refuses a value of the wrong shape", async () => {
    const { admin } = await demoWorld();
    const set = (
      key: string,
      value: number | string | boolean,
      effectiveFrom = "2026-10-01",
    ) => admin.mutation(api.rulebook.setRule, { key, value, effectiveFrom });
    await expect(set("incomeTax.scrapTcs.rateBp", 250.5)).rejects.toThrow(
      /INVALID_VALUE/,
    );
    await expect(set("incomeTax.scrapTcs.rateBp", 20_000)).rejects.toThrow(
      /INVALID_VALUE/,
    );
    await expect(set("escrow.live", "yes")).rejects.toThrow(/INVALID_VALUE/);
    await expect(set("consent.board", 5)).rejects.toThrow(/INVALID_VALUE/);
    await expect(set("nope.rule", 5)).rejects.toThrow(/UNKNOWN_RULE/);
    await expect(set("msme.payment.days", 45, "2026-2-1")).rejects.toThrow(
      /INVALID_DATE/,
    );
  });

  it("answers one rule's value to anyone", async () => {
    const { t } = await demoWorld();
    expect(
      await t.query(api.rulebook.ruleValue, { key: "msme.payment.days" }),
    ).toMatchObject({ value: 45, unit: "days" });
    expect(
      await t.query(api.rulebook.ruleValue, { key: "escrow.live" }),
    ).toMatchObject({ value: false });
    await expect(
      t.query(api.rulebook.ruleValue, { key: "not.a.rule" }),
    ).rejects.toThrow(/UNKNOWN_RULE/);
  });
});

// --- The calendar ----------------------------------------------------------------

describe("the compliance calendar", () => {
  it("shows a month of every business's deadlines, generated and stored", async () => {
    const { admin } = await demoWorld();
    const december = await admin.query(api.rulebook.listCalendar, {
      month: "2026-12",
    });
    expect(december.orgs.map((org) => org.name)).toContain(
      "Hebbal Metal Yard",
    );

    const gstr7 = december.events.filter((event) => event.kind === "gstr7");
    expect(gstr7.map((event) => event.org?.name).toSorted()).toEqual([
      "Bidadi Recycling Works",
      "Hebbal Metal Yard",
    ]);
    expect(gstr7.every((event) => event.dueAt === "2026-12-10")).toBe(true);

    const consent = december.events.find(
      (event) =>
        event.kind === "consent" && event.org?.name === "Hebbal Metal Yard",
    );
    expect(consent).toMatchObject({ dueAt: "2026-12-31", done: false });

    const january = await admin.query(api.rulebook.listCalendar, {
      month: "2027-01",
    });
    expect(
      january.events.filter((event) => event.kind === "darkPatternAudit"),
    ).toMatchObject([{ dueAt: "2027-01-01", org: null }]);

    // The platform's own dates from the seed, and every event sorted by date.
    const dates = january.events.map((event) => event.dueAt);
    expect(dates).toEqual([...dates].sort((a, b) => a.localeCompare(b)));

    await expect(
      admin.query(api.rulebook.listCalendar, { month: "2026-13" }),
    ).rejects.toThrow(/INVALID_MONTH/);
  });

  it("is not for businesses or the signed-out", async () => {
    const { t } = await demoWorld();
    await expect(
      t.query(api.rulebook.listCalendar, { month: "2026-12" }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
    const yard = await signInAs(t, YARD);
    await expect(
      yard.query(api.rulebook.listCalendar, { month: "2026-12" }),
    ).rejects.toThrow(/NOT_ADMIN/);
  });

  it("shows a business only its own upcoming deadlines", async () => {
    const { t } = await demoWorld();
    const shop = await signInAs(t, KABADIWALA);
    const mine = await shop.query(api.rulebook.myDeadlines, {});
    expect(mine.events.length).toBeGreaterThan(0);
    expect(
      mine.events.every((event) => event.org?.name === "Ramesh Kabadi Store"),
    ).toBe(true);
    expect(mine.events.every((event) => !event.done)).toBe(true);
    const scale = mine.events.find((event) => event.kind === "scale");
    expect(scale).toMatchObject({ daysLeft: 18, state: "due_soon" });
    expect(scale?.id).not.toBeNull();

    // The recycler owes a yard for a dispatched load: 45 days from acceptance.
    const recycler = await signInAs(t, RECYCLER);
    const owed = await recycler.query(api.rulebook.myDeadlines, {});
    const msme = owed.events.find((event) => event.kind === "msmeDue");
    expect(msme?.title).toContain("Pay Peenya Paper & Plastic Yard");
    expect(msme?.org?.name).toBe("GreenLoop Polymers");

    const saathi = await signInAs(t, SAATHI);
    await expect(saathi.query(api.rulebook.myDeadlines, {})).rejects.toThrow(
      /NO_BUSINESS/,
    );
    await expect(t.query(api.rulebook.myDeadlines, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
  });

  it("turns a generated deadline into one row the first time it's ticked", async () => {
    const { t, admin } = await demoWorld();
    const before = await admin.query(api.rulebook.listCalendar, {
      month: "2026-12",
    });
    const filing = before.events.find(
      (event) =>
        event.kind === "gstr7" && event.org?.name === "Hebbal Metal Yard",
    );
    expect(filing?.id).toBeNull();
    if (!filing?.sourceKey) throw new Error("expected a generated filing");
    const generated = {
      sourceKey: filing.sourceKey,
      kind: filing.kind,
      title: filing.title,
      dueAt: filing.dueAt,
      orgId: filing.org?.id,
      note: filing.note,
    };

    const first = await admin.mutation(api.rulebook.markDone, {
      generated,
      done: true,
    });
    const after = await admin.query(api.rulebook.listCalendar, {
      month: "2026-12",
    });
    const same = after.events.filter(
      (event) => event.sourceKey === filing.sourceKey,
    );
    expect(same).toHaveLength(1);
    expect(same[0]).toMatchObject({ id: first.id, done: true, state: "done" });

    // Ticking again finds the same row; unticking reopens it.
    const second = await admin.mutation(api.rulebook.markDone, {
      generated,
      done: true,
    });
    expect(second.id).toBe(first.id);
    await admin.mutation(api.rulebook.markDone, { id: first.id, done: false });
    const reopened = await admin.query(api.rulebook.listCalendar, {
      month: "2026-12",
    });
    expect(
      reopened.events.find((event) => event.sourceKey === filing.sourceKey),
    ).toMatchObject({ id: first.id, done: false });

    expect(await auditRows(t, "calendarEvent.done")).toHaveLength(1);
    expect(await auditRows(t, "calendarEvent.reopened")).toHaveLength(1);
  });

  it("lets a business tick only its own deadlines", async () => {
    const { t } = await demoWorld();
    const shop = await signInAs(t, KABADIWALA);
    const mine = await shop.query(api.rulebook.myDeadlines, {});
    const scale = mine.events.find((event) => event.kind === "scale");
    if (!scale?.id) throw new Error("expected a stored scale stamp");

    const yard = await signInAs(t, YARD);
    await expect(
      yard.mutation(api.rulebook.markDone, { id: scale.id, done: true }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      t.mutation(api.rulebook.markDone, { id: scale.id, done: true }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);

    await shop.mutation(api.rulebook.markDone, { id: scale.id, done: true });
    const later = await shop.query(api.rulebook.myDeadlines, {});
    expect(later.events.some((event) => event.id === scale.id)).toBe(false);

    // A business can't invent a deadline for someone else either.
    const other = mine.events[0]?.org?.id;
    await expect(
      yard.mutation(api.rulebook.markDone, {
        generated: {
          sourceKey: "custom:test",
          kind: "custom",
          title: "Not mine",
          dueAt: "2026-12-01",
          orgId: other,
        },
        done: true,
      }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("lets the admin add a dated duty for a business", async () => {
    const { t, admin } = await demoWorld();
    const shop = await signInAs(t, KABADIWALA);
    const orgId = (await shop.query(api.rulebook.myDeadlines, {})).events[0]
      ?.org?.id;
    if (!orgId) throw new Error("expected the shop's business");
    const today = indiaDate(Date.now());
    const dueAt = shiftDate(today, 7);

    await admin.mutation(api.rulebook.addEvent, {
      orgId,
      kind: "custom",
      title: "Send the Udyam certificate",
      dueAt,
      note: "Unlocks the 45-day payment protection.",
    });
    const mine = await shop.query(api.rulebook.myDeadlines, {});
    expect(mine.events).toContainEqual(
      expect.objectContaining({
        kind: "custom",
        title: "Send the Udyam certificate",
        dueAt,
        daysLeft: 7,
      }),
    );
    expect(await auditRows(t, "calendarEvent.added")).toHaveLength(1);

    await expect(
      admin.mutation(api.rulebook.addEvent, {
        kind: "custom",
        title: "   ",
        dueAt,
      }),
    ).rejects.toThrow(/INVALID_TITLE/);
    await expect(
      admin.mutation(api.rulebook.addEvent, {
        kind: "custom",
        title: "Bad date",
        dueAt: "31/12/2026",
      }),
    ).rejects.toThrow(/INVALID_DATE/);
    await expect(
      shop.mutation(api.rulebook.addEvent, {
        kind: "custom",
        title: "Not allowed",
        dueAt,
      }),
    ).rejects.toThrow(/NOT_ADMIN/);
  });
});

// --- Reminders -------------------------------------------------------------------

describe("the reminders cron", () => {
  it("adds each consent once as it enters the window, and logs every run", async () => {
    const { t } = await demoWorld();
    // The seed already ran today's reminders: a second pass changes nothing.
    const quiet = await t.mutation(internal.rulebook.reminders, {});
    expect(quiet).toEqual({
      consentsAdded: 0,
      consentsReminded: 0,
      stampsReminded: 0,
    });

    // A consent slips inside the 90-day window.
    const today = indiaDate(Date.now());
    const soon = shiftDate(today, 30);
    const orgId = await t.run(async (ctx) => {
      const org = await ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", "greenloop-polymers"))
        .unique();
      if (!org?.consent) throw new Error("expected a consent");
      await ctx.db.patch("orgs", org._id, {
        consent: { ...org.consent, validUntil: soon },
      });
      return org._id;
    });

    const first = await t.mutation(internal.rulebook.reminders, {});
    expect(first).toMatchObject({ consentsAdded: 1 });
    const second = await t.mutation(internal.rulebook.reminders, {});
    expect(second).toMatchObject({ consentsAdded: 0, consentsReminded: 0 });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("by_sourceKey", (q) =>
          q.eq("sourceKey", `consent:${orgId}:${soon}`),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      orgId,
      kind: "consent",
      dueAt: soon,
      done: false,
    });
    expect(rows[0]?.remindedAt).toBeDefined();

    expect(await auditRows(t, "rulebook.reminders")).toHaveLength(3);
  });

  it("reminds about a scale stamp once as it comes within 30 days", async () => {
    const { t } = await demoWorld();
    const today = indiaDate(Date.now());
    const orgId = await t.run(async (ctx) => {
      const org = await ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", "hsr-waste-buyers"))
        .unique();
      if (!org) throw new Error("expected the shop");
      await ctx.db.insert("calendarEvents", {
        orgId: org._id,
        kind: "scale",
        title: "Electronic scale re-verification due",
        dueAt: shiftDate(today, 10),
        done: false,
        createdAt: Date.now(),
      });
      return org._id;
    });
    expect(await t.mutation(internal.rulebook.reminders, {})).toMatchObject({
      stampsReminded: 1,
    });
    expect(await t.mutation(internal.rulebook.reminders, {})).toMatchObject({
      stampsReminded: 0,
    });
    const stamps = await t.run(async (ctx) =>
      ctx.db
        .query("calendarEvents")
        .withIndex("by_org_dueAt", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      stamps.filter((row) => row.kind === "scale" && !row.done),
    ).toHaveLength(2);
    expect(stamps.every((row) => row.remindedAt === undefined)).toBe(false);
  });
});
