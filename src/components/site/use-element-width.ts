"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * The rendered width of an element, kept current as it resizes. Charts draw
 * at the real pixel width so their labels stay at a readable size instead of
 * shrinking with a scaled `viewBox` on a phone.
 */
export function useElementWidth<T extends HTMLElement>(
  fallback: number,
): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      setWidth(element.clientWidth > 0 ? element.clientWidth : fallback);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [fallback]);

  return [ref, width];
}
