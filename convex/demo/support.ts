import {
  type PathLessonKey,
  pathModuleId,
  readyModuleId,
  type SaathiReadyKey,
} from "../../src/components/help/training-keys";
import type { MutationCtx } from "../_generated/server";
import type { DemoWorld } from "../lib/demoWorld";
import { callbackMessage } from "../support";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Which training path a demo person is on, from their role key in
 * `world.profiles` ("kabadiwala", "saathi", "yard-2", …). Applicants and the
 * household have no app training path.
 */
const PATH_BY_ROLE: Record<string, readonly PathLessonKey[]> = {
  kabadiwala: [
    "usingTheApp",
    "weighingFairly",
    "safeHandling",
    "servingHouseholds",
    "sellingToYards",
  ],
  yard: ["buyingStock", "tradingWithEscrow", "papersForLoads", "siteSafety"],
  recycler: ["buyingInputs", "tradingWithEscrow", "eprBasics", "siteSafety"],
  manufacturer: [
    "orderingRecycled",
    "checkingDeliveries",
    "tradingWithEscrow",
    "eprBasics",
  ],
  saathi: ["firstJob", "safeHandling", "inPeoplesHomes", "gettingPaid"],
};

export function pathForRoleKey(
  roleKey: string,
): readonly PathLessonKey[] | undefined {
  const role = Object.keys(PATH_BY_ROLE).find(
    (candidate) => roleKey === candidate || roleKey.startsWith(`${candidate}-`),
  );
  return role ? PATH_BY_ROLE[role] : undefined;
}

/**
 * Lakshmi, the demo Saathi, is three modules into Saathi Ready — so a demo
 * can finish the last one live and watch the badge appear.
 */
const LAKSHMI_READY: readonly { key: SaathiReadyKey; score: number }[] = [
  { key: "safeAndReady", score: 3 },
  { key: "neverPickUp", score: 2 },
  { key: "honestWeighing", score: 3 },
];

/** "Did this help?" answers over the last ten days, the way a pilot logs them. */
const FEEDBACK: readonly {
  path: string;
  helpful: boolean;
  note?: string;
  locale: string;
  daysAgo: number;
}[] = [
  { path: "/help/kabadiwala/weigh-and-pay", helpful: true, locale: "kn", daysAgo: 0 },
  { path: "/help/kabadiwala/weigh-and-pay", helpful: true, locale: "kn", daysAgo: 1 },
  { path: "/help/kabadiwala/weigh-and-pay", helpful: true, locale: "hi", daysAgo: 3 },
  {
    path: "/help/kabadiwala/weigh-and-pay",
    helpful: false,
    note: "Half-kilo steps are too small for iron. Let me type the kilos.",
    locale: "en",
    daysAgo: 4,
  },
  { path: "/help/kabadiwala/set-prices", helpful: true, locale: "ta", daysAgo: 2 },
  { path: "/help/kabadiwala/set-prices", helpful: true, locale: "kn", daysAgo: 6 },
  { path: "/help/household/first-pickup", helpful: true, locale: "en", daysAgo: 1 },
  { path: "/help/household/first-pickup", helpful: true, locale: "te", daysAgo: 2 },
  {
    path: "/help/household/first-pickup",
    helpful: false,
    note: "Where do I see the estimate before I book?",
    locale: "en",
    daysAgo: 5,
  },
  { path: "/help/household#faq-no-code", helpful: false, locale: "ur", daysAgo: 1 },
  { path: "/help/household#faq-no-code", helpful: true, locale: "hi", daysAgo: 7 },
  { path: "/help/saathi/home-pickup", helpful: true, locale: "kn", daysAgo: 2 },
  { path: "/help/saathi#faq-who-pays-me", helpful: true, locale: "ta", daysAgo: 3 },
  { path: "/help/yard/escrow", helpful: true, locale: "en", daysAgo: 8 },
  {
    path: "/help/yard/escrow",
    helpful: false,
    note: "When exactly is the money released? Same day?",
    locale: "en",
    daysAgo: 9,
  },
  { path: "/help/kit", helpful: true, locale: "kn", daysAgo: 4 },
  { path: "/help/door-card", helpful: true, locale: "hi", daysAgo: 6 },
];

/**
 * Sample data for the "support" area, seeded after the base demo world:
 * training progress for every demo person with a path, Lakshmi's Saathi
 * Ready record, "Did this help?" answers and one assisted-booking request.
 * Runs inside demo:seed and every convex-test; idempotent for one run.
 */
export async function seedSupport(
  ctx: MutationCtx,
  world: DemoWorld,
): Promise<void> {
  const { now } = world;

  for (const [roleKey, person] of world.profiles) {
    const path = pathForRoleKey(roleKey);
    if (!path) continue;
    // Everyone with a path has done the first lesson; Lakshmi the first two.
    const doneCount = roleKey === "saathi" ? 2 : 1;
    for (const [index, key] of path.slice(0, doneCount).entries()) {
      await ctx.db.insert("trainingProgress", {
        profileId: person.profileId,
        moduleKey: pathModuleId(key),
        doneAt: now - (5 - index) * DAY - 3 * HOUR,
      });
    }
  }

  const lakshmi = world.profiles.get("saathi");
  if (lakshmi) {
    for (const [index, module] of LAKSHMI_READY.entries()) {
      await ctx.db.insert("trainingProgress", {
        profileId: lakshmi.profileId,
        moduleKey: readyModuleId(module.key),
        doneAt: now - (4 - index) * DAY - 2 * HOUR,
        score: module.score,
      });
    }
  }

  for (const [index, row] of FEEDBACK.entries()) {
    await ctx.db.insert("helpFeedback", {
      path: row.path,
      helpful: row.helpful,
      note: row.note,
      locale: row.locale,
      at: now - row.daysAgo * DAY - (index % 5) * HOUR,
    });
  }

  await ctx.db.insert("supportRequests", {
    name: "Shanthi",
    phone: "+919845000031",
    role: "household",
    topic: "pickup",
    message: callbackMessage({
      area: "Mathikere, near the water tank",
      items: "Old newspapers, about 3 bags, and a broken fan",
      window: "morning",
      forWhom: "My mother, she does not use a phone",
      locale: "kn",
    }),
    status: "open",
    createdAt: now - 3 * HOUR,
  });
}
