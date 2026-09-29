import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { financialYear } from "../insights";
import { kgToGrams, type OrgKind } from "../lib/chain";
import { shiftDate } from "../lib/dates";
import type { DemoWorld } from "../lib/demoWorld";
import {
  batchTotals,
  daysUntil,
  type DeductionReason,
  nextSlipNumber,
  qualityDefaults,
  type ScaleKind,
  type Shift,
  type TeamRole,
  weightMismatch,
} from "../lib/quality";

/**
 * Sample data for the "floor" area, seeded after the base demo world: a
 * stamped scale for every business (one about to run out, one expired),
 * weigh slips on both ends of every load that has moved, quality checks on
 * a few of them (one with a deduction the seller can read), months of
 * production batches for yards and recyclers, declared capacities and a
 * couple of invitations waiting to be accepted. Loops over `world.orgs`, so
 * businesses added later get their share too.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// --- Scales -----------------------------------------------------------------------

interface ScaleSpec {
  kind: ScaleKind;
  capacityKg: number;
  /** Days from today to the stamp's last valid day. */
  validInDays: number;
}

/** Days of stamp left, spread so the map shows every state. */
const STAMP_SPREAD = [240, 150, 320, 95, 200, 60, 280, 130, 45, 175, 300, 110];

/** The demo logins see something worth noticing on their scales screen. */
const STAMP_OVERRIDES: Record<string, readonly number[]> = {
  "ramesh-kabadi-store": [20], // reminder badge: re-verify within 30 days
  "peenya-paper-plastic-yard": [265, 12], // weighbridge fine, platform due
  "greenloop-polymers": [300, 140],
  "deccan-packaging": [80],
  "hebbal-metal-yard": [-15], // ran out: shows on the public card
};

function hashOf(text: string): number {
  let hash = 0;
  for (const char of text)
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 9973;
  return hash;
}

function scaleSpecs(org: Doc<"orgs">): ScaleSpec[] {
  const seed = hashOf(org.slug);
  const days = (index: number) =>
    STAMP_OVERRIDES[org.slug]?.[index] ??
    STAMP_SPREAD[(seed + index) % STAMP_SPREAD.length] ??
    180;
  switch (org.kind) {
    case "kabadiwala": {
      return seed % 2 === 0
        ? [{ kind: "platform", capacityKg: 300, validInDays: days(0) }]
        : [
            { kind: "platform", capacityKg: 200, validInDays: days(0) },
            { kind: "spring", capacityKg: 50, validInDays: days(1) },
          ];
    }
    case "yard": {
      return [
        { kind: "weighbridge", capacityKg: 40_000, validInDays: days(0) },
        { kind: "platform", capacityKg: 500, validInDays: days(1) },
      ];
    }
    case "recycler": {
      return [
        { kind: "weighbridge", capacityKg: 60_000, validInDays: days(0) },
        { kind: "platform", capacityKg: 1000, validInDays: days(1) },
      ];
    }
    case "manufacturer": {
      return [
        { kind: "weighbridge", capacityKg: 50_000, validInDays: days(0) },
      ];
    }
  }
}

/** Every business gets its scales; returns them by org, the biggest first. */
async function seedScales(
  ctx: MutationCtx,
  orgs: readonly Doc<"orgs">[],
  world: DemoWorld,
): Promise<Map<Id<"orgs">, Id<"scales">[]>> {
  const byOrg = new Map<Id<"orgs">, Id<"scales">[]>();
  let serial = 400;
  for (const org of orgs) {
    const ids: Id<"scales">[] = [];
    for (const spec of scaleSpecs(org)) {
      serial += 7;
      const validUntil = shiftDate(world.today, spec.validInDays);
      // Stamped 12 months before it runs out (24 for a beam scale).
      const stampedDaysAgo =
        (spec.kind === "beam" ? 730 : 365) - spec.validInDays;
      ids.push(
        await ctx.db.insert("scales", {
          orgId: org._id,
          kind: spec.kind,
          capacityKg: spec.capacityKg,
          stampNumber: `KA/LM/BLR/${validUntil.slice(0, 4)}/${String(serial).padStart(4, "0")}`,
          stampValidUntil: validUntil,
          note:
            spec.kind === "weighbridge"
              ? "At the main gate"
              : spec.kind === "spring"
                ? "For small lots at the counter"
                : undefined,
          createdAt: world.now - stampedDaysAgo * DAY,
          updatedAt: world.now - stampedDaysAgo * DAY,
        }),
      );
    }
    byOrg.set(org._id, ids);
  }
  return byOrg;
}

