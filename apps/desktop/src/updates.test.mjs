import assert from "node:assert/strict";
import test from "node:test";

import { setupUpdates } from "./updates.mjs";
function mockUpdater() {
  /** @type {Map<string, (...args: unknown[]) => void>} */
  const handlers = new Map();
  const calls = { feeds: 0, checks: 0, installs: 0 };
  const updater = {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: true,
    setFeedURL: () => {
      calls.feeds++;
    },
    checkForUpdates: async () => {
      calls.checks++;
    },
    quitAndInstall: () => {
      calls.installs++;
    },
    /** @param {string} event @param {(...args: unknown[]) => void} listener */
    on: (event, listener) => handlers.set(event, listener),
  };
  return { updater, calls, handlers };
}
test("missing feed and unpackaged apps never contact updater", async () => {
  for (const [feed, packaged] of /** @type {[string | null, boolean][]} */ ([
    [null, true],
    ["https://example.com/", false],
  ])) {
    const { updater, calls } = mockUpdater();
    const updates = setupUpdates(updater, feed, packaged, async () => false);
    await updates.check();
    await updates.check(true);
    assert.deepEqual(calls, { feeds: 0, checks: 0, installs: 0 });
  }
});
test("updates download automatically but restart waits for user choice", async () => {
  const { updater, calls, handlers } = mockUpdater();
  let isConsent = false;
  setupUpdates(updater, "https://example.com/", true, async () => isConsent);
  assert.equal(updater.autoDownload, true);
  assert.equal(updater.autoInstallOnAppQuit, true);
  assert.equal(updater.allowPrerelease, false);
  handlers.get("update-downloaded")?.();
  await Promise.resolve();
  assert.equal(calls.installs, 0);
  isConsent = true;
  handlers.get("update-downloaded")?.();
  await Promise.resolve();
  assert.equal(calls.installs, 1);
});
test("update failure does not reject the application check action", async () => {
  const { updater } = mockUpdater();
  updater.checkForUpdates = async () => {
    throw new Error("offline");
  };
  const updates = setupUpdates(
    updater,
    "https://example.com/",
    true,
    async () => false,
  );
  await assert.doesNotReject(updates.check());
});

test("manual update reports a late download failure once", async () => {
  const { updater, handlers } = mockUpdater();
  /** @type {string[]} */
  const notifications = [];
  const { promise: downloadPromise, reject: rejectDownload } =
    Promise.withResolvers();
  const downloadUpdater = {
    ...updater,
    checkForUpdates: async () => ({ downloadPromise }),
  };
  const updates = setupUpdates(
    downloadUpdater,
    "https://example.com/",
    true,
    async (state) => {
      notifications.push(state);
      return false;
    },
  );
  const pending = updates.check(true);
  await Promise.resolve();
  handlers.get("error")?.();
  rejectDownload(new Error("download offline"));
  await pending;
  assert.deepEqual(notifications, ["failed"]);
});
