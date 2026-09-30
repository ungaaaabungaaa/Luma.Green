/**
 * Tax and paperwork rules for a scrap trade, and the khata's arithmetic.
 * Pure functions shared by Convex and the screens.
 *
 * Everything here is INFORMATIONAL, NOT TAX ADVICE: it labels a trade with
 * the rules that appear to apply so an accountant can check them faster. The
 * rules and their sources are summarised in docs/plan.md ("Law and
 * compliance built in") and the payments, legal and industry research:
 *
 * - GST on scrap (Notification 9/2025-CTR, from 22 Sep 2025): 5% on paper,
 *   glass cullet and rags; 18% on plastics, metal scrap, e-waste and
 *   batteries. Recycled output (granules, flakes, kraft, ingots) is 18%.
 * - Metal scrap (Customs Tariff chapters 72–81) bought by a GST-registered
 *   business from an unregistered seller is taxed on the buyer under reverse
 *   charge (Notification 06/2024-CTR, from 10 Oct 2024); the buyer issues a
 *   self-invoice within 30 days of receiving the goods (Rule 47A).
 * - Metal scrap between two registered businesses: the buyer deducts GST TDS
 *   of 2% (1% CGST + 1% SGST) once the contract value passes ₹2.5 lakh
 *   (Notification 25/2024-CT with CGST s.51).
 * - Income-tax TCS on sale of scrap: 2% from 1 Apr 2026 (Income-tax Act 2025
 *   s.394(1), Finance Bill 2026), collected by a seller that is a company,
 *   firm or a business above ₹1 crore turnover — waived when the buyer
 *   declares the goods are for manufacturing (s.394(2), Form 27C).
 * - E-way bill (CGST Rule 138): goods worth more than ₹50,000 moved by a
 *   motor vehicle; handcarts and cycles are exempt (r.138(14)(b)). Valid one
 *   day per 200 km. When the seller has no GSTIN the registered buyer raises
 *   it.
 * - Cash (Income-tax Act 2025): business payments above ₹10,000 in cash to
 *   one person in a day are not deductible (s.36(4)); nobody may receive
 *   ₹2 lakh or more in cash from one person in a day (s.186).
 * - UPI: ₹1 lakh per payment for most transfers (RBI, Apr 2025).
 * - MSMED Act: a buyer must pay a micro or small supplier within 45 days of
 *   accepting the goods, else compound interest at three times the RBI bank
 *   rate.
 * - Platform fee: ₹0 in the pilot. Luma.Green collects no money, so the
 *   e-commerce GST TCS (0.5%) and income-tax TDS (0.1%) do not apply.
 */

export type Family = "paper" | "plastic" | "metal" | "glass" | "ewaste" | "other";
export type Stage = "scrap" | "recycled";
export type Vehicle = "handcart" | "cycle" | "auto" | "mini_truck" | "truck";
export type PaymentMethod = "cash" | "upi" | "neft" | "imps" | "rtgs" | "escrow";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rates in basis points (1% = 100 bp) and limits in paise, dated. */
export const TAX_RULES = {
  /** The date these figures were checked against the notifications. */
  effectiveFrom: "2026-04-01",
  /** GST on scrap-stage material, by family (Notification 9/2025-CTR). */
  scrapGstBp: {
    paper: 500,
    glass: 500,
    other: 500,
    plastic: 1800,
    metal: 1800,
    ewaste: 1800,
  } satisfies Record<Family, number>,
  /** Recycled granules, flakes, kraft and ingots. */
  recycledGstBp: 1800,
  gstTdsBp: 200,
  gstTdsThresholdPaise: 250_000 * 100,
  scrapTcsBp: 200,
  ewayBillLimitPaise: 50_000 * 100,
  ewayBillKmPerDay: 200,
  ewayBillPartBOptionalKm: 50,
  selfInvoiceDays: 30,
  msmeDays: 45,
  cashDeductibleLimitPaise: 10_000 * 100,
  cashReceiptLimitPaise: 200_000 * 100,
  upiLimitPaise: 100_000 * 100,
  platformFeeBp: 0,
  /** Default credit terms on a trade, from acceptance. */
  creditDays: 30,
} as const;

// --- HSN and GST rate ----------------------------------------------------------

