/** Format integer paise without passing the fractional rupees through Number. */
export function formatPaise(paise: number, locale: string): string {
  const remainder = Math.abs(paise % 100);
  const fractionDigits = remainder === 0 ? 0 : 2;
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  const fraction = new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumIntegerDigits: 2,
    maximumFractionDigits: 0,
  }).format(remainder);
  // Truncation keeps -0 for a negative amount smaller than one rupee, so Intl
  // retains its minus sign and direction marks while formatting the whole part.
  return currency
    .formatToParts(Math.trunc(paise / 100))
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
}
