import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Server and edge error tracking. Without a DSN this is a no-op, so local runs
 * and CI never talk to Sentry.
 */
export function register() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Sampled, not exhaustive: traces are useful for trends, not for billing
    // surprises. Raise deliberately when investigating something specific.
    tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.1 : 1,
    // Operator data (phone, PAN, GSTIN) must never leave the app in a trace.
    sendDefaultPii: false,
  });
}

export const onRequestError = dsn ? Sentry.captureRequestError : undefined;
