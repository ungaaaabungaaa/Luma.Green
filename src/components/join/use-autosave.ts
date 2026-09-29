"use client";

import { useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Saves a form a moment after the person stops changing it, so leaving
 * half-way loses nothing (docs/product/onboarding.md). The values it starts
 * with count as already saved.
 */
export function useAutosave<T>(
  values: T,
  save: (values: T) => Promise<unknown>,
  delayMs = 1200,
): SaveState {
  const [state, setState] = useState<SaveState>("idle");
  const serialized = JSON.stringify(values);
  const lastSaved = useRef(serialized);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (serialized === lastSaved.current) return;
    const timer = setTimeout(() => {
      void (async () => {
        setState("saving");
        try {
          await saveRef.current(JSON.parse(serialized) as T);
          lastSaved.current = serialized;
          setState("saved");
        } catch {
          setState("error");
        }
      })();
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [serialized, delayMs]);

  return state;
}

/** Drops keys whose value is `undefined` — Convex arguments can't carry them. */
export function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