// --- Weigh slips and quality checks ----------------------------------------------------

const PLATES = [
  "KA 51 MJ 2048",
  "KA 05 AB 4471",
  "KA 53 CD 7710",
  "KA 41 N 3382",
  "KA 02 MG 9105",
  "KA 50 T 6621",
];

/** The tare of what carried the load, by who sent it. */
const TARE_KG: Record<OrgKind, number> = {
  kabadiwala: 640, // a loaded cargo auto
  yard: 2150, // a mini truck
  recycler: 6400, // a 6-wheel truck
  manufacturer: 6400,
};

/** Buyers whose scales read short on one demo load, and what they deducted. */
const SHORT_LOADS: Record<
  string,
  {
    shortPerMille: number;
    deductionKg: number;
    reason: DeductionReason;
    check: {
      readings: Record<string, number>;
      deductionPct: number;
      note: string;
    };
  }
> = {
  "peenya-paper-plastic-yard>greenloop-polymers:PLASTIC-HDPE": {
    shortPerMille: 5,
    deductionKg: 16,
    reason: "moisture",
    check: {
      readings: { moisture: 2, contamination: 4, offColour: 1 },
      deductionPct: 3,
      note: "Caps and labels mixed in; two bales wet at the bottom.",
    },
  },
};

interface SlipDraft {
  orgId: Id<"orgs">;
  tradeId: Id<"trades">;
  direction: "in" | "out";
  vehicleNo: string;
  grossGrams: number;
  tareGrams: number;
  deductionGrams: number;
  deductionReason?: DeductionReason;
  netGrams: number;
  scaleId: Id<"scales">;
  byProfileId: Id<"profiles">;
  at: number;
}

function reachedAt(trade: Doc<"trades">, status: Doc<"trades">["status"]) {
  return trade.timeline.find((entry) => entry.status === status)?.at;
}

/**
 * Both ends of every load that has moved: the seller weighs out at
 * dispatch (the trade's grams, as agreed), the buyer weighs in on arrival —
 * a shade under, and on one load enough under to be flagged.
 */
