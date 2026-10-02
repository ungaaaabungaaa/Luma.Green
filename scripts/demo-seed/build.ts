import { CATALOGUE } from "../../convex/lib/catalogue";
import type { OrgKind } from "../../convex/lib/chain";
import {
  applicationKinds,
  applicationStatuses,
  bookingStatuses,
  businessKinds,
  families,
  jobKinds,
  type Manifest,
  tradeStatuses,
} from "./model";

export const REFERENCE_TIME = "2026-10-15T06:00:00.000Z";
const DAY = 86_400_000;
const pad = (value: number) => String(value).padStart(2, "0");
const ref = (value: string) => `demo:${value}`;
export const orgRef = (kind: OrgKind, family: string, number = 1) =>
  ref(`org:${kind}:${family}:${pad(number)}`);
export function dayAt(offset: number): string {
  return new Date(Date.parse(REFERENCE_TIME) + offset * DAY)
    .toISOString()
    .slice(0, 10);
}
/** Positive integer grams and paise; round half-up only once per line. */
export function linePaise(grams: number, price: number): number {
  // eslint-disable-next-line unicorn/prefer-bigint-literals -- The repo targets ES2017; BigInt is available in the Node script runtime.
  return Number((BigInt(grams) * BigInt(price) + BigInt(500)) / BigInt(1000));
}
function atStep(step: number): string {
  return new Date(
    Date.parse(REFERENCE_TIME) - DAY + step * 60_000,
  ).toISOString();
}
function timeline(states: readonly string[]) {
  return states.map((status, index) => ({ status, at: atStep(index) }));
}
function applicationPath(
  status: Manifest["applications"][number]["status"],
): string[] {
  if (status === "draft") return ["draft"];
  if (status === "submitted") return ["draft", "submitted"];
  return status === "suspended"
    ? ["draft", "submitted", "approved", "suspended"]
    : ["draft", "submitted", status];
}
export function jobOrgKind(kind: Manifest["jobs"][number]["kind"]): OrgKind {
  if (kind === "yard_sorting") return "yard";
  return kind === "factory_shifts" ? "manufacturer" : "kabadiwala";
}
function plannedDocumentTypes(
  kind: Manifest["applications"][number]["kind"],
): Manifest["documentPlans"][number]["type"][] {
  if (kind === "saathi") return ["id_proof", "selfie"];
  return kind === "kabadiwala"
    ? []
    : ["pcb_certificate", "machine_media", "machine_media"];
}
function baseManifest(): Manifest {
  return {
    version: "demo-v2-offline-1",
    referenceDate: "2026-10-15",
    randomSeed: 20_261_002,
    namespace: "luma-green-demo-v2",
    status: "offline-review-only",
    deployment: null,
    isolationDecision: "pending",
    sideEffects: {
      database: false,
      authentication: false,
      sms: false,
      email: false,
      payments: false,
      analytics: false,
      webhooks: false,
    },
    materials: CATALOGUE.map((item) => ({
      code: item.code,
      family: item.family,
      stage: item.stage,
      name: item.names.en,
      floorPaise: item.floorPaise,
      samplePaise: item.fallbackPaise,
    })),
    users: [],
    businesses: [],
    prices: [],
    listings: [],
    trades: [],
    bookings: [],
    movements: [],
    balances: [],
    jobs: [],
    applications: [],
    snapshots: [],
    documentPlans: [],
    support: [],
    gaps: [],
  };
}
class Builder {
  data = baseManifest();
  addUser(id: string, role: Manifest["users"][number]["role"], name: string) {
    this.data.users.push({
      id,
      role,
      name: `Demo ${name}`,
      identityTag: `demo-identity:${id.slice(5)}`,
    });
    return id;
  }
  materialFor(code: string) {
    const material = this.data.materials.find((item) => item.code === code);
    if (!material) throw new Error(`Unknown catalogue material: ${code}`);
    return material;
  }
  addMovement(
    orgId: string,
    code: string,
    grams: number,
    reason: Manifest["movements"][number]["reason"],
    sourceId: string,
  ) {
    let step = reason === "receive" ? 5 : 4;
    if (reason === "opening") step = -60;
    this.data.movements.push({
      id: ref(`movement:${pad(this.data.movements.length + 1)}`),
      orgId,
      materialCode: code,
      deltaGrams: grams,
      reason,
      sourceId,
      at: atStep(step),
    });
  }
  addBusiness(
    kind: OrgKind,
    family: (typeof families)[number],
    number: number,
  ) {
    const suffix = `${kind}:${family}:${pad(number)}`;
    const ownerId = this.addUser(
      ref(`owner:${suffix}`),
      "business-owner",
      `Owner ${kind} ${family} ${pad(number)}`,
    );
    this.data.businesses.push({
      id: orgRef(kind, family, number),
      ownerId,
      kind,
      family,
      name: `Demo ${family} ${kind} ${pad(number)}`,
      area: `Demo Bengaluru Zone ${pad(families.indexOf(family) * 2 + number)}`,
      hours: "09:00–18:00",
      readiness: family === "other" ? "pending-schema" : "offline-example",
    });
  }
  addPeople() {
    for (const kind of businessKinds)
      for (const family of families)
        for (const number of [1, 2]) this.addBusiness(kind, family, number);
    for (let number = 1; number <= 12; number++) {
      this.addUser(
        ref(`household:${pad(number)}`),
        "household",
        `Household ${pad(number)}`,
      );
      this.addUser(
        ref(`worker:${pad(number)}`),
        "saathi",
        `Worker ${pad(number)}`,
      );
    }
  }
  addPrices() {
    // Fixed, seeded variation; no wall time or Math.random.
    let random: number = this.data.randomSeed;
    for (const material of this.data.materials)
      for (let offset = -29; offset <= 0; offset++) {
        random = (Math.imul(random, 1_664_525) + 1_013_904_223) >>> 0;
        const date = dayAt(offset);
        this.data.prices.push({
          id: ref(`price:${material.code.toLowerCase()}:${date}`),
          materialCode: material.code,
          date,
          floorPaise: material.floorPaise,
          paisePerKg: Math.max(
            material.floorPaise,
            material.samplePaise + ((random % 7) - 3) * 25,
          ),
        });
      }
  }
  addOpeningFor(business: Manifest["businesses"][number]) {
    if (business.family === "other") return;
    const allowed = this.data.materials.filter((material) => {
      if (material.family !== business.family) return false;
      return business.kind === "manufacturer"
        ? material.stage === "recycled"
        : business.kind === "recycler" || material.stage === "scrap";
    });
    for (const [index, material] of allowed.entries()) {
      const isSecond = business.id.endsWith(":02");
      if (isSecond && (index !== 0 || business.family !== "paper")) continue;
      let grams = index === 0 ? 2_500_000 : 500_000;
      if (isSecond) grams = 500;
      this.addMovement(
        business.id,
        material.code,
        grams,
        "opening",
        business.id,
      );
    }
  }
  addTrade(
    material: Manifest["materials"][number],
    sellerKind: OrgKind,
    buyerKind: OrgKind,
    index: number,
    status: (typeof tradeStatuses)[number],
  ) {
    const suffix = `${material.family}:${sellerKind}:${status}`;
    const id = ref(`trade:${suffix}`);
    const listingId = ref(`listing:${suffix}`);
    const sellerId = orgRef(sellerKind, material.family);
    const buyerId = orgRef(buyerKind, material.family);
    const grams = 10_000 + index * 1000;
    const isAccepted = status !== "requested" && status !== "declined";
    const isPaid = ["paid_to_escrow", "dispatched", "completed"].includes(
      status,
    );
    const path =
      status === "declined"
        ? ["requested", "declined"]
        : tradeStatuses.slice(0, index + 1);
    this.data.listings.push({
      id: listingId,
      orgId: sellerId,
      materialCode: material.code,
      originalGrams: grams,
      grams: isAccepted ? 0 : grams,
      askPaisePerKg: material.samplePaise,
      status: isAccepted ? "sold" : "open",
    });
    this.data.trades.push({
      id,
      listingId,
      sellerId,
      buyerId,
      materialCode: material.code,
      grams,
      paisePerKg: material.samplePaise,
      totalPaise: linePaise(grams, material.samplePaise),
      status,
      timeline: timeline(path),
      payment: "simulation-only",
      receiptRef: isPaid ? ref(`trade-receipt:${suffix}`) : null,
    });
    if (status === "dispatched" || status === "completed")
      this.addMovement(sellerId, material.code, -grams, "dispatch", id);
    if (status === "completed")
      this.addMovement(buyerId, material.code, grams, "receive", id);
  }
  addHandoff(family: string, sellerKind: OrgKind, buyerKind: OrgKind) {
    const material = this.data.materials.find(
      (item) =>
        item.family === family &&
        item.stage === (sellerKind === "recycler" ? "recycled" : "scrap"),
    );
    if (!material) return;
    for (const [index, status] of tradeStatuses.entries())
      this.addTrade(material, sellerKind, buyerKind, index, status);
  }
  addTrades() {
    for (const family of families) {
      if (family === "other") continue;
      this.addHandoff(family, "kabadiwala", "yard");
      this.addHandoff(family, "yard", "recycler");
      this.addHandoff(family, "recycler", "manufacturer");
    }
    for (const kind of ["kabadiwala", "yard", "recycler"] as const) {
      const material = this.data.materials.find(
        (item) =>
          item.family === "paper" &&
          item.stage === (kind === "recycler" ? "recycled" : "scrap"),
      );
      if (!material) throw new Error("Missing paper coverage");
      this.data.listings.push({
        id: ref(`listing:withdrawn:${kind}`),
        orgId: orgRef(kind, "paper"),
        materialCode: material.code,
        originalGrams: 1000,
        grams: 1000,
        askPaisePerKg: material.samplePaise,
        status: "withdrawn",
      });
    }
  }
  addBooking(
    mode: "pickup" | "dropoff",
    index: number,
    status: (typeof bookingStatuses)[number],
  ) {
    const number = this.data.bookings.length + 1;
    const id = ref(`booking:${mode}:${status}`);
    const orgId = orgRef("kabadiwala", "paper");
    const isComplete = status === "completed";
    const items = ["PAPER-NEWS", "PAPER-CARTON"].map((code, itemIndex) => ({
      materialCode: code,
      estimatedGrams: 5000 + itemIndex * 1000,
      measuredGrams: isComplete ? 4750 + itemIndex * 1000 : null,
      paisePerKg: this.materialFor(code).samplePaise,
    }));
    // Drop-off permits on_the_way in the shared validator; its meaning is a gap.
    const states =
      status === "declined" || status === "cancelled"
        ? ["requested", status]
        : ["requested", "accepted", "on_the_way", "completed"].slice(
            0,
            index + 1,
          );
    const total = isComplete
      ? items.reduce(
          (sum, item) =>
            sum + linePaise(item.measuredGrams ?? 0, item.paisePerKg),
          0,
        )
      : null;
    const method = mode === "pickup" ? "cash" : "upi";
    this.data.bookings.push({
      id,
      householdId: ref(`household:${pad(number)}`),
      orgId,
      mode,
      status,
      timeline: timeline(states),
      slotDate: dayAt(isComplete ? -1 : 0),
      items,
      estimatePaise: items.reduce(
        (sum, item) => sum + linePaise(item.estimatedGrams, item.paisePerKg),
        0,
      ),
      totalPaise: total,
      receiptRef: isComplete ? ref(`pickup-receipt:${mode}`) : null,
      method: isComplete ? method : null,
      trackingRef: ref(`tracking:${mode}:${status}`),
      points: total === null ? null : Math.floor(total / 1000),
    });
    if (!isComplete) return;
    for (const item of items)
      this.addMovement(
        orgId,
        item.materialCode,
        item.measuredGrams ?? 0,
        "pickup",
        id,
      );
  }
  addBookings() {
    for (const mode of ["pickup", "dropoff"] as const)
      for (const [index, status] of bookingStatuses.entries())
        this.addBooking(mode, index, status);
  }
  addJobs() {
    for (const [kindIndex, kind] of jobKinds.entries())
      for (const [statusIndex, status] of (
        ["open", "assigned", "done"] as const
      ).entries()) {
        const number = kindIndex * 3 + statusIndex + 1;
        this.data.jobs.push({
          id: ref(`job:${kind}:${status}`),
          orgId: orgRef(jobOrgKind(kind), "paper"),
          kind,
          status,
          workerId: status === "open" ? null : ref(`worker:${pad(number)}`),
          date: dayAt(status === "done" ? -1 : 0),
          window: "morning",
          payPaise: 30_000 + kindIndex * 5000,
        });
      }
  }
  addApplication(
    kind: (typeof applicationKinds)[number],
    kindIndex: number,
    number: number,
  ) {
    const index = kindIndex * 2 + number - 1;
    const status = applicationStatuses[index % applicationStatuses.length];
    const id = ref(`application:${kind}:${pad(number)}`);
    const applicantId = this.addUser(
      ref(`applicant:${kind}:${pad(number)}`),
      "applicant",
      `Applicant ${kind} ${pad(number)}`,
    );
    const snapshotRef =
      status === "draft" ? null : ref(`snapshot:${kind}:${pad(number)}:01`);
    this.data.applications.push({
      id,
      applicantId,
      kind,
      status,
      version: snapshotRef ? 1 : 0,
      timeline: timeline(applicationPath(status)),
      snapshotRef,
      readiness: "pending-identity-and-document-adapter",
    });
    if (!snapshotRef) return;
    const documentPlanIds = plannedDocumentTypes(kind).map(
      (type, fileIndex) => {
        const fileId = ref(
          `document:${kind}:${pad(number)}:${pad(fileIndex + 1)}`,
        );
        this.data.documentPlans.push({
          id: fileId,
          applicationId: id,
          type,
          contentType:
            type === "pcb_certificate" ? "application/pdf" : "image/png",
          watermark: "DEMO — NOT A VALID DOCUMENT",
          status: "not-generated",
        });
        return fileId;
      },
    );
    this.data.snapshots.push({
      id: snapshotRef,
      applicationId: id,
      version: 1,
      documentPlanIds,
      submittedAt: atStep(1),
    });
  }
  addApplications() {
    for (const [kindIndex, kind] of applicationKinds.entries())
      for (const number of [1, 2]) this.addApplication(kind, kindIndex, number);
  }
  addBalances() {
    const sums = new Map<string, Manifest["balances"][number]>();
    for (const move of this.data.movements) {
      const key = `${move.orgId}:${move.materialCode}`;
      const balance = sums.get(key) ?? {
        id: ref(
          `balance:${move.orgId.slice(5)}:${move.materialCode.toLowerCase()}`,
        ),
        orgId: move.orgId,
        materialCode: move.materialCode,
        grams: 0,
        reservedGrams: 0,
      };
      balance.grams += move.deltaGrams;
      sums.set(key, balance);
    }
    for (const balance of sums.values()) {
      balance.reservedGrams =
        this.data.listings
          .filter(
            (row) =>
              row.orgId === balance.orgId &&
              row.materialCode === balance.materialCode &&
              row.status === "open",
          )
          .reduce((sum, row) => sum + row.grams, 0) +
        this.data.trades
          .filter(
            (row) =>
              row.sellerId === balance.orgId &&
              row.materialCode === balance.materialCode &&
              (row.status === "accepted" || row.status === "paid_to_escrow"),
          )
          .reduce((sum, row) => sum + row.grams, 0);
      this.data.balances.push(balance);
    }
  }
  addGaps() {
    this.data.gaps = [
      {
        id: "deployment-isolation",
        detail:
          "No deployment selected. Namespace/query isolation and controlled access must be designed before any import.",
        materialCodes: [],
        orgIds: [],
      },
      {
        id: "textile-onboarding",
        detail:
          "The other family is absent from onboarding validators. Eight planned businesses have no operational records; OTHER-CLOTHES appears only in catalogue and synthetic price history.",
        materialCodes: ["OTHER-CLOTHES"],
        orgIds: this.data.businesses
          .filter((org) => org.family === "other")
          .map((org) => org.id),
      },
      {
        id: "missing-recycled-outputs",
        detail:
          "No recycled output codes for glass, e-waste or textiles. Do not fabricate recycler-to-manufacturer trades or conversion records.",
        materialCodes: this.data.materials
          .filter((item) => ["glass", "ewaste", "other"].includes(item.family))
          .map((item) => item.code),
        orgIds: this.data.businesses
          .filter(
            (org) =>
              org.kind === "manufacturer" &&
              ["glass", "ewaste", "other"].includes(org.family),
          )
          .map((org) => org.id),
      },
      {
        id: "identity-documents-admin",
        detail:
          "Synthetic identities are non-routable labels, not auth users. All application states and snapshots are review examples. Controlled identity mapping, a real authorised admin, schema-valid submissions and generated watermarked files are pending.",
        materialCodes: [],
        orgIds: [],
      },
      {
        id: "dropoff-travel-state",
        detail:
          "The shared booking validator permits on_the_way for drop-off; its public meaning needs review before including that scenario in an imported dataset.",
        materialCodes: [],
        orgIds: [],
      },
      {
        id: "unimplemented-services",
        detail:
          "No credit issuance, real escrow, notifications, provider calls or processing conversion records. Opening balances are explicit fictional starting stock, not claimed output production.",
        materialCodes: [],
        orgIds: [],
      },
    ];
  }
  build(): Manifest {
    this.addPeople();
    this.addPrices();
    // Explicit pre-existing sample stock, never invented processing conversions.
    for (const business of this.data.businesses) this.addOpeningFor(business);
    this.addTrades();
    this.addBookings();
    this.addJobs();
    this.addApplications();
    this.addBalances();
    this.addGaps();
    this.data.support = ["open", "answered"].map((status, index) => ({
      id: ref(`support:${status}`),
      userId: ref(`household:${pad(index + 1)}`),
      status: status === "open" ? "open" : "answered",
      subject: `Demo ${status} support example`,
    }));
    return this.data;
  }
}
export function buildManifest(): Manifest {
  return new Builder().build();
}
