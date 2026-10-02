import { describe, expect, it } from "vitest";

import {
  formatBytes,
  formatDay,
  formatPhone,
  formatRupees,
  formatWaiting,
  formatWhen,
} from "./format";

describe("admin formatting", () => {
  it("shows rupees, with paise only when there are some", () => {
    expect(formatRupees(1400)).toBe("₹14");
    expect(formatRupees(1450)).toBe("₹14.50");
    expect(formatRupees(2_100_000)).toBe("₹21,000");
    expect(formatRupees(Number.MAX_SAFE_INTEGER)).toBe(
      "₹9,00,71,99,25,47,409.91",
    );
    expect(formatRupees(-1)).toBe("-₹0.01");
  });

  it("says how long something has waited, in hours then days", () => {
    expect(formatWaiting(0)).toBe("under 1 h");
    expect(formatWaiting(19)).toBe("19 h");
    expect(formatWaiting(47)).toBe("47 h");
    expect(formatWaiting(48)).toBe("2 d");
    expect(formatWaiting(53)).toBe("2 d 5 h");
  });

  it("sizes files the way people read them", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(340 * 1024)).toBe("340 KB");
    expect(formatBytes(2.4 * 1024 * 1024)).toBe("2.4 MB");
  });

  it("uses India time, whatever the laptop's zone", () => {
    // 20:00 UTC is 01:30 the next morning in India.
    expect(formatWhen(Date.UTC(2026, 8, 29, 20, 0))).toMatch(/30 Sept?.*1:30/);
    expect(formatDay("2028-03-31")).toBe("31 Mar 2028");
    expect(formatDay("not a date")).toBe("not a date");
  });

  it("spaces out mobile numbers", () => {
    expect(formatPhone("+919000000107")).toBe("+91 90000 00107");
    expect(formatPhone(undefined)).toBe("—");
  });
});
