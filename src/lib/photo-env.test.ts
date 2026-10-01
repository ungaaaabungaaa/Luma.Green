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
    provider: "openrouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
  });
  for (const quota of ["0", "1001", "5.5", "wrong"]) {
    vi.stubEnv("PHOTO_ESTIMATE_DAILY_LIMIT", quota);
    expect(photoEstimateEnv()).toBeUndefined();
  }
  vi.stubEnv("PHOTO_ESTIMATE_DAILY_LIMIT", "10");
  vi.stubEnv("OPENROUTER_MODEL", "  ");
  expect(photoEstimateEnv()).toBeUndefined();
});

it("requires explicit self-hosted credentials and never falls back to a paid provider", () => {
  vi.stubEnv("PHOTO_ESTIMATE_PROVIDER", "self-hosted");
  vi.stubEnv("OPENROUTER_API_KEY", "paid-key");
  vi.stubEnv("OPENROUTER_MODEL", "paid-model");
  expect(photoEstimateEnv()).toBeUndefined();
  vi.stubEnv(
    "PHOTO_ESTIMATE_ENDPOINT",
    "https://vision.example.com/v1/chat/completions",
  );
  vi.stubEnv("PHOTO_ESTIMATE_API_KEY", "gateway-token");
  vi.stubEnv("PHOTO_ESTIMATE_MODEL", "operator-licensed-vision-model");
  expect(photoEstimateEnv()).toMatchObject({
    provider: "self-hosted",
    apiKey: "gateway-token",
    model: "operator-licensed-vision-model",
  });
  for (const endpoint of [
    "not-a-url",
    // eslint-disable-next-line unicorn/prefer-https -- HTTP is deliberately rejected by the validator.
    "http://vision.example.com/v1/chat/completions",
    "https://localhost/v1/chat/completions",
    "https://127.0.0.1/v1/chat/completions",
    "https://192.168.1.1/v1/chat/completions",
    "https://[::1]/v1/chat/completions",
    "https://router.local/v1/chat/completions",
    "https://user:password@vision.example.com/v1/chat/completions",
    "https://vision.example.com/v1/chat/completions?token=secret",
    "https://vision.example.com/v1/chat/completions#fragment",
    "https://vision.example.com/api/chat",
  ]) {
    vi.stubEnv("PHOTO_ESTIMATE_ENDPOINT", endpoint);
    expect(photoEstimateEnv()).toBeUndefined();
  }
});
it("disables unknown providers rather than silently billing OpenRouter", () => {
  vi.stubEnv("PHOTO_ESTIMATE_PROVIDER", "typo");
  vi.stubEnv("OPENROUTER_API_KEY", "key");
  vi.stubEnv("OPENROUTER_MODEL", "model");
  expect(photoEstimateEnv()).toBeUndefined();
});
