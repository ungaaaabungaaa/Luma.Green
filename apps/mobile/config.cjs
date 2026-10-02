const { X509Certificate } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const { appOrigin } = require("./origin.cjs");

function resolveSettings(env, directory = __dirname) {
  const isDevelopment =
    env.EAS_BUILD_PROFILE === "development" ||
    (!env.EAS_BUILD_PROFILE && env.NODE_ENV !== "production");
  const isAllowLocalHttp =
    isDevelopment && env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === "1";
  const origin = appOrigin(env.EXPO_PUBLIC_APP_URL, isAllowLocalHttp);
  const projectId = env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (
    projectId &&
    !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      projectId,
    )
  ) {
    throw new Error("EXPO_PUBLIC_EAS_PROJECT_ID must be a valid UUID.");
  }
  const signing = resolveSigning(env, directory, projectId);
  if (![undefined, "", "true", "false"].includes(env.EXPO_PUBLIC_PUSH_ENABLED))
    throw new Error("EXPO_PUBLIC_PUSH_ENABLED must be true or false.");
  const isPushEnabled = env.EXPO_PUBLIC_PUSH_ENABLED === "true";
  if (isPushEnabled && !projectId)
    throw new Error("Mobile push requires EXPO_PUBLIC_EAS_PROJECT_ID.");
  return {
    origin,
    allowLocalHttp: isAllowLocalHttp,
    projectId,
    signing,
    pushEnabled: isPushEnabled,
    googleServicesFile: resolveGoogleServices(env, directory),
  };
}

function resolveGoogleServices(env, directory) {
  const filename = env.LUMA_ANDROID_GOOGLE_SERVICES_FILE;
  if (!filename) return;
  const filepath = path.resolve(directory, filename);
  const config = JSON.parse(readFileSync(filepath, "utf8"));
  if (config?.private_key || config?.type === "service_account")
    throw new Error(
      "Use the public google-services.json, never a service-account key.",
    );
  if (
    !Array.isArray(config?.client) ||
    config.client.every(
      (client) =>
        client?.client_info?.android_client_info?.package_name !==
        "green.luma.app",
    )
  )
    throw new Error(
      "Firebase client must match the green.luma.app Android package.",
    );
  return filepath;
}

function resolveSigning(env, directory, projectId) {
  const isProduction =
    env.EAS_BUILD_PROFILE === "production" ||
    (env.NODE_ENV === "production" &&
      !["development", "preview"].includes(env.EAS_BUILD_PROFILE));
  if (
    projectId &&
    isProduction &&
    (!env.EXPO_PUBLIC_APP_URL ||
      !env.LUMA_UPDATE_CERTIFICATE ||
      !env.LUMA_UPDATE_KEY_ID)
  ) {
    throw new Error(
      "Production OTA requires an explicit app origin, update signing certificate and key ID.",
    );
  }
  const certificatePath = env.LUMA_UPDATE_CERTIFICATE;
  const keyid = env.LUMA_UPDATE_KEY_ID;
  if (Boolean(certificatePath) !== Boolean(keyid)) {
    throw new Error(
      "Update signing needs both LUMA_UPDATE_CERTIFICATE and LUMA_UPDATE_KEY_ID.",
    );
  }
  if (!certificatePath || !keyid) return;
  if (!projectId) throw new Error("Update signing requires an EAS project ID.");
  if (!/^[\w.-]{1,100}$/.test(keyid))
    throw new Error("Invalid update signing key ID.");
  const certificateFile = path.resolve(directory, certificatePath);
  const pem = readFileSync(certificateFile, "utf8");
  if (pem.includes("PRIVATE KEY"))
    throw new Error(
      "The update certificate file must not contain a private key.",
    );
  const certificate = new X509Certificate(pem);
  if (certificate.publicKey.asymmetricKeyType !== "rsa") {
    throw new Error("Expo update signing requires an RSA certificate.");
  }
  if (
    Date.parse(certificate.validFrom) > Date.now() ||
    Date.parse(certificate.validTo) <= Date.now()
  ) {
    throw new Error("Update signing certificate is not currently valid.");
  }
  return {
    codeSigningCertificate: certificateFile,
    codeSigningMetadata: { keyid, alg: "rsa-v1_5-sha256" },
  };
}

module.exports = { resolveSettings };
