import { v } from "convex/values";

/** Stakeholders are not trading organisations and have no operational grants. */
export const STAKEHOLDER_KINDS = [
  "city_official",
  "csr_sponsor",
  "lender",
  "independent_auditor",
  "waste_picker_union",
  "apparel_brand",
  "packaging_brand",
] as const;

export type StakeholderKind = (typeof STAKEHOLDER_KINDS)[number];

export const vStakeholderKind = v.union(
  v.literal("city_official"),
  v.literal("csr_sponsor"),
  v.literal("lender"),
  v.literal("independent_auditor"),
  v.literal("waste_picker_union"),
  v.literal("apparel_brand"),
  v.literal("packaging_brand"),
);

export const vStakeholderStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

/** Names are self-declared until an admin verifies the request. */
export function organizationNameOrNull(value: string): string | null {
  const name = value.trim();
  return name.length < 2 || name.length > 120 || /\p{Cc}/u.test(name)
    ? null
    : name;
}
