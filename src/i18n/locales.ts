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
  "as",
  "ne",
  "es",
  "fr",
  "vi",
  "si",
  "th",
  "ru",
  "de",
  "or",
  "ja",
  "uk",
  "ko",
  "it",
  "pl",
  "tr",
  "zh",
  "pt",
  "id",
  "nl",
  "ms",
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
  as: { label: "অসমীয়া", english: "Assamese", dir: "ltr", hreflang: "as-IN" },
  ne: { label: "नेपाली", english: "Nepali", dir: "ltr", hreflang: "ne" },
  es: { label: "Español", english: "Spanish", dir: "ltr", hreflang: "es" },
  fr: { label: "Français", english: "French", dir: "ltr", hreflang: "fr" },
  vi: {
    label: "Tiếng Việt",
    english: "Vietnamese",
    dir: "ltr",
    hreflang: "vi",
  },
  si: { label: "සිංහල", english: "Sinhala", dir: "ltr", hreflang: "si" },
  th: { label: "ไทย", english: "Thai", dir: "ltr", hreflang: "th" },
  ru: { label: "Русский", english: "Russian", dir: "ltr", hreflang: "ru" },
  de: { label: "Deutsch", english: "German", dir: "ltr", hreflang: "de" },
  or: { label: "ଓଡ଼ିଆ", english: "Odia", dir: "ltr", hreflang: "or-IN" },
  ja: { label: "日本語", english: "Japanese", dir: "ltr", hreflang: "ja" },
  uk: { label: "Українська", english: "Ukrainian", dir: "ltr", hreflang: "uk" },
  ko: { label: "한국어", english: "Korean", dir: "ltr", hreflang: "ko" },
  it: { label: "Italiano", english: "Italian", dir: "ltr", hreflang: "it" },
  pl: { label: "Polski", english: "Polish", dir: "ltr", hreflang: "pl" },
  tr: { label: "Türkçe", english: "Turkish", dir: "ltr", hreflang: "tr" },
  zh: {
    label: "简体中文",
    english: "Simplified Chinese",
    dir: "ltr",
    hreflang: "zh-Hans",
  },
  pt: { label: "Português", english: "Portuguese", dir: "ltr", hreflang: "pt" },
  id: {
    label: "Bahasa Indonesia",
    english: "Indonesian",
    dir: "ltr",
    hreflang: "id",
  },
  nl: { label: "Nederlands", english: "Dutch", dir: "ltr", hreflang: "nl" },
  ms: { label: "Bahasa Melayu", english: "Malay", dir: "ltr", hreflang: "ms" },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return localeMeta[locale].dir;
}
