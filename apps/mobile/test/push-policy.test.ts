import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  notificationDestination,
  parsePushRequest,
  pushResultScript,
  pushSignalScript,
  runtimePushProject,
} from "../src/push-policy.ts";

function runTrustedScript(script: string, context: object) {
  // eslint-disable-next-line sonarjs/code-eval -- Executes only our script builder output in an isolated test context to prove escaping and origin checks.
  vm.runInNewContext(script, context);
}

const origin = "https://app.luma.green";
const url = `${origin}/ar/account/notifications`;
const raw = JSON.stringify({
  type: "luma.push.enable",
  requestId: "request_1",
});

void test("only the exact trusted document can request the narrow push bridge", () => {
  assert.deepEqual(parsePushRequest(raw, url, url, origin), {
    type: "luma.push.enable",
    requestId: "request_1",
  });
  for (const frame of [
    "https://evil.test",
    `${origin}.evil.test/`,
    `${origin}/iframe`,
    `${origin}/admin`,
  ])
    assert.equal(parsePushRequest(raw, frame, url, origin), null);
  for (const invalid of [
    "not json",
    "[]",
    "null",
    raw.replace("enable", "open"),
    raw.replace("request_1", ""),
    raw.replace("request_1", "x".repeat(65)),
    JSON.stringify({
      type: "luma.push.enable",
      requestId: "id",
      userId: "other",
    }),
  ])
    assert.equal(parsePushRequest(invalid, url, url, origin), null);
});

void test("native push requires both opt-in build config and valid project ID", () => {
  const eas = { projectId: "ccdb8912-bbf5-4ef5-8e87-a0df35c929e1" };
  assert.equal(runtimePushProject({ pushEnabled: true, eas }), eas.projectId);
  for (const extra of [
    undefined,
    {},
    { eas },
    { pushEnabled: false, eas },
    { pushEnabled: true, eas: { projectId: "placeholder" } },
  ])
    assert.equal(runtimePushProject(extra), undefined);
});

void test("push replies cannot leak a token after navigation or into a child frame", () => {
  const received: unknown[] = [];
  const window = { top: null as unknown, location: { href: url } };
  window.top = window;
  const context = {
    window,
    document: {
      dispatchEvent: (event: unknown) => {
        received.push(event);
      },
    },
    CustomEvent: class {
      name: string;
      value: unknown;
      constructor(name: string, value: unknown) {
        this.name = name;
        this.value = value;
      }
    },
  };
  const script = pushResultScript(url, {
    requestId: "id",
    status: "granted",
    token: 'ExponentPushToken[quote";bad()]',
  });
  runTrustedScript(script, context);
  assert.equal(received.length, 1);
  window.location.href = `${origin}/login`;
  runTrustedScript(script, context);
  assert.equal(received.length, 1);
  window.location.href = url;
  window.top = {};
  runTrustedScript(script, context);
  assert.equal(received.length, 1);
});

void test("notification taps always open the locale-aware protected inbox", () => {
  assert.equal(
    notificationDestination(origin, "en"),
    `${origin}/account/notifications`,
  );
  assert.equal(notificationDestination(origin, "ar"), url);
  assert.match(pushSignalScript(url, "changed"), /luma-push-changed/);
});
