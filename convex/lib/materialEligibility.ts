import type { Doc } from "../_generated/dataModel";

/** Sector references and facility declarations never grant commercial eligibility. */
export function isOrdinaryMaterial(
  material: Doc<"materials"> | null | undefined,
) {
  return (
    material?.active === true &&
    material.byproductEligibility?.hazardStatus !== "hazardous"
  );
}
