import { z } from "zod";

export const MAX_PHOTO_DATA_URL = 450_000;
export const MAX_PHOTO_EDGE = 1600;
export const PHOTO_PROMPT_VERSION = "scrap-grams-v1";
export const PHOTO_DAY_MS = 86_400_000;
export const PHOTO_DEVICE_LIMIT = 5;
export const MAX_PHOTO_ITEMS = 12;

export const photoItemSchema = z.strictObject({
  materialCode: z.string().min(1).max(80),
  gramsLow: z.number().int().min(100).max(200_000),
  gramsHigh: z.number().int().min(100).max(200_000),
  confidence: z.number().min(0).max(1),
});
export const photoResultSchema = z.strictObject({
  items: z.array(photoItemSchema).max(MAX_PHOTO_ITEMS),
  retake: z.enum(["none", "too_dark", "too_far", "not_scrap"]),
});
export type PhotoItem = z.infer<typeof photoItemSchema>;
export type PhotoResult = z.infer<typeof photoResultSchema>;
export type PhotoEstimateReply =
  | { status: "ok"; result: PhotoResult }
  | { status: "unavailable" | "failed" | "invalid" | "limited" };

/** Fail closed: never turn invented materials, inverted weights or extra prices into a basket. */
export function parsePhotoResult(
  value: unknown,
  activeCodes: ReadonlySet<string>,
): PhotoResult {
  const result = photoResultSchema.parse(value);
  const seen = new Set<string>();
  for (const item of result.items) {
    if (
      !activeCodes.has(item.materialCode) ||
      seen.has(item.materialCode) ||
      item.gramsHigh < item.gramsLow
    ) {
      throw new Error("INVALID_PHOTO_RESULT");
    }
    seen.add(item.materialCode);
  }
  if (result.retake !== "none" && result.items.length > 0)
    throw new Error("INVALID_PHOTO_RESULT");
  return result;
}

function isSizeAllowed(width: number, height: number) {
  return (
    width > 0 &&
    height > 0 &&
    width <= MAX_PHOTO_EDGE &&
    height <= MAX_PHOTO_EDGE
  );
}

/** Validate size, encoding, file signature and dimensions before a paid request. */
export function isPhotoDataUrl(value: string): boolean {
  if (value.length > MAX_PHOTO_DATA_URL) return false;
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    value,
  );
  if (!match || match[2].length % 4 !== 0) return false;
  let bytes: string;
  try {
    bytes = atob(match[2]);
  } catch {
    return false;
  }
  const byte = (index: number) => bytes.codePointAt(index) ?? -1;
  if (match[1] === "png") {
    if (
      !bytes.startsWith("\u{89}PNG\r\n\u{1A}\n") ||
      bytes.slice(12, 16) !== "IHDR" ||
      bytes.slice(-8, -4) !== "IEND"
    )
      return false;
    const word = (index: number) =>
      byte(index) * 16_777_216 +
      byte(index + 1) * 65_536 +
      byte(index + 2) * 256 +
      byte(index + 3);
    return isSizeAllowed(word(16), word(20));
  }
  if (!bytes.startsWith("\u{FF}\u{D8}") || !bytes.endsWith("\u{FF}\u{D9}"))
    return false;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (byte(offset) !== 255) return false;
    const marker = byte(offset + 1);
    const length = byte(offset + 2) * 256 + byte(offset + 3);
    if (length < 2 || offset + length + 2 > bytes.length) return false;
    if ([192, 193, 194].includes(marker))
      return isSizeAllowed(
        byte(offset + 7) * 256 + byte(offset + 8),
        byte(offset + 5) * 256 + byte(offset + 6),
      );
    offset += length + 2;
  }
  return false;
}

export interface PhotoReservation {
  at: number;
  deviceHash: string;
  phoneHash?: string;
}
export function photoAllowance(
  reservations: readonly PhotoReservation[],
  now: number,
  deviceHash: string,
  phoneHash: string | undefined,
  dailyLimit: number,
) {
  const recent = reservations.filter((entry) => entry.at > now - PHOTO_DAY_MS);
  const deviceCount = recent.filter(
    (entry) => entry.deviceHash === deviceHash,
  ).length;
  const phoneCount = phoneHash
    ? recent.filter((entry) => entry.phoneHash === phoneHash).length
    : 0;
  return {
    recent,
    allowed:
      Number.isSafeInteger(dailyLimit) &&
      dailyLimit >= 1 &&
      dailyLimit <= 1000 &&
      recent.length < dailyLimit &&
      deviceCount < PHOTO_DEVICE_LIMIT &&
      phoneCount < PHOTO_DEVICE_LIMIT,
  };
}
