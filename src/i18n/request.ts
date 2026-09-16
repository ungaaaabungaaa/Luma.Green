import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

type Messages = Record<string, unknown>;

/**
 * Deep-merge a locale's messages over English so a missing translation falls
 * back to English instead of rendering a raw key.
 */
function mergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];
    const bothObjects =
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof existing === "object" &&
      existing !== null &&
      !Array.isArray(existing);

    result[key] = bothObjects
      ? mergeMessages(existing as Messages, value as Messages)
      : value;
  }

  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const fallback = (await import("../../messages/en.json")).default as Messages;
  const messages =
    locale === routing.defaultLocale
      ? fallback
      : mergeMessages(
          fallback,
          (await import(`../../messages/${locale}.json`)).default as Messages,
        );

  return {
    locale,
    messages,
    // Every server-rendered timestamp resolves against the same clock as the
    // client, so relative times never hydrate-mismatch.
    now: new Date(),
    timeZone: "Asia/Kolkata",
  };
});
