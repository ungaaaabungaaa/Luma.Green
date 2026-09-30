import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Family } from "./lib/catalogue";
import { isInEscrow, requiresEwayBill, type TradeStatus } from "./lib/chain";
import { indiaToday } from "./lib/onboarding";
import { normalizeIndianMobile } from "./lib/phone";
import { vOrgKind, vTradeStatus } from "./lib/validators";
import { vMaterialRef } from "./lib/views";
import { materialIndex, requireOrg } from "./lib/workspace";
import { vExportKind } from "./tables/exports";

/**
 * Exports and document packs. Luma.Green records each hand-off once and
 * hands it over in the shapes the trade already runs on: TallyPrime's Excel
 * import for the accountant, CPCB's EPR purchase register and SWM quarterly
 * return for the compliance person, the dry-waste centre's monthly report
 * for the city, and one evidence pack per trade for buyers and auditors.
 *
 * Every report is computed from the core tables (trades, bookings, inventory,
 * orgs) when asked for; nothing is stored except the documents each side
 * records on a trade and the history of downloads. Column names are part of
 * each file format, so they stay in English whatever language the screen is
 * in. Weights leave as kg and money as rupees, converted from integer grams
 * and paise at the very end.
 */

// --- Limits and shapes --------------------------------------------------------

/** The most trades or pickups one report reads, per side. */
const HISTORY = 1000;
/** Download history shown on the exports screen. */
const RUNS_SHOWN = 20;
/** Trades listed as document packs. */
const PACKS_SHOWN = 30;
/** Household receipts count as a trade's origin when this recent. */
const ORIGIN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const NUMBER_MAX_LENGTH = 40;
const NOTES_MAX_LENGTH = 280;

type Side = "buyer" | "seller";
type Materials = Awaited<ReturnType<typeof materialIndex>>;
type Cell = string | number | null;

export const DOCUMENT_FIELDS = [
  "poNumber",
  "grnNumber",
  "ewayBillNo",
  "irn",
  "vehicleNo",
  "driverPhone",
  "notes",
] as const;
export type DocumentField = (typeof DOCUMENT_FIELDS)[number];

/**
 * Which side records what. The buyer raises the purchase order and the goods
 * receipt note; the seller issues the e-invoice and sends the vehicle. Either
 * may hold the e-way bill number, since who raises it depends on who is
 * GST-registered (see `ewayBillBy`).
 */
export const FIELDS_BY_SIDE: Record<Side, readonly DocumentField[]> = {
  buyer: ["poNumber", "grnNumber", "ewayBillNo", "notes"],
  seller: ["irn", "ewayBillNo", "vehicleNo", "driverPhone", "notes"],
};

const vSide = v.union(v.literal("buyer"), v.literal("seller"));

const vDocumentField = v.union(
  v.literal("poNumber"),
  v.literal("grnNumber"),
  v.literal("ewayBillNo"),
  v.literal("irn"),
  v.literal("vehicleNo"),
  v.literal("driverPhone"),
  v.literal("notes"),
);

const documentFieldValidators = {
  poNumber: v.optional(v.string()),
  grnNumber: v.optional(v.string()),
  ewayBillNo: v.optional(v.string()),
  irn: v.optional(v.string()),
  vehicleNo: v.optional(v.string()),
  driverPhone: v.optional(v.string()),
  notes: v.optional(v.string()),
};

const vDocuments = v.object({
  ...documentFieldValidators,
  updatedAt: v.union(v.number(), v.null()),
});

const vParty = v.object({
  id: v.id("orgs"),
  name: v.string(),
  kind: vOrgKind,
  area: v.string(),
  address: v.string(),
  gstin: v.optional(v.string()),
});

const vTimeline = v.array(v.object({ status: vTradeStatus, at: v.number() }));

const vPackView = v.object({
  trade: v.object({
    id: v.id("trades"),
    status: vTradeStatus,
    material: vMaterialRef,
    grams: v.number(),
    paisePerKg: v.number(),
    totalPaise: v.number(),
    invoiceNo: v.optional(v.string()),
    needsEwayBill: v.boolean(),
    inEscrow: v.boolean(),
    timeline: vTimeline,
    createdAt: v.number(),
  }),
  side: vSide,
  seller: vParty,
  buyer: vParty,
  /** Who raises the e-way bill: the seller when GST-registered, else the buyer. */
  ewayBillBy: vSide,
  mine: vDocuments,
  theirs: vDocuments,
  editable: v.array(vDocumentField),
});

const vCell = v.union(v.string(), v.number(), v.null());

/** A report ready to preview and write as CSV: columns, then rows of cells. */
const vReport = v.object({
  kind: vExportKind,
  period: v.string(),
  columns: v.array(v.string()),
  rows: v.array(v.array(vCell)),
});

const vPackParty = v.object({
  name: v.string(),
  kind: vOrgKind,
  address: v.string(),
  gstin: v.union(v.string(), v.null()),
  consent: v.union(
    v.null(),
    v.object({
      board: v.string(),
      number: v.string(),
      validUntil: v.string(),
    }),
  ),
});

const vEvidencePack = v.object({
  format: v.literal("luma-green/evidence-pack@1"),
  generatedAt: v.string(),
  generatedBy: v.object({ org: v.string(), side: vSide }),
  trade: v.object({
    id: v.string(),
    receiptNo: v.union(v.string(), v.null()),
    status: vTradeStatus,
    material: v.object({ code: v.string(), name: v.string(), hsn: v.string() }),
    grams: v.number(),
    kg: v.number(),
    paisePerKg: v.number(),
    rupeesPerKg: v.number(),
    totalPaise: v.number(),
    totalRupees: v.number(),
    needsEwayBill: v.boolean(),
    ewayBillBy: vSide,
  }),
  timeline: v.array(
    v.object({ status: vTradeStatus, at: v.number(), date: v.string() }),
  ),
  parties: v.object({ seller: vPackParty, buyer: vPackParty }),
  documents: v.object({ buyer: vDocuments, seller: vDocuments }),
  receipts: v.object({
    trade: v.union(
      v.null(),
      v.object({
        number: v.string(),
        issuedAt: v.number(),
        releasedAt: v.union(v.number(), v.null()),
        escrow: v.union(v.literal("held"), v.literal("released")),
      }),
    ),
    /** Household pickups of the same material the seller weighed just before. */
    origin: v.array(
      v.object({ date: v.string(), pickups: v.number(), grams: v.number() }),
    ),
  }),
  audit: v.array(v.object({ action: v.string(), at: v.number() })),
});

