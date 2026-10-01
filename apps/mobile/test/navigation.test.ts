import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyNavigation,
  localeFromLanguage,
  localeFromUrl,
} from "../src/navigation.ts";
import { recoveryPlan } from "../src/recovery.ts";
import { runtimeOrigin } from "../src/runtime-config.ts";
import {
  canCheckUpdate,
  canRestartUpdate,
  type UpdateState,
} from "../src/update-policy.ts";

const origin = "https://app.luma.green";

void test("auth, all locales and normal app routes keep the web-view session", () => {
  for (const path of [
    "/en/sell",
    "/ar/login",
    "/ur/join/status",
    "/api/auth/phone-number/verify",
  ]) {
    assert.equal(classifyNavigation(`${origin}${path}`, origin), "internal");
  }
});

void test("admin routes need explicit browser handoff, including encoded and repeated separators", () => {
  for (const path of [
    "/admin",
    "/admin/login",
    "/admin/applications/123",
    "/%61dmin/login",
    "//admin/login",
    "/admin%2fapplications",
  ]) {
    assert.equal(classifyNavigation(`${origin}${path}`, origin), "browser");
  }
  assert.equal(
    classifyNavigation(`${origin}/administrator`, origin),
    "internal",
  );
});

void test("lookalike origins never enter the trusted view", () => {
  for (const url of [
    "https://app.luma.green.evil.example/en",
    "https://evil.example/?next=https://app.luma.green",
    "https://app.luma.green:8443",
  ]) {
    assert.equal(classifyNavigation(url, origin), "external");
  }
  assert.equal(
    classifyNavigation("https://app.luma.green@evil.example", origin),
    "blocked",
  );
});

void test("unsafe schemes and private blob URLs cannot escape to another app", () => {
  for (const url of [
    "file:///tmp/private.pdf",
    `blob:${origin}/document`,
    "javascript:alert(1)",
    "data:text/html,hello",
    "intent://open#Intent",
    // eslint-disable-next-line unicorn/prefer-https -- intentionally insecure URL verifies rejection
    "http://evil.example",
    "//evil.example",
    "bad",
  ]) {
    assert.equal(classifyNavigation(url, origin), "blocked");
  }
  assert.equal(classifyNavigation("tel:+919876543210", origin), "external");
  assert.equal(
    classifyNavigation("mailto:help@luma.green", origin),
    "external",
  );
});

void test("device language and later locale navigation retain RTL language choices", () => {
  assert.equal(localeFromLanguage("ar-SA"), "ar");
  assert.equal(localeFromLanguage("ur_IN"), "ur");
  assert.equal(localeFromLanguage("kn-IN"), "kn");
  assert.equal(localeFromLanguage("fr-FR"), "en");
  assert.equal(localeFromUrl(`${origin}/ar/sell`, "kn"), "ar");
  assert.equal(localeFromUrl(`${origin}/sell`, "ar"), "en");
  assert.equal(localeFromUrl(`${origin}/`, "ar"), "en");
  assert.equal(localeFromUrl("invalid", "ur"), "ur");
});

void test("a release runtime cannot enable a development origin from extra config", () => {
  const local = { appOrigin: "http://localhost:3000", allowLocalHttp: true };
  assert.throws(() => runtimeOrigin(local, false));
  assert.equal(runtimeOrigin(local, true), "http://localhost:3000");
  assert.equal(runtimeOrigin(undefined, false), origin);
});

void test("update checks require a configured release runtime and are not repeated while downloading", () => {
  assert.equal(canCheckUpdate(false, false, "idle"), false);
  assert.equal(canCheckUpdate(true, true, "idle"), false);
  assert.equal(canCheckUpdate(true, false, "checking"), false);
  assert.equal(canCheckUpdate(true, false, "ready"), false);
  assert.equal(canCheckUpdate(true, false, "failed"), true);
});

void test("only a downloaded update and an explicit restart request can replace the running shell", () => {
  const states: UpdateState[] = [
    "idle",
    "unavailable",
    "checking",
    "current",
    "failed",
    "ready",
  ];
  for (const state of states)
    assert.equal(canRestartUpdate(state, false), false);
  for (const state of states) {
    if (state !== "ready") assert.equal(canRestartUpdate(state, true), false);
  }
  assert.equal(canRestartUpdate("ready", true), true);
});

void test("OS handlers reject malformed, encoded control and service-code payloads", () => {
  for (const value of [
    "mailto:bad",
    "mailto:a@example.com%0d%0aBcc:b@example.com",
    "mailto:a@example.com?bcc=b@example.com",
    "tel:hello",
    "tel:+123?call=1",
    "tel:*123%23",
    "tel:....",
    "tel:+123%0a456",
    "https://outside.example/%0d%0a",
    "https://outside.example/\npath",
  ]) {
    assert.equal(classifyNavigation(value, origin), "blocked", value);
  }
});

void test("renderer recovery remounts at the last trusted page, while a network error can reload", () => {
  const url = `${origin}/ur/sell`;
  assert.deepEqual(recoveryPlan(true, url, origin, "ur"), {
    action: "remount",
    uri: url,
  });
  assert.deepEqual(recoveryPlan(false, url, origin, "ur"), {
    action: "reload",
    uri: url,
  });
  assert.deepEqual(recoveryPlan(true, "https://evil.example", origin, "ar"), {
    action: "remount",
    uri: `${origin}/ar`,
  });
  assert.deepEqual(recoveryPlan(true, `${origin}/admin`, origin, "en"), {
    action: "remount",
    uri: `${origin}/en`,
  });
});
