import { isLocale } from "@/i18n/locales";

import type englishMessages from "../../messages/en.json";

const segment = window.location.pathname.split("/", 3)[1] ?? "en";
export const locale = isLocale(segment) ? segment : "en";
const module_ = (await import(`../../messages/${locale}.json`)) as {
  default: typeof englishMessages;
};
export const messages = module_.default;
