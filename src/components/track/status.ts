import type { BookingStatus } from "../../../convex/lib/chain";

/**
 * How a booking's status reads to the household: the progress bar, and the
 * tone of the status. Pure, so the page and the "Your bookings" list agree.
 */

export type ProgressStep =
  "booked" | "accepted" | "confirmed" | "onTheWay" | "done";

/** The steps a booking goes through — a drop-off has no "on the way". */
export function progressSteps(mode: "pickup" | "dropoff"): ProgressStep[] {
  return mode === "pickup"
    ? ["booked", "accepted", "onTheWay", "done"]
    : ["booked", "confirmed", "done"];
}

/** How far along the bar is, or null when the booking stopped. */
export function progressIndex(
  status: BookingStatus,
  mode: "pickup" | "dropoff",
): number | null {
  const last = progressSteps(mode).length - 1;
  switch (status) {
    case "requested": {
      return 0;
    }
    case "accepted": {
      return 1;
    }
    case "on_the_way": {
      return Math.min(2, last);
    }
    case "completed": {
      return last;
    }
    case "declined":
    case "cancelled": {
      return null;
    }
  }
}

export type Tone = "neutral" | "info" | "good" | "warn" | "bad";

export function statusTone(status: BookingStatus): Tone {
  switch (status) {
    case "requested": {
      return "warn";
    }
    case "accepted":
    case "completed": {
      return "good";
    }
    case "on_the_way": {
      return "info";
    }
    case "declined": {
      return "bad";
    }
    case "cancelled": {
      return "neutral";
    }
  }
}

const FINISHED: ReadonlySet<BookingStatus> = new Set([
  "completed",
  "declined",
  "cancelled",
]);

/** Nothing more will happen to it. */
export function isFinished(status: BookingStatus): boolean {
  return FINISHED.has(status);
}
