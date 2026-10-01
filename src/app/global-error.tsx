"use client";

import { useEffect, useSyncExternalStore } from "react";

import { localeDirection } from "@/i18n/locales";
import { isMonitoringEnabled } from "@/lib/monitoring";
import { monitoringErrorCopy } from "@/lib/monitoring-copy";

const unsubscribe = () => {
  /* The failure screen has no navigation subscription. */
};
const subscribe = () => unsubscribe;
const clientPath = () => window.location.pathname;
const serverPath = () => "/";

/** Root-layout failures cannot rely on the normal translation/provider tree. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = useSyncExternalStore(subscribe, clientPath, serverPath);
  const copy = monitoringErrorCopy(pathname);

  useEffect(() => {
    if (!isMonitoringEnabled()) return;
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang={copy.locale} dir={localeDirection(copy.locale)}>
      <body>
        <main>
          <h1>{copy.error}</h1>
          <button type="button" onClick={reset}>
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
