// @vitest-environment node
import { readFileSync } from "node:fs";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

function serviceWorker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  // eslint-disable-next-line sonarjs/code-eval -- Execute only this repository's fixed worker in an isolated test context, with no network or untrusted source.
  vm.runInNewContext(readFileSync("public/push-sw.js", "utf8"), {
    URL,
    self: {
      addEventListener: (name: string, handler: (event: unknown) => void) =>
        handlers.set(name, handler),
      registration: { showNotification },
      location: { origin: "https://luma.example" },
      clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow },
    },
  });
  return { handlers, showNotification, openWindow };
}

describe("notification-only worker", () => {
  it("handles translated safe messages without installing a fetch/cache handler", async () => {
    const { handlers, showNotification } = serviceWorker();
    let completion: Promise<unknown> | undefined;
    handlers.get("push")?.({
      data: {
        json: () => ({
          title: "تحديث من Luma.Green",
          body: "افتح التطبيق",
          route: "/account/notifications",
          locale: "ar",
        }),
      },
      waitUntil: (value: Promise<unknown>) => {
        completion = value;
      },
    });
    await completion;
    expect(showNotification).toHaveBeenCalledWith(
      "تحديث من Luma.Green",
      expect.objectContaining({ data: { path: "/ar/account/notifications" } }),
    );
    expect(handlers.has("fetch")).toBe(false);
  });
  it("rejects a payload that attempts an external destination", () => {
    const { handlers, showNotification } = serviceWorker();
    handlers.get("push")?.({
      data: {
        json: () => ({ title: "x", body: "x", route: "https://evil.test" }),
      },
      waitUntil: vi.fn(),
    });
    expect(showNotification).not.toHaveBeenCalled();
  });
  it("opens only the local inbox even when click data has been altered", async () => {
    const { handlers, openWindow } = serviceWorker();
    let completion: Promise<unknown> | undefined;
    handlers.get("notificationclick")?.({
      notification: {
        close: vi.fn(),
        data: { path: "//evil.test/account/notifications" },
      },
      waitUntil: (value: Promise<unknown>) => {
        completion = value;
      },
    });
    await completion;
    expect(openWindow).toHaveBeenCalledWith(
      "https://luma.example/account/notifications",
    );
  });
});
