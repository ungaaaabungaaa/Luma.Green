# Analytics and error monitoring

Status: implementation and setup guide, 1 October 2026. No provider account,
production receipt or approved privacy notice is confirmed by this document.
This replaces the earlier deferral in [ADR 0012](../decisions/0012-pilot-analytics-in-convex.md);
the current decision is [ADR 0016](../decisions/0016-optional-analytics-and-error-monitoring.md).

## Enable only the services you need

All services are optional. An empty deployment loads no analytics SDK and starts
no Sentry transport. Set `NEXT_PUBLIC_TELEMETRY_ENABLED=true` in the intended
Next.js deployment and add the settings for the chosen services below. Public
settings are injected at build time: rebuild and redeploy after changing them.
Keep the flag empty or `false` in ordinary local and preview builds. The flag
is independent of `VERCEL_ENV`; it is an explicit operator decision.

| Service            | Public configuration                                  | Private build configuration                                                |
| ------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| PostHog            | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | None                                                                       |
| Google Analytics 4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`G-...`)             | None                                                                       |
| Sentry             | `NEXT_PUBLIC_SENTRY_DSN`                              | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` for source-map uploads |

The analytics project key, measurement ID and Sentry DSN are browser-visible
settings. Do not put a PostHog personal API key or Sentry auth token in a
`NEXT_PUBLIC_*` variable. Set provider budgets, quotas, retention and alerts
before enabling them. No paid plan is required by application code; account
limits and commercial terms must be checked with each provider.

## PostHog and Google Analytics

The visitor must select **Allow analytics** before the app loads an analytics
SDK. **Keep analytics off** leaves analytics disabled. The choice is stored in
this browser under `luma.analytics.v1`; it is not saved to the user account.
**Analytics settings** on the measured pages lets the visitor change it. A
withdrawal stops capture and reloads the page to remove vendor listeners. If
browser storage fails, analytics stays off. Clearing site data removes the
choice and causes a new prompt.

Only these pages, including their locale variants, send manual page views:
`/`, `/how-it-works`, `/participants`, `/prices`, `/standards`, `/solar`, `/help`.
New pages are excluded unless deliberately added to the allowlist. Login,
onboarding, `/sell`, contact forms, booking tracking, the business app and admin
are excluded. Moving from a measured page to an excluded route stops page
capture; returning resumes it only while the saved choice is still allowed.

App properties are the normalized public path and locale. The page URL sent is
the origin plus that allowlisted path. Query strings, fragments, referral URLs,
DOM text, real page titles, form values, customer IDs and booking tokens are not
included by the app's event contract. GA uses the fixed title `Luma.Green`.
Providers may still process browser/network metadata and IP addresses at their
network boundary. Do not describe this as fully anonymous or zero-data traffic.

### PostHog account

1. Create or select a project and confirm its region. Copy its project API key
   and ingestion host to the public values above. The default host is
   `https://eu.i.posthog.com`; use the host for the actual project.
2. Keep session replay, autocapture, surveys, feature flags, exception capture,
   performance capture and heatmaps disabled. The runtime disables these
   features and permits only manual `$pageview` events.
3. Review retention and ingestion limits. There is no user identification or
   person profile creation. The SDK keeps its random identifier in memory;
   it does not persist that identity across reloads. Returning-user and
   cross-device analysis are therefore outside this implementation.
4. Verify the first consented event in the project's live events view. Confirm
   only the allowed properties appear and no events arrive from private pages.

### Google Analytics account

1. Create a GA4 property and web data stream. Set the public measurement ID,
   including its `G-` prefix.
2. In the web stream settings, **disable Enhanced Measurement entirely**.
   Disable automatic page views, including browser history change measurement.
   The app supplies manual page views with `send_page_view=false` on config.
   Automatic measurement can duplicate events or record excluded interactions.
3. Keep Google Signals, advertising personalization, user-provided data and
   advertising integrations disabled. The runtime denies advertising consent
   and disables Google Signals and personalization signals.
4. Do not install a second Google tag, Google Tag Manager container or platform
   analytics integration for this same property. This app owns its tag.
5. Review retention, data sharing and region settings. GA can use analytics
   cookies after the visitor allows it; withdrawal does not promise to delete
   historical provider records. Follow the provider's deletion controls when
   removal is required.
6. Check Realtime and browser network requests after an allowed page visit.
   Confirm one manual page view per route transition, a safe page URL and no
   events from private routes. Provider settings are part of this check.

## Sentry errors

Sentry uses the operator flag and DSN. Its error reporting is **independent of
the visitor's analytics choice**, including on private pages. Describe this
separately in the platform's privacy information before enabling it.

1. Create a Sentry Next.js project in the intended organization and region.
   Set its DSN in the matching deployment and enable the telemetry flag.
2. For source maps, set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`
   only in the trusted build environment. Use the minimum upload permissions.
   Upload is disabled without the token; compiled stack traces may be harder to
   read. The build removes maps after upload. Build-plugin telemetry is off.
3. Set provider quotas, retention, access controls and notifications. Review
   provider-side data scrubbing and disable IP storage. A server-side scrubber
   cannot remove the network address used to connect to an ingestion endpoint.
4. Use a controlled test error containing no real user data. Confirm its
   arrival, source-map resolution if configured, and stripped payload before
   accepting the integration. Check browser and Next.js server errors separately.

Coverage includes browser errors, the global React error boundary and Next.js
request errors in its Node/edge runtimes. It does **not** instrument Convex
functions, React Native shell crashes or Electron main-process crashes. Use
those platforms' existing logs and device diagnostics.

Only exception events are retained. Allowed fields include error class,
sanitized source locations, event time/ID and release/environment metadata.
Error message values become `Error details removed for privacy`. User data,
request headers/body/URLs, tags, extra context, breadcrumbs, source contents and
unapproved event fields are removed. Unknown exception classes are normalized.
Tracing, profiling, session replay, SDK logs, session tracking and client reports
are disabled. This intentionally reduces diagnostic detail and can group
unrelated failures together; never restore raw payloads to fix grouping.

## Verification and shutoff

1. Run the analytics, monitoring and SEO tests, then the required `pnpm check`.
2. In a browser with fresh site storage, check no analytics network calls before
   choosing, after declining, or on private routes. Test English and Arabic.
3. Allow analytics and navigate between measured pages. Inspect outgoing
   payloads for query tokens, referral URLs, user details and duplicates.
4. Open a private workflow and confirm capture stops. Withdraw permission in
   Analytics settings and confirm it remains off after reload and in another
   same-origin tab. Test unavailable local storage.
5. Check controlled Sentry errors with analytics both allowed and denied.
   Inspect the actual received event, not only a successful network response.
6. Turn the operator flag off, rebuild and redeploy. Confirm all three runtime
   integrations remain off even if their keys are still set. Clear a service's
   key and rebuild to disable only that service.

These steps distinguish mock/local tests, browser requests and provider receipt.
None implies production deployment or complete privacy compliance. Keep the
Convex pilot report and audit records as the source of operational totals.
Search ownership and sitemap submission have a separate [setup guide](seo.md).

## Official references

- [PostHog privacy controls](https://posthog.com/docs/privacy)
- [PostHog anonymous and identified events](https://posthog.com/docs/data/anonymous-vs-identified-events)
- [GA4 manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [GA4 Enhanced Measurement](https://support.google.com/analytics/answer/9216061)
- [Sentry Next.js configuration](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/)
- [Sentry data scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/)
