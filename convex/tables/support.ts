import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "support" area: help, training and feedback.
 * convex/schema.ts spreads them into the schema and the demo reset clears
 * them. Support messages themselves live in the core `supportRequests` table
 * (see `convex/support.ts`).
 */
export const supportTables = {
  /**
   * One row per training module a person has finished — a "Saathi Ready"
   * module (`ready:<key>`) or a lesson of their role's path (`path:<key>`).
   * The ids come from `src/components/help/training-keys.ts`. `score` is
   * how many quiz questions were right first time, out of `QUIZ_QUESTIONS`.
   */
  trainingProgress: defineTable({
    profileId: v.id("profiles"),
    moduleKey: v.string(),
    doneAt: v.number(),
    score: v.optional(v.number()),
  })
    .index("by_profile", ["profileId"])
    .index("by_profile_module", ["profileId", "moduleKey"]),

  /**
   * "Did this help? Yes / No" from a guide, a question or a kit page. `path`
   * is the page (plus `#faq-…` for one question); a "No" may carry a short
   * note. Open to anyone, so no personal data beyond an optional profile.
   */
  helpFeedback: defineTable({
    path: v.string(),
    helpful: v.boolean(),
    note: v.optional(v.string()),
    locale: v.optional(v.string()),
    profileId: v.optional(v.id("profiles")),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_path", ["path"]),
};
