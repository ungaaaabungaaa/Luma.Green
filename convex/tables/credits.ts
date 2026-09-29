import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tables owned by the "credits" area: the honest impact ledger's own records.
 * Nothing here mints a credit — only a registry (Verra, Gold Standard, PCX or
 * BEE through Grid-India) issues one. These rows hold what a verifier would
 * ask for: each lot claimed under one route, the energy and fuel behind it,
 * who assigned their credit rights, and what they handled before joining.
 * Money stays in paise and mass in grams.
 */

/** The three routes a lot can be claimed under. Never more than one per trade. */
export const vCreditRegime = v.union(
  v.literal("epr"),
  v.literal("plastic"),
  v.literal("carbon"),
);

/**
 * estimated: claimed, evidence still incomplete. ready: every check passed.
 * issued: a registry issued a credit for it (set by the platform team, never
 * by a business).
 */
export const vClaimStatus = v.union(
  v.literal("estimated"),
  v.literal("ready"),
  v.literal("issued"),
);

export const creditsTables = {
  /** Electricity and diesel a business used in a month, as a verifier asks. */
  energyLogs: defineTable({
    orgId: v.id("orgs"),
    /** YYYY-MM, India time. One row per business and month. */
    month: v.string(),
    /** Whole units (kWh) from the electricity bill. */
    kwh: v.number(),
    /** Whole litres of diesel, for vehicles and generators. */
    dieselLitres: v.number(),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org_month", ["orgId", "month"]),

  /**
   * One claim per trade, across every route: the double-counting guard the
   * Indian rules leave to the platform. The factor is frozen at claim time so
   * a later revision never restates it (AGENTS.md §1).
   */
  creditClaims: defineTable({
    orgId: v.id("orgs"),
    tradeId: v.id("trades"),
    regime: vCreditRegime,
    status: vClaimStatus,
    /** The evidence checklist as it stood when the claim was made. */
    evidence: v.array(v.object({ key: v.string(), ok: v.boolean() })),
    materialCode: v.string(),
    grams: v.number(),
    /** kg CO2e per kg used for the estimate, frozen with the claim. */
    factorUsed: v.number(),
    claimedBy: v.id("profiles"),
    at: v.number(),
  })
    .index("by_trade", ["tradeId"])
    .index("by_org", ["orgId"]),

  /**
   * A business's assignment of the environmental attributes of what it
   * records, for pooled registration, in return for the published share.
   * Revocable until a project registers; then it's ownership evidence.
   */
  creditRights: defineTable({
    orgId: v.id("orgs"),
    accepted: v.boolean(),
    /** Which wording was accepted; changes when the clause or share changes. */
    version: v.string(),
    /** The share as it was stated, kept with the acceptance. */
    shareNote: v.string(),
    at: v.number(),
  }).index("by_org", ["orgId"]),

  /** What the business handled before joining, in its own words. */
  baselineDeclarations: defineTable({
    orgId: v.id("orgs"),
    text: v.string(),
    at: v.number(),
  }).index("by_org", ["orgId"]),

  /**
   * Months of the scrap index from before the platform's own receipts: the
   * public index computes recent months live from the ledger and shows these
   * beside them, marked as sample data until real months replace them.
   */
  scrapIndexHistory: defineTable({
    city: v.string(),
    materialCode: v.string(),
    /** YYYY-MM */
    month: v.string(),
    householdPaise: v.union(v.number(), v.null()),
    yardPaise: v.union(v.number(), v.null()),
    receipts: v.number(),
    trades: v.number(),
  }).index("by_city_month", ["city", "month"]),
};
