import { isLocale, type Locale } from "@/i18n/locales";

import catalogues from "./monitoring-messages.json";

export function monitoringErrorCopy(pathname: string) {
  const segment = pathname.split("/", 2)[1] ?? "en";
  const locale: Locale = isLocale(segment) ? segment : "en";
  return { locale, ...catalogues[locale] };
}
