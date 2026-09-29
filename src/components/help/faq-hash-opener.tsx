"use client";

import { useEffect } from "react";

/**
 * Opens the question named by the URL's `#fragment`, if there is one. The
 * fragment is compared as a plain id — never parsed as a CSS selector — so
 * whatever is in the address can't break the page.
 */
export function openDetailsForHash(hash: string, root: ParentNode = document) {
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return; // A malformed fragment names nothing.
  }
  if (!id) return;
  const target = [...root.querySelectorAll("details")].find(
    (details) => details.id === id,
  );
  if (target) target.open = true;
}

/**
 * A link like `/help/kabadiwala#faq-auto-accept` (from search) lands on a
 * closed question; this opens it. Renders nothing.
 */
export function FaqHashOpener() {
  useEffect(() => {
    const open = () => {
      openDetailsForHash(window.location.hash);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => {
      window.removeEventListener("hashchange", open);
    };
  }, []);
  return null;
}
