import { v } from "convex/values";

/** External records are reported by users; Luma does not issue them. */
export const vEvidenceKind = v.union(
  v.literal("gst_invoice"),
  v.literal("eway_bill"),
  v.literal("cpcb_epr_certificate"),
  v.literal("pollution_consent"),
);

/** A trade party or named body that issued the referenced document. */
export const vEvidenceIssuerKind = v.union(
  v.literal("trade_seller"),
  v.literal("trade_buyer"),
  v.literal("external_authority"),
  v.literal("external_organization"),
);

export function cleanEvidenceText(
  value: string,
  maxLength: number,
): string | null {
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= maxLength ? cleaned : null;
}
