const assert = require("node:assert/strict");
const { test } = require("node:test");

const { demoSettings, checkOrigin } = require("../scripts/demo.cjs");

test("simulator demos select the correct host without changing other environment values", () => {
  const ios = demoSettings("ios", { PATH: "/tools" });
  assert.equal(ios.origin, "http://localhost:3004");
  assert.equal(ios.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP, "1");
  assert.equal(ios.env.PATH, "/tools");
  const android = demoSettings("android", {});
  // eslint-disable-next-line sonarjs/no-clear-text-protocols -- test explicitly development-only emulator HTTP
  assert.equal(android.origin, "http://10.0.2.2:3004");
  assert.equal(android.probeUrl, "http://localhost:3004/");
});

test("physical devices require a configured HTTPS origin", () => {
  assert.throws(() => demoSettings("device", {}), /HTTPS/);
  for (const url of [
    "http://localhost:3004",
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- rejected insecure physical-device origin
    "http://192.168.1.2:3004",
    "https://localhost",
  ]) {
    assert.throws(() => demoSettings("device", { EXPO_PUBLIC_APP_URL: url }));
  }
  const settings = demoSettings("device", {
    EXPO_PUBLIC_APP_URL: "https://demo.example.com",
  });
  assert.equal(settings.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP, "0");
});

test("demo commands do not silently override a release profile or accept untrusted origin shapes", () => {
  for (const profile of ["preview", "production"]) {
    assert.throws(() => demoSettings("ios", { EAS_BUILD_PROFILE: profile }));
  }
  assert.throws(() => demoSettings("unknown", {}));
  assert.throws(() =>
    demoSettings("ios", {
      EXPO_PUBLIC_APP_URL: "https://user:secret@example.com",
    }),
  );
});

test("readiness accepts a page or same-origin locale redirect and rejects errors or external redirects", async () => {
  const settings = demoSettings("ios", {});
  await checkOrigin(settings, async () => new Response("Ready"));
  await checkOrigin(
    settings,
    async () =>
      new Response(null, { status: 307, headers: { location: "/en" } }),
  );
  await assert.rejects(
    checkOrigin(settings, async () => new Response(null, { status: 503 })),
    /HTTP 503/,
  );
  await assert.rejects(
    checkOrigin(
      settings,
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://other.example" },
        }),
    ),
    /another origin/,
  );
  await assert.rejects(
    checkOrigin(settings, async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});
