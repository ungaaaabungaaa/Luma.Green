import {
  fileProblem,
  type FileType,
  sniffContentType,
} from "../../convex/lib/onboarding";
import {
  MAX_UPLOAD_PIXELS,
  stripUploadMetadata,
} from "./upload-image-metadata";

/** Document text gets a larger edge and higher quality than ordinary photographs. */
export function uploadImageSize(width: number, height: number, type: FileType) {
  const edge = type === "id_proof" ? 2400 : 1600;
  const scale = Math.min(1, edge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Prepare before requesting an upload URL. No server CPU, disk cache, or third-party
 * encoder is needed. PDFs, videos and existing WebP images stay byte-identical.
 */
async function prepareUncachedUpload(
  file: File,
  type: FileType,
): Promise<File> {
  if (
    file.size === 0 ||
    fileProblem(type, { contentType: file.type, size: file.size })
  )
    throw new Error("INVALID_UPLOAD_FILE");
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (sniffContentType(head) !== file.type)
    throw new Error("INVALID_UPLOAD_FILE");
  if (!["image/jpeg", "image/png"].includes(file.type)) return file;
  // Reject excessive decoded dimensions before allocating a bitmap.
  const clean = stripUploadMetadata(
    new Uint8Array(await file.arrayBuffer()),
    file.type,
  );
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  try {
    if (
      bitmap.width < 1 ||
      bitmap.height < 1 ||
      bitmap.width * bitmap.height > MAX_UPLOAD_PIXELS
    )
      throw new Error("INVALID_UPLOAD_IMAGE");
    const size = uploadImageSize(bitmap.width, bitmap.height, type);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("IMAGE_ENCODER_UNAVAILABLE");
    // Flatten transparent scans on paper white, not the JPEG default black.
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encoded = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", type === "id_proof" ? 0.92 : 0.85);
    });
    if (encoded?.type !== "image/jpeg")
      throw new Error("IMAGE_ENCODER_UNAVAILABLE");
    const output = encoded.size < clean.size ? encoded : clean;
    if (output.size === 0 || output.size > file.size)
      throw new Error("INVALID_UPLOAD_IMAGE");
    const name =
      output.type === file.type
        ? file.name
        : `${file.name.replace(/\.[^.]*$/, "")}.jpg`;
    return new File([output], name, {
      type: output.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
    // Release the backing pixel buffer before the next file in a multi-upload.
    canvas.width = 0;
    canvas.height = 0;
  }
}

// File identity is safe to reuse: File bytes are immutable. Weak keys let the
// picker release private images; no contents, URLs or authorization go on disk.
const preparedFiles = new WeakMap<File, Map<FileType, Promise<File>>>();
export function prepareUpload(file: File, type: FileType): Promise<File> {
  let presets = preparedFiles.get(file);
  if (!presets) {
    presets = new Map<FileType, Promise<File>>();
    preparedFiles.set(file, presets);
  }
  const existing = presets.get(type);
  if (existing) return existing;
  const prepared = prepareCachedUpload(file, type, presets);
  presets.set(type, prepared);
  return prepared;
}

async function prepareCachedUpload(
  file: File,
  type: FileType,
  cache: Map<FileType, Promise<File>>,
) {
  try {
    return await prepareUncachedUpload(file, type);
  } catch (error) {
    cache.delete(type);
    throw error;
  }
}
