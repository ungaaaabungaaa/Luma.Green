import { isMonitoringEnabled, monitoringOptions } from "@/lib/monitoring";

/** Loading is conditional; an empty deployment never initializes a transport. */
if (isMonitoringEnabled()) {
  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init(monitoringOptions());
    })
    .catch(() => {
      console.warn("Error reporting is unavailable.");
    });
}