// --- Periods --------------------------------------------------------------------

const MONTH_PERIOD = /^(\d{4})-(0[1-9]|1[0-2])$/;
/** YYYY-Qn: financial-year quarters, Q1 = April to June of that year. */
const QUARTER_PERIOD = /^(\d{4})-Q([1-4])$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Midnight in India at the start of a month; months past 12 roll over. */
function monthStart(year: number, month: number): number {
  const rolled =
    month > 12 ? { year: year + 1, month: month - 12 } : { year, month };
  return Date.parse(
    `${String(rolled.year)}-${pad2(rolled.month)}-01T00:00:00+05:30`,
  );
}

export interface PeriodRange {
  kind: "month" | "quarter";
  /** Inclusive, ms. */
  start: number;
  /** Exclusive, ms. */
  end: number;
  /** As it is written in a file: "2026-09" or "FY 2026-27 Q2". */
  label: string;
}

/**
 * The span a period covers, in India time. Months are calendar months;
 * quarters follow the Indian financial year, so 2026-Q4 is January to March
 * 2027. Null when the text isn't a period.
 */
export function periodRange(period: string): PeriodRange | null {
  const month = MONTH_PERIOD.exec(period);
  if (month) {
    const year = Number(month[1]);
    const index = Number(month[2]);
    return {
      kind: "month",
      start: monthStart(year, index),
      end: monthStart(year, index + 1),
      label: period,
    };
  }
  const quarter = QUARTER_PERIOD.exec(period);
  if (quarter) {
    const fy = Number(quarter[1]);
    const index = Number(quarter[2]);
    const firstMonth = 4 + (index - 1) * 3;
    return {
      kind: "quarter",
      start: monthStart(fy, firstMonth),
      end: monthStart(fy, firstMonth + 3),
      label: `FY ${String(fy)}-${String(fy + 1).slice(2)} Q${String(index)}`,
    };
  }
  return null;
}

function requirePeriod(
  period: string,
  kind?: PeriodRange["kind"],
): PeriodRange {
  const range = periodRange(period);
  if (!range || (kind && range.kind !== kind)) {
    throw new ConvexError("INVALID_PERIOD");
  }
  return range;
}

function isInRange(at: number | null, range: PeriodRange): at is number {
  return at !== null && at >= range.start && at < range.end;
}

// --- Tax and EPR reference data --------------------------------------------------

interface TaxInfo {
  /** Indian tariff heading (4 digits where the catalogue has none). */
  hsn: string;
  /** Indicative GST rate, percent. The accountant confirms it. */
  gstRate: number;
}

/**
 * Indicative headings and rates by material family, used when the catalogue
 * row has no HSN of its own. Waste paper, plastic and glass sit at 5%; metal
 * scrap, e-waste and recycled polymers at 18%.
 */
const TAX_BY_FAMILY: Record<Family, TaxInfo> = {
  paper: { hsn: "4707", gstRate: 5 },
  plastic: { hsn: "3915", gstRate: 5 },
  metal: { hsn: "7204", gstRate: 18 },
  glass: { hsn: "7001", gstRate: 5 },
  ewaste: { hsn: "8549", gstRate: 18 },
  other: { hsn: "6310", gstRate: 5 },
};

const TAX_BY_CODE: Partial<Record<string, TaxInfo>> = {
  "METAL-ALU-CAN": { hsn: "7602", gstRate: 18 },
  "METAL-ALU": { hsn: "7602", gstRate: 18 },
  "METAL-COPPER": { hsn: "7404", gstRate: 18 },
  "METAL-BRASS": { hsn: "7404", gstRate: 18 },
  "RECYCLED-PET-FLAKE": { hsn: "3907", gstRate: 18 },
  "RECYCLED-HDPE-GRANULE": { hsn: "3901", gstRate: 18 },
  "RECYCLED-KRAFT": { hsn: "4804", gstRate: 18 },
  "RECYCLED-ALU-INGOT": { hsn: "7601", gstRate: 18 },
};

/** Rates by the first two digits of an HSN the catalogue supplies. */
const GST_BY_CHAPTER: Partial<Record<string, number>> = {
  "39": 18,
  "47": 5,
  "48": 18,
  "63": 5,
  "70": 5,
  "72": 18,
  "74": 18,
  "76": 18,
  "85": 18,
};

export function taxFor(
  material: Doc<"materials"> | undefined,
  code: string,
): TaxInfo {
  const family: Family = material?.family ?? "other";
  const fallback = TAX_BY_CODE[code] ?? TAX_BY_FAMILY[family];
  if (!material?.hsn) return fallback;
  return {
    hsn: material.hsn,
    gstRate: GST_BY_CHAPTER[material.hsn.slice(0, 2)] ?? fallback.gstRate,
  };
}

interface EprInfo {
  /** The CPCB regime the material falls under, or none. */
  regime: string;
  category: string;
}

const EPR_BY_CODE: Partial<Record<string, EprInfo>> = {
  "PLASTIC-PET": { regime: "Plastic packaging", category: "Cat I (rigid)" },
  "PLASTIC-HDPE": { regime: "Plastic packaging", category: "Cat I (rigid)" },
  "PLASTIC-PP": { regime: "Plastic packaging", category: "Cat I (rigid)" },
  "PLASTIC-LDPE": {
    regime: "Plastic packaging",
    category: "Cat II (flexible)",
  },
  "PLASTIC-MIXED": {
    regime: "Plastic packaging",
    category: "Mixed: sort before claiming",
  },
  "RECYCLED-PET-FLAKE": {
    regime: "Plastic packaging",
    category: "Cat I (recycled content)",
  },
  "RECYCLED-HDPE-GRANULE": {
    regime: "Plastic packaging",
    category: "Cat I (recycled content)",
  },
  "EWASTE-BATTERY": { regime: "Batteries", category: "Lead-acid" },
};

