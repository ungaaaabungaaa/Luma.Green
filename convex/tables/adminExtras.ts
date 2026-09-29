import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "adminExtras" area: the admin console's own records.
 * convex/schema.ts spreads them into the schema and the demo reset clears
 * them. Every write here also lands in `auditLog`.
 */

/** What a note can be pinned to. */
export const vNoteSubject = v.union(
  v.literal("org"),
  v.literal("profile"),
  v.literal("booking"),
  v.literal("trade"),
);

export const adminExtrasTables = {
  /**
   * The admin's private notes on a business, a person, a pickup or a trade:
   * what was said on the phone, what to check next time. Never shown to the
   * subject.
   */
  adminNotes: defineTable({
    subject: vNoteSubject,
    /** The subject's document id, as a string so one index serves all four. */
    subjectId: v.string(),
    text: v.string(),
    byProfileId: v.id("profiles"),
    at: v.number(),
  }).index("by_subject", ["subject", "subjectId"]),

  /**
   * One row per time a business is paused. `until` is set when the admin
   * lifts it; a row without `until` is the suspension in force. The org's
   * own `status` is what the trading functions check (requireOrg refuses a
   * suspended business); this is the record of why.
   */
  suspensions: defineTable({
    orgId: v.id("orgs"),
    reason: v.string(),
    from: v.number(),
    until: v.optional(v.number()),
    byProfileId: v.id("profiles"),
    liftedByProfileId: v.optional(v.id("profiles")),
    liftNote: v.optional(v.string()),
  }).index("by_org", ["orgId"]),
};