/** Indian tariff lines by material code where the catalogue has none. */
const HSN_BY_CODE: Record<string, string> = {
  "PAPER-NEWS": "47073000",
  "PAPER-CARTON": "47071000",
  "PAPER-BOOKS": "47073000",
  "PAPER-OFFICE": "47072000",
  "PAPER-MIXED": "47079000",
  "PLASTIC-PET": "39159029",
  "PLASTIC-HDPE": "39151000",
  "PLASTIC-PP": "39159090",
  "PLASTIC-LDPE": "39151000",
  "PLASTIC-MIXED": "39159090",
  "METAL-IRON": "72044900",
  "METAL-SS": "72042190",
  "METAL-ALU-CAN": "76020010",
  "METAL-ALU": "76020010",
  "METAL-COPPER": "74040012",
  "METAL-BRASS": "74040022",
  "GLASS-BOTTLE": "70010010",
  "EWASTE-SMALL": "85499900",
  "EWASTE-PHONE": "85492100",
  "EWASTE-CABLE": "85491900",
  "EWASTE-BATTERY": "85491300",
  "OTHER-CLOTHES": "63109010",
  "RECYCLED-PET-FLAKE": "39076190",
  "RECYCLED-HDPE-GRANULE": "39012000",
  "RECYCLED-KRAFT": "48041100",
  "RECYCLED-ALU-INGOT": "76011010",
};

/** The family's usual heading, when neither the catalogue nor the code map knows. */
const HSN_BY_FAMILY: Record<Stage, Record<Family, string>> = {
  scrap: {
    paper: "4707",
    plastic: "3915",
    metal: "7204",
    glass: "7001",
    ewaste: "8549",
    other: "6310",
  },
  recycled: {
    paper: "4804",
    plastic: "3901",
    metal: "7601",
    glass: "7001",
    ewaste: "8549",
    other: "6310",
  },
};

/** The HSN for a material: the catalogue's, else the code's, else the family's. */
export function hsnFor(
  code: string,
  family: Family,
  stage: Stage,
  catalogueHsn?: string,
): string {
  return catalogueHsn ?? HSN_BY_CODE[code] ?? HSN_BY_FAMILY[stage][family];
}

/** Chapters 72–81 of the Customs Tariff: the metals under reverse charge. */
export function isMetalScrapHsn(hsn: string): boolean {
  const chapter = Number(hsn.slice(0, 2));
  return chapter >= 72 && chapter <= 81;
}

/** GST rate in basis points, from the heading first and the family second. */
export function gstRateBp(hsn: string, family: Family, stage: Stage): number {
  const heading = hsn.slice(0, 4);
  if (heading === "4707" || heading === "7001" || heading === "6309" || heading === "6310") return 500;
  if (heading === "3915" || heading === "8548" || heading === "8549" || isMetalScrapHsn(hsn)) return 1800;
  return stage === "recycled"
    ? TAX_RULES.recycledGstBp
    : TAX_RULES.scrapGstBp[family];
}

/** `value` × `bp` basis points, rounded to the paisa. */
export function applyBp(valuePaise: number, bp: number): number {
  return Math.round((valuePaise * bp) / 10_000);
}

// --- The breakdown of one trade ------------------------------------------------

export interface TaxInput {
  /** The trade's price before tax: grams × paise per kg. */
  taxableValuePaise: number;
  materialCode: string;
  family: Family;
  stage: Stage;
  /** The catalogue's HSN, when it has one. */
  catalogueHsn?: string;
  sellerRegistered: boolean;
  buyerRegistered: boolean;
  /** The buyer declared the goods are for manufacturing (Form 27C). */
  buyerManufacturingDeclaration: boolean;
  /**
   * The seller is a "collector" for income-tax TCS: a company, firm or a
   * business over ₹1 crore turnover. A GST-registered business is the proxy
   * when nothing better is known.
   */
  sellerCollectsTcs?: boolean;
  vehicle?: Vehicle;
}

export type TaxNote =
  | "informational"
  | "forwardCharge"
  | "reverseCharge"
  | "selfInvoice"
  | "noGstUnregistered"
  | "gstTds"
  | "tcs"
  | "tcsWaived"
  | "tcsSellerSmall"
  | "tcsNotScrap"
  | "ewayBill"
  | "ewayBillNonMotor"
  | "ewayBillUnderLimit"
  | "noPlatformFee";