const EPR_BY_FAMILY: Partial<Record<Family, EprInfo>> = {
  plastic: { regime: "Plastic packaging", category: "" },
  ewaste: { regime: "E-waste", category: "" },
};

const NO_EPR: EprInfo = { regime: "Not an EPR stream", category: "" };

export function eprFor(
  material: Doc<"materials"> | undefined,
  code: string,
): EprInfo {
  const family: Family = material?.family ?? "other";
  const known = EPR_BY_CODE[code] ?? EPR_BY_FAMILY[family] ?? NO_EPR;
  return material?.eprCategory
    ? { ...known, category: material.eprCategory }
    : known;
}

/** The SWM Rules 2026 stream a material is handed over in. */
export function streamFor(family: Family): string {
  return family === "ewaste" ? "Special care (e-waste, batteries)" : "Dry";
}

// --- Helpers ---------------------------------------------------------------------

function sideOf(trade: Doc<"trades">, orgId: Id<"orgs">): Side | null {
  if (trade.buyerOrgId === orgId) return "buyer";
  return trade.sellerOrgId === orgId ? "seller" : null;
}

function other(side: Side): Side {
  return side === "buyer" ? "seller" : "buyer";
}

function reachedAt(trade: Doc<"trades">, status: TradeStatus): number | null {
  return trade.timeline.find((entry) => entry.status === status)?.at ?? null;
}

/** GST-registered sellers raise the e-way bill; otherwise the buyer does. */
function ewayBillBy(seller: Doc<"orgs">): Side {
  return seller.gstin ? "seller" : "buyer";
}

function materialRef(materials: Materials, code: string) {
  const material = materials.get(code);
  return {
    code,
    names: material?.names ?? { en: code },
    family: material?.family ?? ("other" as const),
  };
}

function englishName(materials: Materials, code: string): string {
  return materials.get(code)?.names.en ?? code;
}

function partyOf(org: Doc<"orgs">) {
  return {
    id: org._id,
    name: org.name,
    kind: org.kind,
    area: org.area,
    address: org.address,
    gstin: org.gstin,
  };
}

/** A business as the evidence pack describes it, registrations included. */
function packParty(party: Doc<"orgs">) {
  return {
    name: party.name,
    kind: party.kind,
    address: party.address,
    gstin: party.gstin ?? null,
    consent: party.consent ?? null,
  };
}

function kg(grams: number): number {
  return grams / 1000;
}

function rupees(paise: number): number {
  return paise / 100;
}

/** Rupees per kg to the paisa, or null when nothing was sold. */
function averageRate(paise: number, grams: number): number | null {
  return grams === 0 ? null : Math.round((paise * 1000) / grams) / 100;
}

/** Looks each business up once per request. */
function orgLookup(ctx: QueryCtx) {
  const cache = new Map<Id<"orgs">, Promise<Doc<"orgs"> | null>>();
  return (id: Id<"orgs">) => {
    let org = cache.get(id);
    if (!org) {
      org = ctx.db.get("orgs", id);
      cache.set(id, org);
    }
    return org;
  };
}

type Documents = Partial<Record<DocumentField, string>> & {
  updatedAt: number | null;
};

function documentsOf(row: Doc<"tradeDocuments"> | undefined): Documents {
  if (!row) return { updatedAt: null };
  return {
    poNumber: row.poNumber,
    grnNumber: row.grnNumber,
    ewayBillNo: row.ewayBillNo,
    irn: row.irn,
    vehicleNo: row.vehicleNo,
    driverPhone: row.driverPhone,
    notes: row.notes,
    updatedAt: row.updatedAt,
  };
}

/** Both sides' documents on a trade, by side. */
async function documentsFor(
  ctx: QueryCtx,
  trade: Doc<"trades">,
): Promise<Record<Side, Documents>> {
  const rows = await ctx.db
    .query("tradeDocuments")
    .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
    .take(2);
  return {
    buyer: documentsOf(rows.find((row) => row.orgId === trade.buyerOrgId)),
    seller: documentsOf(rows.find((row) => row.orgId === trade.sellerOrgId)),
  };
}

/** The one e-way bill number on a trade, whichever side recorded it. */
function ewayBillOf(documents: Record<Side, Documents>): string {
  return documents.seller.ewayBillNo ?? documents.buyer.ewayBillNo ?? "";
}

/** The fields that are paperwork; notes are not counted as a document. */
const PAPER_FIELDS = DOCUMENT_FIELDS.filter((field) => field !== "notes");

function countFilled(documents: Record<Side, Documents>): number {
  return [documents.buyer, documents.seller].reduce(
    (count, row) =>
      count + PAPER_FIELDS.filter((field) => row[field] !== undefined).length,
    0,
  );
}

interface MyTrade {
  trade: Doc<"trades">;
  side: Side;
}

/** A trade I'm party to, or null. Accepts the id as it comes from the URL. */
async function myTrade(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  rawId: string,
): Promise<MyTrade | null> {
  const tradeId = ctx.db.normalizeId("trades", rawId);
  const trade = tradeId ? await ctx.db.get("trades", tradeId) : null;
  const side = trade ? sideOf(trade, orgId) : null;
  return trade && side ? { trade, side } : null;
}

/** My trades on both sides, newest first. */
async function myTrades(ctx: QueryCtx, orgId: Id<"orgs">): Promise<MyTrade[]> {
  const bought = await ctx.db
    .query("trades")
    .withIndex("by_buyer", (q) => q.eq("buyerOrgId", orgId))
    .order("desc")
    .take(HISTORY);
  const sold = await ctx.db
    .query("trades")
    .withIndex("by_seller", (q) => q.eq("sellerOrgId", orgId))
    .order("desc")
    .take(HISTORY);
  return [
    ...bought.map((trade) => ({ trade, side: "buyer" as const })),
    ...sold.map((trade) => ({ trade, side: "seller" as const })),
  ].toSorted((a, b) => b.trade.createdAt - a.trade.createdAt);
}

