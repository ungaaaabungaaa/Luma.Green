/** Bounded rolling windows for paid SMS requests. All times are milliseconds. */
export const SMS_COOLDOWN_MS = 30_000;
export const SMS_WINDOW_MS = 15 * 60_000;
export const SMS_DAY_MS = 24 * 60 * 60_000;
export const SMS_WINDOW_LIMIT = 3;
export const SMS_DAY_LIMIT = 10;

export function smsAllowance(sentAt: readonly number[], now: number) {
  const recent = sentAt
    .filter((at) => at > now - SMS_DAY_MS)
    .toSorted((a, b) => a - b);
  const window = recent.filter((at) => at > now - SMS_WINDOW_MS);
  const last = recent.at(-1);
  const retryAt = Math.max(
    now,
    last === undefined ? now : last + SMS_COOLDOWN_MS,
    window.length >= SMS_WINDOW_LIMIT
      ? (window[0] ?? now) + SMS_WINDOW_MS
      : now,
    recent.length >= SMS_DAY_LIMIT ? (recent[0] ?? now) + SMS_DAY_MS : now,
  );
  return {
    allowed: retryAt <= now,
    retryAfterSeconds: Math.ceil((retryAt - now) / 1000),
    recent,
  };
}

/** Use a keyed digest: a plain hash of a mobile number is easy to enumerate. */
export async function smsPhoneHash(
  phone: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`sms:${phone}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
