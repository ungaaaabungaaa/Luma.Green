import type {
  DocumentField,
  PackDocuments,
  PackSide,
  PackStatus,
  PackView,
} from "./types";

/**
 * The document pack's screen rules, kept out of the components so they can
 * be tested on their own: which papers belong to which step of a trade,
 * which side recorded them, and what changed in a form.
 */

/** The steps of a trade that goes through, in order. */
export const PACK_STEPS = [
  "requested",
  "accepted",
  "paid_to_escrow",
  "dispatched",
  "completed",
] as const satisfies readonly PackStatus[];
export type PackStep = (typeof PACK_STEPS)[number];

/** Every document field, in the order the pack lists them. */
export const DOCUMENT_FIELDS = [
  "poNumber",
  "irn",
  "ewayBillNo",
  "vehicleNo",
  "driverPhone",
  "grnNumber",
  "notes",
] as const satisfies readonly DocumentField[];

/** Which step of the trade each paper belongs to. Notes stand apart. */
export const STEP_OF_FIELD: Record<Exclude<DocumentField, "notes">, PackStep> =
  {
    poNumber: "requested",
    irn: "paid_to_escrow",
    ewayBillNo: "dispatched",
    vehicleNo: "dispatched",
    driverPhone: "dispatched",
    grnNumber: "completed",
  };

/** The longest text the server keeps for each free-text field. */
export const MAX_LENGTH: Record<DocumentField, number> = {
  poNumber: 40,
  grnNumber: 40,
  ewayBillNo: 14,
  irn: 64,
  vehicleNo: 13,
  driverPhone: 16,
  notes: 280,
};

export interface DocumentEntry {
  field: DocumentField;
  value: string;
  /** Who recorded it. */
  by: PackSide;
}

/** Both sides' documents by side, whichever side I'm on. */
export function documentsBySide(
  pack: Pick<PackView, "side" | "mine" | "theirs">,
): Record<PackSide, PackDocuments> {
  return pack.side === "buyer"
    ? { buyer: pack.mine, seller: pack.theirs }
    : { buyer: pack.theirs, seller: pack.mine };
}

/**
 * Every paper recorded on the trade, in pack order, with who recorded it.
 * The e-way bill can come from either side; the seller's copy wins when
 * both wrote one, as the seller raises it when GST-registered.
 */
export function documentEntries(
  pack: Pick<PackView, "side" | "mine" | "theirs">,
): DocumentEntry[] {
  const docs = documentsBySide(pack);
  const entries: DocumentEntry[] = [];
  for (const field of DOCUMENT_FIELDS) {
    for (const by of ["seller", "buyer"] as const) {
      const value = docs[by][field];
      if (value === undefined) continue;
      entries.push({ field, value, by });
      if (field !== "notes") break;
    }
  }
  return entries;
}

/** The papers that belong to one step of the trade. */
export function entriesForStep(
  entries: readonly DocumentEntry[],
  step: PackStep,
): DocumentEntry[] {
  return entries.filter(
    (entry) => entry.field !== "notes" && STEP_OF_FIELD[entry.field] === step,
  );
}

/** When a trade reached a status, or null if it hasn't. */
export function reachedAt(
  timeline: readonly { status: PackStatus; at: number }[],
  status: PackStatus,
): number | null {
  return timeline.find((entry) => entry.status === status)?.at ?? null;
}

export type FormValues = Record<DocumentField, string>;

/** What the form starts with: my documents, blanks for the rest. */
export function formValuesOf(mine: PackDocuments): FormValues {
  return {
    poNumber: mine.poNumber ?? "",
    grnNumber: mine.grnNumber ?? "",
    ewayBillNo: mine.ewayBillNo ?? "",
    irn: mine.irn ?? "",
    vehicleNo: mine.vehicleNo ?? "",
    driverPhone: mine.driverPhone ?? "",
    notes: mine.notes ?? "",
  };
}

/**
 * Only the fields whose text changed, so an untouched field is never
 * re-sent (the server treats a missing field as "leave it") and a cleared
 * one goes as an empty string (which the server treats as "remove it").
 */
export function changedFields(
  before: FormValues,
  after: FormValues,
  editable: readonly DocumentField[],
): Partial<FormValues> {
  const changes: Partial<FormValues> = {};
  for (const field of editable) {
    if (after[field].trim() !== before[field].trim()) {
      changes[field] = after[field].trim();
    }
  }
  return changes;
}
