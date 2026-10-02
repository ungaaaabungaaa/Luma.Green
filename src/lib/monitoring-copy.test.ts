import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

import { locales } from "@/i18n/locales";

import { monitoringErrorCopy } from "./monitoring-copy";
import catalogues from "./monitoring-messages.json";

it("keeps every error-screen translation in sync with the editable catalogue", () => {
  expect(
    Object.keys(catalogues).toSorted((a, b) => a.localeCompare(b)),
  ).toEqual([...locales].toSorted((a, b) => a.localeCompare(b)));
  for (const locale of locales) {
    const source = JSON.parse(
      readFileSync(`messages/${locale}.json`, "utf8"),
    ) as {
      common: { error: string; retry: string };
    };
    expect(monitoringErrorCopy(`/${locale}/app`)).toEqual({
      locale,
      error: source.common.error,
      retry: source.common.retry,
    });
    expect(
      Object.keys(catalogues[locale]).toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(["error", "retry"]);
  }
});
