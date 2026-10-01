import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConfig,
  runtimeOrigin,
  validateFeed,
  validateOrigin,
} from "./config.mjs";

test("empty environment is runnable without secrets or updater calls", () => {
  const config = buildConfig({});
  assert.equal(config.appOrigin, "https://app.luma.green");
  assert.equal(config.updateUrl, null);
  assert.equal(config.release, false);
});
test("release origin must be HTTPS and contain no paths, tokens or credentials", () => {
  for (const value of [
    // eslint-disable-next-line sonarjs/no-clear-text-protocols, unicorn/prefer-https -- Negative fixture proves insecure origins are rejected.
    "http://app.luma.green",
    "https://app.luma.green/path",
    "https://user:pass@app.luma.green",
    "https://app.luma.green?token=x",
    "https://app.luma.green#x",
    "bad",
  ])
    assert.throws(() => validateOrigin(value));
});
test("localhost HTTP is explicit, unpackaged and cannot replace packaged configuration", () => {
  assert.throws(() => validateOrigin("http://localhost:3000"));
  assert.equal(
    runtimeOrigin({ appOrigin: "https://app.luma.green" }, false, {
      DESKTOP_DEV_ORIGIN: "http://localhost:3000",
    }),
    "http://localhost:3000",
  );
  assert.equal(
    runtimeOrigin({ appOrigin: "https://app.luma.green" }, true, {
      DESKTOP_DEV_ORIGIN: "http://localhost:3000",
    }),
    "https://app.luma.green",
  );
  assert.throws(() =>
    runtimeOrigin({ appOrigin: "https://app.luma.green" }, false, {
      // eslint-disable-next-line unicorn/prefer-https -- Negative fixture proves insecure URLs are rejected.
      DESKTOP_DEV_ORIGIN: "http://evil.test",
    }),
  );
});
test("updater feed accepts public HTTPS directory only", () => {
  assert.equal(
    validateFeed("https://downloads.example.com/stable"),
    "https://downloads.example.com/stable/",
  );
  for (const value of [
    // eslint-disable-next-line unicorn/prefer-https -- Negative fixture proves insecure URLs are rejected.
    "http://example.com",
    "https://token@example.com",
    "https://example.com?key=x",
    "file:///tmp/feed",
    "https://example.com/#fragment",
  ])
    assert.throws(() => validateFeed(value));
});
test("release rejects missing origin, feed, signing and notarization inputs", () => {
  assert.throws(() => buildConfig({}, "mac"), /explicit/);
  const base = {
    DESKTOP_APP_ORIGIN: "https://app.luma.green",
    DESKTOP_UPDATE_URL: "https://downloads.example.com/mac",
  };
  assert.throws(() => buildConfig(base, "mac"), /CSC_NAME/);
  assert.throws(() => buildConfig(base, "win"), /WIN_CSC_LINK/);
  assert.throws(() => buildConfig(base, "linux"), /target/);
  assert.equal(
    buildConfig(
      {
        ...base,
        CSC_NAME: "test identity",
        APPLE_ID: "test",
        APPLE_APP_SPECIFIC_PASSWORD: "test",
        APPLE_TEAM_ID: "test",
      },
      "mac",
    ).release,
    true,
  );
  assert.equal(
    buildConfig(
      {
        ...base,
        WIN_CSC_LINK: "external certificate",
        WIN_CSC_KEY_PASSWORD: "test",
        DESKTOP_WINDOWS_PUBLISHER: "Luma.Green",
      },
      "win",
    ).release,
    true,
  );
});
