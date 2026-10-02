import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { CATALOGUE } from "../convex/lib/catalogue";
import { defaultLocale, localeMeta, locales } from "../src/i18n/locales";
import {
  flattenMessages,
  hasSameMessageContract,
  hasUntranslatedCopy,
} from "../src/i18n/message-validation";

const englishSource = await readFile("messages/en.json", "utf8");
const english = flattenMessages(
  JSON.parse(englishSource) as Record<string, unknown>,
);
const expected = Object.keys(english);
const reports = await Promise.all(
  locales.map(async (locale) => {
    const source = await readFile(`messages/${locale}.json`, "utf8");
    const messages = flattenMessages(
      JSON.parse(source) as Record<string, unknown>,
    );
    const keys = Object.keys(messages);
    const missing = expected.filter((key) => !Object.hasOwn(messages, key));
    const extra = keys.filter((key) => !Object.hasOwn(english, key));
    const invalidContracts: string[] = [];
    const untranslated: string[] = [];
    const blank: string[] = [];
    for (const key of expected) {
      const value = messages[key];
      const original = english[key];
      if (typeof value !== "string" || !value.trim()) {
        blank.push(key);
        continue;
      }
      if (typeof original !== "string")
        throw new Error(`Invalid source ${key}`);
      try {
        if (!hasSameMessageContract(original, value))
          invalidContracts.push(key);
        if (
          locale !== defaultLocale &&
          hasUntranslatedCopy(original, value, locale)
        )
          untranslated.push(key);
      } catch {
        invalidContracts.push(key);
      }
    }
    const missingMaterials = CATALOGUE.filter(
      (item) =>
        !Object.hasOwn(item.names, locale) || !item.names[locale].trim(),
    ).map((item) => item.code);
    return {
      locale,
      language: localeMeta[locale].english,
      direction: localeMeta[locale].dir,
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      messages: keys.length,
      expectedMessages: expected.length,
      nativeControls: keys.filter((key) => key.startsWith("native.")).length,
      materials: CATALOGUE.length - missingMaterials.length,
      expectedMaterials: CATALOGUE.length,
      missing,
      extra,
      blank,
      invalidContracts,
      untranslated,
      missingMaterials,
      linguisticReview:
        locale === defaultLocale ? "source" : "native-review-pending",
    };
  }),
);

const failures = reports.filter((report) =>
  [
    report.missing,
    report.extra,
    report.blank,
    report.invalidContracts,
    report.untranslated,
    report.missingMaterials,
  ].some((items) => items.length > 0),
);
const report = {
  sourceSha256: createHash("sha256").update(englishSource).digest("hex"),
  localeCount: locales.length,
  messageCountPerLocale: expected.length,
  result: failures.length === 0 ? "mechanical-checks-pass" : "issues-found",
  scope:
    "All message keys, ICU contracts, copied English, native shell strings and catalogue names. Admin remains English by project policy. Mechanical checks do not establish linguistic accuracy.",
  locales: reports,
};
await mkdir("docs/i18n", { recursive: true });
await writeFile(
  "docs/i18n/coverage.json",
  `${JSON.stringify(report, null, 2)}\n`,
);
process.stdout.write(
  `${String(locales.length)} locales; ${String(expected.length)} messages each; ${String(failures.length)} locales with coverage issues.\n`,
);
if (failures.length > 0) process.exitCode = 1;
