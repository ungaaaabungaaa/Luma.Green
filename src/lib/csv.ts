/**
 * A small CSV writer for the export centre. Pure: no browser, no locale.
 *
 * Files open cleanly in Excel and import into TallyPrime and the CPCB
 * portals: RFC 4180 quoting, CRLF line ends, and a UTF-8 byte-order mark so
 * Excel reads Indian names and the rupee sign correctly. Numbers are written
 * as JavaScript prints them (`1234.5`), never grouped or localised, because
 * the software on the other side parses them.
 */

export type CsvCell = string | number | boolean | null | undefined;

/** Excel treats a cell starting with one of these as a formula. */
const FORMULA_START = /^[\t\r=+@]/;
/** A plain number, which Excel keeps numeric even when it starts with "-". */
const NUMERIC = /^-?\d+(?:\.\d+)?$/;

export const CSV_BOM = "﻿";
export const CSV_MIME = "text/csv;charset=utf-8";

/**
 * One cell as it appears in the file: quoted when it holds a comma, a quote
 * or a line break; quotes doubled inside; a leading apostrophe on anything a
 * spreadsheet would otherwise run as a formula.
 */
export function csvEscape(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "number") {
    return Number.isFinite(cell) ? String(cell) : "";
  }
  if (typeof cell === "boolean") return cell ? "TRUE" : "FALSE";
  let text = cell;
  const isFormulaLike =
    FORMULA_START.test(text) || (text.startsWith("-") && !NUMERIC.test(text));
  if (isFormulaLike) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export interface CsvOptions {
  /** Prefix the UTF-8 byte-order mark Excel needs. Default true. */
  bom?: boolean;
  /** Line end. Default CRLF, as RFC 4180 and Excel expect. */
  newline?: "\r\n" | "\n";
}

/** Rows of cells as one CSV document. The first row is usually the header. */
export function toCsv(
  rows: readonly (readonly CsvCell[])[],
  { bom = true, newline = "\r\n" }: CsvOptions = {},
): string {
  const body = rows
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join(newline);
  return `${bom ? CSV_BOM : ""}${body}${rows.length > 0 ? newline : ""}`;
}

/**
 * A file name from its parts: lower case, ASCII, hyphens between words.
 * `csvFileName("Tally vouchers", "2026-09")` → `luma-green-tally-vouchers-2026-09.csv`.
 */
export function csvFileName(...parts: readonly string[]): string {
  const slug = ["luma-green", ...parts]
    .map((part) =>
      part
        .normalize("NFKD")
        .replaceAll(/[^\w\s-]/g, "")
        .trim()
        .replaceAll(/[\s_]+/g, "-")
        .toLowerCase(),
    )
    .filter((part) => part !== "")
    .join("-");
  return `${slug}.csv`;
}
