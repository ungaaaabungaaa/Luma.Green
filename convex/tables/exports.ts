import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "exports" area: the paperwork each side records on a
 * trade, and the history of files a business has downloaded. Reports
 * themselves (Tally vouchers, CPCB registers and returns) are computed from
 * the core tables — trades, bookings, inventory, orgs — and never stored.
 */

/** The reports a business can download from /app/exports. */
export const vExportKind = v.union(
  v.literal("tally"),
  v.literal("eprPurchaseRegister"),
  v.literal("swmQuarterly"),
  v.literal("monthlyRecyclables"),
  v.literal("evidencePack"),
);

export const exportsTables = {
  /**
   * One party's documents on one trade. The buyer records its purchase order
   * and goods receipt note; the seller its e-invoice IRN, vehicle and driver;
   * whoever raises the e-way bill records its number. Either side reads both
   * rows; each edits only its own.
   */
  tradeDocuments: defineTable({
    tradeId: v.id("trades"),
    orgId: v.id("orgs"),
    poNumber: v.optional(v.string()),
    grnNumber: v.optional(v.string()),
    /** 12 digits, from the GST e-way bill portal. */
    ewayBillNo: v.optional(v.string()),
    /** The 64-character Invoice Reference Number of a GST e-invoice. */
    irn: v.optional(v.string()),
    /** Registration plate, upper case without spaces: KA01AB1234. */
    vehicleNo: v.optional(v.string()),
    /** E.164, so the buyer's gate can call. */
    driverPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_trade", ["tradeId"])
    .index("by_trade_org", ["tradeId", "orgId"]),

  /** A file a business downloaded: what, for which period, how many rows. */
  exportRuns: defineTable({
    orgId: v.id("orgs"),
    kind: vExportKind,
    /** YYYY-MM, YYYY-Qn (financial-year quarter) or a trade id. */
    period: v.string(),
    rows: v.number(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),
};
