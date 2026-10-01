/** A section can opt into one shared entrance, without animating nested text twice. */
export function revealTargets(scope: HTMLElement): HTMLElement[] {
  const candidates = [
    ...scope.querySelectorAll<HTMLElement>("[data-reveal], h1, h2"),
  ];
  const selected = new Set(candidates);
  return candidates.filter((element) => {
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== scope) {
      if (selected.has(ancestor)) return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  });
}

/** Decoration travels a small distance; malformed markup must never move a page far. */
export function parallaxDistance(
  value: string | undefined,
  isCompact: boolean,
) {
  const parsed = Number(value ?? 32);
  const bounded = Number.isFinite(parsed)
    ? Math.max(-64, Math.min(64, parsed))
    : 32;
  return bounded * (isCompact ? 0.5 : 1);
}
