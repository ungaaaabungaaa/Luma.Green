import { ConvexError, v } from "convex/values";

import {
  isTrainingModuleId,
  QUIZ_QUESTIONS,
  SAATHI_READY_KEYS,
  type TrainingModuleId,
} from "../src/components/help/training-keys";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query,type QueryCtx } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/access";
import { findProfile } from "./lib/applicationAccess";
import { normalizeIndianMobile } from "./lib/phone";
import { currentProfile, findOrgFor } from "./lib/workspace";

const TOPICS = [
  "account",
  "pickup",
  "prices",
  "payments",
  "documents",
  "trade",
  "solar",
  "other",
] as const;

const vTopic = v.union(
  v.literal("account"),
  v.literal("pickup"),
  v.literal("prices"),
  v.literal("payments"),
  v.literal("documents"),
  v.literal("trade"),
  v.literal("solar"),
  v.literal("other"),
);

const vRole = v.union(
  v.literal("household"),
  v.literal("kabadiwala"),
  v.literal("yard"),
  v.literal("recycler"),
  v.literal("manufacturer"),
  v.literal("saathi"),
  v.literal("other"),
);

/**
 * A message to the team from the help centre or the solar page. Open to
 * anyone — people who can't sign in are the ones who most need to ask.
 */
export const send = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    role: vRole,
    topic: vTopic,
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new ConvexError("INVALID_NAME");
    }
    const phone = normalizeIndianMobile(args.phone);
    if (!phone) throw new ConvexError("INVALID_PHONE");
    const message = args.message.trim();
    if (message.length < 5 || message.length > 1000) {
      throw new ConvexError("INVALID_MESSAGE");
    }
    const profile = await currentProfile(ctx);
    await ctx.db.insert("supportRequests", {
      profileId: profile?._id,
      name,
      phone,
      role: args.role,
      topic: args.topic,
      message,
      status: "open",
      createdAt: Date.now(),
    });
    return null;
  },
});

/** The admin's inbox, newest first. */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("supportRequests"),
      name: v.string(),
      phone: v.string(),
      role: v.string(),
      topic: v.string(),
      message: v.string(),
      status: v.union(v.literal("open"), v.literal("answered")),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("supportRequests").order("desc").take(200);
    return rows.map((row) => ({
      id: row._id,
      name: row.name,
      phone: row.phone,
      role: row.role,
      topic: row.topic,
      message: row.message,
      status: row.status,
      createdAt: row.createdAt,
    }));
  },
});

export const markAnswered = mutation({
  args: { id: v.id("supportRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("supportRequests", args.id);
    if (!row) throw new ConvexError("NOT_FOUND");
    await ctx.db.patch("supportRequests", args.id, { status: "answered" });
    return null;
  },
});

// --- Assisted mode: "Call me and we'll book it" ------------------------------

export const CALLBACK_WINDOWS = [
  "morning",
  "afternoon",
  "evening",
  "any",
] as const;

const vCallbackWindow = v.union(
  v.literal("morning"),
  v.literal("afternoon"),
  v.literal("evening"),
  v.literal("any"),
);

export type CallbackWindow = (typeof CALLBACK_WINDOWS)[number];

/** How long the free-text parts of a call-back request may be. */
export const CALLBACK_TEXT_MAX = 200;

/**
 * The support message a call-back request becomes, so the admin's inbox
 * reads it like any other pickup question. English on purpose: the inbox is
 * English only, and the caller's language is named so the team can call
 * back in it.
 */
export function callbackMessage(input: {
  area: string;
  items: string;
  window: CallbackWindow;
  forWhom?: string;
  locale?: string;
}): string {
  const lines = [
    "Call me and book a pickup for me.",
    `Area: ${input.area}`,
    `Scrap: ${input.items}`,
    `Best time to call: ${input.window}`,
  ];
  if (input.forWhom) lines.push(`Booking for: ${input.forWhom}`);
  if (input.locale) lines.push(`Language: ${input.locale}`);
  return lines.join("\n");
}

function cleanText(value: string, max: number): string {
  return value.trim().replaceAll(/\s+/g, " ").slice(0, max);
}

/**
 * Assisted booking for people who'd rather talk than type: the team calls
 * back and books the pickup with them. Lands in the admin's inbox as a
 * household pickup request. Open to anyone.
 */
export const requestCallback = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    area: v.string(),
    items: v.string(),
    window: vCallbackWindow,
    forWhom: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const name = cleanText(args.name, 80);
    if (name.length < 2) throw new ConvexError("INVALID_NAME");
    const phone = normalizeIndianMobile(args.phone);
    if (!phone) throw new ConvexError("INVALID_PHONE");
    const area = cleanText(args.area, CALLBACK_TEXT_MAX);
    if (area.length < 2) throw new ConvexError("INVALID_AREA");
    const items = cleanText(args.items, CALLBACK_TEXT_MAX);
    if (items.length < 2) throw new ConvexError("INVALID_ITEMS");
    const forWhom = args.forWhom
      ? cleanText(args.forWhom, CALLBACK_TEXT_MAX)
      : "";
    const locale = args.locale ? cleanText(args.locale, 8) : "";

    const profile = await currentProfile(ctx);
    await ctx.db.insert("supportRequests", {
      profileId: profile?._id,
      name,
      phone,
      role: "household",
      topic: "pickup",
      message: callbackMessage({
        area,
        items,
        window: args.window,
        forWhom: forWhom || undefined,
        locale: locale || undefined,
      }),
      status: "open",
      createdAt: Date.now(),
    });
    return null;
  },
});