/** Turns column-keyed records into the rows a CSV wants, in column order. */
function tabulate<Column extends string>(
  columns: readonly Column[],
  records: readonly Record<Column, Cell>[],
): Cell[][] {
  return records.map((record) => columns.map((column) => record[column]));
}

const PLATE = /^(?:[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/;

/** What text people type becomes in the record, or the error it earns. */
export function cleanDocument(
  field: DocumentField,
  raw: string,
): string | undefined {
  const text = raw.trim();
  if (text === "") return undefined;
  switch (field) {
    case "ewayBillNo": {
      const digits = text.replaceAll(/[\s-]/g, "");
      if (!/^\d{12}$/.test(digits)) throw new ConvexError("INVALID_EWAY_BILL");
      return digits;
    }
    case "irn": {
      const irn = text.toLowerCase();
      if (!/^[\da-f]{64}$/.test(irn)) throw new ConvexError("INVALID_IRN");
      return irn;
    }
    case "vehicleNo": {
      const plate = text.toUpperCase().replaceAll(/[\s-]/g, "");
      if (!PLATE.test(plate)) throw new ConvexError("INVALID_VEHICLE");
      return plate;
    }
    case "driverPhone": {
      const phone = normalizeIndianMobile(text);
      if (!phone) throw new ConvexError("INVALID_PHONE");
      return phone;
    }
    case "notes": {
      if (text.length > NOTES_MAX_LENGTH) throw new ConvexError("TOO_LONG");
      return text;
    }
    case "poNumber":
    case "grnNumber": {
      if (text.length > NUMBER_MAX_LENGTH) throw new ConvexError("TOO_LONG");
      return text;
    }
  }
}

// --- Document packs ---------------------------------------------------------------

/**
 * The document pack of one of my trades: the trade and its timeline, both
 * businesses, my documents and theirs, and which fields are mine to edit.
 * Null when the trade isn't found or isn't mine.
 */
export const documents = query({
  args: { tradeId: v.string() },
  returns: v.union(v.null(), vPackView),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const mine = await myTrade(ctx, org._id, args.tradeId);
    if (!mine) return null;
    const { trade, side } = mine;
    const seller = await ctx.db.get("orgs", trade.sellerOrgId);
    const buyer = await ctx.db.get("orgs", trade.buyerOrgId);
    if (!seller || !buyer) return null;
    const materials = await materialIndex(ctx);
    const docs = await documentsFor(ctx, trade);
    return {
      trade: {
        id: trade._id,
        status: trade.status,
        material: materialRef(materials, trade.materialCode),
        grams: trade.grams,
        paisePerKg: trade.paisePerKg,
        totalPaise: trade.totalPaise,
        invoiceNo: trade.invoiceNo,
        needsEwayBill: requiresEwayBill(trade.totalPaise),
        inEscrow: isInEscrow(trade.status),
        timeline: trade.timeline,
        createdAt: trade.createdAt,
      },
      side,
      seller: partyOf(seller),
      buyer: partyOf(buyer),
      ewayBillBy: ewayBillBy(seller),
      mine: docs[side],
      theirs: docs[other(side)],
      editable: [...FIELDS_BY_SIDE[side]],
    };
  },
});

/**
 * Records my side's documents on a trade. Only the fields given change; an
 * empty string clears one. A side can only write its own fields
 * (FIELDS_BY_SIDE), and every value is checked for shape before it's kept.
 */
export const saveDocuments = mutation({
  args: {
    tradeId: v.id("trades"),
    fields: v.object(documentFieldValidators),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx);
    const trade = await ctx.db.get("trades", args.tradeId);
    const side = trade ? sideOf(trade, org._id) : null;
    if (!trade || !side) throw new ConvexError("NOT_FOUND");

    const changes: Partial<Record<DocumentField, string | undefined>> = {};
    for (const field of DOCUMENT_FIELDS) {
      const raw = args.fields[field];
      if (raw === undefined) continue;
      if (!FIELDS_BY_SIDE[side].includes(field)) {
        throw new ConvexError("NOT_YOUR_FIELD");
      }
      changes[field] = cleanDocument(field, raw);
    }
    const changed = Object.keys(changes);
    if (changed.length === 0) return null;

    const now = Date.now();
    const existing = await ctx.db
      .query("tradeDocuments")
      .withIndex("by_trade_org", (q) =>
        q.eq("tradeId", trade._id).eq("orgId", org._id),
      )
      .unique();
    const rowId = existing
      ? existing._id
      : await ctx.db.insert("tradeDocuments", {
          tradeId: trade._id,
          orgId: org._id,
          updatedAt: now,
        });
    // Setting a field to undefined removes it, which is how a value clears.
    await ctx.db.patch("tradeDocuments", rowId, { ...changes, updatedAt: now });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "tradeDocuments.updated",
      entityTable: "trades",
      entityId: trade._id,
      metadata: { side, fields: changed },
      createdAt: now,
    });
    return null;
  },
});

/** My recent trades, with how much paperwork each pack already holds. */
export const packs = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("trades"),
      side: vSide,
      status: vTradeStatus,
      material: vMaterialRef,
      grams: v.number(),
      totalPaise: v.number(),
      invoiceNo: v.optional(v.string()),
      counterparty: v.object({ name: v.string(), kind: vOrgKind }),
      documentsFilled: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const all = await myTrades(ctx, org._id);
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const views = [];
    for (const { trade, side } of all.slice(0, PACKS_SHOWN)) {
      const counterparty = await orgOf(
        side === "buyer" ? trade.sellerOrgId : trade.buyerOrgId,
      );
      if (!counterparty) continue;
      views.push({
        id: trade._id,
        side,
        status: trade.status,
        material: materialRef(materials, trade.materialCode),
        grams: trade.grams,
        totalPaise: trade.totalPaise,
        invoiceNo: trade.invoiceNo,
        counterparty: { name: counterparty.name, kind: counterparty.kind },
        documentsFilled: countFilled(await documentsFor(ctx, trade)),
        updatedAt: trade.updatedAt,
      });
    }
    return views;
  },
});

/**
 * Where a trade's material came from: the seller's household pickups of the
 * same material in the month before the request, summed by day. Dates and
 * kilos only; nothing about the households.
 */
