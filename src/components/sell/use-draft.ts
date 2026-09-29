"use client";

import { useCallback, useSyncExternalStore } from "react";

import { parseDraft, type SellDraft } from "./draft";

/**
 * The /sell draft in this tab's session storage. Storage can be missing or
 * throw (private mode, blocked site data), so every access is guarded and a
 * copy in memory keeps the flow working without it.
 */

const KEY = "lg.sellDraft";
const CHANGED = "lg:sell-draft";

const store: {
  /** The last text written, for when storage isn't available. */
  memory: string | null;
  /** Storage threw once: from then on this page keeps the draft in memory. */
  isMemoryOnly: boolean;
  /** The parsed draft for the last text read, so React sees no change. */
  cached: { raw: string | null; draft: SellDraft } | null;
} = { memory: null, isMemoryOnly: false, cached: null };

function readRaw(): string | null {
  if (store.isMemoryOnly) return store.memory;
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    store.isMemoryOnly = true;
    return store.memory;
  }
}

function writeRaw(raw: string | null): void {
  store.memory = raw;
  if (!store.isMemoryOnly) {
    try {
      if (raw === null) sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, raw);
    } catch {
      store.isMemoryOnly = true;
    }
  }
  window.dispatchEvent(new Event(CHANGED));
}

function snapshot(): SellDraft {
  const raw = readRaw();
  if (store.cached?.raw !== raw) store.cached = { raw, draft: parseDraft(raw) };
  return store.cached.draft;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function clearSellDraft(): void {
  writeRaw(null);
}

/** Saves a draft straight away — e.g. to start /sell from an old booking. */
export function saveSellDraft(draft: SellDraft): void {
  writeRaw(JSON.stringify(draft));
}

/**
 * The draft, or `undefined` while rendering on the server and hydrating (the
 * server can't see this tab's storage), plus a way to change it.
 */
export function useSellDraft(): [
  SellDraft | undefined,
  (change: (draft: SellDraft) => SellDraft) => void,
] {
  const draft = useSyncExternalStore(
    subscribe,
    snapshot,
    // eslint-disable-next-line unicorn/no-useless-undefined -- "not known yet"
    () => undefined,
  );
  const update = useCallback((change: (draft: SellDraft) => SellDraft) => {
    saveSellDraft(change(snapshot()));
  }, []);
  return [draft, update];
}
