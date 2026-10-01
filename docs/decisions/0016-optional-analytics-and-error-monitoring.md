# 0016. Optional analytics and error monitoring

- **Status:** Decided
- **Date:** 1 Oct 2026
- **Deciders:** founder's explicit request, implemented by Codex
- **Supersedes:** [0012](0012-pilot-analytics-in-convex.md)

## Context

The founder now requests PostHog, Sentry, Google Analytics and search setup.
The app holds phone numbers, addresses, booking tokens and private documents.
Operating cost must remain small. An SDK's default automatic capture is too
broad for these workflows.

## Decision

Implement optional PostHog and GA4 manual page views on an explicit marketing
route allowlist. Require both the operator's telemetry flag and a visitor's
saved opt-in before loading analytics. Disable automatic capture, replay and
advertising features. Keep only normalized public paths and locale as app
event properties. Do not identify users; PostHog uses memory persistence.

Implement optional Sentry browser and Next.js server error reporting behind the
same operator flag plus its DSN. This is independent of the analytics choice.
Keep error classes and sanitized code locations; remove error messages,
request data, identities, breadcrumbs and other unapproved event fields.
Disable tracing, profiling, replay and logs. Convex functions and native shell
crashes require separate diagnosis; these SDKs do not instrument them.

Keep the Convex pilot report as the source of operational totals. Third-party
visitor counts must not replace booking, stock, trade or audit records.
Search Console and Bing ownership metadata are separate from telemetry.
Current behavior and activation gates live in
[observability](../operations/observability.md) and [search setup](../operations/seo.md).

## Consequences

Empty deployments stay silent. Opt-in and provider settings can reduce traffic
counts; memory-only PostHog IDs cannot measure returning people reliably.
Error filtering reduces diagnostic detail and grouping accuracy. Providers still
receive network connections when enabled. Account configuration, quotas,
retention settings, provider-side privacy controls and live delivery checks
remain operator tasks. No account, delivery or production acceptance is implied
by local tests.

## Alternatives considered

- Automatic capture and session replay: unnecessary data volume and exposure.
- Track private funnels: excluded until a separately reviewed event contract exists.
- Keep all services deferred: conflicts with the founder's current request.
