/** @param {string} value */
export function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** @param {string} value @param {string} origin */
export function isAppUrl(value, origin) {
  const url = parseUrl(value);
  return (
    url !== null &&
    ["https:", "http:"].includes(url.protocol) &&
    url.origin === origin &&
    !url.username &&
    !url.password
  );
}

/** Blobs inherit their creator's origin. Never pass them to the OS browser.
 * @param {string} value @param {string} origin */
export function isAppBlob(value, origin) {
  const url = parseUrl(value);
  return url?.protocol === "blob:" && url.origin === origin;
}

/** @param {string} value */
export function isExternalUrl(value) {
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  if (/[\u{0}-\u{1F}\u{7F}]/u.test(decoded)) return false;
  const url = parseUrl(value);
  if (!url || url.username || url.password) return false;
  if (url.protocol === "https:") return Boolean(url.hostname);
  if (url.search || url.hash || url.hostname) return false;
  const path = decodeURIComponent(url.pathname);
  return url.protocol === "mailto:"
    ? /^[^\s?@]+@[^\s?@]+$/u.test(path)
    : url.protocol === "tel:" &&
        /^\+?[\d(). -]+$/u.test(path) &&
        /\d/u.test(path);
}

/** @param {string} permission @param {string} frameUrl @param {string} topUrl @param {string} origin */
export function mayRequestLocation(permission, frameUrl, topUrl, origin) {
  return (
    permission === "geolocation" &&
    isAppUrl(frameUrl, origin) &&
    isAppUrl(topUrl, origin)
  );
}

/** @param {string} url @param {string} ownerUrl @param {string} origin */
export function mayDownload(url, ownerUrl, origin) {
  return (
    (isAppUrl(ownerUrl, origin) || isAppBlob(ownerUrl, origin)) &&
    (isAppUrl(url, origin) || isAppBlob(url, origin))
  );
}

export const secureWebPreferences = Object.freeze({
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  safeDialogs: true,
});

/** Electron's built-in PDF viewer is an internal Chromium extension. This is
 * permitted only as a child frame inside a trusted blob document window.
 * @param {string} value @param {string} topUrl @param {string} origin */
export function isPdfViewerFrame(value, topUrl, origin) {
  const url = parseUrl(value);
  return (
    isAppBlob(topUrl, origin) &&
    url?.protocol === "chrome-extension:" &&
    url.hostname === "mhjfbmdgcfjbbpaeojofohoefgiehjai" &&
    !url.username &&
    !url.password
  );
}
