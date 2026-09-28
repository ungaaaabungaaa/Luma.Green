/**
 * The secret inside an `otpauth://totp/...` URI, for people who type it into
 * their authenticator app instead of scanning the QR code.
 */
export function secretFromTotpUri(uri: string): string | null {
  try {
    const url = new URL(uri);
    return url.protocol === "otpauth:" ? url.searchParams.get("secret") : null;
  } catch {
    return null;
  }
}

/** `JBSWY3DPEHPK3PXP` → `JBSW Y3DP EHPK 3PXP`. */
export function groupSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}
