import { locales } from "@/i18n/locales";

/**
 * The material-code list as a CSV file anyone can open in a spreadsheet.
 * Built in the browser from the live catalogue — nothing to host or keep in
 * sync.
 */

export interface CodeRow {
  code: string;
  family: string;
  stage: string;
  names: Record<string, string>;
}

/** Excel reads UTF-8 only with a byte-order mark; without it Hindi breaks. */
export const CSV_BOM = String.fromCodePoint(0xfe_ff);

export const CSV_FILENAME = "luma-green-material-codes.csv";

/**
 * One RFC 4180 cell. A leading `= + - @` (or tab/CR) is prefixed with `'` so a
 * spreadsheet never runs a cell as a formula (OWASP "CSV injection").
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return (
    rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n") +
    "\r\n"
  );
}

/**
 * Code, family and stage, then a name column per language the catalogue
 * has — English first, then the site's locale order. Headers stay English
 * and stable: this is data for machines as much as people.
 */
export function materialCodesCsv(materials: readonly CodeRow[]): string {
  const languages = locales.filter((locale) =>
    materials.some((material) => material.names[locale]),
  );
  const header = [
    "code",
    "family",
    "stage",
    ...languages.map((locale) => `name_${locale}`),
  ];
  const rows = materials.map((material) => [
    material.code,
    material.family,
    material.stage,
    ...languages.map((locale) => material.names[locale] ?? ""),
  ]);
  return toCsv([header, ...rows]);
}

/** Hands the browser a CSV to save; no server round trip. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([CSV_BOM, csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Give the download a moment to start before the URL is released.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
