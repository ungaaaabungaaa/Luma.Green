const { withAndroidManifest } = require("expo/config-plugins");

const IMAGE_CAPTURE = "android.media.action.IMAGE_CAPTURE";

/** Declare visibility of the system camera app; this grants no camera permission. */
function ensureCameraCaptureQuery(androidManifest) {
  const queries = [...(androidManifest.manifest.queries ?? [])];
  const hasCaptureQuery = queries.some((query) =>
    query.intent?.some((intent) =>
      intent.action?.some(
        (action) => action.$?.["android:name"] === IMAGE_CAPTURE,
      ),
    ),
  );
  if (!hasCaptureQuery) {
    const firstQuery = queries[0] ?? {};
    queries[0] = {
      ...firstQuery,
      intent: [
        ...(firstQuery.intent ?? []),
        { action: [{ $: { "android:name": IMAGE_CAPTURE } }] },
      ],
    };
  }
  return {
    ...androidManifest,
    manifest: { ...androidManifest.manifest, queries },
  };
}

function withCameraCapture(config) {
  return withAndroidManifest(config, (mod) => ({
    ...mod,
    modResults: ensureCameraCaptureQuery(mod.modResults),
  }));
}

module.exports = withCameraCapture;
module.exports.ensureCameraCaptureQuery = ensureCameraCaptureQuery;
