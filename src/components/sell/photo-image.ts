import {
  MAX_PHOTO_DATA_URL,
  MAX_PHOTO_EDGE,
} from "../../../convex/lib/photoEstimates";

export const MAX_SOURCE_PHOTO_BYTES = 12 * 1024 * 1024;

/** Re-encoding strips photo metadata. Nothing is uploaded until the user confirms. */
export async function preparePhoto(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png"].includes(file.type) ||
    file.size === 0 ||
    file.size > MAX_SOURCE_PHOTO_BYTES
  )
    throw new Error("INVALID_PHOTO");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      bitmap.width < 1 ||
      bitmap.height < 1 ||
      bitmap.width * bitmap.height > 40_000_000
    )
      throw new Error("INVALID_PHOTO");
    const ratio = Math.min(
      1,
      MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("INVALID_PHOTO");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.6, 0.4]) {
      const image = canvas.toDataURL("image/jpeg", quality);
      if (
        image.startsWith("data:image/jpeg;base64,") &&
        image.length <= MAX_PHOTO_DATA_URL
      )
        return image;
    }
    throw new Error("PHOTO_TOO_LARGE");
  } finally {
    bitmap.close();
  }
}

/** A rotatable browser hint, never a security identity. The server also has a global cap. */
export function photoDeviceId(): string {
  const key = "luma-photo-device";
  try {
    const stored = localStorage.getItem(key);
    if (stored && /^[\da-f-]{36}$/i.test(stored)) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
