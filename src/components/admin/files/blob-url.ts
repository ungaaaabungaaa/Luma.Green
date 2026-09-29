"use client";

import { useCallback } from "react";

/**
 * A ref callback that points an element's `src` at a Blob for as long as the
 * element is on the page, then frees the object URL. (Ref cleanups, not
 * state: the URL is never rendered, so React's double-mounting in Strict Mode
 * can't leave a revoked one behind.)
 */
export function useBlobSource(blob: Blob | undefined) {
  return useCallback(
    (element: HTMLElement | null) => {
      if (!element || !blob) return;
      const url = URL.createObjectURL(blob);
      element.setAttribute("src", url);
      return () => {
        element.removeAttribute("src");
        URL.revokeObjectURL(url);
      };
    },
    [blob],
  );
}

/** Long enough for a new tab, or a download, to take what it was given. */
const HANDED_OVER_URL_LIFETIME_MS = 60_000;

function revokeLater(url: string): void {
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, HANDED_OVER_URL_LIFETIME_MS);
}

/** Opens a Blob in a new tab, with no link back to this one. */
export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  revokeLater(url);
}

/** Saves a Blob under a name, the way a download link would. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  // Some browsers only follow a click on a link that's in the page.
  document.body.append(link);
  link.click();
  link.remove();
  revokeLater(url);
}
