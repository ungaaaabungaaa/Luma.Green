import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { DemoWorld } from "../lib/demoWorld";
import { ledgerStatus } from "../lib/tax";

/**
 * Sample data for the "payments" area, seeded after the base demo world.
 *
 * Every trade from acceptance on gets its two khata rows (the seller's
 * receivable, the buyer's payable) and the payments that explain them:
 *  - trades paid into the prototype's escrow carry a simulated reference
 *    (ESC-<invoice>), so the "Paid" tab shows how the money moved;
 *  - the oldest completed trade is part-paid by RTGS and now OVERDUE, so
 *    every demo login on either side of it sees an overdue entry;
 *  - the next completed trade was settled by NEFT with a UTR;
 *  - a kabadiwala's completed sale was settled by UPI, as it would be.
 * Completed household pickups and finished Saathi jobs are recorded too.
 * Declarations: GST status for every business (from its GSTIN), an MSME
 * category, and "for manufacturing" for recyclers and manufacturers.
 *
 * Runs inside demo:seed and every convex-test that seeds the world, so it
 * stays fast and only writes to this area's tables.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Statuses from which money is due on a trade. */
const OWED = new Set<Doc<"trades">["status"]>([
  "accepted",
  "paid_to_escrow",
  "dispatched",
  "completed",
]);

/** A repeatable, made-up bank or UPI reference of the right shape. */
function reference(kind: "utr" | "upi" | "escrow", seed: number): string {
  const digits = String(1_000_000 + ((seed * 7_919) % 8_999_999)).padStart(
    7,
    "0",
  );
  switch (kind) {
    case "utr": {
      return `HDFCN5${digits}${String(seed % 97).padStart(2, "0")}`;
    }
    case "upi": {
      return `4265${digits}${String(seed % 89).padStart(2, "0")}`;
    }
    case "escrow": {
      return `ESC-SIM-${digits}`;
    }
  }
}

function stepAt(
  trade: Doc<"trades">,
  status: Doc<"trades">["status"],
): number | null {
  return trade.timeline.find((step) => step.status === status)?.at ?? null;
}

/** The MSME category each demo business declares (Udyam). */
const MSME_BY_KIND: Record<Doc<"orgs">["kind"], string> = {
  kabadiwala: "micro",
  yard: "small",
  recycler: "small",
  manufacturer: "medium",
};

export async function seedPayments(
  ctx: MutationCtx,
  world: DemoWorld,
): Promise<void> {
  const { now } = world;
  const orgs = new Map<Id<"orgs">, Doc<"orgs">>();
  for (const id of world.orgs.values()) {
    const org = await ctx.db.get("orgs", id);
    if (org) orgs.set(id, org);
  }
  const fallbackProfile =
    world.profiles.get("yard")?.profileId ??
    [...world.profiles.values()][0]?.profileId;
  if (!fallbackProfile) return;
  /** Who recorded a payment: the business's owner, else a demo login. */
  const recorderFor = (...ids: (Id<"orgs"> | undefined)[]): Id<"profiles"> => {
    for (const id of ids) {
      const owner = id ? orgs.get(id)?.ownerProfileId : undefined;
      if (owner) return owner;
    }
    return fallbackProfile;
  };

  await seedDeclarations(ctx, orgs, recorderFor, now);
  await seedTradeLedger(ctx, recorderFor, now);
  await seedPickupPayments(ctx, recorderFor);
  await seedJobPayments(ctx, recorderFor, now);
}

async function seedDeclarations(
  ctx: MutationCtx,
  orgs: Map<Id<"orgs">, Doc<"orgs">>,
  recorderFor: (...ids: (Id<"orgs"> | undefined)[]) => Id<"profiles">,
  now: number,
) {
  for (const org of orgs.values()) {
    const byProfileId = recorderFor(org._id);
    const rows: { kind: Doc<"declarations">["kind"]; value: string }[] = [
      { kind: "gstStatus", value: org.gstin ? "registered" : "unregistered" },
      { kind: "msme", value: MSME_BY_KIND[org.kind] },
    ];
    if (org.kind === "recycler" || org.kind === "manufacturer") {
      rows.push({ kind: "manufacturingUse", value: "yes" });
    }
    for (const row of rows) {
      await ctx.db.insert("declarations", {
        orgId: org._id,
        ...row,
        validFrom: "2026-04-01",
        byProfileId,
        createdAt: now - 60 * DAY,
      });
    }
  }
}

interface TradePlan {
  method: Doc<"payments">["method"];
  /** Share of the total paid, 0–1. */
  share: number;
  /** When the payment is due, relative to the trade's last step. */
  dueDays: number;
}

