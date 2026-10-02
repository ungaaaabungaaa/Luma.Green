/** Keep both responsive labels in the accessible name for voice control. */
export function actionName(shortLabel: string, fullLabel: string): string {
  return shortLabel === fullLabel ? fullLabel : `${shortLabel}: ${fullLabel}`;
}
