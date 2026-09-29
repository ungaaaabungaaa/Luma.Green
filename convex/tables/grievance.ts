import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "grievance" area: complaints and disputes, the DPDP
 * privacy centre (data requests and consents) and the yearly dark-pattern
 * self-audit the E-Commerce Rules ask for. convex/schema.ts spreads these into
 * the schema and the demo reset clears them.
 */

export const vDisputeSubject = v.union(
  v.literal("booking"),
  v.literal("trade"),
  v.literal("job"),
);

export const vDisputeKind = v.union(
  v.literal("weight"),
  v.literal("payment"),
  v.literal("noShow"),
  v.literal("behaviour"),
  v.literal("quality"),
  v.literal("other"),
);

export const vDisputeStatus = v.union(
  v.literal("open"),
  v.literal("acknowledged"),
  v.literal("resolved"),
  v.literal("appealed"),
  v.literal("closed"),
);

/** Who raised it: the role behind the person, so the desk can sort. */
export const vRaiserRole = v.union(
  v.literal("household"),
  v.literal("kabadiwala"),
  v.literal("yard"),
  v.literal("recycler"),
  v.literal("manufacturer"),
  v.literal("saathi"),
);

export const vDataRequestKind = v.union(
  v.literal("see"),
  v.literal("delete"),
  v.literal("correct"),
);

export const vDataRequestStatus = v.union(
  v.literal("open"),
  v.literal("done"),
);

export const vConsentDocument = v.union(
  v.literal("terms"),
  v.literal("privacy"),
  v.literal("creditRights"),
);

export const grievanceTables = {
  /**
   * A complaint about one pickup, trade or job. Raised by a signed-in
   * business or Saathi, or by a household through its booking token — a
   * dispute never stores the household's phone; the booking keeps that.
   * The clocks follow the E-Commerce Rules: acknowledged within 48 hours,
   * resolved within a month.
   */
  disputes: defineTable({
    raisedByProfileId: v.optional(v.id("profiles")),
    /** A household's booking token, when raised without signing in. */
    raisedByToken: v.optional(v.string()),
    raisedByRole: vRaiserRole,
    /** The business on the other side, when there is one. */
    againstOrgId: v.optional(v.id("orgs")),
    subject: vDisputeSubject,
    /** The booking, trade or job id, as a string. */
    subjectId: v.string(),
    kind: vDisputeKind,
    text: v.string(),
    status: vDisputeStatus,
    ackDueAt: v.number(),
    resolveDueAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    timeline: v.array(
      v.object({
        status: vDisputeStatus,
        at: v.number(),
        note: v.optional(v.string()),
      }),
    ),
    /** The grievance officer's answer, in plain words. */
    resolution: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_raiser", ["raisedByProfileId"])
    .index("by_token", ["raisedByToken"])
    .index("by_subject", ["subject", "subjectId"])
    .index("by_against", ["againstOrgId"])
    .index("by_status", ["status"]),

  /** "Show me / correct / delete my data" — answered within 30 days. */
  dataRequests: defineTable({
    profileId: v.optional(v.id("profiles")),
    phone: v.string(),
    kind: vDataRequestKind,
    /** What to correct, or anything else the person wants to say. */
    note: v.optional(v.string()),
    status: vDataRequestStatus,
    dueAt: v.number(),
    log: v.array(v.object({ at: v.number(), note: v.string() })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_status", ["status"]),

  /** Who accepted which document, at which version, when. Append-only. */
  consents: defineTable({
    profileId: v.id("profiles"),
    role: v.string(),
    documentKey: vConsentDocument,
    version: v.string(),
    at: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_profile_document", ["profileId", "documentKey"]),

  /** The yearly dark-pattern self-audit: one row per year, one item per check. */
  auditSelfChecks: defineTable({
    year: v.number(),
    items: v.array(
      v.object({
        key: v.string(),
        done: v.boolean(),
        note: v.optional(v.string()),
      }),
    ),
    updatedAt: v.number(),
  }).index("by_year", ["year"]),
};
