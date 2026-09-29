import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { shiftDate } from "../lib/dates";
import type { DemoWorld } from "../lib/demoWorld";
import { RULE_DEFAULTS } from "../lib/rules";
import { runReminders } from "../rulebook";

/**
 * Sample data for the "rulebook" area, seeded after the base demo world:
 * every default as a dated row (with real history for the two rates that
 * changed), a scale stamp and a trade licence for every business that
 * weighs, the platform's own dates, and the reminders the cron would have
 * written by today. Runs inside demo:seed and demo:reset; idempotent for one
 * run and only writes to this area's own tables.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Rates that were different before: the history the drawer shows. */
const EARLIER_ROWS: readonly {
  key: string;
  value: number;
  unit: string;
  effectiveFrom: string;
  note: string;
  sourceUrl: string;
}[] = [
  {
    key: "gst.ecommerceTcs.rateBp",
    value: 100,
    unit: "bp",
    effectiveFrom: "2018-10-01",
    note: "1% (0.5% CGST + 0.5% SGST) from the day TCS started; cut to 0.5% by the 53rd GST Council after half of it was being refunded to sellers.",
    sourceUrl:
      "https://www.gstcouncil.gov.in/sites/default/files/Minutes/53rd_minutes_converted.pdf",
  },
  {
    key: "incomeTax.scrapTcs.rateBp",
    value: 100,
    unit: "bp",
    effectiveFrom: "2025-04-01",
    note: "1% under s.206C(1) of the 1961 Act, carried into s.394(1) of the 2025 Act, before Budget 2026-27 doubled it.",
    sourceUrl:
      "https://prsindia.org/files/bills_acts/bills_parliament/2025/Bill_as_passed_by_LS_Income_Tax_(No.2)_Bill.pdf",
  },
];

/**
 * Where each demo business's scale stamp falls, in days from today: one
 * overdue, one due soon, the rest spread over the year.
 */
function stampOffset(index: number): number {
  const spread = [18, 61, -12, 140, 95, 230, 47, 310, 175, 265, 120, 200];
  return spread[index % spread.length] ?? 90;
}

function scaleTitle(kind: Doc<"orgs">["kind"]): string {
  return kind === "recycler" || kind === "manufacturer"
    ? "Weighbridge re-verification due"
    : "Electronic scale re-verification due";
}

async function seedRules(ctx: MutationCtx, world: DemoWorld) {
  const seededAt = world.now - 30 * DAY;
  for (const rule of RULE_DEFAULTS) {
    await ctx.db.insert("rules", {
      key: rule.key,
      value: rule.value,
      unit: rule.unit,
      effectiveFrom: rule.effectiveFrom,
      note: rule.note,
      sourceUrl: rule.sourceUrl,
      updatedAt: seededAt,
    });
  }
  for (const row of EARLIER_ROWS) {
    await ctx.db.insert("rules", { ...row, updatedAt: seededAt - DAY });
  }
}

async function seedBusinessDates(ctx: MutationCtx, world: DemoWorld) {
  const orgs = [...world.orgs.values()];
  for (const [index, orgId] of orgs.entries()) {
    const org = await ctx.db.get("orgs", orgId);
    if (!org) continue;

    const dueAt = shiftDate(world.today, stampOffset(index));
    await ctx.db.insert("calendarEvents", {
      orgId,
      kind: "scale",
      title: scaleTitle(org.kind),
      dueAt,
      done: false,
      note: "Legal Metrology stamps electronic scales for 12 months. Book the officer's visit two weeks ahead.",
      sourceKey: `scale:${orgId}:${dueAt}`,
      createdAt: world.now - 20 * DAY,
    });

    // The stamp before this one, so the first business has a history.
    if (index === 0) {
      const lastYear = shiftDate(dueAt, -365);
      await ctx.db.insert("calendarEvents", {
        orgId,
        kind: "scale",
        title: scaleTitle(org.kind),
        dueAt: lastYear,
        done: true,
        doneAt: Date.parse(`${lastYear}T09:00:00+05:30`),
        note: "Stamped by the Legal Metrology officer, Yeshwanthpur.",
        sourceKey: `scale:${orgId}:${lastYear}`,
        createdAt: world.now - 400 * DAY,
      });
    }

    if (org.kind === "kabadiwala") {
      await ctx.db.insert("calendarEvents", {
        orgId,
        kind: "tradeLicence",
        title: "Trade licence renewal",
        dueAt: nextMarch(world.today),
        done: false,
        note: "Renew online with the Greater Bengaluru Authority before the financial year ends.",
        createdAt: world.now - 20 * DAY,
      });
    }
  }
}

/** 31 March of the current financial year. */
function nextMarch(today: string): string {
  const year = Number(today.slice(0, 4));
  const thisMarch = `${String(year)}-03-31`;
  return thisMarch >= today ? thisMarch : `${String(year + 1)}-03-31`;
}

async function seedPlatformDates(ctx: MutationCtx, world: DemoWorld) {
  const platform: {
    kind: Doc<"calendarEvents">["kind"];
    title: string;
    dueAt: string;
    note: string;
  }[] = [
    {
      kind: "custom",
      title: "Lawyer and CA review terms, receipts and the rulebook",
      dueAt: "2026-10-06",
      note: "Booked for 6–12 October. Business trades and Saathi jobs switch on once it clears.",
    },
    {
      kind: "custom",
      title: "Apply to the National Consumer Helpline convergence programme",
      dueAt: "2026-12-31",
      note: "Mandatory for e-commerce entities from 1 January 2027 (G.S.R. 789(E)).",
    },
    {
      kind: "custom",
      title: "Register as an aggregator with the Karnataka gig-workers welfare board",
      dueAt: shiftDate(world.today, 45),
      note: "Within 45 days of the first Saathi payout through the platform; only if Luma.Green pays Saathis itself.",
    },
  ];
  for (const event of platform) {
    await ctx.db.insert("calendarEvents", {
      ...event,
      done: false,
      createdAt: world.now - 10 * DAY,
    });
  }
}

export async function seedRulebook(
  ctx: MutationCtx,
  world: DemoWorld,
): Promise<void> {
  await seedRules(ctx, world);
  await seedBusinessDates(ctx, world);
  await seedPlatformDates(ctx, world);
  // What the daily cron would have written by now.
  await runReminders(ctx, world.now);
}
