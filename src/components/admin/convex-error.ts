import { ConvexError } from "convex/values";

/** The code a Convex function refused with (`WRONG_STATE`, …), if any. */
export function convexErrorCode(error: unknown): string | undefined {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : undefined;
}

const SESSION_ENDED =
  "Your admin session has ended. Sign in again, then try once more.";

/** Codes every admin function can answer with. */
const COMMON: Readonly<Record<string, string>> = {
  NOT_SIGNED_IN: SESSION_ENDED,
  NOT_ADMIN: SESSION_ENDED,
  TWO_FACTOR_REQUIRED: SESSION_ENDED,
};

/** A sentence for the admin, from a function's refusal. */
export function adminErrorMessage(
  error: unknown,
  messages: Readonly<Record<string, string>>,
): string {
  const code = convexErrorCode(error);
  return (
    (code === undefined ? undefined : (messages[code] ?? COMMON[code])) ??
    "Something went wrong. Try again."
  );
}