async function originOf(
  ctx: QueryCtx,
  seller: Doc<"orgs">,
  trade: Doc<"trades">,
): Promise<{ date: string; pickups: number; grams: number }[]> {
  if (seller.kind !== "kabadiwala") return [];
  const pickups = await ctx.db
    .query("bookings")
    .withIndex("by_org_status", (q) =>
      q.eq("orgId", seller._id).eq("status", "completed"),
    )
    .order("desc")
    .take(HISTORY);
  const byDate = new Map<string, { pickups: number; grams: number }>();
  for (const pickup of pickups) {
    const receipt = pickup.receipt;
    if (
      !receipt ||
      receipt.paidAt > trade.createdAt ||
      receipt.paidAt < trade.createdAt - ORIGIN_WINDOW_MS
    ) {
      continue;
    }
    const grams = receipt.lines
      .filter((line) => line.materialCode === trade.materialCode)
      .reduce((sum, line) => sum + line.grams, 0);
    if (grams === 0) continue;
    const date = indiaToday(receipt.paidAt);
    const day = byDate.get(date) ?? { pickups: 0, grams: 0 };
    byDate.set(date, { pickups: day.pickups + 1, grams: day.grams + grams });
  }
  const days = [];
  for (const [date, day] of byDate) days.push({ date, ...day });
  return days.toSorted((a, b) => a.date.localeCompare(b.date));
}

/**
 * Everything about one trade in one JSON file, for a buyer's compliance
 * folder or an auditor: the trade, its timeline, both businesses with their
 * registrations, both sides' documents, the trade receipt, the household
 * pickups the material came from (dates and kilos only) and the audit trail.
 */
export const evidencePack = query({
  args: { tradeId: v.string() },
  returns: v.union(v.null(), vEvidencePack),
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const mine = await myTrade(ctx, org._id, args.tradeId);
    if (!mine) return null;
    const { trade, side } = mine;
    const seller = await ctx.db.get("orgs", trade.sellerOrgId);
    const buyer = await ctx.db.get("orgs", trade.buyerOrgId);
    if (!seller || !buyer) return null;
    const materials = await materialIndex(ctx);
    const material = materials.get(trade.materialCode);
    const docs = await documentsFor(ctx, trade);
    const issuedAt = reachedAt(trade, "paid_to_escrow");
    const releasedAt = reachedAt(trade, "completed");
    const audit = await ctx.db
      .query("auditLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityTable", "trades").eq("entityId", trade._id),
      )
      .take(HISTORY);

    return {
      format: "luma-green/evidence-pack@1" as const,
      generatedAt: new Date().toISOString(),
      generatedBy: { org: org.name, side },
      trade: {
        id: trade._id,
        receiptNo: trade.invoiceNo ?? null,
        status: trade.status,
        material: {
          code: trade.materialCode,
          name: englishName(materials, trade.materialCode),
          hsn: taxFor(material, trade.materialCode).hsn,
        },
        grams: trade.grams,
        kg: kg(trade.grams),
        paisePerKg: trade.paisePerKg,
        rupeesPerKg: rupees(trade.paisePerKg),
        totalPaise: trade.totalPaise,
        totalRupees: rupees(trade.totalPaise),
        needsEwayBill: requiresEwayBill(trade.totalPaise),
        ewayBillBy: ewayBillBy(seller),
      },
      timeline: trade.timeline.map((entry) => ({
        ...entry,
        date: indiaToday(entry.at),
      })),
      parties: { seller: packParty(seller), buyer: packParty(buyer) },
      documents: docs,
      receipts: {
        trade:
          issuedAt !== null && trade.invoiceNo
            ? {
                number: trade.invoiceNo,
                issuedAt,
                releasedAt,
                escrow:
                  releasedAt === null
                    ? ("held" as const)
                    : ("released" as const),
              }
            : null,
        origin: await originOf(ctx, seller, trade),
      },
      audit: audit
        .toSorted((a, b) => a.createdAt - b.createdAt)
        .map((row) => ({ action: row.action, at: row.createdAt })),
    };
  },
});

// --- Tally vouchers -----------------------------------------------------------------

const TALLY_COLUMNS = [
  "Voucher Date",
  "Voucher Type",
  "Voucher Number",
  "Tracking Number",
  "Party Ledger Name",
  "Party GSTIN",
  "Registration Type",
  "Item Name",
  "Item Code",
  "HSN/SAC",
  "Quantity",
  "Unit",
  "Rate",
  "Item Amount",
  "GST Rate (%)",
  "Reverse Charge",
  "E-Way Bill Number",
  "Narration",
] as const;
type TallyColumn = (typeof TALLY_COLUMNS)[number];
type TallyVoucher = "Purchase" | "Receipt Note" | "Sales";

/** Within one day, purchases first, then receipt notes, then sales. */
const TALLY_ORDER: Record<TallyVoucher, number> = {
  Purchase: 0,
  "Receipt Note": 1,
  Sales: 2,
};

interface TallyRecord {
  at: number;
  type: TallyVoucher;
  cells: Record<TallyColumn, Cell>;
}

/**
 * The vouchers one trade puts in my books for a month: a Purchase or a Sales
 * voucher dated when the buyer paid into escrow (when the trade receipt is
 * issued) and, for the buyer, a Receipt Note dated when delivery was
 * confirmed. Metal scrap bought from an unregistered seller is marked
 * reverse charge, as the GST rules since October 2024 require.
 */
