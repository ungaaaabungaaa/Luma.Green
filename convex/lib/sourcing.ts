import { ConvexError } from "convex/values";
import { z } from "zod";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { sellerKindFor } from "./chain";
import { demandSchema } from "./ecosystem";
import { isOrdinaryMaterial } from "./materialEligibility";

export const sourcingText = z.string().trim().min(3).max(500);
export const sourcingReference = z.string().trim().min(3).max(120);
export const sourcingQuantity = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
export const planSchema = demandSchema.extend({
  everyDays: z.union([z.literal(7), z.literal(30)]),
});
export const qualificationSchema = z.object({
  sampleReference: sourcingReference,
  specification: sourcingText,
  decision: z.enum(["pending", "approved", "rejected"]),
  validUntil: z.iso.date(),
  reason: sourcingText,
});
export const agreementSchema = z
  .object({
    reference: sourcingReference,
    specification: sourcingText,
    quantityGrams: sourcingQuantity,
    paisePerKg: sourcingQuantity,
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
  })
  .refine((x) => x.startsOn <= x.endsOn);
export const releaseSchema = z.object({
  reference: sourcingReference,
  quantityGrams: sourcingQuantity,
  neededBy: z.iso.date(),
});
export function canSupply(
  supplier: Doc<"orgs">,
  buyer: Doc<"orgs">,
  material: Doc<"materials">,
) {
  const hasScope =
    supplier._id !== buyer._id &&
    supplier.status === "active" &&
    buyer.status === "active" &&
    isOrdinaryMaterial(material) &&
    supplier.families.includes(material.family) &&
    buyer.families.includes(material.family);
  return (
    hasScope &&
    (supplier.kind === sellerKindFor(buyer.kind) ||
      (supplier.kind === "manufacturer" &&
        material.stage === "scrap" &&
        material.byproductEligibility?.hazardStatus === "non_hazardous"))
  );
}
export async function pair(
  ctx: QueryCtx,
  buyerId: Id<"orgs">,
  supplierId: Id<"orgs">,
  code: string,
) {
  const [buyer, supplier, material] = await Promise.all([
    ctx.db.get("orgs", buyerId),
    ctx.db.get("orgs", supplierId),
    ctx.db
      .query("materials")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique(),
  ]);
  if (!buyer || !supplier || !material || !canSupply(supplier, buyer, material))
    throw new ConvexError("MATERIAL_NOT_ALLOWED");
  return { buyer, supplier, material };
}
