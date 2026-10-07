import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { sellerKindFor } from "./chain";
import { demandSchema } from "./ecosystem";
import { isOrdinaryMaterial } from "./materialEligibility";
export function canDemand(org: Doc<"orgs">, material: Doc<"materials">) {
  return (
    isOrdinaryMaterial(material) &&
    org.families.includes(material.family) &&
    (sellerKindFor(org.kind) !== null ||
      (material.stage === "scrap" &&
        material.byproductEligibility?.hazardStatus === "non_hazardous"))
  );
}
export async function createDemand(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  profile: Doc<"profiles">,
  args: unknown,
) {
  const parsed = demandSchema.safeParse(args);
  if (!parsed.success) throw new ConvexError("INVALID_DEMAND");
  const material = await ctx.db
    .query("materials")
    .withIndex("by_code", (q) => q.eq("code", parsed.data.materialCode))
    .unique();
  if (material && sellerKindFor(org.kind) === null && !canDemand(org, material))
    throw new ConvexError("WRONG_ROLE");
  if (!material || !canDemand(org, material))
    throw new ConvexError("MATERIAL_NOT_ALLOWED");
  const recent = await ctx.db
    .query("materialDemands")
    .withIndex("by_org", (q) => q.eq("orgId", org._id))
    .order("desc")
    .take(1);
  const now = Date.now();
  if (recent[0] && now - recent[0].createdAt < 10_000)
    throw new ConvexError("TRY_LATER");
  const id = await ctx.db.insert("materialDemands", {
    ...parsed.data,
    city: org.city,
    buyerKind: org.kind,
    family: material.family,
    orgId: org._id,
    createdBy: profile._id,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("auditLog", {
    orgId: org._id,
    actorProfileId: profile._id,
    action: "demand.posted",
    entityTable: "materialDemands",
    entityId: id,
    createdAt: now,
  });
  return id;
}
