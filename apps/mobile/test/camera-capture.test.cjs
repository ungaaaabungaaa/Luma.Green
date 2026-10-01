const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  ensureCameraCaptureQuery,
} = require("../plugins/with-camera-capture.cjs");

const captureQuery = {
  intent: [
    {
      action: [{ $: { "android:name": "android.media.action.IMAGE_CAPTURE" } }],
    },
  ],
};

test("Android can discover the delegated camera without requesting the camera permission", () => {
  const result = ensureCameraCaptureQuery({ manifest: {} });
  assert.deepEqual(result.manifest.queries, [captureQuery]);
  assert.equal(result.manifest["uses-permission"], undefined);
});

test("camera query generation is idempotent and preserves unrelated manifest entries", () => {
  const existing = {
    package: [{ $: { "android:name": "green.luma.helper" } }],
  };
  const original = {
    manifest: {
      queries: [existing],
      application: [{ $: { "android:label": "Luma.Green" } }],
    },
  };
  const first = ensureCameraCaptureQuery(original);
  const second = ensureCameraCaptureQuery(first);
  assert.deepEqual(second, first);
  assert.deepEqual(second.manifest.queries, [{ ...existing, ...captureQuery }]);
  assert.deepEqual(original.manifest.queries, [existing]);
  assert.deepEqual(second.manifest.application, original.manifest.application);
});
