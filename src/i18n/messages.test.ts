import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { defaultLocale, localeMeta, locales } from "./locales";

const messagesDir = join(process.cwd(), "messages");

function load(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), "utf8"));
}

function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? flatKeys(value as Record<string, unknown>, path)
      : [path];
  });
}

const baseline = flatKeys(load(defaultLocale)).sort();

describe("locale registry", () => {
  it("has metadata for every locale", () => {
    for (const locale of locales) {
      expect(localeMeta[locale]).toBeDefined();
      expect(localeMeta[locale].label).not.toHaveLength(0);
    }
  });

  it("ships a message file for every registered locale", () => {
    const onDisk = readdirSync(messagesDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();

    expect(onDisk).toEqual([...locales].sort());
  });
});

describe.each(locales)("messages/%s.json", (locale) => {
  const messages = load(locale);

  it("matches the English key set exactly", () => {
    // Catches both missing translations and keys left behind after a rename.
    expect(flatKeys(messages).sort()).toEqual(baseline);
  });

  it("has no empty or untranslated-looking values", () => {
    for (const key of baseline) {
      const value = key
        .split(".")
        .reduce<unknown>(
          (acc, part) => (acc as Record<string, unknown>)?.[part],
          messages,
        );

      expect(typeof value, `${locale}.${key}`).toBe("string");
      expect((value as string).trim(), `${locale}.${key}`).not.toBe("");
      expect(value as string, `${locale}.${key}`).not.toMatch(/^TODO/i);
    }
  });

  it("keeps the brand name untranslated", () => {
    expect((messages.brand as Record<string, string>).name).toBe("Luma.Green");
  });
});
