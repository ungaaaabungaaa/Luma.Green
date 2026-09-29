"use client";

import { useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

const WAIT_MS = 20_000;

/**
 * After an SMS code is accepted, Convex picks up the new session a moment
 * later. This returns a function that resolves once it has — so a booking
 * made right after signing in is made as the household, not as nobody.
 */
export function useAuthReady(): () => Promise<void> {
  const { isAuthenticated } = useConvexAuth();
  const isReady = useRef(isAuthenticated);
  const waiting = useRef<(() => void)[]>([]);

  useEffect(() => {
    isReady.current = isAuthenticated;
    if (!isAuthenticated) return;
    for (const resolve of waiting.current.splice(0)) resolve();
  }, [isAuthenticated]);

  return useCallback(() => {
    if (isReady.current) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiting.current = waiting.current.filter((entry) => entry !== done);
        reject(new Error("SIGN_IN_TIMEOUT"));
      }, WAIT_MS);
      function done() {
        clearTimeout(timer);
        resolve();
      }
      waiting.current.push(done);
    });
  }, []);
}
