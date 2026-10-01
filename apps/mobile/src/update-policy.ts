export type UpdateState =
  "unavailable" | "idle" | "checking" | "ready" | "current" | "failed";

export function canCheckUpdate(
  isEnabled: boolean,
  isDevelopment: boolean,
  state: UpdateState,
): boolean {
  return (
    isEnabled && !isDevelopment && state !== "checking" && state !== "ready"
  );
}

/** A downloaded update never replaces a live form without the user's action. */
export function canRestartUpdate(
  state: UpdateState,
  isExplicitlyRequested: boolean,
): boolean {
  return state === "ready" && isExplicitlyRequested;
}
