import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/access";
import { isAdminEmail } from "./lib/admin";
import { findProfile } from "./lib/applicationAccess";
import { shiftDate } from "./lib/dates";
import {
  activeRule,
  type CalendarOrg,
  type CalendarRules,
  daysBetween,
  type DeadlineState,
  deadlineState,
  generatedDeadlines,
  indiaDate,
  isIsoDate,
  isRuleKey,
  isRuleOn,
  NOTE_MAX_CHARS,
  type OpenTrade,
  RULE_DEFAULTS,
  ruleChangeProblem,
  ruleDefault,
  ruleNumber,
  ruleText,
  ruleType,
  type RuleValue,
} from "./lib/rules";
import { vOrgKind } from "./lib/validators";
import { materialIndex, requireOrg } from "./lib/workspace";
import { vCalendarKind, vRuleValue } from "./tables/rulebook";

/**
 * The rulebook and the compliance calendar — convex/lib/rules.ts explains
 * the model. The admin edits every legal threshold, rate and deadline here
 * as dated rows; the calendar turns who a business is (its consent, its
 * GSTIN, what it handles, its open trades) into dated duties, and a daily
 * cron writes reminders for the ones that are close.
 */

const MAX_ROWS_PER_KEY = 200;
const MAX_ORGS = 500;
const MAX_EVENTS = 2000;
const MAX_TRADES_PER_ORG = 200;
const TITLE_MAX_CHARS = 120;
const SOURCE_KEY_MAX_CHARS = 160;
/** Businesses see this far around today. */
const MINE_PAST_DAYS = 30;
const MINE_AHEAD_DAYS = 120;
/** "Due soon" on the calendar. */
const SOON_DAYS = 30;

const vRuleUnit = v.union(
  v.literal("paise"),
  v.literal("bp"),
  v.literal("months"),
  v.literal("days"),
  v.literal("hours"),
  v.literal("years"),
  v.literal("count"),
  v.literal("text"),
  v.literal("flag"),
);

const vRuleGroup = v.union(
  v.literal("gst"),
  v.literal("incomeTax"),
  v.literal("weighing"),
  v.literal("consent"),
  v.literal("service"),
  v.literal("payments"),
  v.literal("prices"),
  v.literal("gig"),
  v.literal("platform"),
);

const vRuleRow = v.object({
  id: v.union(v.id("rules"), v.null()),
  value: vRuleValue,
  effectiveFrom: v.string(),
  note: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  updatedAt: v.number(),
  /** Saved by the admin, as against a seeded default. */
  byAdmin: v.boolean(),
});

const vDeadlineState = v.union(
  v.literal("done"),
  v.literal("overdue"),
  v.literal("due_soon"),
  v.literal("ok"),
);

const vGeneratedEvent = v.object({
  sourceKey: v.string(),
  kind: vCalendarKind,
  title: v.string(),
  dueAt: v.string(),
  orgId: v.optional(v.id("orgs")),
  note: v.optional(v.string()),
});

const vCalendarEvent = v.object({
  /** Null for a generated deadline nobody has touched yet. */
  id: v.union(v.id("calendarEvents"), v.null()),
  sourceKey: v.optional(v.string()),
  kind: vCalendarKind,
  title: v.string(),
  dueAt: v.string(),
  done: v.boolean(),
  note: v.optional(v.string()),
  /** Null for the platform's own duties. */
  org: v.union(
    v.object({ id: v.id("orgs"), name: v.string(), kind: vOrgKind }),
    v.null(),
  ),
  state: vDeadlineState,
  /** Negative once the date has passed. */
  daysLeft: v.number(),
});

