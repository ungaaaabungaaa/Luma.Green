"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useState,
} from "react";

import { nearestIndex } from "./chart-kit";

/**
 * Which data point a chart is showing details for. The pointer snaps to the
 * nearest point; the keyboard steps with the arrow keys, Home and End — the
 * same readout either way, so no value hides behind a hover.
 */
export function useChartCursor(xs: readonly number[]) {
  const count = xs.length;
  const [active, setActive] = useState<number | null>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const box = event.currentTarget.getBoundingClientRect();
      const index = nearestIndex(xs, event.clientX - box.left);
      setActive(index === -1 ? null : index);
    },
    [xs],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (count === 0) return;
      const current = active ?? count - 1;
      let next: number;
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowDown": {
          next = Math.max(0, current - 1);
          break;
        }
        case "ArrowRight":
        case "ArrowUp": {
          next = Math.min(count - 1, current + 1);
          break;
        }
        case "Home": {
          next = 0;
          break;
        }
        case "End": {
          next = count - 1;
          break;
        }
        default: {
          return;
        }
      }
      event.preventDefault();
      setActive(next);
    },
    [active, count],
  );

  return {
    active,
    handlers: {
      onPointerMove,
      onPointerLeave: () => {
        setActive(null);
      },
      onKeyDown,
      onFocus: () => {
        setActive((current) => current ?? (count > 0 ? count - 1 : null));
      },
      onBlur: () => {
        setActive(null);
      },
    },
  };
}
