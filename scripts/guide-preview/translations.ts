import { createTranslator } from "next-intl";

import messages from "../../messages/en.json";

/** Resolve the actual async household layout's translations without a Next server. */
export function getTranslations(namespace: keyof typeof messages) {
  return Promise.resolve(
    createTranslator({ locale: "en", messages, namespace }),
  );
}
