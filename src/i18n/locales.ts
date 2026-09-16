/**
 * Single source of truth for every locale Luma.Green ships.
 *
 * Adding a locale = add it here + add `messages/<code>.json`.
 * The key-parity test in `src/i18n/messages.test.ts` will fail until the
 * message file exists and matches the English key set.
 */

export const locales = [
  "en",
  "hi",
  "bn",
  "mr",
  "ta",
  "te",
  "kn",
  "ml",
  "gu",
  "pa",
  "ur",
  "ar",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export interface LocaleMeta {
  /** Endonym — how speakers write the language name themselves. */
  label: string;
  /** English name, used in admin tooling and logs. */
  english: string;
  dir: "ltr" | "rtl";
  /** BCP-47 tag used for `<html lang>` and hreflang. */
  hreflang: string;
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  en: { label: "English", english: "English", dir: "ltr", hreflang: "en" },
  hi: { label: "हिन्दी", english: "Hindi", dir: "ltr", hreflang: "hi-IN" },
  bn: { label: "বাংলা", english: "Bengali", dir: "ltr", hreflang: "bn-IN" },
  mr: { label: "मराठी", english: "Marathi", dir: "ltr", hreflang: "mr-IN" },
  ta: { label: "தமிழ்", english: "Tamil", dir: "ltr", hreflang: "ta-IN" },
  te: { label: "తెలుగు", english: "Telugu", dir: "ltr", hreflang: "te-IN" },
  kn: { label: "ಕನ್ನಡ", english: "Kannada", dir: "ltr", hreflang: "kn-IN" },
  ml: { label: "മലയാളം", english: "Malayalam", dir: "ltr", hreflang: "ml-IN" },
  gu: { label: "ગુજરાતી", english: "Gujarati", dir: "ltr", hreflang: "gu-IN" },
  pa: { label: "ਪੰਜਾਬੀ", english: "Punjabi", dir: "ltr", hreflang: "pa-IN" },
  ur: { label: "اردو", english: "Urdu", dir: "rtl", hreflang: "ur-IN" },
  ar: { label: "العربية", english: "Arabic", dir: "rtl", hreflang: "ar" },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return localeMeta[locale].dir;
}