export interface TaxBreakdown {
  hsn: string;
  taxableValuePaise: number;
  gstRateBp: number;
  gstPaise: number;
  /** The buyer pays the GST to the government, not the seller. */
  reverseCharge: boolean;
  /** Days the buyer has to issue the RCM self-invoice, when it applies. */
  selfInvoiceDays: number | null;
  /** GST the seller charges on the invoice (0 under reverse charge). */
  invoiceGstPaise: number;
  invoiceTotalPaise: number;
  gstTdsPaise: number;
  tcsPaise: number;
  tcsWaived: boolean;
  ewayBill: EwayBillCheck;
  platformFeePaise: number;
  /** Who pays what, after every deduction and addition. */
  buyerPaysSellerPaise: number;
  buyerPaysGovernmentPaise: number;
  sellerRemitsGovernmentPaise: number;
  notes: TaxNote[];
}

export function taxBreakdown(input: TaxInput): TaxBreakdown {
  const hsn = hsnFor(
    input.materialCode,
    input.family,
    input.stage,
    input.catalogueHsn,
  );
  const rateBp = gstRateBp(hsn, input.family, input.stage);
  const isMetal = isMetalScrapHsn(hsn) && input.stage === "scrap";
  const notes: TaxNote[] = ["informational"];

  // GST: who charges it, if anyone.
  const isReverseCharge =
    isMetal && !input.sellerRegistered && input.buyerRegistered;
  let gstPaise = 0;
  if (input.sellerRegistered) {
    gstPaise = applyBp(input.taxableValuePaise, rateBp);
    notes.push("forwardCharge");
  } else if (isReverseCharge) {
    gstPaise = applyBp(input.taxableValuePaise, rateBp);
    notes.push("reverseCharge", "selfInvoice");
  } else {
    notes.push("noGstUnregistered");
  }
  const invoiceGstPaise = input.sellerRegistered ? gstPaise : 0;
  const invoiceTotalPaise = input.taxableValuePaise + invoiceGstPaise;

  // GST TDS: metal scrap between registered businesses over ₹2.5 lakh.
  const isGstTdsApplies =
    isMetal &&
    input.sellerRegistered &&
    input.buyerRegistered &&
    input.taxableValuePaise > TAX_RULES.gstTdsThresholdPaise;
  const gstTdsPaise = isGstTdsApplies
    ? applyBp(input.taxableValuePaise, TAX_RULES.gstTdsBp)
    : 0;
  if (isGstTdsApplies) notes.push("gstTds");

  // Income-tax TCS on scrap, collected by the seller from the buyer.
  const isSellerCollectsTcs = input.sellerCollectsTcs ?? input.sellerRegistered;
  let tcsPaise = 0;
  let isTcsWaived = false;
  if (input.stage !== "scrap") {
    notes.push("tcsNotScrap");
  } else if (!isSellerCollectsTcs) {
    notes.push("tcsSellerSmall");
  } else if (input.buyerManufacturingDeclaration) {
    isTcsWaived = true;
    notes.push("tcsWaived");
  } else {
    tcsPaise = applyBp(invoiceTotalPaise, TAX_RULES.scrapTcsBp);
    notes.push("tcs");
  }

  const ewayBill = ewayBillCheck({
    valuePaise: invoiceTotalPaise,
    vehicle: input.vehicle ?? "mini_truck",
    sellerRegistered: input.sellerRegistered,
    buyerRegistered: input.buyerRegistered,
  });
  notes.push(ewayBill.note);

  const platformFeePaise = applyBp(
    input.taxableValuePaise,
    TAX_RULES.platformFeeBp,
  );
  notes.push("noPlatformFee");

  return {
    hsn,
    taxableValuePaise: input.taxableValuePaise,
    gstRateBp: rateBp,
    gstPaise,
    reverseCharge: isReverseCharge,
    selfInvoiceDays: isReverseCharge ? TAX_RULES.selfInvoiceDays : null,
    invoiceGstPaise,
    invoiceTotalPaise,
    gstTdsPaise,
    tcsPaise,
    tcsWaived: isTcsWaived,
    ewayBill,
    platformFeePaise,
    buyerPaysSellerPaise: invoiceTotalPaise - gstTdsPaise + tcsPaise,
    buyerPaysGovernmentPaise: (isReverseCharge ? gstPaise : 0) + gstTdsPaise,
    sellerRemitsGovernmentPaise: invoiceGstPaise + tcsPaise,
    notes,
  };
}

// --- E-way bills -----------------------------------------------------------------

export interface EwayBillInput {
  /** The consignment's value including the GST on the document. */
  valuePaise: number;
  vehicle: Vehicle;
  sellerRegistered: boolean;
  buyerRegistered: boolean;
  distanceKm?: number;
}

