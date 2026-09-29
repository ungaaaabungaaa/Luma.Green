import { v } from "convex/values";

import { query } from "./_generated/server";
import { findApplication } from "./lib/applicationAccess";
import { vApplicationKind, vApplicationStatus } from "./lib/drafts";
import { vOrgSummary } from "./lib/views";
import { currentProfile, findOrgFor, findSaathiFor } from "./lib/workspace";

/**
 * Where the signed-in person works: their business, their Saathi profile, or
 * nothing yet (then the app sends them to their application). Null when
 * signed out.
 */
export const mine = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ kind: v.literal("org"), org: vOrgSummary }),
    v.object({
      kind: v.literal("saathi"),
      saathi: v.object({
        name: v.string(),
        area: v.string(),
        city: v.string(),
      }),
    }),
    v.object({
      kind: v.literal("none"),
      application: v.union(
        v.null(),
        v.object({ kind: vApplicationKind, status: vApplicationStatus }),
      ),
    }),
  ),
  handler: async (ctx) => {
    const profile = await currentProfile(ctx);
    if (!profile) return null;
    const org = await findOrgFor(ctx, profile._id);
    if (org) {
      return {
        kind: "org" as const,
        org: {
          id: org._id,
          kind: org.kind,
          name: org.name,
          slug: org.slug,
          area: org.area,
          city: org.city,
          offersPickup: org.offersPickup,
          gstin: org.gstin,
        },
      };
    }
    const saathi = await findSaathiFor(ctx, profile._id);
    if (saathi) {
      return {
        kind: "saathi" as const,
        saathi: { name: saathi.name, area: saathi.area, city: saathi.city },
      };
    }
    const application = await findApplication(ctx, profile._id);
    return {
      kind: "none" as const,
      application: application
        ? { kind: application.kind, status: application.status }
        : null,
    };
  },
});
