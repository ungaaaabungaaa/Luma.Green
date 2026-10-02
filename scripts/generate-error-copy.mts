import { readFile, writeFile } from "node:fs/promises";

import { locales } from "../src/i18n/locales";

// The root error boundary has no translation provider. Ship only its two
// controls, derived from the editable catalogues, instead of every page string.
const entries = await Promise.all(
  locales.map(async (locale) => {
    const source = JSON.parse(
      await readFile(`messages/${locale}.json`, "utf8"),
    ) as {
      common?: { error?: unknown; retry?: unknown };
    };
    const error = source.common?.error;
    const retry = source.common?.retry;
    if (typeof error !== "string" || typeof retry !== "string") {
      throw new TypeError(`Missing error controls for ${locale}`);
    }
    return [locale, { error, retry }];
  }),
);
await writeFile(
  "src/lib/monitoring-messages.json",
  `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`,
);