export interface EwayBillCheck {
  needed: boolean;
  motorised: boolean;
  overLimit: boolean;
  /** Who generates it: the registered party causing the movement. */
  raisedBy: "seller" | "buyer" | "none";
  /** One day per 200 km (or part), when a distance is known. */
  validityDays: number | null;
  /** Part B (vehicle number) can wait for moves of up to 50 km to a transporter. */
  partBOptional: boolean;
  note: Extract<TaxNote, "ewayBill" | "ewayBillNonMotor" | "ewayBillUnderLimit">;
}

export function isMotorised(vehicle: Vehicle): boolean {
  return vehicle !== "handcart" && vehicle !== "cycle";
}

export function ewayBillCheck(input: EwayBillInput): EwayBillCheck {
  const motorised = isMotorised(input.vehicle);
  const isOverLimit = input.valuePaise > TAX_RULES.ewayBillLimitPaise;
  const isNeeded = motorised && isOverLimit;
  let raisedBy: EwayBillCheck["raisedBy"] = "none";
  if (input.sellerRegistered) raisedBy = "seller";
  else if (input.buyerRegistered) raisedBy = "buyer";
  const distance = input.distanceKm;
  const validityDays =
    distance === undefined || distance <= 0
      ? null
      : Math.max(1, Math.ceil(distance / TAX_RULES.ewayBillKmPerDay));
  let note: EwayBillCheck["note"] = "ewayBill";
  if (!motorised) note = "ewayBillNonMotor";
  else if (!isOverLimit) note = "ewayBillUnderLimit";
  return {
    needed: isNeeded,
    motorised,
    overLimit: isOverLimit,
    raisedBy: isNeeded ? raisedBy : "none",
    validityDays,
    partBOptional:
      distance !== undefined && distance <= TAX_RULES.ewayBillPartBOptionalKm,
    note,
  };
}

/** Great-circle distance between two points, in whole kilometres. */
export function distanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// --- Recording a payment -----------------------------------------------------------

export type PaymentWarning =
  | "cashNotDeductible"
  | "cashOverReceiptLimit"
  | "upiOverLimit";

/** What to tell someone before they record this payment. */
export function paymentWarnings(
  method: PaymentMethod,
  amountPaise: number,
): PaymentWarning[] {
  const warnings: PaymentWarning[] = [];
  if (method === "cash") {
    if (amountPaise >= TAX_RULES.cashReceiptLimitPaise) {
      warnings.push("cashOverReceiptLimit");
    } else if (amountPaise > TAX_RULES.cashDeductibleLimitPaise) {
      warnings.push("cashNotDeductible");
    }
  }
  if (method === "upi" && amountPaise > TAX_RULES.upiLimitPaise) {
    warnings.push("upiOverLimit");
  }
  return warnings;
}

/** Cash needs no reference; everything else carries one. */
export function referenceRequired(method: PaymentMethod): boolean {
  return method !== "cash";
}

// --- The khata -------------------------------------------------------------------

export type LedgerStatus = "open" | "part" | "settled" | "overdue";

/** Where an entry stands right now. */
export function ledgerStatus(
  entry: { duePaise: number; paidPaise: number; dueAt: number },
  now: number,
): LedgerStatus {
  if (entry.paidPaise >= entry.duePaise) return "settled";
  if (entry.dueAt < now) return "overdue";
  return entry.paidPaise > 0 ? "part" : "open";
}

/** Whole days from `now` to `at`: negative once it has passed. */
export function daysUntil(at: number, now: number): number {
  return Math.ceil((at - now) / DAY_MS);
}

/** Default credit terms: due 30 days after the trade was accepted. */
export function defaultDueAt(acceptedAt: number): number {
  return acceptedAt + TAX_RULES.creditDays * DAY_MS;
}

/** The MSMED Act clock: 45 days from the day the buyer accepted the goods. */
export function msmeDueAt(acceptedGoodsAt: number): number {
  return acceptedGoodsAt + TAX_RULES.msmeDays * DAY_MS;
}

export type MsmeCategory = "none" | "micro" | "small" | "medium";

/** Only micro and small suppliers get the 45-day rule. */
export function msmeProtected(category: MsmeCategory | undefined): boolean {
  return category === "micro" || category === "small";
}

/** RCM self-invoice deadline: 30 days after the goods were received. */
export function selfInvoiceDueAt(receivedAt: number): number {
  return receivedAt + TAX_RULES.selfInvoiceDays * DAY_MS;
}
