import type { Locale } from "../../../src/i18n/locales.ts";
import { classifyNavigation } from "./navigation.ts";

/** Android cannot reload a WebView after its renderer process has exited. */
export function recoveryPlan(
  hasRendererCrashed: boolean,
  currentUrl: string,
  origin: string,
  locale: Locale,
) {
  const isCurrentTrusted =
    classifyNavigation(currentUrl, origin) === "internal";
  return {
    action:
      hasRendererCrashed || !isCurrentTrusted
        ? ("remount" as const)
        : ("reload" as const),
    uri: isCurrentTrusted ? currentUrl : `${origin}/${locale}`,
  };
}
