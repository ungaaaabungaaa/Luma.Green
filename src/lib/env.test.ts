// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("optional server environment", () => {
  it("accepts the empty auth secret shipped in .env.example", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const { serverEnv } = await import("./env");
    expect(serverEnv().BETTER_AUTH_SECRET).toBeUndefined();
  });

  it("still refuses a configured secret that is too short", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "too-short");
    const { serverEnv } = await import("./env");
    expect(() => serverEnv()).toThrow();
  });
});
