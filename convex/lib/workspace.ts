import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";
import { requireUser } from "./access";
import { findProfile } from "./applicationAccess";
import type { OrgKind } from "./chain";

/** The business a person runs (the first, in the prototype), if any. */
export async function findOrgFor(
  ctx: QueryCtx,
  profileId: Doc<"profiles">["_id"],
): Promise<Doc<"orgs"> | null> {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_profile", (q) => q.eq("profileId", profileId))
    .first();
  if (!membership) return null;
  const org = await ctx.db.get("orgs", membership.orgId);
  return org?.status === "active" ? org : null;
}

export async function findSaathiFor(
  ctx: QueryCtx,
  profileId: Doc<"profiles">["_id"],
): Promise<Doc<"saathiProfiles"> | null> {
  const saathi = await ctx.db
    .query("saathiProfiles")
    .withIndex("by_profile", (q) => q.eq("profileId", profileId))
    .unique();
  return saathi?.status === "active" ? saathi : null;
}

/** The signed-in person's profile, or null (signed out, or none yet). */
export async function currentProfile(
  ctx: QueryCtx,
): Promise<Doc<"profiles"> | null> {
  const user = await authComponent.safeGetAuthUser(ctx);
  return user ? findProfile(ctx, user._id) : null;
}

/**
 * The caller's business, when it's one of `kinds`. Every business screen's
 * functions start here: a person only ever sees and changes their own.
 */
export async function requireOrg(
  ctx: QueryCtx,
  kinds?: readonly OrgKind[],
): Promise<{ profile: Doc<"profiles">; org: Doc<"orgs"> }> {
  const user = await requireUser(ctx);
  const profile = await findProfile(ctx, user._id);
  if (!profile) throw new ConvexError("NO_PROFILE");
  const org = await findOrgFor(ctx, profile._id);
  if (!org) throw new ConvexError("NO_BUSINESS");
  if (kinds && !kinds.includes(org.kind)) throw new ConvexError("WRONG_ROLE");
  return { profile, org };
}

export async function requireSaathi(
  ctx: QueryCtx,
): Promise<{ profile: Doc<"profiles">; saathi: Doc<"saathiProfiles"> }> {
  const user = await requireUser(ctx);
  const profile = await findProfile(ctx, user._id);
  if (!profile) throw new ConvexError("NO_PROFILE");
  const saathi = await findSaathiFor(ctx, profile._id);
  if (!saathi) throw new ConvexError("NOT_A_SAATHI");
  return { profile, saathi };
}

/** Material names and CO2e factors by code, for joining into results. */
export async function materialIndex(ctx: QueryCtx) {
  const materials = await ctx.db
    .query("materials")
    .withIndex("by_sortOrder")
    .collect();
  return new Map(materials.map((material) => [material.code, material]));
}
