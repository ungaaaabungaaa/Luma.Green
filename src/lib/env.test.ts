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

describe("admin setup secret", () => {
  it("permits an unconfigured deployment but rejects a weak setup token", async () => {
    vi.stubEnv("ADMIN_SETUP_TOKEN", "");
    let env = await import("./env");
    expect(env.serverEnv().ADMIN_SETUP_TOKEN).toBeUndefined();
    vi.resetModules();
    vi.stubEnv("ADMIN_SETUP_TOKEN", "short-token");
    env = await import("./env");
    expect(() => env.serverEnv()).toThrow();
  });

  it("does not expose the setup token through client settings", async () => {
    vi.stubEnv(
      "ADMIN_SETUP_TOKEN",
      "test-only-setup-token-01234567890123456789",
    );
    const { clientEnv, serverEnv } = await import("./env");
    expect(serverEnv().ADMIN_SETUP_TOKEN).toBe(
      "test-only-setup-token-01234567890123456789",
    );
    expect(clientEnv).not.toHaveProperty("ADMIN_SETUP_TOKEN");
  });
});

describe("optional observability configuration", () => {
  it("keeps telemetry off with empty template values", async () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    const { clientEnv } = await import("./env");
    expect(clientEnv.NEXT_PUBLIC_TELEMETRY_ENABLED).toBe(false);
  });
  it("requires an explicit true operator flag", async () => {
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-LUMATEST");
    const { clientEnv } = await import("./env");
    expect(clientEnv.NEXT_PUBLIC_TELEMETRY_ENABLED).toBe(true);
    expect(clientEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID).toBe("G-LUMATEST");
  });
  it("rejects a malformed Google measurement ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "https://wrong.example");
    await expect(import("./env")).rejects.toThrow();
  });
});
