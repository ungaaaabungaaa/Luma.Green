/** Decimal digit blocks used by the supported languages and phone keyboards. */
const DIGIT_ZEROS = [
  0x30, 0x6_60, 0x6_f0, 0x9_66, 0x9_e6, 0xa_66, 0xa_e6, 0xb_66, 0xb_e6, 0xc_66,
  0xc_e6, 0xd_66, 0xd_e6, 0xe_50, 0xff_10,
];

export function asciiDigits(input: string): string {
  return input.replaceAll(/\p{Nd}/gu, (character) => {
    const code = character.codePointAt(0) ?? 0;
    const zero = DIGIT_ZEROS.find(
      (start) => code >= start && code <= start + 9,
    );
    return zero === undefined ? character : String(code - zero);
  });
}

/**
 * Ungrouped kilograms/rupees to integer grams/paise. The decimal separator may
 * follow the locale; an ASCII dot is also accepted for generated field values.
 * Never parse a fractional amount through floating point arithmetic.
 */
export function fixedDecimalInput(
  input: string,
  precision: 2 | 3,
  locale = "en",
): number | null {
  const decimal =
    new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value ?? ".";
  const text = asciiDigits(input.trim())
    .replaceAll(decimal, ".")
    .replaceAll("٫", ".");
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) return null;
  const [, whole = "", fraction = ""] = match;
  if ((whole === "" && fraction === "") || fraction.length > precision)
    return null;
  const result =
    Number(whole || "0") * 10 ** precision +
    Number(fraction.padEnd(precision, "0"));
  return Number.isSafeInteger(result) ? result : null;
}
