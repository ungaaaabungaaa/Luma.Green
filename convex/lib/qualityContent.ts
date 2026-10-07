import { ConvexError } from "convex/values";

import { sniffContentType } from "./onboarding";

export const QUALITY_MAX_BYTES = 2 * 1024 * 1024;
/** Downloads are attachments, never embedded active documents. This is format validation, not malware certification. */
export function validateQualityContent(
  bytes: ArrayBuffer,
  declaredType: string,
) {
  const data = new Uint8Array(bytes);
  if (data.length < 12 || data.length > QUALITY_MAX_BYTES)
    throw new ConvexError("INVALID_FILE_SIZE");
  const type = sniffContentType(data);
  if (
    !type ||
    type !== declaredType ||
    !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(type)
  )
    throw new ConvexError("INVALID_FILE_TYPE");
  if (type === "application/pdf") {
    const text = new TextDecoder("latin1").decode(data);
    // Reject encrypted/embedded/active PDFs; users can supply a flattened scan instead.
    if (
      !text.includes("%%EOF") ||
      /\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile|RichMedia|Encrypt|XFA)\b/i.test(
        text,
      ) ||
      /#[0-9a-f]{2}/i.test(text)
    )
      throw new ConvexError("UNSAFE_DOCUMENT");
  }
  return type;
}
export function qualityText(value: string, max = 500) {
  const text = value.trim();
  if (
    text.length < 3 ||
    text.length > max ||
    /[\u{0}-\u{1F}\u{7F}]/u.test(text)
  )
    throw new ConvexError("INVALID_QUALITY_TEXT");
  return text;
}