async function seedSlipsAndChecks(
  ctx: MutationCtx,
  orgs: ReadonlyMap<Id<"orgs">, Doc<"orgs">>,
  scales: ReadonlyMap<Id<"orgs">, Id<"scales">[]>,
  world: DemoWorld,
) {
  const trades = await ctx.db.query("trades").collect();
  const drafts: SlipDraft[] = [];
  const checks: {
    org: Doc<"orgs">;
    trade: Doc<"trades">;
    at: number;
    short: (typeof SHORT_LOADS)[string] | undefined;
  }[] = [];

  for (const trade of trades) {
    if (trade.status !== "dispatched" && trade.status !== "completed") continue;
    const seller = orgs.get(trade.sellerOrgId);
    const buyer = orgs.get(trade.buyerOrgId);
    if (!seller || !buyer) continue;
    const plate =
      PLATES[hashOf(seller.slug + trade.materialCode) % PLATES.length];
    const tareGrams = kgToGrams(TARE_KG[seller.kind]);
    const short =
      SHORT_LOADS[`${seller.slug}>${buyer.slug}:${trade.materialCode}`];

    const dispatchedAt = reachedAt(trade, "dispatched") ?? trade.updatedAt;
    const sellerScale = scales.get(seller._id)?.[0];
    if (seller.kind !== "kabadiwala" && seller.ownerProfileId && sellerScale) {
      drafts.push({
        orgId: seller._id,
        tradeId: trade._id,
        direction: "out",
        vehicleNo: plate ?? PLATES[0] ?? "",
        grossGrams: trade.grams + tareGrams,
        tareGrams,
        deductionGrams: 0,
        netGrams: trade.grams,
        scaleId: sellerScale,
        byProfileId: seller.ownerProfileId,
        at: dispatchedAt - HOUR,
      });
    }

    if (trade.status !== "completed") continue;
    const arrivedAt = (reachedAt(trade, "completed") ?? trade.updatedAt) - HOUR;
    const buyerScale = scales.get(buyer._id)?.[0];
    if (!buyer.ownerProfileId || !buyerScale) continue;
    // A shade under the seller's figure: 3‰ or 6‰, more on the short load.
    const perMille =
      short?.shortPerMille ?? (hashOf(trade._id) % 2 === 0 ? 3 : 6);
    const weighed = trade.grams - Math.round((trade.grams * perMille) / 1000);
    const deductionGrams = short ? kgToGrams(short.deductionKg) : 0;
    drafts.push({
      orgId: buyer._id,
      tradeId: trade._id,
      direction: "in",
      vehicleNo: plate ?? PLATES[0] ?? "",
      grossGrams: weighed + tareGrams,
      tareGrams,
      deductionGrams,
      deductionReason: short?.reason,
      netGrams: weighed - deductionGrams,
      scaleId: buyerScale,
      byProfileId: buyer.ownerProfileId,
      at: arrivedAt,
    });
    checks.push({ org: buyer, trade, at: arrivedAt + HOUR / 2, short });
  }

  // Slips are numbered per business in the order they were written.
  const lastNumber = new Map<Id<"orgs">, string>();
  for (const draft of drafts.toSorted((a, b) => a.at - b.at)) {
    const slipNumber = nextSlipNumber(
      lastNumber.get(draft.orgId),
      new Date(draft.at + 5.5 * HOUR).toISOString().slice(2, 4),
    );
    lastNumber.set(draft.orgId, slipNumber);
    const slipId = await ctx.db.insert("weighSlips", { ...draft, slipNumber });
    const trade = trades.find((row) => row._id === draft.tradeId);
    await ctx.db.insert("auditLog", {
      orgId: draft.orgId,
      actorProfileId: draft.byProfileId,
      action: "weighSlip.recorded",
      entityTable: "weighSlips",
      entityId: slipId,
      metadata: {
        slipNumber,
        direction: draft.direction,
        tradeId: draft.tradeId,
        netGrams: draft.netGrams,
        mismatch: trade ? weightMismatch(draft.netGrams, trade.grams) : null,
        demo: true,
      },
      createdAt: draft.at,
    });
  }

  await seedChecks(ctx, checks, world);
}

/** The buyer's quality checks: within limits, except the one short load. */
async function seedChecks(
  ctx: MutationCtx,
  checks: readonly {
    org: Doc<"orgs">;
    trade: Doc<"trades">;
    at: number;
    short: (typeof SHORT_LOADS)[string] | undefined;
  }[],
  world: DemoWorld,
) {
  const materials = new Map(
    (await ctx.db.query("materials").withIndex("by_sortOrder").collect()).map(
      (material) => [material.code, material],
    ),
  );
  for (const { org, trade, at, short } of checks) {
    if (!org.ownerProfileId) continue;
    const material = materials.get(trade.materialCode);
    const defaults = qualityDefaults({
      code: trade.materialCode,
      family: material?.family ?? "other",
      stage: material?.stage ?? "scrap",
    });
    const params = defaults.map((limit) => ({
      ...limit,
      // Comfortably inside the limit unless the load was short.
      value:
        short?.check.readings[limit.key] ??
        Math.max(0, Math.round(limit.limit * 0.6 * 2) / 2),
    }));
    const checkId = await ctx.db.insert("qualityChecks", {
      orgId: org._id,
      tradeId: trade._id,
      materialCode: trade.materialCode,
      params,
      result: short ? "deduct" : "accept",
      deductionPct: short?.check.deductionPct ?? 0,
      reason: short?.check.note,
      byProfileId: org.ownerProfileId,
      at: Math.min(at, world.now - HOUR),
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: org.ownerProfileId,
      action: `qualityCheck.${short ? "deduct" : "accept"}`,
      entityTable: "qualityChecks",
      entityId: checkId,
      metadata: { tradeId: trade._id, demo: true },
      createdAt: at,
    });
  }
}

