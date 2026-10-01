"use client";

import "./globals.css";

import { RotateCwIcon } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Logo } from "@/components/brand/logo";
import { themeBootstrap } from "@/components/theme/theme";
import { Button } from "@/components/ui/button";
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
    <html
      suppressHydrationWarning
      lang={copy.locale}
      dir={localeDirection(copy.locale)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <header className="border-b px-6 py-5">
          <Logo />
        </header>
        <main className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-start justify-center gap-6 px-6 py-16">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {copy.error}
          </h1>
          <Button size="lg" onClick={reset}>
            <RotateCwIcon aria-hidden />
            {copy.retry}
          </Button>
        </main>
      </body>
    </html>
  );
}
