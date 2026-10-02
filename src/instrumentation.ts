import type { Instrumentation } from "next";

import { isMonitoringEnabled, monitoringOptions } from "@/lib/monitoring";

/** Next loads the matching SDK for Node or edge through its package exports. */
export async function register() {
  if (!isMonitoringEnabled()) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init(monitoringOptions());
  } catch {
    console.warn("Error reporting is unavailable.");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (!isMonitoringEnabled()) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(error, request, context);
  } catch {
    // Never replace the original request failure with a reporting failure.
    console.warn("Error reporting is unavailable.");
  }
};
