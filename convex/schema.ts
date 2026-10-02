import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  draftSections,
  vApplicationKind,
  vApplicationStatus,
  vFileType,
  vRadius,
  vSaathiTime,
  vSaathiVehicle,
  vSaathiWork,
  vShopVehicle,
  vWeekday,
} from "./lib/drafts";
import { vIntegrationScope } from "./lib/integrations";
import {
  vNotificationEvent,
  vNotificationStatus,
} from "./lib/notificationConfig";
import {
  vBookingStatus,
  vFamily,
  vOrgKind,
  vTradeStatus,
} from "./lib/validators";

/**
 * Luma.Green data model — docs/architecture/data-model.md.
 *
 * Material moves up the chain: households → kabadiwalas → yards → recyclers
 * → manufacturers. Each step is on the ledger: bookings and receipts, stock,
 * listings and trades.
 *
 * Money is stored in paise (integer) and mass in grams (integer). Never float:
 * a rounding drift in either column is a compliance problem, not a UI bug.
 */

const timestamps = {
  createdAt: v.number(),
  updatedAt: v.number(),
};

export default defineSchema({
  /** Private account inbox. Event labels are translated when displayed. */
  inbox: defineTable({
    profileId: v.id("profiles"),
    dedupKey: v.string(),
    event: vNotificationEvent,
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_dedupKey", ["dedupKey"])
    .index("by_profile_created", ["profileId", "createdAt"])
    .index("by_profile_read", ["profileId", "read"]),

  /** Secrets are only returned to an internal delivery action, never a client. */
  pushDevices: defineTable({
    profileId: v.id("profiles"),
    installationId: v.string(),
    fingerprint: v.string(),
    channel: v.union(v.literal("web"), v.literal("expo")),
    endpoint: v.string(),
    keys: v.optional(v.object({ p256dh: v.string(), auth: v.string() })),
    locale: v.string(),
    expiresAt: v.number(),
    ...timestamps,
  })
    .index("by_fingerprint", ["fingerprint"])
    .index("by_profile", ["profileId"])
    .index("by_profile_installation", ["profileId", "installationId"]),

  pushLimits: defineTable({
    profileId: v.id("profiles"),
    windowStart: v.number(),
    registrations: v.number(),
  }).index("by_profile", ["profileId"]),

  /** A send is claimed once. Unknown delivery is never automatically retried. */
  pushDeliveries: defineTable({
    inboxId: v.id("inbox"),
    deviceId: v.id("pushDevices"),
    profileId: v.id("profiles"),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("accepted"),
      v.literal("failed"),
      v.literal("unknown"),
      v.literal("cancelled"),
    ),
    attemptedAt: v.optional(v.number()),
    receiptId: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_inbox_device", ["inboxId", "deviceId"])
    .index("by_profile_attemptedAt", ["profileId", "attemptedAt"]),

  /** Transactional SMS events. No phone, tracking token, OTP or provider body. */
  smsNotifications: defineTable({
    dedupKey: v.string(),
    attemptedAt: v.optional(v.number()),
    event: vNotificationEvent,
    status: vNotificationStatus,
    profileId: v.id("profiles"),
    locale: v.string(),
    revision: v.number(),
    bookingId: v.optional(v.id("bookings")),
    applicationId: v.optional(v.id("applications")),
    orgId: v.optional(v.id("orgs")),
    templateId: v.optional(v.string()),
    templateLocale: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_dedupKey", ["dedupKey"])
    .index("by_profile_attemptedAt", ["profileId", "attemptedAt"])
    .index("by_status_updatedAt", ["status", "updatedAt"]),

  /**
   * One row per signed-in person, linked to their Better Auth user (which
   * lives inside the auth component). `kind` separates platform staff from
   * everyone else — see docs/architecture/auth.md.
   */
  profiles: defineTable({
    authUserId: v.string(),
    phone: v.optional(v.string()), // E.164, verified by SMS code
    kind: v.union(v.literal("member"), v.literal("admin")),
    locale: v.string(),
    ...timestamps,
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_phone", ["phone"]),

  /**
   * The one admin's identity record. Never used to sign in, and never a full
   * Aadhaar number — only the last four digits (docs/operations/data-protection.md).
   */
  adminProfiles: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    dateOfBirth: v.string(), // YYYY-MM-DD
    aadhaarLast4: v.string(),
    ...timestamps,
  }).index("by_profileId", ["profileId"]),

  /**
   * One per person joining as a business or a Saathi — docs/product/onboarding.md.
   * The form is saved here as a draft while they fill it in; the business or
   * Saathi record itself is created when the admin approves.
   */
  applications: defineTable({
    profileId: v.id("profiles"),
    kind: vApplicationKind,
    status: vApplicationStatus,
    /** Goes up by one on every submit; 0 while never sent. */
    version: v.number(),
    locale: v.string(),
    ageConfirmedAt: v.number(),
    privacyAcceptedAt: v.number(),
    ...draftSections,
    submittedAt: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    decidedBy: v.optional(v.id("profiles")),
    /** The admin's note on changes requested or a rejection. */
    note: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_profile", ["profileId"])
    .index("by_status_submittedAt", ["status", "submittedAt"])
    .index("by_submittedAt", ["submittedAt"]),

  /** What was sent at each version, so the admin can see what changed. */
  applicationSnapshots: defineTable({
    applicationId: v.id("applications"),
    version: v.number(),
    ...draftSections,
    fileIds: v.array(v.id("applicationFiles")),
    submittedAt: v.number(),
  }).index("by_application_version", ["applicationId", "version"]),

  /**
   * Uploads: PCB certificates, machine photos and videos, photo IDs, selfies.
   * Private — served only through a permission-checked HTTP action, never a
   * storage URL. A file that was part of a submitted version is only marked
   * removed, so earlier versions stay complete.
   */
  applicationFiles: defineTable({
    applicationId: v.id("applications"),
    profileId: v.id("profiles"),
    type: vFileType,
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    firstSubmittedVersion: v.optional(v.number()),
    removedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_application", ["applicationId"])
    .index("by_storageId", ["storageId"]),

  // --- Catalogue and prices ------------------------------------------------

  /**
   * The material catalogue — Luma.Green's shared material codes. Names are
   * data (per language, English as the fallback), so adding a material needs
   * no code change: edit convex/lib/catalogue.ts and re-run the seed.
   */
  materials: defineTable({
    code: v.string(), // e.g. "PAPER-NEWS"
    family: vFamily,
    stage: v.union(v.literal("scrap"), v.literal("recycled")),
    names: v.record(v.string(), v.string()), // locale → name
    /** kg CO2e avoided per kg recycled instead of made new (indicative). */
    co2eFactor: v.number(),
    sortOrder: v.number(),
    active: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_sortOrder", ["sortOrder"]),

  /** The admin's floor and fallback price per material per city. */
  referencePrices: defineTable({
    city: v.string(),
    materialCode: v.string(),
    floorPaise: v.number(), // per kg; a kabadiwala can't offer less
    fallbackPaise: v.number(), // per kg; used when a shop hasn't set a price
    updatedAt: v.number(),
  }).index("by_city_material", ["city", "materialCode"]),

  /** The daily market price per material per city, for the price board. */
  marketPrices: defineTable({
    city: v.string(),
    materialCode: v.string(),
    date: v.string(), // YYYY-MM-DD, India time
    paisePerKg: v.number(),
  }).index("by_city_material_date", ["city", "materialCode", "date"]),

  /** What one shop pays households, per material. */
  rateCards: defineTable({
    orgId: v.id("orgs"),
    materialCode: v.string(),
    paisePerKg: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_material", ["orgId", "materialCode"])
    .index("by_material", ["materialCode"]),

  // --- Businesses and Saathis -----------------------------------------------

  /** An approved business: created when the admin approves its application. */
  orgs: defineTable({
    kind: vOrgKind,
    name: v.string(),
    slug: v.string(),
    status: v.union(v.literal("active"), v.literal("suspended")),
    ownerProfileId: v.optional(v.id("profiles")),
    applicationId: v.optional(v.id("applications")),
    city: v.string(),
    area: v.string(),
    address: v.string(),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    phones: v.array(v.object({ number: v.string(), label: v.string() })),
    hours: v.optional(v.object({ opens: v.string(), closes: v.string() })),
    weeklyOff: v.array(vWeekday),
    gstin: v.optional(v.string()),
    families: v.array(vFamily),
    offersPickup: v.boolean(),
    autoAccept: v.optional(v.boolean()),
    pickupRadiusKm: v.optional(v.number()),
    vehicle: v.optional(vShopVehicle),
    consent: v.optional(
      v.object({
        board: v.string(),
        number: v.string(),
        validUntil: v.string(),
      }),
    ),
    ...timestamps,
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerProfileId"])
    .index("by_kind_city", ["kind", "city", "status"])
    .index("by_kind_city_pickup", ["kind", "city", "status", "offersPickup"]),

  /** Who can act for which business. */
  memberships: defineTable({
    profileId: v.id("profiles"),
    orgId: v.id("orgs"),
    role: v.union(v.literal("owner"), v.literal("staff")),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_org", ["orgId"])
    .index("by_org_profile", ["orgId", "profileId"]),

  /** Machine credentials. Plain tokens are returned once and never stored. */
  integrationKeys: defineTable({
    orgId: v.id("orgs"),
    issuerProfileId: v.id("profiles"),
    label: v.string(),
    prefix: v.string(),
    keyHash: v.string(),
    scopes: v.array(vIntegrationScope),
    createdAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    windowStartedAt: v.number(),
    requestsInWindow: v.number(),
  })
    .index("by_hash", ["keyHash"])
    .index("by_org_created", ["orgId", "createdAt"])
    .index("by_org_revoked_expires", ["orgId", "revokedAt", "expiresAt"]),

  /** One fixed-window request counter per business, shared by all its keys. */
  integrationUsage: defineTable({
    orgId: v.id("orgs"),
    windowStartedAt: v.number(),
    requestsInWindow: v.number(),
  }).index("by_org", ["orgId"]),

  /** Fixed global cost bound for optional industry-news provider requests. */
  integrationNewsQuota: defineTable({
    key: v.literal("global"),
    startedAt: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  /** An approved Saathi. */
  saathiProfiles: defineTable({
    profileId: v.id("profiles"),
    applicationId: v.optional(v.id("applications")),
    name: v.string(),
    city: v.string(),
    area: v.string(),
    radiusKm: vRadius,
    workTypes: v.array(vSaathiWork),
    vehicle: vSaathiVehicle,
    times: v.array(vSaathiTime),
    days: v.array(vWeekday),
    status: v.union(v.literal("active"), v.literal("suspended")),
    createdAt: v.number(),
  }).index("by_profile", ["profileId"]),

  // --- Household pickups ------------------------------------------------------

  /** A household's pickup or drop-off, tracked at /t/{token}. */
  bookings: defineTable({
    token: v.string(),
    householdProfileId: v.optional(v.id("profiles")),
    phone: v.string(),
    name: v.optional(v.string()),
    mode: v.union(v.literal("pickup"), v.literal("dropoff")),
    items: v.array(v.object({ materialCode: v.string(), estKg: v.number() })),
    estimatePaise: v.number(),
    orgId: v.id("orgs"),
    slotDate: v.string(), // YYYY-MM-DD
    slotWindow: vSaathiTime,
    address: v.optional(v.string()),
    dispatch: v.optional(
      v.object({
        attempt: v.number(),
        offeredAt: v.number(),
        expiresAt: v.optional(v.number()),
        attemptedOrgIds: v.array(v.id("orgs")),
        origin: v.optional(v.object({ lat: v.number(), lng: v.number() })),
        approximateLocation: v.boolean(),
      }),
    ),
    status: vBookingStatus,
    timeline: v.array(v.object({ status: vBookingStatus, at: v.number() })),
    receipt: v.optional(
      v.object({
        lines: v.array(
          v.object({
            materialCode: v.string(),
            grams: v.number(),
            paisePerKg: v.number(),
            paise: v.number(),
          }),
        ),
        totalPaise: v.number(),
        method: v.union(v.literal("cash"), v.literal("upi")),
        paidAt: v.number(),
      }),
    ),
    points: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_token", ["token"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_household", ["householdProfileId"])
    .index("by_createdAt", ["createdAt"]),

  /** Immutable offer events; a booking can pass through several shops. */
  bookingOffers: defineTable({
    bookingId: v.id("bookings"),
    orgId: v.id("orgs"),
    attempt: v.number(),
    event: v.union(
      v.literal("offered"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("timed_out"),
    ),
    createdAt: v.number(),
  }).index("by_booking", ["bookingId"]),

  /** Internal SMS send limits. Phone numbers are hashed before insertion. */
  smsRateLimits: defineTable({
    phoneHash: v.string(),
    sentAt: v.array(v.number()),
  }).index("by_phone_hash", ["phoneHash"]),

  /** Short-lived hashed request counters only. No photos or model responses. */
  photoEstimateQuota: defineTable({
    key: v.literal("global"),
    cleanupScheduledAt: v.optional(v.number()),
    reservations: v.array(
      v.object({
        at: v.number(),
        deviceHash: v.string(),
        phoneHash: v.optional(v.string()),
      }),
    ),
  }).index("by_key", ["key"]),

  // --- Stock and trade --------------------------------------------------------

  /** Stock of one material at one business. */
  inventory: defineTable({
    orgId: v.id("orgs"),
    materialCode: v.string(),
    grams: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_material", ["orgId", "materialCode"]),

  /** A lot offered to the next business up the chain. */
  listings: defineTable({
    orgId: v.id("orgs"),
    sellerKind: vOrgKind,
    materialCode: v.string(),
    grams: v.number(),
    askPaisePerKg: v.number(),
    city: v.string(),
    note: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("sold"),
      v.literal("withdrawn"),
    ),
    ...timestamps,
  })
    .index("by_status_kind", ["status", "sellerKind"])
    .index("by_org", ["orgId"]),

  /**
   * A purchase between two businesses. Money is held in escrow (simulated in
   * the prototype) from payment until the buyer confirms delivery.
   */
  trades: defineTable({
    listingId: v.id("listings"),
    sellerOrgId: v.id("orgs"),
    buyerOrgId: v.id("orgs"),
    materialCode: v.string(),
    grams: v.number(),
    paisePerKg: v.number(),
    totalPaise: v.number(),
    status: vTradeStatus,
    timeline: v.array(v.object({ status: vTradeStatus, at: v.number() })),
    invoiceNo: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_seller", ["sellerOrgId"])
    .index("by_buyer", ["buyerOrgId"])
    .index("by_listing", ["listingId"]),

  // --- Saathi work --------------------------------------------------------------

  /** Paid work a business posts for Saathis. */
  jobs: defineTable({
    orgId: v.optional(v.id("orgs")),
    kind: vSaathiWork,
    title: v.string(),
    area: v.string(),
    date: v.string(),
    window: vSaathiTime,
    payPaise: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("assigned"),
      v.literal("done"),
    ),
    saathiProfileId: v.optional(v.id("saathiProfiles")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_saathi", ["saathiProfileId"]),

  // --- Help -----------------------------------------------------------------------

  /** Messages from the help centre and the solar page, for the team to answer. */
  supportRequests: defineTable({
    profileId: v.optional(v.id("profiles")),
    name: v.string(),
    phone: v.string(),
    role: v.string(),
    topic: v.string(),
    message: v.string(),
    status: v.union(v.literal("open"), v.literal("answered")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_phone_createdAt", ["phone", "createdAt"]),

  /** Immutable audit trail. Anything a regulator could ask about lands here. */
  auditLog: defineTable({
    orgId: v.optional(v.id("orgs")),
    /** The signed-in person behind the change. */
    actorProfileId: v.optional(v.id("profiles")),
    action: v.string(), // "trade.settled", "credit.retired", …
    entityTable: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org_created", ["orgId", "createdAt"])
    .index("by_entity", ["entityTable", "entityId"]),
});
