import { afterEach, describe, expect, it, vi } from "vitest";

import {
  adminSessionExpiry,
  ageOn,
  isAdminEmail,
  validateAdminProfile,
} from "./admin";

const today = new Date(Date.UTC(2026, 8, 29)); // 29 Sep 2026

describe("isAdminEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads ADMIN_EMAIL from the environment", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@luma.test");
    expect(isAdminEmail("admin@luma.test")).toBe(true);
  });

  it("matches ignoring case and spaces", () => {
    expect(isAdminEmail("Admin@Luma.Test ", "admin@luma.test")).toBe(true);
    expect(isAdminEmail("someone@luma.test", "admin@luma.test")).toBe(false);
  });

  it("is never true when ADMIN_EMAIL isn't set", () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(isAdminEmail("admin@luma.test")).toBe(false);
    expect(isAdminEmail("", "")).toBe(false);
    expect(isAdminEmail(undefined, "admin@luma.test")).toBe(false);
  });
});

describe("ageOn", () => {
  it("counts whole years, turning over on the birthday", () => {
    expect(ageOn("2008-09-29", today)).toBe(18);
    expect(ageOn("2008-09-30", today)).toBe(17);
    expect(ageOn("1990-01-15", today)).toBe(36);
  });

  it("rejects dates that don't exist or aren't YYYY-MM-DD", () => {
    expect(ageOn("2001-02-29", today)).toBeNull();
    expect(ageOn("2000-13-01", today)).toBeNull();
    expect(ageOn("29/09/1990", today)).toBeNull();
    expect(ageOn("", today)).toBeNull();
  });
});

describe("validateAdminProfile", () => {
  const valid = {
    name: "  Asha Rao ",
    phone: "98765 43210",
    dateOfBirth: "1990-01-15",
    aadhaarLast4: "1234",
  };

  it("cleans a valid profile", () => {
    expect(validateAdminProfile(valid, today)).toEqual({
      ok: true,
      value: {
        name: "Asha Rao",
        phone: "+919876543210",
        dateOfBirth: "1990-01-15",
        aadhaarLast4: "1234",
      },
    });
  });

  it.each([
    [{ name: "A" }, "name"],
    [{ phone: "12345" }, "phone"],
    [{ dateOfBirth: "1990-02-30" }, "dateOfBirth"],
    [{ dateOfBirth: "1890-01-01" }, "dateOfBirth"],
    [{ dateOfBirth: "2010-01-01" }, "underage"],
    [{ aadhaarLast4: "123" }, "aadhaarLast4"],
    [{ aadhaarLast4: "12345" }, "aadhaarLast4"],
    // A full Aadhaar number is refused outright, never trimmed to four.
    [{ aadhaarLast4: "123412341234" }, "aadhaarLast4"],
  ])("rejects %o as %s", (change, error) => {
    expect(validateAdminProfile({ ...valid, ...change }, today)).toEqual({
      ok: false,
      error,
    });
  });
});

describe("adminSessionExpiry", () => {
  const now = Date.UTC(2026, 8, 29, 9, 0);

  it("caps a 30-day session at 12 hours", () => {
    const thirtyDays = new Date(now + 30 * 24 * 60 * 60 * 1000);
    expect(adminSessionExpiry(thirtyDays, now)).toEqual(
      new Date(now + 12 * 60 * 60 * 1000),
    );
  });

  it("keeps a session that already ends sooner", () => {
    const oneHour = new Date(now + 60 * 60 * 1000);
    expect(adminSessionExpiry(oneHour, now)).toBe(oneHour);
  });
});