function tallyRecordsFor(
  { trade, side }: MyTrade,
  me: Doc<"orgs">,
  counterparty: Doc<"orgs">,
  materials: Materials,
  docs: Record<Side, Documents>,
  range: PeriodRange,
): TallyRecord[] {
  const receiptNo = trade.invoiceNo;
  if (!receiptNo) return [];
  const seller = side === "seller" ? me : counterparty;
  const buyer = side === "buyer" ? me : counterparty;
  const material = materials.get(trade.materialCode);
  const tax = taxFor(material, trade.materialCode);
  const name = englishName(materials, trade.materialCode);
  const isReverseCharge =
    side === "buyer" && material?.family === "metal" && !seller.gstin;

  const voucher = (
    type: TallyVoucher,
    at: number,
    number: string,
  ): TallyRecord => ({
    at,
    type,
    cells: {
      "Voucher Date": indiaToday(at),
      "Voucher Type": type,
      "Voucher Number": number,
      "Tracking Number": receiptNo,
      "Party Ledger Name": counterparty.name,
      "Party GSTIN": counterparty.gstin ?? "",
      "Registration Type": counterparty.gstin ? "Regular" : "Unregistered",
      "Item Name": name,
      "Item Code": trade.materialCode,
      "HSN/SAC": tax.hsn,
      Quantity: kg(trade.grams),
      Unit: "KGS",
      Rate: rupees(trade.paisePerKg),
      "Item Amount": rupees(trade.totalPaise),
      "GST Rate (%)": tax.gstRate,
      "Reverse Charge": type === "Purchase" && isReverseCharge ? "Yes" : "No",
      "E-Way Bill Number": ewayBillOf(docs),
      Narration: `Luma.Green trade ${receiptNo}: ${name} ${String(kg(trade.grams))} kg, ${seller.name} to ${buyer.name}`,
    },
  });

  const records: TallyRecord[] = [];
  const paidAt = reachedAt(trade, "paid_to_escrow");
  if (isInRange(paidAt, range)) {
    records.push(
      voucher(side === "buyer" ? "Purchase" : "Sales", paidAt, receiptNo),
    );
  }
  const deliveredAt = reachedAt(trade, "completed");
  if (side === "buyer" && isInRange(deliveredAt, range)) {
    records.push(
      voucher(
        "Receipt Note",
        deliveredAt,
        docs.buyer.grnNumber ?? `GRN-${receiptNo}`,
      ),
    );
  }
  return records;
}

/**
 * Purchase, Receipt Note and Sales vouchers for one month, one row per
 * trade, laid out the way TallyPrime's Excel import reads transactions.
 */
export const tally = query({
  args: { period: v.string() },
  returns: vReport,
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const range = requirePeriod(args.period, "month");
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const trades = await myTrades(ctx, org._id);
    const records: TallyRecord[] = [];
    for (const mine of trades) {
      const { trade, side } = mine;
      const counterparty = await orgOf(
        side === "buyer" ? trade.sellerOrgId : trade.buyerOrgId,
      );
      if (!counterparty) continue;
      const docs = await documentsFor(ctx, trade);
      records.push(
        ...tallyRecordsFor(mine, org, counterparty, materials, docs, range),
      );
    }
    records.sort(
      (a, b) => a.at - b.at || TALLY_ORDER[a.type] - TALLY_ORDER[b.type],
    );
    return {
      kind: "tally" as const,
      period: args.period,
      columns: [...TALLY_COLUMNS],
      rows: tabulate(
        TALLY_COLUMNS,
        records.map((record) => record.cells),
      ),
    };
  },
});

// --- EPR purchase register ---------------------------------------------------------

const EPR_COLUMNS = [
  "Date of Receipt",
  "Supplier Name",
  "Supplier Address",
  "Supplier GSTIN / PAN",
  "Supplier Registration",
  "Material",
  "Material Code",
  "EPR Regime",
  "EPR Category",
  "Quantity (kg)",
  "Quantity (t)",
  "Invoice / Receipt No.",
  "Invoice Date",
  "E-Way Bill No.",
  "Vehicle No.",
] as const;
type EprColumn = (typeof EPR_COLUMNS)[number];

/**
 * Every purchase delivered in a month, with the supplier, its GSTIN, the
 * EPR regime and category, and the kilos, in the order CPCB's EPR portals
 * ask for a processor's procurement entries. The supplier's GSTIN is blank
 * for unregistered kabadiwalas; the portal then takes a PAN or Aadhaar,
 * which Luma.Green never stores.
 */
export const eprPurchaseRegister = query({
  args: { period: v.string() },
  returns: vReport,
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const range = requirePeriod(args.period, "month");
    const materials = await materialIndex(ctx);
    const orgOf = orgLookup(ctx);
    const trades = await myTrades(ctx, org._id);
    const records: { at: number; cells: Record<EprColumn, Cell> }[] = [];

    for (const { trade, side } of trades) {
      if (side !== "buyer") continue;
      const deliveredAt = reachedAt(trade, "completed");
      if (!isInRange(deliveredAt, range)) continue;
      const supplier = await orgOf(trade.sellerOrgId);
      if (!supplier) continue;
      const material = materials.get(trade.materialCode);
      const epr = eprFor(material, trade.materialCode);
      const docs = await documentsFor(ctx, trade);
      const paidAt = reachedAt(trade, "paid_to_escrow");
      records.push({
        at: deliveredAt,
        cells: {
          "Date of Receipt": indiaToday(deliveredAt),
          "Supplier Name": supplier.name,
          "Supplier Address": supplier.address,
          "Supplier GSTIN / PAN": supplier.gstin ?? "",
          "Supplier Registration": supplier.gstin
            ? "GST-registered"
            : "Unregistered (verified on Luma.Green)",
          Material: englishName(materials, trade.materialCode),
          "Material Code": trade.materialCode,
          "EPR Regime": epr.regime,
          "EPR Category": epr.category,
          "Quantity (kg)": kg(trade.grams),
          "Quantity (t)": trade.grams / 1_000_000,
          "Invoice / Receipt No.": trade.invoiceNo ?? "",
          "Invoice Date": paidAt === null ? "" : indiaToday(paidAt),
          "E-Way Bill No.": ewayBillOf(docs),
          "Vehicle No.": docs.seller.vehicleNo ?? "",
        },
      });
    }

    records.sort((a, b) => a.at - b.at);
    return {
      kind: "eprPurchaseRegister" as const,
      period: args.period,
      columns: [...EPR_COLUMNS],
      rows: tabulate(
        EPR_COLUMNS,
        records.map((record) => record.cells),
      ),
    };
  },
});

// --- Movements by material, for the SWM and monthly reports -----------------------

interface Movement {
  code: string;
  fromHouseholdsGrams: number;
  fromBusinessesGrams: number;
  sentGrams: number;
  sentPaise: number;
  buyers: Set<string>;
  stockGrams: number;
}

