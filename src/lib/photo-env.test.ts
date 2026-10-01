import { afterEach, expect, it, vi } from "vitest";

import { photoEstimateEnv } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});
it("requires an operator model and bounded global cap", () => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  vi.stubEnv("OPENROUTER_MODEL", "chosen/model");
  vi.stubEnv("PHOTO_ESTIMATE_DAILY_LIMIT", "");
  expect(photoEstimateEnv()).toEqual({
    apiKey: "test-key",
    model: "chosen/model",
    dailyLimit: 100,
  });
  for (const quota of ["0", "1001", "5.5", "wrong"]) {
    vi.stubEnv("PHOTO_ESTIMATE_DAILY_LIMIT", quota);
    expect(photoEstimateEnv()).toBeUndefined();
  }
  vi.stubEnv("PHOTO_ESTIMATE_DAILY_LIMIT", "10");
  vi.stubEnv("OPENROUTER_MODEL", "  ");
  expect(photoEstimateEnv()).toBeUndefined();
});
