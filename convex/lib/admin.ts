import { normalizeIndianMobile } from "./phone";

/**
 * The single admin must match `ADMIN_EMAIL`, a Convex
 * environment variable — see docs/architecture/auth.md#the-admin.
 */
export function isAdminEmail(
  email: string | null | undefined,
  adminEmail: string | undefined = process.env.ADMIN_EMAIL,
): boolean {
  const expected = adminEmail?.trim().toLowerCase();
  return Boolean(expected) && email?.trim().toLowerCase() === expected;
}

/** Operator-only bootstrap secret. Never return this from a public query. */
export function getAdminSetupToken(): string | undefined {
  const token = process.env.ADMIN_SETUP_TOKEN;
  return token &&
    token.length >= 32 &&
    token.length <= 512 &&
    token.trim().length > 0
    ? token
    : undefined;
}

/** The admin signs in again after this long — docs/architecture/auth.md. */
export const ADMIN_SESSION_HOURS = 12;

/** A session's expiry, shortened to the admin's limit if it's longer. */
export function adminSessionExpiry(expiresAt: Date, now: number): Date {
  const cap = new Date(now + ADMIN_SESSION_HOURS * 60 * 60 * 1000);
  return expiresAt < cap ? expiresAt : cap;
}

export interface AdminProfileInput {
  name: string;
  phone: string;
  dateOfBirth: string;
  aadhaarLast4: string;
}

export type AdminProfileError =
  "name" | "phone" | "dateOfBirth" | "underage" | "aadhaarLast4";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whole years between a YYYY-MM-DD birth date and `today`. */
export function ageOn(dateOfBirth: string, today: Date): number | null {
  const match = ISO_DATE.exec(dateOfBirth);
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const born = new Date(Date.UTC(year, month - 1, day));
  if (
    born.getUTCFullYear() !== year ||
    born.getUTCMonth() !== month - 1 ||
    born.getUTCDate() !== day
  ) {
    return null; // 2026-02-31 and friends
  }
  let age = today.getUTCFullYear() - year;
  const isBeforeBirthday =
    today.getUTCMonth() < month - 1 ||
    (today.getUTCMonth() === month - 1 && today.getUTCDate() < day);
  if (isBeforeBirthday) age -= 1;
  return age;
}

/**
 * Checks the admin's profile. Returns the cleaned values, or the first field
 * that's wrong. Only the last four Aadhaar digits are ever accepted.
 */
export function validateAdminProfile(
  input: AdminProfileInput,
  today: Date = new Date(),
):
  | { ok: true; value: AdminProfileInput }
  | { ok: false; error: AdminProfileError } {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) return { ok: false, error: "name" };

  const phone = normalizeIndianMobile(input.phone);
  if (!phone) return { ok: false, error: "phone" };

  const age = ageOn(input.dateOfBirth, today);
  if (age === null || age > 120) return { ok: false, error: "dateOfBirth" };
  if (age < 18) return { ok: false, error: "underage" };

  if (!/^\d{4}$/.test(input.aadhaarLast4)) {
    return { ok: false, error: "aadhaarLast4" };
  }

  return {
    ok: true,
    value: {
      name,
      phone,
      dateOfBirth: input.dateOfBirth,
      aadhaarLast4: input.aadhaarLast4,
    },
  };
}
