import { ConvexError } from "convex/values";

/** The reasons `saathi.take` and `saathi.finish` refuse, as the server says them. */
const JOB_ERRORS = [
  "JOB_TAKEN",
  "JOB_EXPIRED",
  "SLOT_BUSY",
  "NOT_YOUR_JOB",
  "ALREADY_DONE",
  "TOO_EARLY",
  "JOB_NOT_FOUND",
] as const;

export type JobErrorKey = (typeof JOB_ERRORS)[number] | "generic";

function isJobError(code: string): code is (typeof JOB_ERRORS)[number] {
  return (JOB_ERRORS as readonly string[]).includes(code);
}

/** What to tell a Saathi whose tap didn't work: a `saathi.errors` key. */
export function jobErrorKey(error: unknown): JobErrorKey {
  return error instanceof ConvexError &&
    typeof error.data === "string" &&
    isJobError(error.data)
    ? error.data
    : "generic";
}
