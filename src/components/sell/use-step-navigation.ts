"use client";

import { useCallback, useSyncExternalStore } from "react";

import { parseStep, type SellStep } from "./draft";

/**
 * The /sell step lives in the address (`?step=shop`), so the phone's back
 * button goes back a step instead of leaving the page. Moving between steps
 * only rewrites the address — nothing is fetched and the draft stays put.
 * Next.js keeps its router in step with `history.pushState` on its own.
 */

const STEP_CHANGED = "lg:sell-step";

function urlFor(step: SellStep): string {
  const { pathname } = window.location;
  return step === "basket" ? pathname : `${pathname}?step=${step}`;
}

function readStep(): SellStep {
  const step = new URLSearchParams(window.location.search).get("step");
  return parseStep(step) ?? "basket";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(STEP_CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(STEP_CHANGED, onChange);
  };
}

export function useStepNavigation() {
  const wanted = useSyncExternalStore<SellStep>(
    subscribe,
    readStep,
    () => "basket",
  );

  /** A new step: back returns here. */
  const goTo = useCallback((step: SellStep) => {
    window.history.pushState(null, "", urlFor(step));
    window.dispatchEvent(new Event(STEP_CHANGED));
  }, []);

  /** Corrects the address without adding a step to the history. */
  const replace = useCallback((step: SellStep) => {
    window.history.replaceState(null, "", urlFor(step));
    window.dispatchEvent(new Event(STEP_CHANGED));
  }, []);

  return { wanted, goTo, replace };
}
