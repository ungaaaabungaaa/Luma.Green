import { v } from "convex/values";

/** A site describes where material is generated or processed, not who owns it. */
export const SITE_TYPES = [
  "preprocessor_yard",
  "recycling_facility",
  "manufacturing_facility",
  "apartment_community",
  "office",
  "hotel",
  "resort",
  "other",
] as const;
export type SiteType = (typeof SITE_TYPES)[number];

/** Keep industrial byproducts distinct from post-consumer discarded material. */
export const MATERIAL_ORIGINS = [
  "industrial_byproduct",
  "post_consumer",
] as const;
export type MaterialOrigin = (typeof MATERIAL_ORIGINS)[number];

export const vSiteType = v.union(
  v.literal("preprocessor_yard"),
  v.literal("recycling_facility"),
  v.literal("manufacturing_facility"),
  v.literal("apartment_community"),
  v.literal("office"),
  v.literal("hotel"),
  v.literal("resort"),
  v.literal("other"),
);

export const vMaterialOrigin = v.union(
  v.literal("industrial_byproduct"),
  v.literal("post_consumer"),
);

/** Existing organisations have no site field, so keep their known primary site. */
export function primarySiteType(org: {
  kind: "kabadiwala" | "yard" | "recycler" | "manufacturer";
  siteType?: SiteType;
}): SiteType | undefined {
  if (org.siteType) return org.siteType;
  switch (org.kind) {
    case "kabadiwala": {
      return undefined;
    }
    case "yard": {
      return "preprocessor_yard";
    }
    case "recycler": {
      return "recycling_facility";
    }
    case "manufacturer": {
      return "manufacturing_facility";
    }
  }
}
