import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Luma.Green data model — first pass.
 *
 * Three loops share one ledger:
 *   1. Recovery  — material is collected and enters an org's inventory.
 *   2. Trade     — orgs in the same sector list, bid on and settle lots.
 *   3. Carbon    — a settled trade mints credits, which are held then retired.
 *
 * Money is stored in paise (integer) and mass in grams (integer). Never float:
 * a rounding drift in either column is a compliance problem, not a UI bug.
 */

const timestamps = {
  createdAt: v.number(),
  updatedAt: v.number(),
};

/** Where an org sits in the loop. Drives permissions and the default views. */
const orgRole = v.union(
  v.literal("collector"), // picks up material at source
  v.literal("aggregator"), // sorts and bulks it up
  v.literal("recycler"), // processes it back into feedstock
  v.literal("factory"), // consumes recovered feedstock
  v.literal("verifier"), // audits claims, signs off credits
);

/** Broad material family. Grades live on the material record itself. */
const materialFamily = v.union(
  v.literal("plastic"),
  v.literal("paper"),
  v.literal("metal"),
  v.literal("glass"),
  v.literal("ewaste"),
  v.literal("textile"),
  v.literal("organic"),
  v.literal("other"),
);

export default defineSchema({
  users: defineTable({
    authId: v.string(), // subject from the auth provider
    email: v.optional(v.string()),
    phone: v.optional(v.string()), // E.164, the primary identifier in India
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    locale: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_authId", ["authId"])
    .index("by_phone", ["phone"])
    .index("by_email", ["email"]),

  /** A company, co-op or informal collective operating in one sector. */
  orgs: defineTable({
    name: v.string(),
    slug: v.string(),
    role: orgRole,
    /** Industry sector — orgs only see and trade within their own. */
    sector: v.string(),
    gstin: v.optional(v.string()),
    pan: v.optional(v.string()),
    kycStatus: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
    ),
    location: v.optional(
      v.object({
        line1: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        pincode: v.optional(v.string()),
        lat: v.optional(v.number()),
        lng: v.optional(v.number()),
      }),
    ),
    ...timestamps,
  })
    .index("by_slug", ["slug"])
    .index("by_sector", ["sector"])
    .index("by_sector_role", ["sector", "role"]),

  /** Join table: who can act for which org, and how much they can do. */
  memberships: defineTable({
    userId: v.id("users"),
    orgId: v.id("orgs"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("operator"),
      v.literal("viewer"),
    ),
    ...timestamps,
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"])
    .index("by_user_org", ["userId", "orgId"]),

  /** Catalogue of tradeable material types, shared across all orgs. */
  materials: defineTable({
    code: v.string(), // e.g. "PET-CLEAR-A"
    family: materialFamily,
    name: v.string(),
    grade: v.optional(v.string()),
    /** kg CO2e avoided per kg recycled vs virgin production. */
    co2eFactorPerKg: v.number(),
    /** Source of that factor — every credit must trace back to a citation. */
    factorSource: v.string(),
    active: v.boolean(),
    ...timestamps,
  })
    .index("by_code", ["code"])
    .index("by_family", ["family"]),

  /** Current stock of one material at one org. */
  inventory: defineTable({
    orgId: v.id("orgs"),
    materialId: v.id("materials"),
    quantityGrams: v.number(),
    reservedGrams: v.number(), // committed to open trades
    warehouse: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_org", ["orgId"])
    .index("by_org_material", ["orgId", "materialId"]),

  /** Append-only record of every stock change. Inventory is derived from this. */
  inventoryMovements: defineTable({
    orgId: v.id("orgs"),
    materialId: v.id("materials"),
    deltaGrams: v.number(), // signed
    reason: v.union(
      v.literal("collection"),
      v.literal("purchase"),
      v.literal("sale"),
      v.literal("processing_loss"),
      v.literal("adjustment"),
      v.literal("write_off"),
    ),
    tradeId: v.optional(v.id("trades")),
    note: v.optional(v.string()),
    actorUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_created", ["orgId", "createdAt"])
    .index("by_trade", ["tradeId"]),

  /** An offer to buy or sell a lot, visible to the seller's sector. */
  listings: defineTable({
    orgId: v.id("orgs"),
    materialId: v.id("materials"),
    side: v.union(v.literal("sell"), v.literal("buy")),
    quantityGrams: v.number(),
    pricePerKgPaise: v.number(),
    minQuantityGrams: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("partially_filled"),
      v.literal("filled"),
      v.literal("cancelled"),
      v.literal("expired"),
    ),
    expiresAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_material_status", ["materialId", "status"]),

  /** A matched buy/sell, from agreement through settlement. */
  trades: defineTable({
    listingId: v.id("listings"),
    buyerOrgId: v.id("orgs"),
    sellerOrgId: v.id("orgs"),
    materialId: v.id("materials"),
    quantityGrams: v.number(),
    pricePerKgPaise: v.number(),
    totalPaise: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("in_transit"),
      v.literal("delivered"),
      v.literal("settled"),
      v.literal("disputed"),
      v.literal("cancelled"),
    ),
    paymentRef: v.optional(v.string()), // Razorpay order/payment id
    settledAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_buyer", ["buyerOrgId"])
    .index("by_seller", ["sellerOrgId"])
    .index("by_status", ["status"])
    .index("by_listing", ["listingId"]),

  /**
   * Credits minted from a settled trade. `kgCo2e` is computed from the
   * material factor at settlement time and frozen — later factor revisions
   * must not silently restate credits that are already issued.
   */
  carbonCredits: defineTable({
    orgId: v.id("orgs"),
    tradeId: v.optional(v.id("trades")),
    materialId: v.id("materials"),
    kgCo2e: v.number(),
    factorUsed: v.number(),
    vintageYear: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_verification"),
      v.literal("issued"),
      v.literal("listed"),
      v.literal("transferred"),
      v.literal("retired"),
      v.literal("rejected"),
    ),
    verifierOrgId: v.optional(v.id("orgs")),
    verifiedAt: v.optional(v.number()),
    serial: v.string(), // human-readable, unique, printed on certificates
    ...timestamps,
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_serial", ["serial"])
    .index("by_trade", ["tradeId"]),

  /** Every movement of a credit between orgs, plus its final retirement. */
  creditTransfers: defineTable({
    creditId: v.id("carbonCredits"),
    fromOrgId: v.optional(v.id("orgs")), // absent = issuance
    toOrgId: v.optional(v.id("orgs")), // absent = retirement
    kgCo2e: v.number(),
    pricePaise: v.optional(v.number()),
    kind: v.union(
      v.literal("issue"),
      v.literal("transfer"),
      v.literal("retire"),
    ),
    retirementReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_credit", ["creditId"])
    .index("by_from", ["fromOrgId"])
    .index("by_to", ["toOrgId"]),

  /** Immutable audit trail. Anything a regulator could ask about lands here. */
  auditLog: defineTable({
    orgId: v.optional(v.id("orgs")),
    actorUserId: v.optional(v.id("users")),
    action: v.string(), // "trade.settled", "credit.retired", …
    entityTable: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org_created", ["orgId", "createdAt"])
    .index("by_entity", ["entityTable", "entityId"]),
});
