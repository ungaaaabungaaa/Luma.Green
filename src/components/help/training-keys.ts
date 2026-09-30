/**
 * The keys of every training module, with no imports so the Convex backend
 * (`convex/support.ts`) can read the same list the screens use. A module's
 * id in `trainingProgress.moduleKey` is `<kind>:<key>`:
 *
 * - `ready:<key>` — one of the four "Saathi Ready" modules (`saathi-ready.ts`)
 * - `path:<key>`  — one lesson of a role's training path (`content.ts`)
 */

export const SAATHI_READY_KEYS = [
  "safeAndReady",
  "neverPickUp",
  "honestWeighing",
  "atTheDoor",
] as const;

export type SaathiReadyKey = (typeof SAATHI_READY_KEYS)[number];

export const PATH_LESSON_KEYS = [
  "whatRecycles",
  "sortOnce",
  "batteriesSafe",
  "fairWeigh",
  "usingTheApp",
  "weighingFairly",
  "safeHandling",
  "servingHouseholds",
  "sellingToYards",
  "buyingStock",
  "tradingWithEscrow",
  "papersForLoads",
  "siteSafety",
  "buyingInputs",
  "eprBasics",
  "orderingRecycled",
  "checkingDeliveries",
  "firstJob",
  "inPeoplesHomes",
  "gettingPaid",
] as const;

export type PathLessonKey = (typeof PATH_LESSON_KEYS)[number];

export type ReadyModuleId = `ready:${SaathiReadyKey}`;
export type PathModuleId = `path:${PathLessonKey}`;
export type TrainingModuleId = ReadyModuleId | PathModuleId;

export function readyModuleId(key: SaathiReadyKey): ReadyModuleId {
  return `ready:${key}`;
}

export function pathModuleId(key: PathLessonKey): PathModuleId {
  return `path:${key}`;
}

/** Every id a `trainingProgress` row may carry. */
export const TRAINING_MODULE_IDS: readonly TrainingModuleId[] = [
  ...SAATHI_READY_KEYS.map((key) => readyModuleId(key)),
  ...PATH_LESSON_KEYS.map((key) => pathModuleId(key)),
];

export function isTrainingModuleId(value: string): value is TrainingModuleId {
  return (TRAINING_MODULE_IDS as readonly string[]).includes(value);
}

export function isSaathiReadyKey(value: string): value is SaathiReadyKey {
  return (SAATHI_READY_KEYS as readonly string[]).includes(value);
}

/** Every Saathi Ready quiz has this many questions; a score is out of it. */
export const QUIZ_QUESTIONS = 3;
