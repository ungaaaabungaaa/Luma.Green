import assert from "node:assert/strict";
import test from "node:test";

import { registerPush } from "../src/push-registration.ts";

function setup() {
  const calls: string[] = [];
  const state = {
    current: true,
    granted: false,
    canAskAgain: true,
    approve: true,
  };
  const options = {
    enable: false,
    isCurrent: () => state.current,
    getPermission: () => {
      calls.push("read");
      return Promise.resolve({
        granted: state.granted,
        canAskAgain: state.canAskAgain,
      });
    },
    explain: () => {
      calls.push("explain");
      return Promise.resolve(state.approve);
    },
    prepareChannel: () => {
      calls.push("channel");
      return Promise.resolve();
    },
    askPermission: () => {
      calls.push("ask");
      return Promise.resolve({ granted: true, canAskAgain: false });
    },
    getToken: () => {
      calls.push("token");
      return Promise.resolve("ExpoPushToken[test]");
    },
  };
  return { calls, state, options };
}

void test("status cannot prompt or obtain a token before permission exists", async () => {
  const { calls, options } = setup();
  assert.deepEqual(await registerPush(options), { status: "denied" });
  assert.deepEqual(calls, ["read"]);
});

void test("enable requires native confirmation before OS permission or token acquisition", async () => {
  const { calls, state, options } = setup();
  options.enable = true;
  state.approve = false;
  assert.deepEqual(await registerPush(options), { status: "denied" });
  assert.deepEqual(calls, ["read", "explain"]);
});

void test("a previously blocked permission does not open another prompt", async () => {
  const { calls, state, options } = setup();
  options.enable = true;
  state.canAskAgain = false;
  assert.deepEqual(await registerPush(options), { status: "denied" });
  assert.deepEqual(calls, ["read"]);
});

void test("channel setup precedes the OS prompt and a granted result contains a token", async () => {
  const { calls, options } = setup();
  options.enable = true;
  assert.deepEqual(await registerPush(options), {
    status: "granted",
    token: "ExpoPushToken[test]",
  });
  assert.deepEqual(calls, [
    "read",
    "explain",
    "channel",
    "ask",
    "channel",
    "token",
  ]);
});

void test("an existing grant supports token renewal without a permission prompt", async () => {
  const { calls, state, options } = setup();
  state.granted = true;
  assert.deepEqual(await registerPush(options), {
    status: "granted",
    token: "ExpoPushToken[test]",
  });
  assert.deepEqual(calls, ["read", "channel", "token"]);
});

void test("navigation during permission or token work discards the result", async () => {
  for (const point of [
    "explain",
    "prepareChannel",
    "askPermission",
    "getToken",
  ] as const) {
    const { state, options } = setup();
    options.enable = true;
    const original = options[point];
    Object.assign(options, {
      [point]: async () => {
        const value = await original();
        state.current = false;
        return value;
      },
    });
    assert.equal(await registerPush(options), undefined, point);
  }
});

void test("provider failure returns an error instead of claiming notifications are enabled", async () => {
  const { state, options } = setup();
  state.granted = true;
  options.getToken = () => Promise.reject(new Error("offline"));
  await assert.rejects(registerPush(options), /offline/);
});