// --- Production -----------------------------------------------------------------------

interface Recipe {
  family: Doc<"orgs">["families"][number];
  inputs: { materialCode: string; share: number }[];
  outputs: { materialCode: string; share: number }[];
  /** Input per batch, kg. */
  batchKg: number;
}

/** What a recycler's plant turns scrap into (shares of the batch's input). */
const RECYCLER_RECIPES: readonly Recipe[] = [
  {
    family: "plastic",
    inputs: [{ materialCode: "PLASTIC-PET", share: 1 }],
    outputs: [{ materialCode: "RECYCLED-PET-FLAKE", share: 0.87 }],
    batchKg: 7200,
  },
  {
    family: "plastic",
    inputs: [{ materialCode: "PLASTIC-HDPE", share: 1 }],
    outputs: [{ materialCode: "RECYCLED-HDPE-GRANULE", share: 0.9 }],
    batchKg: 4500,
  },
  {
    family: "paper",
    inputs: [
      { materialCode: "PAPER-CARTON", share: 0.7 },
      { materialCode: "PAPER-NEWS", share: 0.3 },
    ],
    outputs: [{ materialCode: "RECYCLED-KRAFT", share: 0.84 }],
    batchKg: 9000,
  },
  {
    family: "metal",
    inputs: [
      { materialCode: "METAL-ALU", share: 0.8 },
      { materialCode: "METAL-ALU-CAN", share: 0.2 },
    ],
    outputs: [{ materialCode: "RECYCLED-ALU-INGOT", share: 0.93 }],
    batchKg: 3000,
  },
];

/** A yard's sorting runs: mixed material into grades. */
const YARD_RECIPES: readonly Recipe[] = [
  {
    family: "plastic",
    inputs: [{ materialCode: "PLASTIC-MIXED", share: 1 }],
    outputs: [
      { materialCode: "PLASTIC-PET", share: 0.55 },
      { materialCode: "PLASTIC-HDPE", share: 0.33 },
    ],
    batchKg: 6000,
  },
  {
    family: "paper",
    inputs: [{ materialCode: "PAPER-MIXED", share: 1 }],
    outputs: [
      { materialCode: "PAPER-NEWS", share: 0.5 },
      { materialCode: "PAPER-CARTON", share: 0.42 },
    ],
    batchKg: 8000,
  },
];

const SHIFT_CYCLE: readonly Shift[] = ["day", "evening", "day", "night"];

/**
 * Batches since the financial year began: every third day for recyclers,
 * every sixth for yards, rotating through the recipes the business handles.
 * Weights wobble a little so no two batches read the same.
 */
