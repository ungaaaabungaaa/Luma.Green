import {
  type AbstractIntlMessages,
  createFormatter,
  createTranslator,
} from "next-intl";

import messages from "../../../messages/en.json";

/**
 * Stand-ins for `next-intl/server` so async server components can render in
 * a unit test: English messages, India time. Use as
 * `vi.mock("next-intl/server", () => import("@/components/site/intl-server.testing"))`.
 */
const english: AbstractIntlMessages = messages;

export function getTranslations(namespace?: string) {
  return Promise.resolve(
    createTranslator({ locale: "en", messages: english, namespace }),
  );
}

export function getFormatter() {
  return Promise.resolve(
    createFormatter({ locale: "en", timeZone: "Asia/Kolkata" }),
  );
}
