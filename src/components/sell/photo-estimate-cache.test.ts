import { afterEach, expect, it, vi } from "vitest";

import type { PhotoEstimateReply } from "../../../convex/lib/photoEstimates";
import { createPhotoEstimateCache } from "./photo-estimate-cache";

const reply: PhotoEstimateReply = {
  status: "ok",
  result: { items: [], retake: "too_dark" },
};
const hash = (value: string) => Promise.resolve(value);
afterEach(() => {
  vi.useRealTimers();
});
it("coalesces concurrent calls and retains successes for five minutes", async () => {
  vi.useFakeTimers();
  const cache = createPhotoEstimateCache(hash);
  const request = vi.fn().mockResolvedValue(reply);
  expect(
    await Promise.all([
      cache.run("image", "catalogue", request),
      cache.run("image", "catalogue", request),
    ]),
  ).toEqual([reply, reply]);
  expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(299_999);
  await cache.run("image", "catalogue", request);
  expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await cache.run("image", "catalogue", request);
  expect(request).toHaveBeenCalledTimes(2);
  cache.clear();
});
it("bounds memory to three images and invalidates changed catalogue context", async () => {
  const cache = createPhotoEstimateCache(hash);
  const request = vi.fn().mockResolvedValue(reply);
  for (const image of ["a", "b", "c", "d", "a"])
    await cache.run(image, "catalogue", request);
  expect(request).toHaveBeenCalledTimes(5);
  await cache.run("a", "new-catalogue", request);
  expect(request).toHaveBeenCalledTimes(6);
  cache.clear();
});
it("never caches failures or transfers results to another form session", async () => {
  const cache = createPhotoEstimateCache(hash);
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ status: "limited" })
    .mockResolvedValue(reply);
  await expect(cache.run("a", "c", request)).rejects.toThrow("offline");
  await cache.run("a", "c", request);
  await cache.run("a", "c", request);
  expect(request).toHaveBeenCalledTimes(3);
  cache.clear();
  await cache.run("a", "c", request);
  expect(request).toHaveBeenCalledTimes(4);
  cache.clear();
});
it("does not start work after its session is cleared while hashing", async () => {
  const cache = createPhotoEstimateCache(hash);
  const request = vi.fn();
  const pending = cache.run("a", "c", request);
  cache.clear();
  expect(await pending).toEqual({ status: "unavailable" });
  expect(request).not.toHaveBeenCalled();
});
