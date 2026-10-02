import { createHash } from "node:crypto";

import { CATALOGUE } from "../../convex/lib/catalogue";
import {
  buyerKindFor,
  canMoveBooking,
  type TradeStatus,
  tradeStep,
} from "../../convex/lib/chain";
import { APPLICATION_STATUSES, canMove } from "../../convex/lib/lifecycle";
import { SAATHI_WORK } from "../../convex/lib/onboarding";
import { dayAt, jobOrgKind, linePaise } from "./build";
import {
  applicationKinds,
  applicationStatuses,
  bookingStatuses,
  businessKinds,
  families,
  jobKinds,
  type Manifest,
  manifestSchema,
  tradeStatuses,
} from "./model";

function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
function sortObject(entry: unknown): unknown {
  if (Array.isArray(entry))
    return entry.map((item: unknown) => sortObject(item));
  return entry === null || typeof entry !== "object"
    ? entry
    : Object.fromEntries(
        Object.entries(entry)
          .toSorted(([a], [b]) => compareText(a, b))
          .map(([key, item]) => [key, sortObject(item)]),
      );
}
export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortObject(value), null, 2)}\n`;
}
export function manifestHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
function areSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  return (
    JSON.stringify([...new Set(a)].toSorted(compareText)) ===
    JSON.stringify([...new Set(b)].toSorted(compareText))
  );
}
const movementKey = (
  source: string,
  reason: string,
  org: string,
  code: string,
) => `${source}|${reason}|${org}|${code}`;
const stockKey = (org: string, code: string) => `${org}|${code}`;
const isTradeStatus = (status: string): status is TradeStatus =>
  (tradeStatuses as readonly string[]).includes(status);
class Validation {
  readonly data: Manifest;
  readonly errors: string[] = [];
  readonly users: Map<string, Manifest["users"][number]>;
  readonly orgs: Map<string, Manifest["businesses"][number]>;
  readonly materials: Map<string, Manifest["materials"][number]>;
  readonly listings: Map<string, Manifest["listings"][number]>;
  readonly applications: Map<string, Manifest["applications"][number]>;
  readonly snapshots: Map<string, Manifest["snapshots"][number]>;
  readonly files: Map<string, Manifest["documentPlans"][number]>;
  readonly expectedMoves = new Map<string, number>();
  readonly sums = new Map<string, number>();
  readonly seenMoves = new Set<string>();
  constructor(data: Manifest) {
    this.data = data;
    this.users = new Map(data.users.map((row) => [row.id, row]));
    this.orgs = new Map(data.businesses.map((row) => [row.id, row]));
    this.materials = new Map(data.materials.map((row) => [row.code, row]));
    this.listings = new Map(data.listings.map((row) => [row.id, row]));
    this.applications = new Map(data.applications.map((row) => [row.id, row]));
    this.snapshots = new Map(data.snapshots.map((row) => [row.id, row]));
    this.files = new Map(data.documentPlans.map((row) => [row.id, row]));
  }
  check(isValid: boolean, message: string) {
    if (!isValid) this.errors.push(message);
  }
  validateIdentity() {
    const data = this.data;
    this.check(
      areSetsEqual(applicationStatuses, APPLICATION_STATUSES),
      "Application schema status drift",
    );
    this.check(areSetsEqual(jobKinds, SAATHI_WORK), "Job schema kind drift");
    const groups = [
      data.users,
      data.businesses,
      data.prices,
      data.listings,
      data.trades,
      data.bookings,
      data.movements,
      data.balances,
      data.jobs,
      data.applications,
      data.snapshots,
      data.documentPlans,
      data.support,
    ];
    const referenceIds = [
      ...data.trades.flatMap((trade) =>
        trade.receiptRef ? [trade.receiptRef] : [],
      ),
      ...data.bookings.flatMap((booking) =>
        booking.receiptRef
          ? [booking.receiptRef, booking.trackingRef]
          : [booking.trackingRef],
      ),
    ];
    const ids = [
      ...groups.flatMap((group) => group.map((record) => record.id)),
      ...referenceIds,
    ];
    this.check(new Set(ids).size === ids.length, "Duplicate logical ID");
    this.check(
      data.businesses.length === 48 && data.users.length === 82,
      "Expected 48 business plans and 82 synthetic users",
    );
    this.check(
      new Set(data.users.map((record) => record.identityTag)).size ===
        data.users.length,
      "Duplicate synthetic identity",
    );
    this.check(
      new Set(data.businesses.map((org) => org.ownerId)).size === 48,
      "Each business needs a distinct sample owner",
    );
    for (const [role, count] of [
      ["business-owner", 48],
      ["household", 12],
      ["saathi", 12],
      ["applicant", 10],
    ] as const)
      this.check(
        data.users.filter((user) => user.role === role).length === count,
        `User role coverage mismatch: ${role}`,
      );
    for (const kind of businessKinds)
      for (const family of families)
        this.check(
          data.businesses.filter(
            (row) => row.kind === kind && row.family === family,
          ).length === 2,
          `Expected two businesses: ${kind}/${family}`,
        );
    for (const org of data.businesses) {
      this.check(
        this.users.get(org.ownerId)?.role === "business-owner",
        `Missing owner: ${org.id}`,
      );
      this.check(
        (org.family === "other") === (org.readiness === "pending-schema"),
        `Textile readiness mismatch: ${org.id}`,
      );
    }
  }
  validateMaterials() {
    this.check(
      this.data.materials.length === CATALOGUE.length &&
        areSetsEqual(
          this.data.materials.map((item) => item.code),
          CATALOGUE.map((item) => item.code),
        ),
      "Catalogue code coverage mismatch",
    );
    for (const item of this.data.materials) {
      const source = CATALOGUE.find((entry) => entry.code === item.code);
      this.check(
        source?.family === item.family &&
          source.stage === item.stage &&
          source.names.en === item.name &&
          source.floorPaise === item.floorPaise &&
          source.fallbackPaise === item.samplePaise,
        `Catalogue mismatch: ${item.code}`,
      );
      const points = this.data.prices.filter(
        (point) => point.materialCode === item.code,
      );
      this.check(
        points.length === 30 &&
          areSetsEqual(
            points.map((point) => point.date),
            Array.from({ length: 30 }, (_, index) => dayAt(index - 29)),
          ),
        `Expected 30 fixed price points: ${item.code}`,
      );
    }
    for (const price of this.data.prices)
      this.check(
        this.materials.has(price.materialCode) &&
          price.floorPaise ===
            this.materials.get(price.materialCode)?.floorPaise &&
          price.paisePerKg >= price.floorPaise,
        `Invalid sample price: ${price.id}`,
      );
  }
  mayHold(orgId: string, code: string): boolean {
    const org = this.orgs.get(orgId);
    const material = this.materials.get(code);
    if (
      !org ||
      !material ||
      org.readiness !== "offline-example" ||
      org.family !== material.family
    )
      return false;
    return org.kind === "manufacturer"
      ? material.stage === "recycled"
      : org.kind === "recycler" || material.stage === "scrap";
  }
  validateTime(
    path: { status: string; at: string }[],
    final: string,
    id: string,
  ) {
    this.check(
      path.at(-1)?.status === final,
      `Timeline terminal mismatch: ${id}`,
    );
    this.check(
      path.every(
        (entry, index) => index === 0 || entry.at > (path[index - 1]?.at ?? ""),
      ),
      `Timeline order: ${id}`,
    );
  }
  expectMove(
    source: string,
    reason: string,
    org: string,
    code: string,
    grams: number,
  ) {
    this.expectedMoves.set(movementKey(source, reason, org, code), grams);
  }
  validateTradePath(trade: Manifest["trades"][number]) {
    this.check(
      trade.timeline[0]?.status === "requested",
      `Trade must start requested: ${trade.id}`,
    );
    this.validateTime(trade.timeline, trade.status, trade.id);
    const actions = {
      accepted: ["accept", "seller"],
      declined: ["decline", "seller"],
      paid_to_escrow: ["pay", "buyer"],
      dispatched: ["dispatch", "seller"],
      completed: ["confirm", "buyer"],
    } as const;
    for (let index = 1; index < trade.timeline.length; index++) {
      const previous = trade.timeline[index - 1]?.status;
      const next = trade.timeline[index]?.status;
      const action =
        next && Object.hasOwn(actions, next)
          ? actions[next as keyof typeof actions]
          : undefined;
      const isValid =
        isTradeStatus(previous) &&
        action !== undefined &&
        tradeStep(previous, action[0], action[1]) === next;
      this.check(isValid, `Invalid trade transition: ${trade.id}`);
    }
  }
  validateTrade(trade: Manifest["trades"][number]) {
    const listing = this.listings.get(trade.listingId);
    const seller = this.orgs.get(trade.sellerId);
    const buyer = this.orgs.get(trade.buyerId);
    if (!seller || !buyer)
      this.check(false, `Invalid chain handoff: ${trade.id}`);
    else
      this.check(
        buyerKindFor(seller.kind) === buyer.kind && seller.id !== buyer.id,
        `Invalid chain handoff: ${trade.id}`,
      );
    this.check(
      this.mayHold(trade.sellerId, trade.materialCode) &&
        this.mayHold(trade.buyerId, trade.materialCode),
      `Invalid trade material: ${trade.id}`,
    );
    this.check(
      listing?.orgId === trade.sellerId &&
        listing.materialCode === trade.materialCode &&
        listing.askPaisePerKg === trade.paisePerKg,
      `Listing reference mismatch: ${trade.id}`,
    );
    this.check(
      trade.totalPaise === linePaise(trade.grams, trade.paisePerKg),
      `Trade total mismatch: ${trade.id}`,
    );
    this.validateTradePath(trade);
    const isPaid = ["paid_to_escrow", "dispatched", "completed"].includes(
      trade.status,
    );
    this.check(
      (trade.receiptRef !== null) === isPaid,
      `Trade receipt state mismatch: ${trade.id}`,
    );
    if (trade.status === "dispatched" || trade.status === "completed")
      this.expectMove(
        trade.id,
        "dispatch",
        trade.sellerId,
        trade.materialCode,
        -trade.grams,
      );
    if (trade.status === "completed")
      this.expectMove(
        trade.id,
        "receive",
        trade.buyerId,
        trade.materialCode,
        trade.grams,
      );
  }
  validateListing(listing: Manifest["listings"][number]) {
    const org = this.orgs.get(listing.orgId);
    const material = this.materials.get(listing.materialCode);
    this.check(
      org !== undefined &&
        org.kind !== "manufacturer" &&
        this.mayHold(listing.orgId, listing.materialCode) &&
        material?.stage === (org.kind === "recycler" ? "recycled" : "scrap"),
      `Invalid listing role/stage: ${listing.id}`,
    );
    const accepted = this.data.trades
      .filter(
        (trade) =>
          trade.listingId === listing.id &&
          !["requested", "declined"].includes(trade.status),
      )
      .reduce((sum, trade) => sum + trade.grams, 0);
    this.check(
      listing.grams + accepted === listing.originalGrams,
      `Listing allocation mismatch: ${listing.id}`,
    );
    this.check(
      listing.status === "withdrawn" ||
        (listing.status === "sold") === (listing.grams === 0),
      `Listing state mismatch: ${listing.id}`,
    );
    this.check(
      this.data.trades.every(
        (trade) =>
          !(
            trade.listingId === listing.id &&
            trade.grams > listing.originalGrams
          ),
      ),
      `Trade exceeds listing: ${listing.id}`,
    );
  }
  validateBookingPath(booking: Manifest["bookings"][number]) {
    this.check(
      booking.timeline[0]?.status === "requested",
      `Booking must start requested: ${booking.id}`,
    );
    this.validateTime(booking.timeline, booking.status, booking.id);
    for (let index = 1; index < booking.timeline.length; index++) {
      const previous = booking.timeline[index - 1]?.status;
      const next = booking.timeline[index]?.status;
      const isValid =
        bookingStatuses.includes(previous as typeof booking.status) &&
        bookingStatuses.includes(next as typeof booking.status) &&
        canMoveBooking(
          previous as typeof booking.status,
          next as typeof booking.status,
        );
      this.check(isValid, `Invalid booking transition: ${booking.id}`);
    }
  }
  validateBooking(booking: Manifest["bookings"][number]) {
    this.check(
      this.users.get(booking.householdId)?.role === "household" &&
        this.orgs.get(booking.orgId)?.kind === "kabadiwala",
      `Booking identity/role mismatch: ${booking.id}`,
    );
    this.validateBookingPath(booking);
    let estimate = 0;
    let total = 0;
    this.check(
      new Set(booking.items.map((item) => item.materialCode)).size ===
        booking.items.length,
      `Duplicate booking material: ${booking.id}`,
    );
    for (const item of booking.items) {
      this.check(
        this.mayHold(booking.orgId, item.materialCode) &&
          this.materials.get(item.materialCode)?.stage === "scrap",
        `Invalid pickup material: ${booking.id}`,
      );
      estimate += linePaise(item.estimatedGrams, item.paisePerKg);
      this.check(
        (item.measuredGrams !== null) === (booking.status === "completed"),
        `Measured weight state mismatch: ${booking.id}`,
      );
      if (item.measuredGrams === null) continue;
      total += linePaise(item.measuredGrams, item.paisePerKg);
      this.expectMove(
        booking.id,
        "pickup",
        booking.orgId,
        item.materialCode,
        item.measuredGrams,
      );
    }
    this.check(
      estimate === booking.estimatePaise,
      `Booking estimate mismatch: ${booking.id}`,
    );
    this.validateReceipt(booking, total);
  }
  validateReceipt(booking: Manifest["bookings"][number], total: number) {
    if (booking.status === "completed") {
      this.check(
        booking.totalPaise === total &&
          booking.points === Math.floor(total / 1000) &&
          booking.receiptRef !== null &&
          booking.method !== null,
        `Booking receipt mismatch: ${booking.id}`,
      );
      return;
    }
    this.check(
      booking.totalPaise === null &&
        booking.points === null &&
        booking.receiptRef === null &&
        booking.method === null,
      `Booking receipt mismatch: ${booking.id}`,
    );
  }
  validateMovement(move: Manifest["movements"][number]) {
    this.check(
      this.mayHold(move.orgId, move.materialCode),
      `Invalid stock material: ${move.id}`,
    );
    const key = movementKey(
      move.sourceId,
      move.reason,
      move.orgId,
      move.materialCode,
    );
    this.check(!this.seenMoves.has(key), `Duplicate movement: ${move.id}`);
    this.seenMoves.add(key);
    if (move.reason === "opening")
      this.check(
        move.sourceId === move.orgId && move.deltaGrams > 0,
        `Invalid opening balance: ${move.id}`,
      );
    else
      this.check(
        this.expectedMoves.get(key) === move.deltaGrams,
        `Unexplained movement: ${move.id}`,
      );
    const stock = stockKey(move.orgId, move.materialCode);
    this.sums.set(stock, (this.sums.get(stock) ?? 0) + move.deltaGrams);
    this.check(
      Number.isSafeInteger(this.sums.get(stock)) &&
        (this.sums.get(stock) ?? 0) >= 0,
      `Negative or unsafe running stock: ${move.id}`,
    );
  }
  validateBalances() {
    const stockKeys = new Set<string>();
    for (const stock of this.data.balances) {
      const key = stockKey(stock.orgId, stock.materialCode);
      this.check(!stockKeys.has(key), `Duplicate balance: ${stock.id}`);
      stockKeys.add(key);
      this.check(
        stock.grams === this.sums.get(key),
        `Balance does not match movements: ${stock.id}`,
      );
      const reserved =
        this.data.listings
          .filter(
            (item) =>
              item.orgId === stock.orgId &&
              item.materialCode === stock.materialCode &&
              item.status === "open",
          )
          .reduce((sum, item) => sum + item.grams, 0) +
        this.data.trades
          .filter(
            (item) =>
              item.sellerId === stock.orgId &&
              item.materialCode === stock.materialCode &&
              ["accepted", "paid_to_escrow"].includes(item.status),
          )
          .reduce((sum, item) => sum + item.grams, 0);
      this.check(
        stock.reservedGrams === reserved && reserved <= stock.grams,
        `Over-reserved or incorrect stock: ${stock.id}`,
      );
    }
    this.check(stockKeys.size === this.sums.size, "Missing inventory balance");
    this.validateReservationReferences(stockKeys);
    for (const key of this.expectedMoves.keys())
      this.check(this.seenMoves.has(key), `Missing movement: ${key}`);
    const opening = this.data.movements
      .filter((item) => item.reason === "opening")
      .reduce((sum, item) => sum + item.deltaGrams, 0);
    const recovered = this.data.movements
      .filter((item) => item.reason === "pickup")
      .reduce((sum, item) => sum + item.deltaGrams, 0);
    const inTransit = this.data.trades
      .filter((item) => item.status === "dispatched")
      .reduce((sum, item) => sum + item.grams, 0);
    this.check(
      Number.isSafeInteger(opening + recovered) &&
        Number.isSafeInteger(inTransit) &&
        opening + recovered ===
          this.data.balances.reduce((sum, item) => sum + item.grams, 0) +
            inTransit,
      "Global mass conservation failed",
    );
  }
  validateReservationReferences(keys: Set<string>) {
    for (const listing of this.data.listings) {
      if (listing.status !== "open") continue;
      this.check(
        keys.has(stockKey(listing.orgId, listing.materialCode)),
        `Listing has no stock balance: ${listing.id}`,
      );
    }
    for (const trade of this.data.trades) {
      if (!["accepted", "paid_to_escrow"].includes(trade.status)) continue;
      this.check(
        keys.has(stockKey(trade.sellerId, trade.materialCode)),
        `Reserved trade has no stock balance: ${trade.id}`,
      );
    }
  }
  validateJobs() {
    const assignments = new Set<string>();
    for (const job of this.data.jobs) {
      this.check(
        this.orgs.get(job.orgId)?.kind === jobOrgKind(job.kind),
        `Invalid job organisation: ${job.id}`,
      );
      this.check(
        job.status === "open"
          ? job.workerId === null
          : this.users.get(job.workerId ?? "")?.role === "saathi",
        `Job assignment mismatch: ${job.id}`,
      );
      if (job.workerId === null) continue;
      const slot = `${job.workerId}|${job.date}|${job.window}`;
      this.check(!assignments.has(slot), `Worker double-booked: ${job.id}`);
      assignments.add(slot);
    }
  }
  validateApplication(application: Manifest["applications"][number]) {
    this.check(
      this.users.get(application.applicantId)?.role === "applicant",
      `Missing applicant: ${application.id}`,
    );
    this.validateTime(application.timeline, application.status, application.id);
    this.check(
      application.timeline[0]?.status === "draft",
      `Application must start draft: ${application.id}`,
    );
    for (let index = 1; index < application.timeline.length; index++) {
      const from = application.timeline[index - 1]?.status;
      const to = application.timeline[index]?.status;
      const isValid =
        applicationStatuses.includes(from as typeof application.status) &&
        applicationStatuses.includes(to as typeof application.status) &&
        canMove(
          from as typeof application.status,
          to as typeof application.status,
        );
      this.check(isValid, `Invalid application transition: ${application.id}`);
    }
    this.check(
      application.status === "draft"
        ? application.version === 0 && application.snapshotRef === null
        : application.version === 1 &&
            this.snapshots.get(application.snapshotRef ?? "")?.applicationId ===
              application.id,
      `Application snapshot mismatch: ${application.id}`,
    );
  }
  validateDocuments() {
    for (const snapshot of this.data.snapshots) {
      const application = this.applications.get(snapshot.applicationId);
      this.check(
        application?.snapshotRef === snapshot.id &&
          application.version === snapshot.version,
        `Snapshot owner/version mismatch: ${snapshot.id}`,
      );
      this.check(
        application?.timeline.find((step) => step.status === "submitted")
          ?.at === snapshot.submittedAt,
        `Snapshot submission time mismatch: ${snapshot.id}`,
      );
      this.check(
        new Set(snapshot.documentPlanIds).size ===
          snapshot.documentPlanIds.length,
        `Duplicate snapshot document: ${snapshot.id}`,
      );
      for (const file of snapshot.documentPlanIds)
        this.check(
          this.files.get(file)?.applicationId === snapshot.applicationId,
          `Document ownership mismatch: ${snapshot.id}`,
        );
    }
    for (const file of this.data.documentPlans)
      this.check(
        this.applications.has(file.applicationId) &&
          this.data.snapshots.some(
            (snapshot) =>
              snapshot.applicationId === file.applicationId &&
              snapshot.documentPlanIds.includes(file.id),
          ),
        `Missing document application/snapshot: ${file.id}`,
      );
    for (const support of this.data.support)
      this.check(
        this.users.has(support.userId),
        `Missing support user: ${support.id}`,
      );
  }
  validateCoverage() {
    for (const gap of this.data.gaps)
      this.check(
        gap.materialCodes.every((code) => this.materials.has(code)) &&
          gap.orgIds.every((org) => this.orgs.has(org)),
        `Invalid gap references: ${gap.id}`,
      );
    this.check(
      [
        "deployment-isolation",
        "textile-onboarding",
        "missing-recycled-outputs",
        "identity-documents-admin",
        "dropoff-travel-state",
        "unimplemented-services",
      ].every((id) => this.data.gaps.some((gap) => gap.id === id)),
      "Missing required pending-coverage gap",
    );
    this.check(
      areSetsEqual(
        this.data.trades.map((item) => item.status),
        tradeStatuses,
      ),
      "Trade status coverage gap",
    );
    this.check(
      areSetsEqual(
        this.data.bookings.map((item) => item.status),
        bookingStatuses,
      ),
      "Booking status coverage gap",
    );
    this.check(
      areSetsEqual(
        this.data.applications.map((item) => item.status),
        applicationStatuses,
      ),
      "Application status coverage gap",
    );
    for (const kind of applicationKinds)
      this.check(
        this.data.applications.filter((item) => item.kind === kind).length ===
          2,
        `Expected two applicant examples: ${kind}`,
      );
    for (const kind of jobKinds)
      this.check(
        areSetsEqual(
          this.data.jobs
            .filter((item) => item.kind === kind)
            .map((item) => item.status),
          ["open", "assigned", "done"],
        ),
        `Job state coverage gap: ${kind}`,
      );
    for (const kind of businessKinds)
      this.check(
        this.data.businesses.some(
          (org) =>
            org.kind === kind &&
            org.readiness === "offline-example" &&
            this.data.balances.every((stock) => stock.orgId !== org.id),
        ),
        `Missing empty stock example: ${kind}`,
      );
    const missingStock = this.data.materials
      .filter((item) =>
        this.data.balances.every((stock) => stock.materialCode !== item.code),
      )
      .map((item) => item.code);
    this.check(
      areSetsEqual(missingStock, ["OTHER-CLOTHES"]),
      "Unexpected material inventory coverage gap",
    );
  }
  run(): string[] {
    this.validateIdentity();
    this.validateMaterials();
    for (const row of this.data.trades) this.validateTrade(row);
    for (const row of this.data.listings) this.validateListing(row);
    for (const row of this.data.bookings) this.validateBooking(row);
    for (const row of this.data.movements) this.validateMovement(row);
    this.validateBalances();
    this.validateJobs();
    for (const row of this.data.applications) this.validateApplication(row);
    this.validateDocuments();
    this.validateCoverage();
    return this.errors;
  }
}
export function validateManifest(input: unknown): string[] {
  const parsed = manifestSchema.safeParse(input);
  return parsed.success
    ? new Validation(parsed.data).run()
    : parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
}
export function coverageReport(manifest: Manifest) {
  const errors = validateManifest(manifest);
  const openingGrams = manifest.movements
    .filter((row) => row.reason === "opening")
    .reduce((sum, row) => sum + row.deltaGrams, 0);
  const pickupGrams = manifest.movements
    .filter((row) => row.reason === "pickup")
    .reduce((sum, row) => sum + row.deltaGrams, 0);
  const inventoryGrams = manifest.balances.reduce(
    (sum, row) => sum + row.grams,
    0,
  );
  const inTransitGrams = manifest.trades
    .filter((row) => row.status === "dispatched")
    .reduce((sum, row) => sum + row.grams, 0);
  return {
    status: errors.length > 0 ? "invalid" : "offline-checks-pass",
    manifestSha256: manifestHash(manifest),
    version: manifest.version,
    referenceDate: manifest.referenceDate,
    randomSeed: manifest.randomSeed,
    businessCoverage: businessKinds.flatMap((kind) =>
      families.map((family) => ({
        kind,
        family,
        planned: manifest.businesses.filter(
          (org) => org.kind === kind && org.family === family,
        ).length,
        pendingSchema: manifest.businesses.filter(
          (org) =>
            org.kind === kind &&
            org.family === family &&
            org.readiness === "pending-schema",
        ).length,
      })),
    ),
    workflowCoverage: {
      trades: Object.fromEntries(
        tradeStatuses.map((status) => [
          status,
          manifest.trades.filter((row) => row.status === status).length,
        ]),
      ),
      bookings: Object.fromEntries(
        bookingStatuses.map((status) => [
          status,
          manifest.bookings.filter((row) => row.status === status).length,
        ]),
      ),
      applications: Object.fromEntries(
        applicationStatuses.map((status) => [
          status,
          manifest.applications.filter((row) => row.status === status).length,
        ]),
      ),
    },
    massBalance: {
      openingGrams,
      pickupGrams,
      inventoryGrams,
      inTransitGrams,
      isBalanced:
        openingGrams + pickupGrams === inventoryGrams + inTransitGrams,
    },
    imported: false,
    productionReady: false,
    sideEffects: manifest.sideEffects,
    counts: Object.fromEntries(
      Object.entries(manifest)
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [key, (value as unknown[]).length]),
    ),
    materials: manifest.materials.map((item) => ({
      code: item.code,
      prices: manifest.prices.filter(
        (price) => price.materialCode === item.code,
      ).length,
      stockExamples: manifest.balances.filter(
        (stock) => stock.materialCode === item.code,
      ).length,
      tradeExamples: manifest.trades.filter(
        (trade) => trade.materialCode === item.code,
      ).length,
    })),
    completedTradePaise: manifest.trades
      .filter((trade) => trade.status === "completed")
      .reduce((sum, trade) => sum + trade.totalPaise, 0),
    simulatedEscrowPaise: manifest.trades
      .filter((trade) =>
        ["paid_to_escrow", "dispatched"].includes(trade.status),
      )
      .reduce((sum, trade) => sum + trade.totalPaise, 0),
    completedJobPaise: manifest.jobs
      .filter((job) => job.status === "done")
      .reduce((sum, job) => sum + job.payPaise, 0),
    inTransitGrams: manifest.trades
      .filter((trade) => trade.status === "dispatched")
      .reduce((sum, trade) => sum + trade.grams, 0),
    gaps: manifest.gaps,
    errors,
  };
}
