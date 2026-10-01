"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { usePathname } from "@/i18n/navigation";

import { revealTargets } from "./reveal-targets";

/** Secondary pages use the browser animation engine; no GSAP chunk is needed. */
export function SectionMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The homepage owns its GSAP motion; a persistent site shell must not double it.
    if (pathname === "/") return;
    const scope = root.current;
    if (
      !scope ||
      !("IntersectionObserver" in window) ||
      !("animate" in HTMLElement.prototype)
    )
      return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;
    let generation = 0;
    function stop() {
      generation++;
      observer?.disconnect();
      observer = undefined;
      for (const animation of animations) animation.cancel();
      animations.clear();
    }
    function update() {
      stop();
      if (!scope || preference.matches) return;
      const currentGeneration = generation;
      observer = new IntersectionObserver(
        (entries) => {
          if (currentGeneration !== generation) return;
          for (const entry of entries) {
            if (!entry.isIntersecting || !(entry.target instanceof HTMLElement))
              continue;
            observer?.unobserve(entry.target);
            const animation = entry.target.animate(
              [
                { transform: "translateY(14px)", opacity: 0.8 },
                { transform: "translateY(0)", opacity: 1 },
              ],
              { duration: 420, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
            );
            animations.add(animation);
            animation.addEventListener(
              "finish",
              () => animations.delete(animation),
              { once: true },
            );
          }
        },
        { threshold: 0.1 },
      );
      for (const target of revealTargets(scope)) observer.observe(target);
    }
    update();
    preference.addEventListener("change", update);
    return () => {
      stop();
      preference.removeEventListener("change", update);
    };
  }, [pathname]);
  return <div ref={root}>{children}</div>;
}
