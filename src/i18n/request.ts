import { locale as rootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

type Messages = Record<string, unknown>;

interface MessageModule {
  default: Messages;
}

/**
 * Deep-merge a locale's messages over English so a missing translation falls
 * back to English instead of rendering a raw key.
 */
function mergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];
    const isBothObjects =
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof existing === "object" &&
      existing !== null &&
      !Array.isArray(existing);

    result[key] = isBothObjects
      ? mergeMessages(existing as Messages, value as Messages)
      : value;
  }

  return result;
}

async function loadMessages(locale: string): Promise<Messages> {
  const module_ = (await import(
    `../../messages/${locale}.json`
  )) as MessageModule;
  return module_.default;
}

export default getRequestConfig(async () => {
  // The locale comes from the `[locale]` root segment (Next 16 root params),
  // which is what lets every locale stay statically rendered.
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const fallback = await loadMessages(routing.defaultLocale);
  const messages =
    locale === routing.defaultLocale
      ? fallback
      : mergeMessages(fallback, await loadMessages(locale));

  return {
    locale,
    messages,
    // Every server-rendered timestamp resolves against the same clock as the
    // client, so relative times never hydrate-mismatch.
    now: new Date(),
    timeZone: "Asia/Kolkata",
  };
});