// --- "Did this help?" -----------------------------------------------------------

/** The longest note a "No" may carry. */
export const FEEDBACK_NOTE_MAX = 300;
const FEEDBACK_PATH_MAX = 200;

/** A help page path we'll record: absolute, short, and ours. */
export function isFeedbackPath(path: string): boolean {
  return (
    path.length > 1 &&
    path.length <= FEEDBACK_PATH_MAX &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !/[\s<>"'\\]/.test(path)
  );
}

/**
 * One tap on "Did this help? Yes / No" under a guide, a question or a kit
 * page. Open to anyone; a note is optional and short.
 */
export const feedback = mutation({
  args: {
    path: v.string(),
    helpful: v.boolean(),
    note: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!isFeedbackPath(args.path)) throw new ConvexError("INVALID_PATH");
    const note = args.note ? cleanText(args.note, FEEDBACK_NOTE_MAX) : "";
    const locale = args.locale ? cleanText(args.locale, 8) : "";
    const profile = await currentProfile(ctx);
    await ctx.db.insert("helpFeedback", {
      path: args.path,
      helpful: args.helpful,
      note: note || undefined,
      locale: locale || undefined,
      profileId: profile?._id,
      at: Date.now(),
    });
    return null;
  },
});

export interface FeedbackSummaryRow {
  path: string;
  yes: number;
  no: number;
  notes: string[];
}

/** Counts per page, most answered first; the last few "No" notes kept. */
export function summariseFeedback(
  rows: readonly Pick<Doc<"helpFeedback">, "path" | "helpful" | "note">[],
): FeedbackSummaryRow[] {
  const byPath = new Map<string, FeedbackSummaryRow>();
  for (const row of rows) {
    let entry = byPath.get(row.path);
    if (!entry) {
      entry = { path: row.path, yes: 0, no: 0, notes: [] };
      byPath.set(row.path, entry);
    }
    if (row.helpful) entry.yes += 1;
    else entry.no += 1;
    if (row.note && entry.notes.length < 3) entry.notes.push(row.note);
  }
  return [...byPath.values()].toSorted(
    (a, b) => b.yes + b.no - (a.yes + a.no) || a.path.localeCompare(b.path),
  );
}

/**
 * "Did this help?" rates by page for the admin: which guides work and which
 * need rewriting. The most recent 500 answers.
 */
