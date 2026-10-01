import {
  defaultLocale,
  isLocale,
  type Locale,
} from "../../../src/i18n/locales.ts";

export type NavigationDecision =
  "internal" | "browser" | "external" | "blocked";

/** Only an exact app origin owns the authenticated web view. */
export function classifyNavigation(
  value: string,
  origin: string,
): NavigationDecision {
  let url: URL;
  try {
    const decoded = decodeURIComponent(value);
    if (/[\u{0}-\u{1F}\u{7F}]/u.test(decoded)) return "blocked";
    url = new URL(value);
  } catch {
    return "blocked";
  }
  if (url.username || url.password) return "blocked";
  if (["https:", "http:"].includes(url.protocol) && url.origin === origin) {
    let path: string;
    try {
      path = decodeURIComponent(url.pathname).replaceAll("\\", "/");
    } catch {
      return "blocked";
    }
    return /^\/+admin(?:\/|$)/i.test(path) ? "browser" : "internal";
  }
  if (url.protocol === "https:") return "external";
  if (url.search || url.hash || url.host) return "blocked";
  const payload = decodeURIComponent(url.pathname);
  if (url.protocol === "mailto:" && /^[^\s?@]+@[^\s?@]+$/u.test(payload))
    return "external";
  return url.protocol === "tel:" &&
    /^\+?[\d(). -]+$/u.test(payload) &&
    /\d/u.test(payload)
    ? "external"
    : "blocked";
}

export function localeFromLanguage(
  language: string | null | undefined,
): Locale {
  const base = language?.split(/[-_]/, 1)[0]?.toLowerCase();
  return base && isLocale(base) ? base : defaultLocale;
}

export function localeFromUrl(value: string, current: Locale): Locale {
  try {
    const segment = new URL(value).pathname.split("/", 2)[1];
    // The shared Next router omits the English prefix (localePrefix: as-needed).
    return segment && isLocale(segment) ? segment : defaultLocale;
  } catch {
    return current;
  }
}