async function seedTradeLedger(
  ctx: MutationCtx,
  recorderFor: (...ids: (Id<"orgs"> | undefined)[]) => Id<"profiles">,
  now: number,
) {
  const trades = (await ctx.db.query("trades").collect())
    .filter((trade) => OWED.has(trade.status))
    .sort((a, b) => a.createdAt - b.createdAt);
  const completed = trades.filter((trade) => trade.status === "completed");
  const overdueId = completed[0]?._id;
  const neftId = completed[1]?._id;

  for (const [index, trade] of trades.entries()) {
    const acceptedAt = stepAt(trade, "accepted") ?? trade.createdAt;
    const escrowAt = stepAt(trade, "paid_to_escrow");
    const completedAt = stepAt(trade, "completed");
    const seller = await ctx.db.get("orgs", trade.sellerOrgId);

    let plan: TradePlan;
    if (trade.status === "accepted") {
      plan = { method: "cash", share: 0, dueDays: 30 };
    } else if (trade._id === overdueId) {
      plan = { method: "rtgs", share: 0.5, dueDays: 15 };
    } else if (trade._id === neftId) {
      plan = { method: "neft", share: 1, dueDays: 30 };
    } else if (trade.status === "completed" && seller?.kind === "kabadiwala") {
      plan = { method: "upi", share: 1, dueDays: 30 };
    } else {
      plan = { method: "escrow", share: 1, dueDays: 30 };
    }

    const paidAt = completedAt ?? escrowAt ?? acceptedAt;
    let dueAt = (completedAt ?? acceptedAt) + plan.dueDays * DAY;
    // The overdue entry must read as overdue whatever the seed date is.
    if (trade._id === overdueId && dueAt >= now) dueAt = now - 5 * DAY;
    const amountPaise = Math.round(trade.totalPaise * plan.share);
    const byProfileId = recorderFor(
      plan.method === "escrow" ? trade.buyerOrgId : trade.sellerOrgId,
      trade.buyerOrgId,
    );

    if (amountPaise > 0) {
      let kind: "utr" | "upi" | "escrow" = "utr";
      if (plan.method === "upi") kind = "upi";
      else if (plan.method === "escrow") kind = "escrow";
      await ctx.db.insert("payments", {
        subject: "trade",
        subjectId: trade._id,
        method: plan.method,
        reference:
          plan.method === "escrow" && trade.invoiceNo
            ? `ESC-${trade.invoiceNo}`
            : reference(kind, index + 11),
        amountPaise,
        paidAt,
        fromOrgId: trade.buyerOrgId,
        toOrgId: trade.sellerOrgId,
        byProfileId,
        note:
          plan.share < 1 ? "Part payment on delivery; balance on credit" : undefined,
        createdAt: paidAt,
      });
    }

    const status = ledgerStatus(
      { duePaise: trade.totalPaise, paidPaise: amountPaise, dueAt },
      now,
    );
    const sides = [
      {
        orgId: trade.sellerOrgId,
        counterpartyOrgId: trade.buyerOrgId,
        direction: "receivable" as const,
      },
      {
        orgId: trade.buyerOrgId,
        counterpartyOrgId: trade.sellerOrgId,
        direction: "payable" as const,
      },
    ];
    for (const side of sides) {
      await ctx.db.insert("ledgerEntries", {
        ...side,
        tradeId: trade._id,
        duePaise: trade.totalPaise,
        paidPaise: amountPaise,
        dueAt,
        status,
        createdAt: acceptedAt,
        updatedAt: paidAt,
      });
    }
  }
}

/** A completed household pickup was paid at the door: cash or UPI. */
async function seedPickupPayments(
  ctx: MutationCtx,
  recorderFor: (...ids: (Id<"orgs"> | undefined)[]) => Id<"profiles">,
) {
  const bookings = await ctx.db.query("bookings").collect();
  for (const [index, booking] of bookings.entries()) {
    if (booking.status !== "completed" || !booking.receipt) continue;
    await ctx.db.insert("payments", {
      subject: "booking",
      subjectId: booking._id,
      method: booking.receipt.method,
      reference:
        booking.receipt.method === "upi" ? reference("upi", index + 101) : undefined,
      amountPaise: booking.receipt.totalPaise,
      paidAt: booking.receipt.paidAt,
      fromOrgId: booking.orgId,
      byProfileId: recorderFor(booking.orgId),
      createdAt: booking.receipt.paidAt,
    });
  }
}

/** A finished Saathi job was paid by the business that posted it. */
async function seedJobPayments(
  ctx: MutationCtx,
  recorderFor: (...ids: (Id<"orgs"> | undefined)[]) => Id<"profiles">,
  now: number,
) {
  const jobs = await ctx.db.query("jobs").collect();
  for (const [index, job] of jobs.entries()) {
    if (job.status !== "done" || !job.orgId) continue;
    const paidAt = Math.min(job.createdAt + 8 * HOUR, now - HOUR);
    await ctx.db.insert("payments", {
      subject: "job",
      subjectId: job._id,
      method: "upi",
      reference: reference("upi", index + 201),
      amountPaise: job.payPaise,
      paidAt,
      fromOrgId: job.orgId,
      byProfileId: recorderFor(job.orgId),
      createdAt: paidAt,
    });
  }
}
