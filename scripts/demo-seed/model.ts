import { z } from "zod";

const id = z.string().regex(/^demo:[a-z0-9:_-]+$/u);
const integer = z.number().int();
const nonnegative = integer.min(0);
const positive = integer.positive();
const date = z.iso.date();
export const families = [
  "paper",
  "plastic",
  "metal",
  "glass",
  "ewaste",
  "other",
] as const;
export const businessKinds = [
  "kabadiwala",
  "yard",
  "recycler",
  "manufacturer",
] as const;
export const tradeStatuses = [
  "requested",
  "accepted",
  "paid_to_escrow",
  "dispatched",
  "completed",
  "declined",
] as const;
export const bookingStatuses = [
  "requested",
  "accepted",
  "on_the_way",
  "completed",
  "declined",
  "cancelled",
] as const;
export const applicationKinds = [
  "kabadiwala",
  "yard",
  "recycler",
  "manufacturer",
  "saathi",
] as const;
export const applicationStatuses = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "rejected",
  "suspended",
] as const;
export const jobKinds = [
  "home_pickups",
  "shop_help",
  "yard_sorting",
  "factory_shifts",
] as const;
const timeline = z
  .array(z.strictObject({ status: z.string(), at: z.iso.datetime() }))
  .min(1);
const material = z.strictObject({
  code: z.string(),
  family: z.enum(families),
  stage: z.enum(["scrap", "recycled"]),
  name: z.string().min(1),
  floorPaise: positive,
  samplePaise: positive,
});
const user = z.strictObject({
  id,
  role: z.enum(["business-owner", "household", "saathi", "applicant"]),
  name: z.string().startsWith("Demo "),
  identityTag: z.string().regex(/^demo-identity:[a-z0-9:-]+$/u),
});
const business = z.strictObject({
  id,
  ownerId: id,
  kind: z.enum(businessKinds),
  family: z.enum(families),
  name: z.string().startsWith("Demo "),
  area: z.string().startsWith("Demo Bengaluru Zone "),
  hours: z.literal("09:00–18:00"),
  readiness: z.enum(["offline-example", "pending-schema"]),
});
const price = z.strictObject({
  id,
  materialCode: z.string(),
  date,
  paisePerKg: positive,
  floorPaise: positive,
});
const listing = z.strictObject({
  id,
  orgId: id,
  materialCode: z.string(),
  originalGrams: positive,
  grams: nonnegative,
  askPaisePerKg: positive,
  status: z.enum(["open", "sold", "withdrawn"]),
});
const trade = z.strictObject({
  id,
  listingId: id,
  sellerId: id,
  buyerId: id,
  materialCode: z.string(),
  grams: positive,
  paisePerKg: positive,
  totalPaise: nonnegative,
  status: z.enum(tradeStatuses),
  timeline,
  payment: z.literal("simulation-only"),
  receiptRef: id.nullable(),
});
const pickupItem = z.strictObject({
  materialCode: z.string(),
  estimatedGrams: positive,
  measuredGrams: positive.nullable(),
  paisePerKg: positive,
});
const booking = z.strictObject({
  id,
  householdId: id,
  orgId: id,
  mode: z.enum(["pickup", "dropoff"]),
  status: z.enum(bookingStatuses),
  timeline,
  slotDate: date,
  items: z.array(pickupItem).min(1),
  estimatePaise: nonnegative,
  totalPaise: nonnegative.nullable(),
  receiptRef: id.nullable(),
  method: z.enum(["cash", "upi"]).nullable(),
  trackingRef: id,
  points: nonnegative.nullable(),
});
const movement = z.strictObject({
  id,
  orgId: id,
  materialCode: z.string(),
  deltaGrams: integer,
  reason: z.enum(["opening", "pickup", "dispatch", "receive"]),
  sourceId: id,
  at: z.iso.datetime(),
});
const balance = z.strictObject({
  id,
  orgId: id,
  materialCode: z.string(),
  grams: nonnegative,
  reservedGrams: nonnegative,
});
const job = z.strictObject({
  id,
  orgId: id,
  kind: z.enum(jobKinds),
  status: z.enum(["open", "assigned", "done"]),
  workerId: id.nullable(),
  date,
  window: z.enum(["morning", "afternoon", "evening"]),
  payPaise: positive,
});
const application = z.strictObject({
  id,
  applicantId: id,
  kind: z.enum(applicationKinds),
  status: z.enum(applicationStatuses),
  version: nonnegative,
  timeline,
  snapshotRef: id.nullable(),
  // Review plans are not database-ready submissions or real approval decisions.
  readiness: z.literal("pending-identity-and-document-adapter"),
});
const snapshot = z.strictObject({
  id,
  applicationId: id,
  version: positive,
  documentPlanIds: z.array(id),
  submittedAt: z.iso.datetime(),
});
const documentPlan = z.strictObject({
  id,
  applicationId: id,
  type: z.enum(["pcb_certificate", "machine_media", "id_proof", "selfie"]),
  contentType: z.enum(["application/pdf", "image/png"]),
  watermark: z.literal("DEMO — NOT A VALID DOCUMENT"),
  status: z.literal("not-generated"),
});
const support = z.strictObject({
  id,
  userId: id,
  status: z.enum(["open", "answered"]),
  subject: z.string().startsWith("Demo "),
});
const gap = z.strictObject({
  id: z.string(),
  detail: z.string().min(1),
  materialCodes: z.array(z.string()),
  orgIds: z.array(id),
});
export const manifestSchema = z.strictObject({
  version: z.literal("demo-v2-offline-1"),
  referenceDate: z.literal("2026-10-15"),
  randomSeed: z.literal(20_261_002),
  namespace: z.literal("luma-green-demo-v2"),
  status: z.literal("offline-review-only"),
  deployment: z.null(),
  isolationDecision: z.literal("pending"),
  sideEffects: z.strictObject({
    database: z.literal(false),
    authentication: z.literal(false),
    sms: z.literal(false),
    email: z.literal(false),
    payments: z.literal(false),
    analytics: z.literal(false),
    webhooks: z.literal(false),
  }),
  materials: z.array(material),
  users: z.array(user),
  businesses: z.array(business),
  prices: z.array(price),
  listings: z.array(listing),
  trades: z.array(trade),
  bookings: z.array(booking),
  movements: z.array(movement),
  balances: z.array(balance),
  jobs: z.array(job),
  applications: z.array(application),
  snapshots: z.array(snapshot),
  documentPlans: z.array(documentPlan),
  support: z.array(support),
  gaps: z.array(gap),
});
export type Manifest = z.infer<typeof manifestSchema>;