class Movements {
  private readonly byCode = new Map<string, Movement>();

  private of(code: string): Movement {
    let row = this.byCode.get(code);
    if (!row) {
      row = {
        code,
        fromHouseholdsGrams: 0,
        fromBusinessesGrams: 0,
        sentGrams: 0,
        sentPaise: 0,
        buyers: new Set(),
        stockGrams: 0,
      };
      this.byCode.set(code, row);
    }
    return row;
  }

  /** A household pickup paid for. */
  fromHousehold(code: string, grams: number): void {
    this.of(code).fromHouseholdsGrams += grams;
  }

  /** A purchase from another business, delivered. */
  fromBusiness(code: string, grams: number): void {
    this.of(code).fromBusinessesGrams += grams;
  }

  /** A sale dispatched to a buyer, named as the return wants it. */
  sent(code: string, grams: number, paise: number, buyer: string | null) {
    const row = this.of(code);
    row.sentGrams += grams;
    row.sentPaise += paise;
    if (buyer !== null) row.buyers.add(buyer);
  }

  /** Today's stock of a material. */
  stock(code: string, grams: number): void {
    this.of(code).stockGrams = grams;
  }

  /** Rows in catalogue order; materials the catalogue lacks come last. */
  inOrder(materials: Materials): Movement[] {
    const rank = new Map<string, number>();
    for (const [code] of materials) rank.set(code, rank.size);
    const rows: Movement[] = [];
    for (const [, row] of this.byCode) rows.push(row);
    const rankOf = (code: string) => rank.get(code) ?? rank.size;
    return rows.toSorted(
      (a, b) => rankOf(a.code) - rankOf(b.code) || a.code.localeCompare(b.code),
    );
  }
}

/** Household pickups paid for in the period, by material. */
async function addPickups(
  ctx: QueryCtx,
  org: Doc<"orgs">,
  range: PeriodRange,
  movements: Movements,
) {
  const pickups = await ctx.db
    .query("bookings")
    .withIndex("by_org_status", (q) =>
      q.eq("orgId", org._id).eq("status", "completed"),
    )
    .order("desc")
    .take(HISTORY);
  for (const pickup of pickups) {
    if (!pickup.receipt || !isInRange(pickup.receipt.paidAt, range)) continue;
    for (const line of pickup.receipt.lines) {
      movements.fromHousehold(line.materialCode, line.grams);
    }
  }
}

/** How a buyer is named in a return: with its GSTIN when it has one. */
function registeredName(buyer: Doc<"orgs">): string {
  return buyer.gstin ? `${buyer.name} (GSTIN ${buyer.gstin})` : buyer.name;
}

/** Purchases delivered and sales dispatched in the period, by material. */
async function addTrades(
  ctx: QueryCtx,
  org: Doc<"orgs">,
  range: PeriodRange,
  movements: Movements,
) {
  const orgOf = orgLookup(ctx);
  const trades = await myTrades(ctx, org._id);
  for (const { trade, side } of trades) {
    if (side === "buyer") {
      if (isInRange(reachedAt(trade, "completed"), range)) {
        movements.fromBusiness(trade.materialCode, trade.grams);
      }
      continue;
    }
    if (!isInRange(reachedAt(trade, "dispatched"), range)) continue;
    const buyer = await orgOf(trade.buyerOrgId);
    movements.sent(
      trade.materialCode,
      trade.grams,
      trade.totalPaise,
      buyer ? registeredName(buyer) : null,
    );
  }
}

/** Today's stock, by material. */
async function addStock(ctx: QueryCtx, org: Doc<"orgs">, movements: Movements) {
  const stock = await ctx.db
    .query("inventory")
    .withIndex("by_org", (q) => q.eq("orgId", org._id))
    .take(HISTORY);
  for (const row of stock) {
    if (row.grams > 0) movements.stock(row.materialCode, row.grams);
  }
}

/**
 * What came in, went out and is on hand, per material, over a period:
 * household pickups paid for, purchases delivered, sales dispatched, and
 * today's stock. Stock is only known for today, so it's left out of a
 * report for an earlier period. Rows come back in catalogue order, empty
 * ones left out.
 */
async function movementsFor(
  ctx: QueryCtx,
  org: Doc<"orgs">,
  range: PeriodRange,
  materials: Materials,
): Promise<Movement[]> {
  const movements = new Movements();
  await addPickups(ctx, org, range, movements);
  await addTrades(ctx, org, range, movements);
  if (isInRange(Date.now(), range)) await addStock(ctx, org, movements);
  return movements
    .inOrder(materials)
    .filter(
      (row) =>
        row.fromHouseholdsGrams + row.fromBusinessesGrams > 0 ||
        row.sentGrams > 0 ||
        row.stockGrams > 0,
    );
}

function buyersCell(buyers: ReadonlySet<string>): string {
  return [...buyers].toSorted((a, b) => a.localeCompare(b)).join("; ");
}

function sum(rows: readonly Movement[], pick: (row: Movement) => number) {
  return rows.reduce((total, row) => total + pick(row), 0);
}

/** Everything that came in: household pickups and purchases. */
function receivedGrams(row: Movement): number {
  return row.fromHouseholdsGrams + row.fromBusinessesGrams;
}

// --- SWM quarterly return --------------------------------------------------------------

const SWM_COLUMNS = [
  "Quarter",
  "Stream",
  "Material",
  "Material Code",
  "HSN",
  "Received (kg)",
  "Sorted (kg)",
  "Sent to registered processors (kg)",
  "Sent to",
  "Stock on hand (kg)",
] as const;
type SwmColumn = (typeof SWM_COLUMNS)[number];

/**
 * The quarterly return rule 9 of the SWM Rules 2026 asks of anyone who
 * collects or sorts dry waste: what was received, sorted and sent on to
 * registered processors, by stream and material. Everything weighed on
 * Luma.Green is recorded by material, so received and sorted agree; every
 * buyer on the platform is verified by the admin, so sales count as sent to
 * registered processors and the return names them.
 */
