import { Blob as NodeBlob, File as NodeFile } from "node:buffer";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prepareUpload, uploadImageSize } from "./upload-image";
import { stripUploadMetadata } from "./upload-image-metadata";

const frame = [255, 192, 0, 8, 8, 0, 100, 0, 200, 1];
const scan = [255, 218, 0, 2, 12, 34, 255, 0, 56, 255, 208, 78];
const comment = [255, 254, 0, 8, 71, 80, 83, 49, 50, 51];
const jpeg = new Uint8Array([
  255,
  216,
  ...comment,
  ...frame,
  ...scan,
  ...comment,
  255,
  217,
]);
const close = vi.fn();
const decode = vi.fn();
const encode = vi.fn();
const draw = vi.fn();

beforeEach(() => {
  vi.stubGlobal("File", NodeFile);
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("createImageBitmap", decode);
  decode.mockResolvedValue({ width: 200, height: 100, close });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        fillRect: vi.fn(),
        drawImage: draw,
        fillStyle: "",
      }) as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(encode);
  encode.mockImplementation((callback: BlobCallback) => {
    callback(new Blob([new Uint8Array(20)], { type: "image/jpeg" }));
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("upload preparation", () => {
  it("keeps document text larger and never upscales small images", () => {
    expect(uploadImageSize(4000, 3000, "id_proof")).toEqual({
      width: 2400,
      height: 1800,
    });
    expect(uploadImageSize(4000, 3000, "selfie")).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(uploadImageSize(300, 200, "selfie")).toEqual({
      width: 300,
      height: 200,
    });
  });
  it("removes comments before and after scan data without altering compressed pixels", async () => {
    const clean = stripUploadMetadata(jpeg, "image/jpeg");
    expect(new Uint8Array(await clean.arrayBuffer())).toEqual(
      new Uint8Array([255, 216, ...frame, ...scan, 255, 217]),
    );
  });
  it("never increases already small uploads", async () => {
    encode.mockImplementation((callback: BlobCallback) => {
      callback(new Blob([new Uint8Array(500)], { type: "image/jpeg" }));
    });
    const output = await prepareUpload(
      new File([jpeg], "scan.jpg", { type: "image/jpeg" }),
      "id_proof",
    );
    expect(output.size).toBeLessThan(jpeg.length);
    expect(output.name).toBe("scan.jpg");
    expect(new TextDecoder().decode(await output.arrayBuffer())).not.toContain(
      "GPS123",
    );
    expect(close).toHaveBeenCalledOnce();
  });
  it("uses a smaller encoding and releases the source bitmap", async () => {
    const output = await prepareUpload(
      new File([jpeg], "photo.jpeg", { type: "image/jpeg" }),
      "selfie",
    );
    expect(output.size).toBe(20);
    expect(output.type).toBe("image/jpeg");
    expect(draw).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
  it("keeps PDF and video bytes unchanged", async () => {
    const pdf = new File(["%PDF document"], "id.pdf", {
      type: "application/pdf",
    });
    const video = new File(
      [new Uint8Array([0, 0, 0, 16]), "ftypisom0000"],
      "machine.mp4",
      { type: "video/mp4" },
    );
    expect(await prepareUpload(pdf, "id_proof")).toBe(pdf);
    expect(await prepareUpload(video, "machine_media")).toBe(video);
    expect(decode).not.toHaveBeenCalled();
  });
  it("rejects empty, oversized, mismatched and malformed files before decoding", async () => {
    for (const file of [
      new File([], "empty.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array(11 * 1024 * 1024)], "large.jpg", {
        type: "image/jpeg",
      }),
      new File(["%PDF wrong"], "fake.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array([255, 216, 255, 225, 255, 255])], "broken.jpg", {
        type: "image/jpeg",
      }),
    ])
      await expect(prepareUpload(file, "selfie")).rejects.toThrow();
    expect(decode).not.toHaveBeenCalled();
  });
  it("rejects pixel bombs before the browser allocates their decoded bitmap", async () => {
    const huge = new Uint8Array([
      255, 216, 255, 192, 0, 8, 8, 255, 255, 255, 255, 1, 255, 217,
    ]);
    await expect(
      prepareUpload(
        new File([huge], "huge.jpg", { type: "image/jpeg" }),
        "selfie",
      ),
    ).rejects.toThrow();
    expect(decode).not.toHaveBeenCalled();
  });
  it("fails safely on decode and encoder errors without sending original metadata", async () => {
    const file = new File([jpeg], "photo.jpg", { type: "image/jpeg" });
    decode.mockRejectedValueOnce(new Error("Bad image"));
    await expect(prepareUpload(file, "selfie")).rejects.toThrow("Bad image");
    encode.mockImplementation((callback: BlobCallback) => {
      callback(null);
    });
    await expect(prepareUpload(file, "selfie")).rejects.toThrow(
      "IMAGE_ENCODER_UNAVAILABLE",
    );
    expect(close).toHaveBeenCalledOnce();
  });
});

it("reuses preparation for the same immutable File and preset, but retries failures", async () => {
  const file = new File([jpeg], "photo.jpg", { type: "image/jpeg" });
  const [first, second] = await Promise.all([
    prepareUpload(file, "selfie"),
    prepareUpload(file, "selfie"),
  ]);
  expect(first).toBe(second);
  expect(decode).toHaveBeenCalledOnce();
  await prepareUpload(file, "id_proof");
  expect(decode).toHaveBeenCalledTimes(2);
  const failed = new File([jpeg], "retry.jpg", { type: "image/jpeg" });
  decode.mockRejectedValueOnce(new Error("Temporary decoder failure"));
  await expect(prepareUpload(failed, "selfie")).rejects.toThrow();
  await expect(prepareUpload(failed, "selfie")).resolves.toBeInstanceOf(File);
  expect(decode).toHaveBeenCalledTimes(4);
});

it("drops arbitrary APP0 and APP14 private payloads", async () => {
  const secret = new TextEncoder().encode("PRIVATE GPS and device ID");
  const app0 = [255, 224, 0, secret.length + 2, ...secret];
  const app14 = [255, 238, 0, secret.length + 2, ...secret];
  const bytes = new Uint8Array([
    255,
    216,
    ...app0,
    ...app14,
    ...frame,
    ...scan,
    255,
    217,
  ]);
  const output = stripUploadMetadata(bytes, "image/jpeg");
  expect(new Uint8Array(await output.arrayBuffer())).toEqual(
    new Uint8Array([255, 216, ...frame, ...scan, 255, 217]),
  );
});

it("keeps EXIF orientation while dropping other EXIF fields", async () => {
  const exif = [
    255,
    225,
    0,
    42,
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
    6,
    0,
    0,
    0,
    0,
    0,
    0,
    ...new TextEncoder().encode("GPS data"),
  ];
  const output = stripUploadMetadata(
    new Uint8Array([255, 216, ...exif, ...frame, ...scan, 255, 217]),
    "image/jpeg",
  );
  const bytes = new Uint8Array(await output.arrayBuffer());
  expect(bytes[31]).toBe(6);
  expect(new TextDecoder().decode(bytes)).not.toContain("GPS data");
  expect(output.size).toBeLessThan(
    2 + exif.length + frame.length + scan.length + 2,
  );
});

it("strips PNG metadata but preserves the orientation needed by its pixels", async () => {
  // A synthetic 4x2 PNG with orientation=6 and standard nonessential metadata.
  const bytes = new Uint8Array(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAABP2lDQ1BpY2MAABiVfZC/SwJxGMY/11WWWA05NBQcJU0FUUtTgYZOEfgj1Kbz/FGgdt33QprLoaloiEZrCaLZxhz6A4KgIQqirdWghpKLrw5aUM/yfnh4Xt6XB5TnvFEQ3RoUirYVDvm1eCKpuV5Q8dLPIGO6IczlSDAKIPSSMGwrzw+936PIeTe9rhfTO6/Xq8kFpbo7UY4FP1Yu+F/udEYYwBfgM0zLBkUDxku2KXkJ8BrrehqUODBlxRNJUPakn2vxieRUiy8lW9FwAJQaoOU6ONXBhfy2vCslv/dkirEI0AeMIggTwv9HpreZCRBgBmRfv3sQ2bnZ1pZnEXqeHOdtElyH0DhynM9Tx2mcgfoIta32/mYF5uugHrS91DFc7cPIQ9vzVWCoDNUbU7f0pqUCXdkNqJ/DQAKGb8G99g3j4l+x2lMbhgAAALRlWElmSUkqAAgAAAAGABIBAwABAAAABgAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAAA4YwAA6AMAADhjAADoAwAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAQAAQAAAAQAAAADoAQAAQAAAAIAAAAAAAAAbZ57xwAAAAlwSFlzAAAD6AAAA+gBtXtSawAAABBJREFUCJljaOAxgiMGZA4AT7oF8Wbrm3oAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const clean = stripUploadMetadata(bytes, "image/png");
  const output = new Uint8Array(await clean.arrayBuffer());
  const text = new TextDecoder().decode(output);
  expect(text).toContain("eXIf");
  expect(text).not.toContain("iCCP");
  expect(text).not.toContain("pHYs");
  expect(output.length).toBeLessThan(bytes.length);
  const exifIndex = text.indexOf("eXIf");
  expect(output[exifIndex + 23]).toBe(6);
});
