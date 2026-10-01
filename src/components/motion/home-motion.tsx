"use client";

import { type ReactNode, useEffect, useRef } from "react";

/** Server-rendered children stay visible even if the optional motion fails. */
export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let request = 0;
    let stop: (() => void) | undefined;

    function updateMotion() {
      const currentRequest = ++request;
      stop?.();
      stop = undefined;
      if (preference.matches) return;

      // The GSAP chunk is loaded only on this page, with motion enabled.
      void import("./home-reveal")
        .then(({ startHomeReveal }) => {
          if (currentRequest === request && scope) {
            stop = startHomeReveal(scope);
          }
        })
        .catch((error: unknown) => {
          console.warn(
            "Home motion could not load; content remains visible.",
            error,
          );
        });
    }

    updateMotion();
    preference.addEventListener("change", updateMotion);
    return () => {
      request++;
      preference.removeEventListener("change", updateMotion);
      stop?.();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
