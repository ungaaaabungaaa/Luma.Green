import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: true,
  init: vi.fn(),
  capture: vi.fn(),
}));
vi.mock("@/lib/monitoring", () => ({
  isMonitoringEnabled: () => mocks.enabled,
  monitoringOptions: () => ({ enabled: true }),
}));
vi.mock("@sentry/nextjs", () => ({
  init: mocks.init,
  captureRequestError: mocks.capture,
}));

beforeEach(() => {
  vi.resetModules();
  mocks.enabled = true;
  mocks.init.mockReset();
  mocks.capture.mockReset();
});
afterEach(() => vi.restoreAllMocks());

const request = { path: "/private?token=secret", method: "GET", headers: {} };
const context = {
  routerKind: "App Router" as const,
  routePath: "/private",
  routeType: "render" as const,
  revalidateReason: undefined,
};

describe("optional error reporting failures", () => {
  it("does not prevent server startup when initialization fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    mocks.init.mockImplementation(() => {
      throw new Error("private configuration");
    });
    const { register } = await import("./instrumentation");
    await expect(register()).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "Error reporting is unavailable.",
    );
  });

  it("does not replace the request failure or log private data when capture fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    mocks.capture.mockImplementation(() => {
      throw new Error("private provider response");
    });
    const { onRequestError } = await import("./instrumentation");
    await expect(
      onRequestError(new Error("private record"), request, context),
    ).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "Error reporting is unavailable.",
    );
  });

  it("contains browser initialization failure without an unhandled rejection", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    mocks.init.mockImplementation(() => {
      throw new Error("private configuration");
    });
    await import("./instrumentation-client");
    await vi.waitFor(() => {
      expect(warning).toHaveBeenCalledExactlyOnceWith(
        "Error reporting is unavailable.",
      );
    });
  });

  it("does not initialize or capture when monitoring is disabled", async () => {
    mocks.enabled = false;
    const { register, onRequestError } = await import("./instrumentation");
    await register();
    await onRequestError(new Error("private record"), request, context);
    await import("./instrumentation-client");
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });
});
