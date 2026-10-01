/** Only raster headers are inspected here. The browser still validates the full image. */
export const MAX_UPLOAD_PIXELS = 40_000_000;

function invalid(): never {
  throw new Error("INVALID_UPLOAD_IMAGE");
}

function checkDimensions(width: number, height: number) {
  if (width < 1 || height < 1 || width * height > MAX_UPLOAD_PIXELS) invalid();
}

/** Keep only the orientation from EXIF, never GPS, device IDs or comments. */
function orientationSegment(segment: Uint8Array): Uint8Array | undefined {
  const view = new DataView(
    segment.buffer,
    segment.byteOffset,
    segment.byteLength,
  );
  if (
    segment.length < 18 ||
    String.fromCodePoint(...segment.subarray(4, 10)) !== "Exif\0\0"
  )
    return;
  const base = 10;
  const isLittle = view.getUint16(base) === 0x49_49;
  if (!isLittle && view.getUint16(base) !== 0x4d_4d) invalid();
  if (view.getUint16(base + 2, isLittle) !== 42) invalid();
  const directory = base + view.getUint32(base + 4, isLittle);
  if (directory < base + 8 || directory + 2 > segment.length) invalid();
  const count = view.getUint16(directory, isLittle);
  if (directory + 2 + count * 12 > segment.length) invalid();
  for (let index = 0; index < count; index++) {
    const entry = directory + 2 + index * 12;
    if (view.getUint16(entry, isLittle) !== 0x01_12) continue;
    if (
      view.getUint16(entry + 2, isLittle) !== 3 ||
      view.getUint32(entry + 4, isLittle) !== 1
    )
      invalid();
    const orientation = view.getUint16(entry + 8, isLittle);
    if (orientation < 1 || orientation > 8) invalid();
    if (orientation === 1) return;
    // A minimal big-endian EXIF directory with one orientation entry.
    return new Uint8Array([
      255,
      225,
      0,
      34,
      69,
      120,
      105,
      102,
      0,
      0,
      77,
      77,
      0,
      42,
      0,
      0,
      0,
      8,
      0,
      1,
      1,
      18,
      0,
      3,
      0,
      0,
      0,
      1,
      0,
      orientation,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);
  }
}

function isFrame(marker: number) {
  return (
    marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
  );
}

function jpegPart(segment: Uint8Array, marker: number) {
  if (marker === 0xe1) return orientationSegment(segment);
  if (marker === 0xe0) {
    if (
      segment.length < 18 ||
      String.fromCodePoint(...segment.subarray(4, 9)) !== "JFIF\0"
    )
      return;
    const jfif = segment.slice(0, 18);
    jfif[2] = 0;
    jfif[3] = 16;
    jfif[16] = 0;
    jfif[17] = 0;
    return jfif;
  }
  if (marker === 0xee) {
    if (
      segment.length < 16 ||
      String.fromCodePoint(...segment.subarray(4, 9)) !== "Adobe"
    )
      return;
    const adobe = segment.slice(0, 16);
    adobe[2] = 0;
    adobe[3] = 14;
    return adobe;
  }
  if (marker === 0xfe || marker >= 0xe0) return;
  return segment;
}

/** PNG stores the same TIFF orientation directory as JPEG, without its EXIF label. */
function pngOrientation(data: Uint8Array): Uint8Array | undefined {
  const wrapped = new Uint8Array(10 + data.length);
  wrapped.set([255, 225, 0, 0, 69, 120, 105, 102, 0, 0]);
  wrapped.set(data, 10);
  const orientation = orientationSegment(wrapped);
  if (!orientation) return;
  const tiff = orientation.subarray(10);
  const chunk = new Uint8Array(tiff.length + 12);
  new DataView(chunk.buffer).setUint32(0, tiff.length);
  chunk.set([101, 88, 73, 102], 4);
  chunk.set(tiff, 8);
  let crc = 0xff_ff_ff_ff;
  const content = chunk.subarray(4, -4);
  for (const byte of content) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xed_b8_83_20 : 0);
  }
  new DataView(chunk.buffer).setUint32(
    chunk.length - 4,
    (crc ^ 0xff_ff_ff_ff) >>> 0,
  );
  return chunk;
}

/** Skip escaped FF bytes and restart markers inside compressed scan data. */
function scanEnd(bytes: Uint8Array, start: number) {
  for (let index = start; index + 1 < bytes.length; index++) {
    const next = bytes[index + 1];
    if (next !== 0 && bytes[index] === 0xff && !(next >= 0xd0 && next <= 0xd7))
      return index;
  }
  return invalid();
}

function jpegSegment(bytes: Uint8Array, offset: number) {
  if (offset + 4 > bytes.length) return invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint16(offset + 2);
  if (length < 2 || offset + 2 + length > bytes.length) return invalid();
  const marker = bytes[offset + 1];
  if (isFrame(marker)) {
    if (length < 8) return invalid();
    checkDimensions(view.getUint16(offset + 7), view.getUint16(offset + 5));
  }
  const end = offset + length + 2;
  return { part: jpegPart(bytes.slice(offset, end), marker), end, marker };
}

function cleanJpeg(bytes: Uint8Array): Blob {
  const parts: BlobPart[] = [bytes.slice(0, 2)];
  let offset = 2;
  let hasDimensions = false;
  while (offset + 2 <= bytes.length) {
    if (bytes[offset] !== 0xff) return invalid();
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0xd9 && hasDimensions) {
      parts.push(bytes.slice(offset, offset + 2));
      return new Blob(parts, { type: "image/jpeg" });
    }
    const segment = jpegSegment(bytes, offset);
    hasDimensions ||= isFrame(segment.marker);
    if (segment.part) parts.push(new Uint8Array(segment.part).buffer);
    offset = segment.end;
    if (marker !== 0xda) continue;
    const end = scanEnd(bytes, offset);
    parts.push(bytes.slice(offset, end));
    offset = end;
  }
  return invalid();
}

function pngPart(bytes: Uint8Array, offset: number, end: number, kind: string) {
  if (kind === "eXIf")
    return pngOrientation(bytes.subarray(offset + 8, end - 4));
  // Critical chunks plus transparency and colour interpretation. No text/GPS.
  if (
    ["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "sRGB", "gAMA", "cHRM"].includes(
      kind,
    )
  )
    return bytes.slice(offset, end);
}

function cleanPng(bytes: Uint8Array): Blob {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: BlobPart[] = [bytes.slice(0, 8)];
  let offset = 8;
  let hasDimensions = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const end = offset + length + 12;
    if (end > bytes.length) invalid();
    const kind = String.fromCodePoint(
      ...bytes.subarray(offset + 4, offset + 8),
    );
    if (!hasDimensions) {
      if (kind !== "IHDR" || length !== 13) invalid();
      checkDimensions(view.getUint32(offset + 8), view.getUint32(offset + 12));
      hasDimensions = true;
    }
    const part = pngPart(bytes, offset, end, kind);
    if (part) parts.push(new Uint8Array(part).buffer);
    if (kind === "IEND") return new Blob(parts, { type: "image/png" });
    offset = end;
  }
  return invalid();
}

/** A lossless, never-larger fallback for images that are already well compressed. */
export function stripUploadMetadata(bytes: Uint8Array, type: string): Blob {
  return type === "image/jpeg" ? cleanJpeg(bytes) : cleanPng(bytes);
}
