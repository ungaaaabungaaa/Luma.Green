import { useSyncExternalStore } from "react";

/**
 * Small bits of sign-in state kept in the browser. Storage can be missing or
 * throw (private mode, blocked site data), so every access is guarded and the
 * flow still works without it.
 */

const PHONE_KEY = "lg.signInPhone";
const PREVIEW_KEY = "lg.signInPreview";
const LANGUAGE_KEY = "lg.languageChosen";

/** The number a code was just sent to — kept out of the URL on purpose. */
export function rememberPhone(e164: string): void {
  try {
    sessionStorage.setItem(PHONE_KEY, e164);
    sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    // Without storage the verify screen sends the user back to enter it again.
  }
}

/** A preview never means a code was sent or a session was created. */
export function rememberPreviewPhone(e164: string): void {
  try {
    sessionStorage.removeItem(PHONE_KEY);
    sessionStorage.setItem(PREVIEW_KEY, e164);
  } catch {
    // With blocked storage the next screen returns to phone entry.
  }
}

export function isPhonePreview(): boolean {
  try {
    return sessionStorage.getItem(PREVIEW_KEY) !== null;
  } catch {
    return false;
  }
}

export function readPhone(): string | null {
  try {
    return (
      sessionStorage.getItem(PREVIEW_KEY) ?? sessionStorage.getItem(PHONE_KEY)
    );
  } catch {
    return null;
  }
}

/** Whether this browser has already picked a language on the sign-in screen. */
export function isLanguageChosen(): boolean {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "1";
  } catch {
    // If we can't remember, don't make them choose every time.
    return true;
  }
}

export function markLanguageChosen(): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, "1");
  } catch {
    // The language grid shows again next time — harmless.
  }
}

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
  };
}

/**
 * A value read from browser storage, or `undefined` while rendering on the
 * server and hydrating — so the first paint matches the server's.
 */
export function useStoredValue<T extends string | boolean | null>(
  read: () => T,
): T | undefined {
  // The server has no storage: its snapshot is "not known yet".
  // eslint-disable-next-line unicorn/no-useless-undefined -- that's the value
  return useSyncExternalStore(subscribeToStorage, read, () => undefined);
}
