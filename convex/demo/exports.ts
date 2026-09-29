import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requiresEwayBill } from "../lib/chain";
import type { DemoWorld } from "../lib/demoWorld";

/**
 * Sample data for the "exports" area, seeded after the base demo world: the
 * paperwork both sides have recorded on every trade that has been paid for,
 * and a short download history for the demo businesses. Runs inside
 * demo:seed and demo:reset; idempotent for one run and only writes to this
 * area's own tables.
 */

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const VEHICLES = ["KA01AB1234", "KA05MJ4477", "KA51AE9021", "KA02NC7788"];
const DRIVERS = ["+919845000301", "+919845000302", "+919845000303"];

type Orgs = Map<Id<"orgs">, Doc<"orgs">>;

/** A small, repeatable hash so demo numbers look real and never change. */
function hash(text: string): number {
  let value = 2_166_136_261;
  for (const char of text) {
    value = Math.imul(value ^ (char.codePointAt(0) ?? 0), 16_777_619) >>> 0;
  }
  return value;
}

/** `length` characters of hex or decimal digits, derived from a seed. */
function derived(seed: string, length: number, radix: 10 | 16): string {
  let out = "";
  let round = 0;
  while (out.length < length) {
    out += hash(`${seed}:${String(round)}`)
      .toString(radix)
      .padStart(radix === 16 ? 8 : 10, "0");
    round += 1;
  }
  return out.slice(0, length);
}

/** "peenya-paper-plastic-yard" → "PPPY", for document numbers. */
function initials(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** "26-27" for a date in the Indian financial year 2026-27. */
function fyLabel(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const start = month >= 4 ? year : year - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

/** The month before `today`, as YYYY-MM. */
function lastMonth(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return month === 1
    ? `${String(year - 1)}-12`
    : `${String(year)}-${String(month - 1).padStart(2, "0")}`;
}

/** The financial-year quarter before the one `today` is in, as YYYY-Qn. */
function lastQuarter(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const fy = month >= 4 ? year : year - 1;
  const quarter = Math.floor(((month + 8) % 12) / 3) + 1; // Apr → 1
  return quarter === 1
    ? `${String(fy - 1)}-Q4`
    : `${String(fy)}-Q${String(quarter - 1)}`;
}

/**
 * Both sides' paperwork on one paid trade: the buyer's PO (and GRN once
 * delivered), the seller's e-invoice IRN when GST-registered, the vehicle and
 * driver once the load moves, and the e-way bill recorded by whoever raises
 * it: the seller when GST-registered, else the buyer.
 */
async function seedTradeDocuments(
  ctx: MutationCtx,
  trade: Doc<"trades">,
  seller: Doc<"orgs">,
  buyer: Doc<"orgs">,
  sequence: number,
  fy: string,
) {
  const number = String(sequence).padStart(3, "0");
  const isMoving =
    trade.status === "dispatched" || trade.status === "completed";
  const isDelivered = trade.status === "completed";
  const ewayBillNo = requiresEwayBill(trade.totalPaise)
    ? derived(`eway:${trade._id}`, 12, 10)
    : undefined;
  const paidAt =
    trade.timeline.find((entry) => entry.status === "paid_to_escrow")?.at ??
    trade.createdAt;

  await ctx.db.insert("tradeDocuments", {
    tradeId: trade._id,
    orgId: buyer._id,
    poNumber: `PO/${initials(buyer.slug)}/${fy}/${number}`,
    grnNumber: isDelivered
      ? `GRN/${initials(buyer.slug)}/${fy}/${number}`
      : undefined,
    ewayBillNo: seller.gstin ? undefined : ewayBillNo,
    notes: isDelivered
      ? "Weighed at our gate; net weight matched the receipt."
      : undefined,
    updatedAt: paidAt + HOUR,
  });
  await ctx.db.insert("tradeDocuments", {
    tradeId: trade._id,
    orgId: seller._id,
    irn: seller.gstin ? derived(`irn:${trade._id}`, 64, 16) : undefined,
    ewayBillNo: isMoving && seller.gstin ? ewayBillNo : undefined,
    vehicleNo: isMoving ? VEHICLES[sequence % VEHICLES.length] : undefined,
    driverPhone: isMoving ? DRIVERS[sequence % DRIVERS.length] : undefined,
    updatedAt: paidAt + 2 * HOUR,
  });
}

/** Documents on every trade the buyer has paid for, oldest first. */
async function seedDocuments(ctx: MutationCtx, world: DemoWorld, orgs: Orgs) {
  const fy = fyLabel(world.today);
  const trades = await ctx.db.query("trades").take(500);
  const paid = trades
    .filter((trade) => trade.invoiceNo !== undefined)
    .toSorted((a, b) => a.createdAt - b.createdAt);
  let sequence = 0;
  for (const trade of paid) {
    const seller = orgs.get(trade.sellerOrgId);
    const buyer = orgs.get(trade.buyerOrgId);
    if (!seller || !buyer) continue;
    sequence += 1;
    await seedTradeDocuments(ctx, trade, seller, buyer, sequence, fy);
  }
}

/** A short download history for the businesses the demo logins run. */
async function seedHistory(ctx: MutationCtx, world: DemoWorld) {
  const month = lastMonth(world.today);
  const quarter = lastQuarter(world.today);
  const history: {
    slug: string;
    kind: Doc<"exportRuns">["kind"];
    period: string;
    rows: number;
    daysAgo: number;
  }[] = [
    {
      slug: "peenya-paper-plastic-yard",
      kind: "tally",
      period: month,
      rows: 6,
      daysAgo: 3,
    },
    {
      slug: "peenya-paper-plastic-yard",
      kind: "swmQuarterly",
      period: quarter,
      rows: 5,
      daysAgo: 9,
    },
    {
      slug: "greenloop-polymers",
      kind: "eprPurchaseRegister",
      period: month,
      rows: 3,
      daysAgo: 4,
    },
    {
      slug: "greenloop-polymers",
      kind: "tally",
      period: month,
      rows: 4,
      daysAgo: 4,
    },
    {
      slug: "deccan-packaging",
      kind: "tally",
      period: month,
      rows: 2,
      daysAgo: 6,
    },
    {
      slug: "ramesh-kabadi-store",
      kind: "monthlyRecyclables",
      period: month,
      rows: 5,
      daysAgo: 2,
    },
  ];
  for (const run of history) {
    const orgId = world.orgs.get(run.slug);
    if (!orgId) continue;
    await ctx.db.insert("exportRuns", {
      orgId,
      kind: run.kind,
      period: run.period,
      rows: run.rows,
      createdAt: world.now - run.daysAgo * DAY - 3 * HOUR,
    });
  }
}

export async function seedExports(
  ctx: MutationCtx,
  world: DemoWorld,
): Promise<void> {
  const orgs: Orgs = new Map();
  for (const orgId of world.orgs.values()) {
    const org = await ctx.db.get("orgs", orgId);
    if (org) orgs.set(org._id, org);
  }
  await seedDocuments(ctx, world, orgs);
  await seedHistory(ctx, world);
}
