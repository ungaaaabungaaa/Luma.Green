/**
 * The page to return to after sign-in, from a `?next=` parameter. Only a
 * relative path on this site is accepted — anything else falls back — so the
 * sign-in page can't be used to redirect someone to another site.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return /[\\\s]/.test(value) || value.includes(":") ? fallback : value;
}
