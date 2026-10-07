import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, it } from "vitest";
import { z } from "zod";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const fontSchema = z.object({
  familyName: z.string(),
  isCustomFont: z.boolean(),
  glyphCount: z.number(),
});
const reviewRecordSchema = z.object({
  file: z.string(),
  sha256: hash,
  reviewedAt: z.iso.datetime(),
  layoutPassed: z.literal(true),
  noSensitivePixels: z.literal(true),
});
const reviewSchema = z.object({
  method: z.literal("original-png-at-readable-resolution"),
  records: z.array(reviewRecordSchema).length(450),
});
const recordSchema = z.object({
  file: z.string().regex(/^lots-[a-z0-9-]+\.png$/),
  sha256: hash,
  locale: z.enum(["en", "ar", "kn"]),
  theme: z.enum(["light", "dark"]),
  width: z.union([z.literal(390), z.literal(768), z.literal(1440)]),
  scrollWidth: z.number(),
  dir: z.enum(["rtl", "ltr"]),
  dark: z.boolean(),
  clippedControls: z.array(z.string()).length(0),
  glyphFonts: z.array(fontSchema),
});
const manifestSchema = z.object({
  version: z.literal(1),
  complete: z.literal(true),
  sourceHashes: z.record(z.string(), hash),
  records: z.array(recordSchema).length(450),
});

function digest(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function statesForWidth(width: number) {
  return [
    "list",
    "detail",
    "detail-bottom",
    "inspection-top",
    "inspection-bottom",
    "saathi",
    "manufacturer-sell",
    "kabadiwala-buy",
    "manufacturer-selling",
    "kabadiwala-buying",
    "sandbox-unavailable",
    "evidence-history",
    "evidence-form",
    "evidence-correction",
    "facility-list",
    "facility-form",
    "industry-reference",
    "registration-history",
    "registration-correction",
    "controlled-detail",
    "controlled-disposition",
    "stock-intake-history",
    "stock-intake-form",
    ...(width < 1280 ? ["menu"] : []),
    ...(width === 390
      ? ["declare", "transform", "transform-bottom", "dispatch"]
      : []),
  ];
}

function checkMatrixNames(names: Set<string>) {
  for (const locale of ["en", "ar", "kn"])
    for (const theme of ["light", "dark"])
      for (const width of [390, 768, 1440]) {
        const states = statesForWidth(width);
        for (const state of states)
          expect(
            names.has(`lots-${locale}-${theme}-${String(width)}-${state}.png`),
          ).toBe(true);
      }
}

it("keeps the complete local lots, Saathi, business and payment capture matrix current", () => {
  const source: unknown = JSON.parse(
    readFileSync("docs/user-guide/lots-captures.json", "utf8"),
  );
  const manifest = manifestSchema.parse(source);
  const names = new Set(manifest.records.map((record) => record.file));
  expect(names.size).toBe(450);
  for (const [path, expected] of Object.entries(manifest.sourceHashes)) {
    expect(path).toMatch(/^(src|convex|messages|scripts)\//);
    expect(path).not.toContain("..");
    expect(digest(path), path).toBe(expected);
  }
  checkMatrixNames(names);
  for (const record of manifest.records) {
    expect(
      digest(`docs/user-guide/screenshots/${record.file}`),
      record.file,
    ).toBe(record.sha256);
    expect(record.scrollWidth).toBeLessThanOrEqual(record.width + 1);
    expect(record.dir).toBe(record.locale === "ar" ? "rtl" : "ltr");
    expect(record.dark).toBe(record.theme === "dark");
    const required = {
      en: record.file.endsWith("-menu.png") ? "Noto Sans" : "Geist",
      ar: "Noto Sans Arabic",
      kn: "Noto Sans Kannada",
    }[record.locale];
    expect(
      record.glyphFonts.some(
        (font) =>
          font.isCustomFont &&
          font.familyName === required &&
          font.glyphCount > 0,
      ),
    ).toBe(true);
  }
});

it("records visual review of every original capture at readable resolution", () => {
  const manifest = manifestSchema.parse(
    JSON.parse(
      readFileSync("docs/user-guide/lots-captures.json", "utf8"),
    ) as unknown,
  );
  const reviewSource: unknown = JSON.parse(
    readFileSync("docs/user-guide/lots-visual-review.json", "utf8"),
  );
  const review = reviewSchema.parse(reviewSource);
  expect(new Set(review.records.map((record) => record.file)).size).toBe(450);
  for (const record of manifest.records)
    expect(
      review.records.find((entry) => entry.file === record.file)?.sha256,
    ).toBe(record.sha256);
});