async function seedBatches(
  ctx: MutationCtx,
  orgs: readonly Doc<"orgs">[],
  world: DemoWorld,
) {
  const fy = financialYear(world.today);
  const firstDay = daysUntil(fy.from, world.today);
  for (const org of orgs) {
    const isYard = org.kind === "yard";
    if (org.kind !== "recycler" && !isYard) continue;
    const recipes = (isYard ? YARD_RECIPES : RECYCLER_RECIPES).filter(
      (recipe) => org.families.includes(recipe.family),
    );
    if (recipes.length === 0) continue;
    const step = isYard ? 6 : 3;
    let index = hashOf(org.slug);
    for (let day = firstDay; day <= -1; day += step) {
      index += 1;
      const recipe = recipes[index % recipes.length];
      const shift = SHIFT_CYCLE[index % SHIFT_CYCLE.length];
      if (!recipe || !shift) continue;
      const wobble = 1 + ((index % 7) - 3) * 0.02; // ±6%
      const inputKg = Math.round(recipe.batchKg * wobble);
      const line = (entry: { materialCode: string; share: number }) => ({
        materialCode: entry.materialCode,
        grams: kgToGrams(Math.round(inputKg * entry.share)),
      });
      const inputs = recipe.inputs.map(line);
      const outputs = recipe.outputs.map(line);
      const totals = batchTotals(inputs, outputs);
      const date = shiftDate(world.today, day);
      await ctx.db.insert("productionBatches", {
        orgId: org._id,
        date,
        shift,
        inputs,
        outputs,
        yieldPct: totals.yieldPct,
        note:
          index % 9 === 0 ? "Line stopped 40 min for a belt change" : undefined,
        byProfileId: org.ownerProfileId,
        createdAt: world.now + day * DAY + 18 * HOUR,
      });
    }
  }
}

// --- Capacity and invites -----------------------------------------------------------

/** Tonnes a year, as a plant of this size would declare (sample figures). */
function capacityFor(
  org: Doc<"orgs">,
): { tonnes: number; source: "consent" | "epr" } | null {
  switch (org.kind) {
    case "kabadiwala": {
      return null;
    }
    case "yard": {
      return { tonnes: 800, source: "consent" };
    }
    case "recycler": {
      return org.families.includes("plastic")
        ? { tonnes: 1200, source: "epr" }
        : { tonnes: 1800, source: "consent" };
    }
    case "manufacturer": {
      return { tonnes: 15_000, source: "consent" };
    }
  }
}

async function seedCapacities(
  ctx: MutationCtx,
  orgs: readonly Doc<"orgs">[],
  world: DemoWorld,
) {
  for (const org of orgs) {
    const capacity = capacityFor(org);
    if (!capacity) continue;
    await ctx.db.insert("capacities", {
      orgId: org._id,
      tonnesPerYear: capacity.tonnes,
      source: capacity.source,
      updatedAt: world.now - 40 * DAY,
    });
  }
}

const INVITES: readonly {
  slug: string;
  phone: string;
  name: string;
  role: TeamRole;
  daysAgo: number;
}[] = [
  {
    slug: "peenya-paper-plastic-yard",
    phone: "+919845000021",
    name: "Manjunath B",
    role: "gate",
    daysAgo: 2,
  },
  {
    slug: "greenloop-polymers",
    phone: "+919845000022",
    name: "Shilpa N",
    role: "quality",
    daysAgo: 1,
  },
];

/** Invitations waiting for a phone that hasn't signed in yet. */
async function seedInvites(
  ctx: MutationCtx,
  orgs: ReadonlyMap<Id<"orgs">, Doc<"orgs">>,
  world: DemoWorld,
) {
  for (const invite of INVITES) {
    const orgId = world.orgs.get(invite.slug);
    const org = orgId ? orgs.get(orgId) : undefined;
    if (!org?.ownerProfileId) continue;
    await ctx.db.insert("teamInvites", {
      orgId: org._id,
      phone: invite.phone,
      name: invite.name,
      role: invite.role,
      status: "pending",
      invitedBy: org.ownerProfileId,
      invitedAt: world.now - invite.daysAgo * DAY,
    });
  }
}

// --- Entry point ---------------------------------------------------------------------

export async function seedFloor(
  ctx: MutationCtx,
  world: DemoWorld,
): Promise<void> {
  const orgs: Doc<"orgs">[] = [];
  for (const orgId of world.orgs.values()) {
    const org = await ctx.db.get("orgs", orgId);
    if (org) orgs.push(org);
  }
  const byId = new Map(orgs.map((org) => [org._id, org]));
  const scales = await seedScales(ctx, orgs, world);
  await seedSlipsAndChecks(ctx, byId, scales, world);
  await seedBatches(ctx, orgs, world);
  await seedCapacities(ctx, orgs, world);
  await seedInvites(ctx, byId, world);
}
