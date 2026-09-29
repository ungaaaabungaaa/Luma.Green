"use client";

import { useCallback, useState } from "react";

import type { Point } from "../../../convex/lib/households";

export type LocationState =
  | { status: "off" }
  | { status: "locating" }
  | { status: "on"; point: Point }
  | { status: "failed" };

/** About 100 m: enough to sort shops, not enough to find a door. */
function coarse(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * "Use my location", only when the household asks. The point stays in this
 * page — it is sent with the shop list for distances and never stored.
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>({ status: "off" });

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "failed" });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "on",
          point: {
            lat: coarse(position.coords.latitude),
            lng: coarse(position.coords.longitude),
          },
        });
      },
      () => {
        setState({ status: "failed" });
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    );
  }, []);

  const stop = useCallback(() => {
    setState({ status: "off" });
  }, []);

  return {
    state,
    point: state.status === "on" ? state.point : undefined,
    locate,
    stop,
  };
}
