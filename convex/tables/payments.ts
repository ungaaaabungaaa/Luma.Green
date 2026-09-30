import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "payments" area: the khata (credit ledger) between
 * businesses, every payment reference, and the declarations that decide
 * which tax rules apply to a trade. Money is integer paise throughout.
 *
 * The pilot moves no money (docs/plan.md, "Payments"): these tables record
 * cash, UPI and bank references that people exchange off the platform. The
 * escrow step is simulated and its payments carry a made-up reference.
 */

/** What a payment settles. */
export const vPaymentSubject = v.union(
  v.literal("booking"),
  v.literal("trade"),
  v.literal("job"),
);

export const vPaymentSubjectId = v.union(
  v.id("bookings"),
  v.id("trades"),
  v.id("jobs"),
);

/** How the money moved. `escrow` is the prototype's simulated hold. */
export const vPaymentMethod = v.union(
  v.literal("cash"),
  v.literal("upi"),
  v.literal("neft"),
  v.literal("imps"),
  v.literal("rtgs"),
  v.literal("escrow"),
);

export const vLedgerDirection = v.union(
  v.literal("receivable"),
  v.literal("payable"),
);

export const vLedgerStatus = v.union(
  v.literal("open"),
  v.literal("part"),
  v.literal("settled"),
  v.literal("overdue"),
);

/**
 * What a business declares about itself, and the values each kind takes:
 * manufacturingUse yes | no (Form 27C: bought for manufacturing, so no TCS);
 * gstStatus registered | unregistered | composition;
 * msme none | micro | small | medium (Udyam category; micro and small get
 * the 45-day payment rule).
 */
export const vDeclarationKind = v.union(
  v.literal("manufacturingUse"),
  v.literal("gstStatus"),
  v.literal("msme"),
);

export const paymentsTables = {
  /** One row per payment (or part payment) anyone recorded, with its reference. */
  payments: defineTable({
    subject: vPaymentSubject,
    subjectId: vPaymentSubjectId,
    method: vPaymentMethod,
    /** UPI reference, bank UTR, or the simulated escrow reference. */
    reference: v.optional(v.string()),
    amountPaise: v.number(),
    paidAt: v.number(),
    /** The paying business; none when a household paid (never in the pilot). */
    fromOrgId: v.optional(v.id("orgs")),
    /** The receiving business; none when a household or a Saathi was paid. */
    toOrgId: v.optional(v.id("orgs")),
    /** Who recorded it. */
    byProfileId: v.id("profiles"),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_subject", ["subject", "subjectId"])
    .index("by_from_paidAt", ["fromOrgId", "paidAt"])
    .index("by_to_paidAt", ["toOrgId", "paidAt"]),

  /**
   * The khata: what one business is owed (receivable) or owes (payable) on a
   * trade. A trade has one row for each side, kept in step by every payment.
   * `status` is what was true at the last write; readers recompute overdue
   * against the clock with ledgerStatus() from convex/lib/tax.ts.
   */
  ledgerEntries: defineTable({
    orgId: v.id("orgs"),
    counterpartyOrgId: v.id("orgs"),
    tradeId: v.id("trades"),
    direction: vLedgerDirection,
    duePaise: v.number(),
    paidPaise: v.number(),
    dueAt: v.number(),
    status: vLedgerStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_counterparty", ["orgId", "counterpartyOrgId"])
    .index("by_trade", ["tradeId"]),

  /** A business's standing declarations; the newest per kind applies. */
  declarations: defineTable({
    orgId: v.id("orgs"),
    kind: vDeclarationKind,
    value: v.string(),
    /** YYYY-MM-DD, India time. */
    validFrom: v.string(),
    byProfileId: v.id("profiles"),
    createdAt: v.number(),
  }).index("by_org_kind", ["orgId", "kind", "validFrom"]),
};
