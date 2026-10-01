import type { Instrumentation } from "next";

import { isMonitoringEnabled, monitoringOptions } from "@/lib/monitoring";

/** Next loads the matching SDK for Node or edge through its package exports. */
export async function register() {
  if (!isMonitoringEnabled()) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(monitoringOptions());
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (!isMonitoringEnabled()) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