/** Trimmed text, or nothing when there's nothing in it. */
function nonEmpty(text: string | undefined): string | undefined {
  const trimmed = text?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

// --- Rules ------------------------------------------------------------------------

async function rowsFor(ctx: QueryCtx, key: string): Promise<Doc<"rules">[]> {
  return ctx.db
    .query("rules")
    .withIndex("by_key", (q) => q.eq("key", key))
    .take(MAX_ROWS_PER_KEY);
}

function rowView(row: Doc<"rules">) {
  return {
    id: row._id,
    value: row.value,
    effectiveFrom: row.effectiveFrom,
    note: row.note,
    sourceUrl: row.sourceUrl,
    updatedAt: row.updatedAt,
    byAdmin: row.updatedBy !== undefined,
  };
}

/** Whether a stored row already says exactly what a proposed change says. */
function isSameChange(
  row: Doc<"rules"> | undefined,
  change: { value: RuleValue; note?: string; sourceUrl?: string },
): boolean {
  return row
    ? row.value === change.value &&
        row.note === change.note &&
        row.sourceUrl === change.sourceUrl
    : false;
}

/** Every rule with the value in force today, what's coming, and its history. */
export const listRules = query({
  args: {},
  returns: v.array(
    v.object({
      key: v.string(),
      group: vRuleGroup,
      label: v.string(),
      unit: vRuleUnit,
      type: v.union(v.literal("number"), v.literal("text"), v.literal("flag")),
      /** The default, for "why this rule" when no row carries a note. */
      defaultNote: v.string(),
      active: vRuleRow,
      upcoming: v.array(vRuleRow),
      history: v.array(vRuleRow),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = indiaDate(Date.now());
    const result = [];
    for (const rule of RULE_DEFAULTS) {
      const rows = await rowsFor(ctx, rule.key);
      const active = activeRule(rows, today);
      const history = rows
        .map((row) => rowView(row))
        .toSorted(
          (a, b) =>
            b.effectiveFrom.localeCompare(a.effectiveFrom) ||
            b.updatedAt - a.updatedAt,
        );
      result.push({
        key: rule.key,
        group: rule.group,
        label: rule.label,
        unit: rule.unit,
        type: ruleType(rule.unit),
        defaultNote: rule.note,
        active: active
          ? rowView(active)
          : {
              id: null,
              value: rule.value,
              effectiveFrom: rule.effectiveFrom,
              note: rule.note,
              sourceUrl: rule.sourceUrl,
              updatedAt: 0,
              byAdmin: false,
            },
        upcoming: history
          .filter((row) => row.effectiveFrom > today)
          .toReversed(),
        history,
      });
    }
    return result;
  },
});

/**
 * Saves a new value for a rule from a date. Nothing is ever overwritten: a
 * new row lands and the old one stays in the history. Saving what is
 * already in force from the same date changes nothing.
 */
export const saveRule = mutation({
  args: {
    key: v.string(),
    value: vRuleValue,
    effectiveFrom: v.string(),
    note: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.object({ id: v.union(v.id("rules"), v.null()) }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!isRuleKey(args.key)) throw new ConvexError("UNKNOWN_RULE");
    const rule = ruleDefault(args.key);
    const note = nonEmpty(args.note);
    const sourceUrl = nonEmpty(args.sourceUrl);
    const problem = ruleChangeProblem({
      unit: rule.unit,
      value: args.value,
      effectiveFrom: args.effectiveFrom,
      note,
      sourceUrl,
    });
    if (problem) throw new ConvexError(problem);
    const value =
      typeof args.value === "string" ? args.value.trim() : args.value;

    const rows = await rowsFor(ctx, rule.key);
    const sameDate = rows.filter(
      (row) => row.effectiveFrom === args.effectiveFrom,
    );
    const latestSameDate = activeRule(sameDate, args.effectiveFrom);
    if (isSameChange(latestSameDate, { value, note, sourceUrl })) {
      return { id: null };
    }

    const now = Date.now();
    const today = indiaDate(now);
    const before = activeRule(rows, today)?.value ?? rule.value;
    const adminProfile = await findProfile(ctx, admin._id);
    const id = await ctx.db.insert("rules", {
      key: rule.key,
      value,
      unit: rule.unit,
      effectiveFrom: args.effectiveFrom,
      note,
      sourceUrl,
      updatedBy: adminProfile?._id,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      actorProfileId: adminProfile?._id,
      action: "rule.set",
      entityTable: "rules",
      entityId: id,
      metadata: {
        key: rule.key,
        unit: rule.unit,
        from: before,
        to: value,
        effectiveFrom: args.effectiveFrom,
      },
      createdAt: now,
    });
    return { id };
  },
});

/**
 * One rule's value, as of today or a given date. Public by design: these
 * are legal thresholds every screen (and the public price board's notes)
 * may quote, and nothing personal is in them.
 */
export const ruleValue = query({
  args: { key: v.string(), on: v.optional(v.string()) },
  returns: v.object({
    key: v.string(),
    value: vRuleValue,
    unit: vRuleUnit,
    effectiveFrom: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!isRuleKey(args.key)) throw new ConvexError("UNKNOWN_RULE");
    if (args.on !== undefined && !isIsoDate(args.on)) {
      throw new ConvexError("INVALID_DATE");
    }
    const rule = ruleDefault(args.key);
    const rows = await rowsFor(ctx, rule.key);
    const active = activeRule(rows, args.on ?? indiaDate(Date.now()));
    return {
      key: rule.key,
      value: active?.value ?? rule.value,
      unit: rule.unit,
      effectiveFrom: active?.effectiveFrom ?? rule.effectiveFrom,
    };
  },
});

// --- Calendar: reading -----------------------------------------------------------

interface DateRange {
  from: string;
  to: string;
}

interface CalendarEventView {
  id: Id<"calendarEvents"> | null;
  sourceKey?: string;
  kind: Doc<"calendarEvents">["kind"];
  title: string;
  dueAt: string;
  done: boolean;
  note?: string;
  org: { id: Id<"orgs">; name: string; kind: Doc<"orgs">["kind"] } | null;
  state: DeadlineState;
  daysLeft: number;
}

async function activeOrgs(ctx: QueryCtx): Promise<Doc<"orgs">[]> {
  const orgs = await ctx.db.query("orgs").take(MAX_ORGS);
  return orgs.filter((org) => org.status === "active");
}

const PAYMENT_PENDING = new Set<Doc<"trades">["status"]>([
  "accepted",
  "paid_to_escrow",
  "dispatched",
]);

/**
 * Trades whose seller hasn't been paid in full, for the `buyers` given.
 * Sellers are named from every business, not only the buyers in scope.
 */
async function openTradesFor(
  ctx: QueryCtx,
  buyers: readonly Doc<"orgs">[],
  everyOrg: readonly Doc<"orgs">[],
): Promise<OpenTrade[]> {
  const materials = await materialIndex(ctx);
  const names = new Map(everyOrg.map((org) => [org._id, org.name]));
  const trades: OpenTrade[] = [];
  for (const buyer of buyers) {
    const bought = await ctx.db
      .query("trades")
      .withIndex("by_buyer", (q) => q.eq("buyerOrgId", buyer._id))
      .take(MAX_TRADES_PER_ORG);
    for (const trade of bought) {
      if (!PAYMENT_PENDING.has(trade.status)) continue;
      const accepted = trade.timeline.find(
        (step) => step.status === "accepted",
      );
      trades.push({
        id: trade._id,
        buyerOrgId: buyer._id,
        sellerName: names.get(trade.sellerOrgId) ?? "the seller",
        materialName:
          materials.get(trade.materialCode)?.names.en ?? trade.materialCode,
        acceptedAt: accepted?.at ?? trade.createdAt,
      });
    }
  }
  return trades;
}

async function calendarRules(
  ctx: QueryCtx,
  today: string,
): Promise<CalendarRules> {
  return {
    escrowLive: await isRuleOn(ctx, "escrow.live", today),
    msmeDays: await ruleNumber(ctx, "msme.payment.days", today),
    board: await ruleText(ctx, "consent.board", today),
    darkPatternFirstDue: await ruleText(
      ctx,
      "platform.darkPatternAudit.firstDue",
      today,
    ),
  };
}

function toCalendarOrg(org: Doc<"orgs">): CalendarOrg {
  return {
    id: org._id,
    kind: org.kind,
    name: org.name,
    gstin: org.gstin,
    families: org.families,
    consent: org.consent,
  };
}

async function storedEvents(
  ctx: QueryCtx,
  range: DateRange,
  orgId?: Id<"orgs">,
): Promise<Doc<"calendarEvents">[]> {
  const rows = orgId
    ? ctx.db
        .query("calendarEvents")
        .withIndex("by_org_dueAt", (q) =>
          q.eq("orgId", orgId).gte("dueAt", range.from).lte("dueAt", range.to),
        )
    : ctx.db
        .query("calendarEvents")
        .withIndex("by_dueAt", (q) =>
          q.gte("dueAt", range.from).lte("dueAt", range.to),
        );
  return rows.take(MAX_EVENTS);
}

interface EventSource {
  id: Id<"calendarEvents"> | null;
  sourceKey?: string;
  kind: Doc<"calendarEvents">["kind"];
  title: string;
  dueAt: string;
  done: boolean;
  note?: string;
  orgId?: Id<"orgs">;
}

/**
 * Every deadline in a range: the stored rows plus the generated ones that
 * no row has taken over. With `orgId`, only that business's own.
 */
async function eventsIn(
  ctx: QueryCtx,
  range: DateRange,
  today: string,
  orgId?: Id<"orgs">,
): Promise<CalendarEventView[]> {
  const orgs = await activeOrgs(ctx);
  const scope = orgId ? orgs.filter((org) => org._id === orgId) : orgs;
  const byId = new Map(orgs.map((org) => [org._id, org]));
  const stored = await storedEvents(ctx, range, orgId);
  const taken = new Set(
    stored.flatMap((row) => (row.sourceKey ? [row.sourceKey] : [])),
  );
  const generated = generatedDeadlines({
    range,
    orgs: scope.map((org) => toCalendarOrg(org)),
    openTrades: await openTradesFor(ctx, scope, orgs),
    rules: await calendarRules(ctx, today),
  }).filter(
    (event) => !taken.has(event.sourceKey) && (!orgId || event.orgId === orgId),
  );

  const view = (event: EventSource): CalendarEventView => {
    const org = event.orgId ? byId.get(event.orgId) : undefined;
    return {
      id: event.id,
      sourceKey: event.sourceKey,
      kind: event.kind,
      title: event.title,
      dueAt: event.dueAt,
      done: event.done,
      note: event.note,
      org: org ? { id: org._id, name: org.name, kind: org.kind } : null,
      state: deadlineState(event, today, SOON_DAYS),
      daysLeft: daysBetween(today, event.dueAt),
    };
  };

  return [
    ...stored
      .filter((row) => row.orgId === undefined || byId.has(row.orgId))
      .map((row) => view({ ...row, id: row._id })),
    ...generated.map((event) => view({ ...event, id: null, done: false })),
  ].toSorted(
    (a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title),
  );
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthRange(month: string): DateRange {
  const [year, index] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  };
}

/** The admin's month: every business's deadlines, and the platform's own. */
export const listCalendar = query({
  args: { month: v.string() },
  returns: v.object({
    today: v.string(),
    events: v.array(vCalendarEvent),
    orgs: v.array(
      v.object({ id: v.id("orgs"), name: v.string(), kind: vOrgKind }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!MONTH.test(args.month)) throw new ConvexError("INVALID_MONTH");
    const today = indiaDate(Date.now());
    const orgs = await activeOrgs(ctx);
    return {
      today,
      events: await eventsIn(ctx, monthRange(args.month), today),
      orgs: orgs
        .map((org) => ({ id: org._id, name: org.name, kind: org.kind }))
        .toSorted((a, b) => a.name.localeCompare(b.name)),
    };
  },
});

/** A business's own deadlines: a month back, four months ahead, not yet done. */
export const myDeadlines = query({
  args: {},
  returns: v.object({ today: v.string(), events: v.array(vCalendarEvent) }),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const today = indiaDate(Date.now());
    const range = {
      from: shiftDate(today, -MINE_PAST_DAYS),
      to: shiftDate(today, MINE_AHEAD_DAYS),
    };
    const events = await eventsIn(ctx, range, today, org._id);
    return { today, events: events.filter((event) => !event.done) };
  },
});

// --- Calendar: writing ----------------------------------------------------------

function checkTitle(title: string): string {
  const text = title.trim();
  if (text.length === 0 || text.length > TITLE_MAX_CHARS) {
    throw new ConvexError("INVALID_TITLE");
  }
  return text;
}

function checkNote(note: string | undefined): string | undefined {
  const text = nonEmpty(note);
  if (text !== undefined && text.length > NOTE_MAX_CHARS) {
    throw new ConvexError("NOTE_TOO_LONG");
  }
  return text;
}

interface CalendarActor {
  profileId?: Id<"profiles">;
  /** Null for the admin, who may touch any deadline. */
  orgId: Id<"orgs"> | null;
}

/**
 * Who may tick a deadline: the admin (any), or a business (only its own).
 * Generated platform duties have no business, so only the admin sees them.
 */
async function requireCalendarActor(ctx: MutationCtx): Promise<CalendarActor> {
  const user = await requireUser(ctx);
  if (isAdminEmail(user.email)) {
    if (user.twoFactorEnabled !== true) {
      throw new ConvexError("TWO_FACTOR_REQUIRED");
    }
    const profile = await findProfile(ctx, user._id);
    return { profileId: profile?._id, orgId: null };
  }
  const { profile, org } = await requireOrg(ctx);
  return { profileId: profile._id, orgId: org._id };
}

/** A stored row, which must exist. */
async function storedRow(
  ctx: MutationCtx,
  id: Id<"calendarEvents">,
): Promise<Doc<"calendarEvents">> {
  const row = await ctx.db.get("calendarEvents", id);
  if (!row) throw new ConvexError("NOT_FOUND");
  return row;
}

interface GeneratedInput {
  sourceKey: string;
  kind: Doc<"calendarEvents">["kind"];
  title: string;
  dueAt: string;
  orgId?: Id<"orgs">;
  note?: string;
}

/**
 * The row for a generated deadline, made the first time someone touches it
 * and keyed by its `sourceKey` so the calendar shows one, not two.
 */
async function adoptGenerated(
  ctx: MutationCtx,
  actor: CalendarActor,
  generated: GeneratedInput,
  now: number,
): Promise<Doc<"calendarEvents">> {
  const key = generated.sourceKey.trim();
  if (key.length === 0 || key.length > SOURCE_KEY_MAX_CHARS) {
    throw new ConvexError("INVALID_SOURCE_KEY");
  }
  const existing = await ctx.db
    .query("calendarEvents")
    .withIndex("by_sourceKey", (q) => q.eq("sourceKey", key))
    .first();
  if (existing) return existing;

  if (!isIsoDate(generated.dueAt)) throw new ConvexError("INVALID_DATE");
  if (actor.orgId && generated.orgId !== actor.orgId) {
    throw new ConvexError("FORBIDDEN");
  }
  const id = await ctx.db.insert("calendarEvents", {
    orgId: generated.orgId,
    kind: generated.kind,
    title: checkTitle(generated.title),
    dueAt: generated.dueAt,
    done: false,
    note: checkNote(generated.note),
    sourceKey: key,
    createdAt: now,
  });
  return storedRow(ctx, id);
}

/** Marks a deadline done (or not), with an audit line when anything changes. */
export const markDone = mutation({
  args: {
    id: v.optional(v.id("calendarEvents")),
    generated: v.optional(vGeneratedEvent),
    done: v.boolean(),
  },
  returns: v.object({ id: v.id("calendarEvents") }),
  handler: async (ctx, args) => {
    const actor = await requireCalendarActor(ctx);
    const now = Date.now();

    let row: Doc<"calendarEvents">;
    if (args.id) {
      row = await storedRow(ctx, args.id);
    } else if (args.generated) {
      row = await adoptGenerated(ctx, actor, args.generated, now);
    } else {
      throw new ConvexError("NOTHING_TO_MARK");
    }

    if (actor.orgId && row.orgId !== actor.orgId) {
      throw new ConvexError("FORBIDDEN");
    }
    if (row.done !== args.done) {
      await ctx.db.patch("calendarEvents", row._id, {
        done: args.done,
        doneAt: args.done ? now : undefined,
      });
      await ctx.db.insert("auditLog", {
        orgId: row.orgId,
        actorProfileId: actor.profileId,
        action: args.done ? "calendarEvent.done" : "calendarEvent.reopened",
        entityTable: "calendarEvents",
        entityId: row._id,
        metadata: { kind: row.kind, title: row.title, dueAt: row.dueAt },
        createdAt: now,
      });
    }
    return { id: row._id };
  },
});

/** The admin puts a dated duty on the calendar: a stamp, a licence, anything. */
export const scheduleDeadline = mutation({
  args: {
    orgId: v.optional(v.id("orgs")),
    kind: vCalendarKind,
    title: v.string(),
    dueAt: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.object({ id: v.id("calendarEvents") }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const title = checkTitle(args.title);
    if (!isIsoDate(args.dueAt)) throw new ConvexError("INVALID_DATE");
    const note = checkNote(args.note);
    if (args.orgId) {
      const org = await ctx.db.get("orgs", args.orgId);
      if (!org) throw new ConvexError("UNKNOWN_BUSINESS");
    }
    const now = Date.now();
    const id = await ctx.db.insert("calendarEvents", {
      orgId: args.orgId,
      kind: args.kind,
      title,
      dueAt: args.dueAt,
      done: false,
      note,
      createdAt: now,
    });
    const adminProfile = await findProfile(ctx, admin._id);
    await ctx.db.insert("auditLog", {
      orgId: args.orgId,
      actorProfileId: adminProfile?._id,
      action: "calendarEvent.added",
      entityTable: "calendarEvents",
      entityId: id,
      metadata: { kind: args.kind, title, dueAt: args.dueAt },
      createdAt: now,
    });
    return { id };
  },
});

// --- Reminders -----------------------------------------------------------------

export interface ReminderRun {
  /** Consent expiries that entered the reminder window and got a row. */
  consentsAdded: number;
  /** Consent rows that were there already and now carry a reminder. */
  consentsReminded: number;
  /** Scale stamps due within the window that got their reminder. */
  stampsReminded: number;
}

/** A consent expiring within the window gets one row, and one reminder. */
async function remindConsent(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  consent: { board: string; number: string; validUntil: string },
  now: number,
  run: ReminderRun,
): Promise<void> {
  const sourceKey = `consent:${org._id}:${consent.validUntil}`;
  const existing = await ctx.db
    .query("calendarEvents")
    .withIndex("by_sourceKey", (q) => q.eq("sourceKey", sourceKey))
    .first();
  if (existing) {
    if (existing.remindedAt === undefined && !existing.done) {
      await ctx.db.patch("calendarEvents", existing._id, { remindedAt: now });
      run.consentsReminded += 1;
    }
    return;
  }
  await ctx.db.insert("calendarEvents", {
    orgId: org._id,
    kind: "consent",
    title: `${consent.board} consent expires`,
    dueAt: consent.validUntil,
    done: false,
    note: `Consent ${consent.number}. Apply for renewal now: it can take weeks.`,
    sourceKey,
    remindedAt: now,
    createdAt: now,
  });
  run.consentsAdded += 1;
}

/**
 * One pass of the reminders: a calendar row for every consent expiring
 * within the consent window (created once, keyed by business and date) and
 * a reminder stamp on every scale re-verification due within its window.
 * Running it twice on the same day changes nothing the second time. Shared
 * by the cron and the demo seed.
 */
export async function runReminders(
  ctx: MutationCtx,
  now: number,
): Promise<ReminderRun> {
  const today = indiaDate(now);
  const consentDays = await ruleNumber(ctx, "consent.reminder.days", today);
  const scaleDays = await ruleNumber(ctx, "scale.reminder.days", today);
  const run: ReminderRun = {
    consentsAdded: 0,
    consentsReminded: 0,
    stampsReminded: 0,
  };

  const orgs = await activeOrgs(ctx);
  for (const org of orgs) {
    const { consent } = org;
    if (
      !consent ||
      !isIsoDate(consent.validUntil) ||
      daysBetween(today, consent.validUntil) > consentDays
    ) {
      continue;
    }
    await remindConsent(ctx, org, consent, now, run);
  }

  const stamps = await ctx.db
    .query("calendarEvents")
    .withIndex("by_dueAt", (q) => q.lte("dueAt", shiftDate(today, scaleDays)))
    .take(MAX_EVENTS);
  for (const stamp of stamps) {
    if (
      stamp.kind !== "scale" ||
      stamp.done ||
      stamp.remindedAt !== undefined
    ) {
      continue;
    }
    await ctx.db.patch("calendarEvents", stamp._id, { remindedAt: now });
    run.stampsReminded += 1;
  }
  return run;
}

/** Daily reminders from the compliance calendar (consents, scales, filings). */
export const reminders = internalMutation({
  args: {},
  returns: v.object({
    consentsAdded: v.number(),
    consentsReminded: v.number(),
    stampsReminded: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const run = await runReminders(ctx, now);
    await ctx.db.insert("auditLog", {
      action: "rulebook.reminders",
      entityTable: "calendarEvents",
      entityId: indiaDate(now),
      metadata: run,
      createdAt: now,
    });
    return run;
  },
});
