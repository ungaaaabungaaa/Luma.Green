import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "rulebook" area — convex/lib/rules.ts explains the
 * model. convex/schema.ts spreads them into the schema and the demo reset
 * clears them. Money is paise and rates are basis points, both integers.
 */

export const vRuleValue = v.union(v.number(), v.string(), v.boolean());

export const vCalendarKind = v.union(
  v.literal("consent"),
  v.literal("scale"),
  v.literal("gstr7"),
  v.literal("gstr8"),
  v.literal("eprReturn"),
  v.literal("eprQuarterly"),
  v.literal("msmeDue"),
  v.literal("darkPatternAudit"),
  v.literal("tradeLicence"),
  v.literal("custom"),
);

export const rulebookTables = {
  /**
   * Every legal threshold, rate and deadline, with history: a new row per
   * change, never an edit. The latest row whose `effectiveFrom` has arrived
   * is the one in force (convex/lib/rules.ts, `activeRule`).
   */
  rules: defineTable({
    key: v.string(),
    value: vRuleValue,
    unit: v.string(),
    effectiveFrom: v.string(), // YYYY-MM-DD, India
    note: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    /** The admin who saved it; none for the seeded defaults. */
    updatedBy: v.optional(v.id("profiles")),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  /**
   * A dated duty for one business, or for the platform when `orgId` is
   * empty. Written by the admin, the demo seed and the reminders cron;
   * recurring filings are generated on the fly and only stored once someone
   * marks them done (`sourceKey` ties the two together).
   */
  calendarEvents: defineTable({
    orgId: v.optional(v.id("orgs")),
    kind: vCalendarKind,
    title: v.string(),
    dueAt: v.string(), // YYYY-MM-DD, India
    done: v.boolean(),
    doneAt: v.optional(v.number()),
    note: v.optional(v.string()),
    /** Stable id of a generated event, so a run of the cron adds it once. */
    sourceKey: v.optional(v.string()),
    /** When the business was told about it (set by the reminders cron). */
    remindedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_dueAt", ["dueAt"])
    .index("by_org_dueAt", ["orgId", "dueAt"])
    .index("by_sourceKey", ["sourceKey"]),
};
