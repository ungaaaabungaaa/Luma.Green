import { expect, it } from "vitest";

import { MAX_SOURCE_PHOTO_BYTES, preparePhoto } from "./photo-image";

it("refuses unsupported and empty files before browser decoding", async () => {
  await expect(
    preparePhoto(new File(["text"], "scrap.svg", { type: "image/svg+xml" })),
  ).rejects.toThrow("INVALID_PHOTO");
  await expect(
    preparePhoto(new File([], "scrap.jpg", { type: "image/jpeg" })),
  ).rejects.toThrow("INVALID_PHOTO");
});
it("refuses photos larger than 12 MiB before browser decoding", async () => {
  const file = new File(
    [new Uint8Array(MAX_SOURCE_PHOTO_BYTES + 1)],
    "scrap.jpg",
    { type: "image/jpeg" },
  );
  await expect(preparePhoto(file)).rejects.toThrow("INVALID_PHOTO");
});
