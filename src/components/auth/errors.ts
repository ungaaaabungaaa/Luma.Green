/** Message keys (namespace `auth`) for a failed code check. */
export type CodeErrorKey =
  "errorInvalid" | "errorExpired" | "errorTooMany" | "errorGeneric";

/**
 * Maps a Better Auth phone-verification error to what we tell the user.
 * Codes from better-auth's phone-number plugin: `TOO_MANY_ATTEMPTS` (403),
 * `OTP_EXPIRED` and `OTP_NOT_FOUND` (the code is gone — ask for a new one),
 * `INVALID_OTP` (400). A 429 is the rate limiter.
 */
export function codeErrorKey(
  error: { status?: number; code?: string } | null | undefined,
): CodeErrorKey {
  if (!error) return "errorGeneric";
  const { status, code = "" } = error;
  if (status === 429 || code === "TOO_MANY_ATTEMPTS") return "errorTooMany";
  if (code === "OTP_EXPIRED" || code === "OTP_NOT_FOUND") return "errorExpired";
  return status === 400 || code === "INVALID_OTP"
    ? "errorInvalid"
    : "errorGeneric";
}
