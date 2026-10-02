import { createTranslator } from "next-intl";

import type englishMessages from "../../messages/en.json";
import { locale, messages } from "./locale";

/** Resolve the actual async household layout's translations without a Next server. */
export function getTranslations(namespace: keyof typeof englishMessages) {
  return Promise.resolve(createTranslator({ locale, messages, namespace }));
}