export const feedbackSummary = query({
  args: {},
  returns: v.array(
    v.object({
      path: v.string(),
      yes: v.number(),
      no: v.number(),
      notes: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("helpFeedback")
      .withIndex("by_at")
      .order("desc")
      .take(500);
    return summariseFeedback(rows);
  },
});

// --- Training progress ------------------------------------------------------------

const vProgressRow = v.object({
  moduleKey: v.string(),
  doneAt: v.number(),
  score: v.optional(v.number()),
});

/** The signed-in person's own profile; null before their first sign-in. */
async function ownProfile(ctx: QueryCtx): Promise<Doc<"profiles"> | null> {
  const user = await requireUser(ctx);
  return findProfile(ctx, user._id);
}

async function progressRows(
  ctx: QueryCtx,
  profileId: Id<"profiles">,
): Promise<Doc<"trainingProgress">[]> {
  return ctx.db
    .query("trainingProgress")
    .withIndex("by_profile", (q) => q.eq("profileId", profileId))
    .take(100);
}

/** Every module the signed-in person has finished, oldest first. */
export const myTraining = query({
  args: {},
  returns: v.array(vProgressRow),
  handler: async (ctx) => {
    const profile = await ownProfile(ctx);
    if (!profile) return [];
    const rows = await progressRows(ctx, profile._id);
    return rows.map((row) => ({
      moduleKey: row.moduleKey,
      doneAt: row.doneAt,
      score: row.score,
    }));
  },
});

/**
 * Marks a module done for the signed-in person. Finishing it again keeps
 * the first `doneAt` and the better score, so a refresher never lowers a
 * record.
 */
export const completeModule = mutation({
  args: { moduleKey: v.string(), score: v.optional(v.number()) },
  returns: v.object({ doneAt: v.number(), score: v.optional(v.number()) }),
  handler: async (ctx, args) => {
    const profile = await ownProfile(ctx);
    if (!profile) throw new ConvexError("NO_PROFILE");
    if (!isTrainingModuleId(args.moduleKey)) {
      throw new ConvexError("UNKNOWN_MODULE");
    }
    if (
      args.score !== undefined &&
      (!Number.isInteger(args.score) ||
        args.score < 0 ||
        args.score > QUIZ_QUESTIONS)
    ) {
      throw new ConvexError("INVALID_SCORE");
    }
    const existing = await ctx.db
      .query("trainingProgress")
      .withIndex("by_profile_module", (q) =>
        q.eq("profileId", profile._id).eq("moduleKey", args.moduleKey),
      )
      .unique();
    if (existing) {
      const score =
        existing.score === undefined || args.score === undefined
          ? (args.score ?? existing.score)
          : Math.max(existing.score, args.score);
      if (score !== existing.score) {
        await ctx.db.patch("trainingProgress", existing._id, { score });
      }
      return { doneAt: existing.doneAt, score };
    }
    const doneAt = Date.now();
    await ctx.db.insert("trainingProgress", {
      profileId: profile._id,
      moduleKey: args.moduleKey,
      doneAt,
      score: args.score,
    });
    return { doneAt, score: args.score };
  },
});

/** "Start again": forgets one module of the signed-in person's own record. */
export const clearModule = mutation({
  args: { moduleKey: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ownProfile(ctx);
    if (!profile) throw new ConvexError("NO_PROFILE");
    const existing = await ctx.db
      .query("trainingProgress")
      .withIndex("by_profile_module", (q) =>
        q.eq("profileId", profile._id).eq("moduleKey", args.moduleKey),
      )
      .unique();
    if (existing) await ctx.db.delete("trainingProgress", existing._id);
    return null;
  },
});

// --- The Saathi Ready badge ------------------------------------------------------

export interface ReadyStatus {
  ready: boolean;
  /** Modules finished, out of the four. */
  done: number;
  total: number;
  /** When the last module was finished; null until every one is. */
  completedAt: number | null;
}

/** Whether a set of finished modules earns the "Saathi Ready" badge. */
export function readyStatus(
  rows: readonly Pick<Doc<"trainingProgress">, "moduleKey" | "doneAt">[],
): ReadyStatus {
  const needed: readonly TrainingModuleId[] = SAATHI_READY_KEYS.map(
    (key) => `ready:${key}` as const,
  );
  const finished = rows.filter((row) =>
    (needed as readonly string[]).includes(row.moduleKey),
  );
  const done = new Set(finished.map((row) => row.moduleKey)).size;
  const isReady = done === needed.length;
  return {
    ready: isReady,
    done,
    total: needed.length,
    completedAt: isReady ? Math.max(...finished.map((row) => row.doneAt)) : null,
  };
}

const vReadyStatus = v.object({
  ready: v.boolean(),
  done: v.number(),
  total: v.number(),
  completedAt: v.union(v.number(), v.null()),
});

/**
 * A Saathi's "Ready" badge, for the Saathi themself and for the businesses
 * that post jobs. Nobody else can ask — a household never sees a Saathi's
 * record, only the verified badge on their booking.
 */
export const saathiReady = query({
  args: { saathiProfileId: v.id("saathiProfiles") },
  returns: vReadyStatus,
  handler: async (ctx, args) => {
    const profile = await ownProfile(ctx);
    if (!profile) throw new ConvexError("NO_PROFILE");
    const saathi = await ctx.db.get("saathiProfiles", args.saathiProfileId);
    if (!saathi) throw new ConvexError("NOT_FOUND");
    const isSelf = saathi.profileId === profile._id;
    if (!isSelf) {
      const org = await findOrgFor(ctx, profile._id);
      if (!org) throw new ConvexError("WRONG_ROLE");
    }
    return readyStatus(await progressRows(ctx, saathi.profileId));
  },
});

export { TOPICS as SUPPORT_TOPICS };
