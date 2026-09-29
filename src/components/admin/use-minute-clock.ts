"use client";

import { useSyncExternalStore } from "react";

const MINUTE_MS = 60_000;

function subscribe(onTick: () => void): () => void {
  const timer = setInterval(onTick, MINUTE_MS / 4);
  return () => {
    clearInterval(timer);
  };
}

function currentMinute(): number {
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

function serverMinute(): number {
  return 0;
}

/**
 * The time, to the minute, re-rendering as minutes pass — so "waiting 19 h"
 * and its due-soon badge stay true while the console is left open. Zero
 * during server rendering, where nothing time-based is shown.
 */
export function useMinuteClock(): number {
  return useSyncExternalStore(subscribe, currentMinute, serverMinute);
}
