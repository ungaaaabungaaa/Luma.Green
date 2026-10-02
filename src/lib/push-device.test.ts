import { afterEach, describe, expect, it, vi } from "vitest";

import { parsePushResult, requestNativePush } from "./push-device";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("native push bridge", () => {
  it("rejects invalid request IDs, unrelated properties and tokens on failure", () => {
    expect(
      parsePushResult({
        requestId: "id-1",
        status: "granted",
        token: "ExpoPushToken[valid]",
      }),
    ).toEqual({
      requestId: "id-1",
      status: "granted",
      token: "ExpoPushToken[valid]",
    });
    expect(
      parsePushResult({
        requestId: "id",
        status: "denied",
        token: "ExpoPushToken[valid]",
      }),
    ).toBeUndefined();
    expect(
      parsePushResult({ requestId: "id", status: "granted", token: "invalid" }),
    ).toBeUndefined();
    expect(
      parsePushResult({ requestId: "x".repeat(65), status: "granted" }),
    ).toBeUndefined();
    expect(
      parsePushResult({
        requestId: "id",
        status: "granted",
        url: "https://evil.test",
      }),
    ).toBeUndefined();
  });
  it("accepts only the outstanding ID and ignores duplicates", async () => {
    const postMessage = vi.fn();
    vi.stubGlobal("ReactNativeWebView", { postMessage });
    const result = requestNativePush(
      "luma.push.status",
      new AbortController().signal,
    );
    const sent = JSON.parse(postMessage.mock.calls[0][0] as string) as {
      requestId: string;
      type: string;
    };
    expect(sent.type).toBe("luma.push.status");
    document.dispatchEvent(
      new CustomEvent("luma-push-result", {
        detail: { requestId: "other", status: "denied" },
      }),
    );
    document.dispatchEvent(
      new CustomEvent("luma-push-result", {
        detail: { requestId: sent.requestId, status: "granted" },
      }),
    );
    await expect(result).resolves.toEqual({
      requestId: sent.requestId,
      status: "granted",
    });
  });
  it("rejects after timeout and abort without retaining the listener", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("ReactNativeWebView", { postMessage: vi.fn() });
    const abort = new AbortController();
    const cancelled = requestNativePush("luma.push.enable", abort.signal);
    abort.abort();
    await expect(cancelled).rejects.toThrow("PUSH_CANCELLED");
    const pending = requestNativePush(
      "luma.push.status",
      new AbortController().signal,
    );
    const assertion = expect(pending).rejects.toThrow("PUSH_TIMEOUT");
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });
  it("keeps explicit consent pending while the user reviews the OS dialogs", async () => {
    vi.useFakeTimers();
    const postMessage = vi.fn();
    vi.stubGlobal("ReactNativeWebView", { postMessage });
    const pending = requestNativePush(
      "luma.push.enable",
      new AbortController().signal,
    );
    const sent = JSON.parse(postMessage.mock.calls[0][0] as string) as {
      requestId: string;
    };
    await vi.advanceTimersByTimeAsync(30_000);
    document.dispatchEvent(
      new CustomEvent("luma-push-result", {
        detail: {
          requestId: sent.requestId,
          status: "granted",
          token: "ExpoPushToken[approved]",
        },
      }),
    );
    await expect(pending).resolves.toMatchObject({
      status: "granted",
      token: "ExpoPushToken[approved]",
    });
  });
});
