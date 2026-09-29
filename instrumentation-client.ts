import * as Sentry from "@sentry/nextjs";

import { privateDataCollection } from "@/lib/sentry";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0.1,
    // Session replay is off by default: operators enter KYC and payout details,
    // and a replay is a recording of that. Turn it on only with masking proven.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Operator data (phone, PAN, GSTIN) must never leave the app in a trace.
    dataCollection: privateDataCollection,
  });
}

export const onRouterTransitionStart = dsn
  ? Sentry.captureRouterTransitionStart
  : undefined;
