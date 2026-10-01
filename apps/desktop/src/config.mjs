import { parseUrl } from "./policy.mjs";

/** @param {string} value @param {boolean} canUseLocal */
export function validateOrigin(value, canUseLocal = false) {
  const url = parseUrl(value);
  const isLocal =
    url?.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !url ||
    (url.protocol !== "https:" && !(canUseLocal && isLocal)) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "DESKTOP_APP_ORIGIN must be an exact HTTPS origin. Explicit unpackaged development may use HTTP localhost.",
    );
  }
  return url.origin;
}

/** @param {string | undefined} value */
export function validateFeed(value) {
  if (!value) return null;
  const url = parseUrl(value);
  if (
    !url ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "DESKTOP_UPDATE_URL must be a public HTTPS directory without credentials, query or fragment.",
    );
  }
  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

/** @param {NodeJS.ProcessEnv} env @param {string} [releasePlatform] */
export function buildConfig(env, releasePlatform) {
  const isRelease = releasePlatform !== undefined;
  const appOrigin = validateOrigin(
    env.DESKTOP_APP_ORIGIN || "https://app.luma.green",
  );
  const updateUrl = validateFeed(env.DESKTOP_UPDATE_URL);
  if (isRelease) {
    if (!["mac", "win"].includes(releasePlatform))
      throw new Error("Release target must be mac or win.");
    if (!updateUrl || !env.DESKTOP_APP_ORIGIN)
      throw new Error(
        "Release requires explicit DESKTOP_APP_ORIGIN and DESKTOP_UPDATE_URL.",
      );
    if (
      releasePlatform === "mac" &&
      (!env.CSC_NAME ||
        !env.APPLE_ID ||
        !env.APPLE_APP_SPECIFIC_PASSWORD ||
        !env.APPLE_TEAM_ID)
    ) {
      throw new Error(
        "macOS release requires CSC_NAME and APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID for signing and notarization.",
      );
    }
    if (
      releasePlatform === "win" &&
      (!env.WIN_CSC_LINK ||
        !env.WIN_CSC_KEY_PASSWORD ||
        !env.DESKTOP_WINDOWS_PUBLISHER)
    ) {
      throw new Error(
        "Windows release requires WIN_CSC_LINK, WIN_CSC_KEY_PASSWORD and DESKTOP_WINDOWS_PUBLISHER.",
      );
    }
  }
  return {
    appOrigin,
    updateUrl,
    release: isRelease,
    releasePlatform: releasePlatform ?? null,
    windowsPublisher: env.DESKTOP_WINDOWS_PUBLISHER || null,
  };
}

/** Runtime overrides cannot change a packaged app's origin.
 * @param {{appOrigin: string}} config @param {boolean} packaged @param {NodeJS.ProcessEnv} env */
export function runtimeOrigin(config, packaged, env) {
  return !packaged && env.DESKTOP_DEV_ORIGIN
    ? validateOrigin(env.DESKTOP_DEV_ORIGIN, true)
    : validateOrigin(config.appOrigin);
}
