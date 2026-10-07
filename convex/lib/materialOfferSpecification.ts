import { v } from "convex/values";

/** Seller declaration frozen into the order; no lab or origin verification. */
export const vOfferSpecificationInput = v.object({
  grade: v.string(),
  specification: v.string(),
  lotId: v.optional(v.id("materialLots")),
});
export const vMaterialOfferSpecification = v.object({
  grade: v.string(),
  specification: v.string(),
  lotId: v.optional(v.id("materialLots")),
  lotState: v.optional(v.string()),
  source: v.literal("seller_declared"),
});

/** A declared class only narrows evidence links; material approval stays independent. */
export function hasOfferLotClassification(lot: {
  streamClass?: string;
  handlingClass?: string;
}) {
  return (
    lot.handlingClass === "non_hazardous" &&
    ["main_product", "saleable_byproduct", "recoverable_waste"].includes(
      lot.streamClass ?? "",
    )
  );
}
