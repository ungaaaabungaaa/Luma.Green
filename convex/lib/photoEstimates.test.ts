import { describe, expect, it } from "vitest";

import {
  isPhotoDataUrl,
  MAX_PHOTO_DATA_URL,
  parsePhotoResult,
  PHOTO_DAY_MS,
  photoAllowance,
} from "./photoEstimates";

const item = {
  materialCode: "PAPER-NEWS",
  gramsLow: 500,
  gramsHigh: 1500,
  confidence: 0.7,
};
const codes = new Set(["PAPER-NEWS"]);
// Valid 1x1 PNG, used only to check transport validation.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";

describe("photo input and output boundaries", () => {
  it("accepts integer gram ranges from the active catalogue", () => {
    expect(
      parsePhotoResult({ items: [item], retake: "none" }, codes).items,
    ).toEqual([item]);
  });
  it.each([
    { ...item, materialCode: "INVENTED" },
    { ...item, gramsLow: 0 },
    { ...item, gramsLow: 100.5 },
    { ...item, gramsHigh: 200_001 },
    { ...item, gramsHigh: 400 },
    { ...item, confidence: 1.1 },
    { ...item, confidence: NaN },
    { ...item, price: 999 },
  ])("rejects unsupported or unsafe result %j", (bad) => {
    expect(() =>
      parsePhotoResult({ items: [bad], retake: "none" }, codes),
    ).toThrow();
  });
  it("rejects duplicates, too many items and a retake with usable items", () => {
    for (const result of [
      { items: [item, item], retake: "none" },
      { items: Array.from({ length: 13 }, () => item), retake: "none" },
      { items: [item], retake: "too_dark" },
    ]) {
      expect(() => parsePhotoResult(result, codes)).toThrow();
    }
    expect(
      parsePhotoResult({ items: [], retake: "not_scrap" }, codes).items,
    ).toEqual([]);
  });
  it("accepts a bounded PNG and rejects URLs, fake signatures and oversized payloads", () => {
    expect(isPhotoDataUrl(PNG)).toBe(true);
    for (const input of [
      "https://example.com/photo.jpg",
      "data:image/png;base64,aGVsbG8=",
      "data:image/svg+xml;base64,AAAA",
      PNG + "x".repeat(MAX_PHOTO_DATA_URL),
    ]) {
      expect(isPhotoDataUrl(input)).toBe(false);
    }
  });
  it("checks PNG dimensions before requesting the provider", () => {
    const bytes = atob(PNG.split(",", 2)[1]);
    const tooWide =
      bytes.slice(0, 16) + "\u{0}\u{0}\u{10}\u{0}" + bytes.slice(20);
    expect(isPhotoDataUrl(`data:image/png;base64,${btoa(tooWide)}`)).toBe(
      false,
    );
  });
});

describe("photo rolling quota", () => {
  it("enforces per-device, verified phone, and global caps", () => {
    const reservations = Array.from({ length: 5 }, () => ({
      at: 100,
      deviceHash: "same",
      phoneHash: "phone",
    }));
    expect(
      photoAllowance(reservations, 101, "same", undefined, 100).allowed,
    ).toBe(false);
    expect(
      photoAllowance(reservations, 101, "rotated", "phone", 100).allowed,
    ).toBe(false);
    expect(
      photoAllowance(reservations, 101, "rotated", undefined, 5).allowed,
    ).toBe(false);
    expect(
      photoAllowance(reservations, 101, "rotated", undefined, 100).allowed,
    ).toBe(true);
  });
  it("releases expired reservations and refuses invalid quota config", () => {
    expect(
      photoAllowance(
        [{ at: 100, deviceHash: "same" }],
        100 + PHOTO_DAY_MS,
        "same",
        undefined,
        1,
      ).allowed,
    ).toBe(true);
    for (const cap of [0, 1001, 1.5, NaN])
      expect(photoAllowance([], 100, "device", undefined, cap).allowed).toBe(
        false,
      );
  });
});