export const swmQuarterly = query({
  args: { period: v.string() },
  returns: vReport,
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const range = requirePeriod(args.period, "quarter");
    const materials = await materialIndex(ctx);
    const movements = await movementsFor(ctx, org, range, materials);

    const records: Record<SwmColumn, Cell>[] = movements.map((row) => {
      const material = materials.get(row.code);
      return {
        Quarter: range.label,
        Stream: streamFor(material?.family ?? "other"),
        Material: englishName(materials, row.code),
        "Material Code": row.code,
        HSN: taxFor(material, row.code).hsn,
        "Received (kg)": kg(receivedGrams(row)),
        "Sorted (kg)": kg(receivedGrams(row)),
        "Sent to registered processors (kg)": kg(row.sentGrams),
        "Sent to": buyersCell(row.buyers),
        "Stock on hand (kg)": kg(row.stockGrams),
      };
    });
    if (records.length > 0) {
      records.push({
        Quarter: range.label,
        Stream: "",
        Material: "Total",
        "Material Code": "",
        HSN: "",
        "Received (kg)": kg(sum(movements, receivedGrams)),
        "Sorted (kg)": kg(sum(movements, receivedGrams)),
        "Sent to registered processors (kg)": kg(
          sum(movements, (row) => row.sentGrams),
        ),
        "Sent to": "",
        "Stock on hand (kg)": kg(sum(movements, (row) => row.stockGrams)),
      });
    }
    return {
      kind: "swmQuarterly" as const,
      period: args.period,
      columns: [...SWM_COLUMNS],
      rows: tabulate(SWM_COLUMNS, records),
    };
  },
});

// --- Monthly recyclables report -----------------------------------------------------------

const MONTHLY_COLUMNS = [
  "Month",
  "Material",
  "Material Code",
  "From households (kg)",
  "From businesses (kg)",
  "Received (kg)",
  "Sold (kg)",
  "Sale value (INR)",
  "Average rate (INR/kg)",
  "Sold to",
  "Stock now (kg)",
] as const;
type MonthlyColumn = (typeof MONTHLY_COLUMNS)[number];

/**
 * The monthly recyclables report a dry-waste collection centre or MRF gives
 * the city: received, sold and on hand, by material, with buyers and the
 * money. The same figures feed a city's Swachhatam upload.
 */
export const monthlyRecyclables = query({
  args: { period: v.string() },
  returns: vReport,
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx);
    const range = requirePeriod(args.period, "month");
    const materials = await materialIndex(ctx);
    const movements = await movementsFor(ctx, org, range, materials);

    const records: Record<MonthlyColumn, Cell>[] = movements.map((row) => ({
      Month: range.label,
      Material: englishName(materials, row.code),
      "Material Code": row.code,
      "From households (kg)": kg(row.fromHouseholdsGrams),
      "From businesses (kg)": kg(row.fromBusinessesGrams),
      "Received (kg)": kg(row.fromHouseholdsGrams + row.fromBusinessesGrams),
      "Sold (kg)": kg(row.sentGrams),
      "Sale value (INR)": rupees(row.sentPaise),
      "Average rate (INR/kg)": averageRate(row.sentPaise, row.sentGrams),
      "Sold to": buyersCell(row.buyers),
      "Stock now (kg)": kg(row.stockGrams),
    }));
    if (records.length > 0) {
      const households = sum(movements, (row) => row.fromHouseholdsGrams);
      const businesses = sum(movements, (row) => row.fromBusinessesGrams);
      const sold = sum(movements, (row) => row.sentGrams);
      const paise = sum(movements, (row) => row.sentPaise);
      records.push({
        Month: range.label,
        Material: "Total",
        "Material Code": "",
        "From households (kg)": kg(households),
        "From businesses (kg)": kg(businesses),
        "Received (kg)": kg(households + businesses),
        "Sold (kg)": kg(sold),
        "Sale value (INR)": rupees(paise),
        "Average rate (INR/kg)": averageRate(paise, sold),
        "Sold to": "",
        "Stock now (kg)": kg(sum(movements, (row) => row.stockGrams)),
      });
    }
    return {
      kind: "monthlyRecyclables" as const,
      period: args.period,
      columns: [...MONTHLY_COLUMNS],
      rows: tabulate(MONTHLY_COLUMNS, records),
    };
  },
});

// --- Download history ------------------------------------------------------------------

/**
 * Files I downloaded, newest first. A document pack's `period` is a trade
 * id, so it also carries the trade's receipt number as `reference`.
 */
export const runs = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("exportRuns"),
      kind: vExportKind,
      period: v.string(),
      reference: v.union(v.string(), v.null()),
      rows: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const { org } = await requireOrg(ctx);
    const rows = await ctx.db
      .query("exportRuns")
      .withIndex("by_org_created", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(RUNS_SHOWN);
    const views = [];
    for (const row of rows) {
      let reference: string | null = null;
      if (row.kind === "evidencePack") {
        const tradeId = ctx.db.normalizeId("trades", row.period);
        const trade = tradeId ? await ctx.db.get("trades", tradeId) : null;
        reference = trade?.invoiceNo ?? null;
      }
      views.push({
        id: row._id,
        kind: row.kind,
        period: row.period,
        reference,
        rows: row.rows,
        createdAt: row.createdAt,
      });
    }
    return views;
  },
});

/** Notes that a file was downloaded, for the history and the audit log. */
export const recordRun = mutation({
  args: { kind: vExportKind, period: v.string(), rows: v.number() },
  returns: v.id("exportRuns"),
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrg(ctx);
    if (!Number.isSafeInteger(args.rows) || args.rows < 0) {
      throw new ConvexError("INVALID_ROWS");
    }
    if (args.kind === "evidencePack") {
      const mine = await myTrade(ctx, org._id, args.period);
      if (!mine) throw new ConvexError("NOT_FOUND");
    } else {
      requirePeriod(args.period);
    }
    const now = Date.now();
    const runId = await ctx.db.insert("exportRuns", {
      orgId: org._id,
      kind: args.kind,
      period: args.period,
      rows: args.rows,
      createdAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "export.downloaded",
      entityTable: "exportRuns",
      entityId: runId,
      metadata: { kind: args.kind, period: args.period, rows: args.rows },
      createdAt: now,
    });
    return runId;
  },
});
