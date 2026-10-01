# Account and deployment checklist

> Status: code setup checklist, 1 October 2026. Local checks do not confirm a
> live deployment or provider delivery. Do not put credentials in this file.

## Required for the pilot

| Account     | Set up                                                                                                                      | Environment values                                                                             | Where                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Convex      | Select separate development and production deployments. Enable backups.                                                     | `NEXT_PUBLIC_CONVEX_URL` (build-injected), optional `NEXT_PUBLIC_CONVEX_SITE_URL` (local only) | Next.js / Vercel, for the matching environment |
| Convex      | Create a production deploy key.                                                                                             | `CONVEX_DEPLOY_KEY`                                                                            | Vercel build environment only                  |
| Vercel      | Connect this repository, select the production branch, and add `luma.green`. Set the DNS records Vercel gives you.          | `NEXT_PUBLIC_SITE_URL=https://luma.green`                                                      | Vercel production                              |
| Better Auth | No separate account. Generate a random secret with at least 32 characters. Set the allowed site origin.                     | `BETTER_AUTH_SECRET`, `SITE_URL=https://luma.green`, `ADMIN_EMAIL`                             | Convex production environment                  |
| MSG91       | Create the account and complete its current sender/template approval process. Add a sending budget and provider OTP limits. | `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID`                                                      | Convex production environment                  |

Configure Vercel's Build Command as described in [environments.md](environments.md).
It deploys Convex before building the frontend and injects the matching backend
URL. Remove static public backend URLs from Vercel when this is enabled, so a
preview cannot point at production. The repository default builds only the frontend.

Use the provider dashboards to enter secrets. `NEXT_PUBLIC_*` values are public;
never use that prefix for a secret. Preview deployments must use their own
backend and site origin. Add only known preview origins to
`EXTRA_TRUSTED_ORIGINS` if required.

`AUTH_DEV_MODE=true` is for development only. Do not set it in production.
It enables demo codes and log delivery. Keep the production auth secret stable;
rotating it also rotates the keyed SMS quota identifiers.

## Booking and application SMS

The code supports eight status events through MSG91 Flow. Set these on Convex:

- `MSG91_NOTIFICATION_TEMPLATES`: JSON mapping event names to language codes and
  approved Flow template IDs. Each template uses `VAR1` for the full link.
- `SMS_NOTIFICATION_BASE_URL=https://luma.green`: the verified HTTPS site origin.
- `MSG91_NOTIFICATION_ENGLISH_FALLBACK=true`: optional; enable only if English is
  an accepted fallback when a localized template is missing.

It uses the same `MSG91_AUTH_KEY` as OTP but separate template IDs. Follow
[sms-notifications.md](sms-notifications.md) for all event names and tests.
Messages disabled at event time are not sent later when you add keys. Check
provider acceptance and handset delivery separately; there is no automatic retry.

## Optional photo estimates

Choose either a self-hosted vision endpoint or OpenRouter. The
[low-cost operation guide](low-cost-operation.md) has the self-hosted gateway
and environment checklist; this route needs no OpenRouter account.

For the OpenRouter route, create an account.
Choose a vision model that supports structured output, test it on representative
scrap photos, and set a hard spending limit on the API key.

Set these on the Convex deployment:

- `OPENROUTER_API_KEY`: the key with the spending limit.
- `OPENROUTER_MODEL`: the exact model ID selected for this deployment.
- `PHOTO_ESTIMATE_DAILY_LIMIT`: an optional lower daily request ceiling.

The account is not needed for manual material entry. Provider execution and
model accuracy must be checked with the selected endpoint before launch.

## Optional analytics, errors and search tools

These integrations are now implemented; the earlier deferral is superseded.
They do not need to be enabled for booking and trade operations to work.

| Account               | Configuration                                                                                        | Acceptance gate                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| PostHog               | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`                                                | Region, retention and quota reviewed; consented public page view received             |
| Google Analytics 4    | `NEXT_PUBLIC_GA_MEASUREMENT_ID`                                                                      | Enhanced Measurement and automatic page views off; one manual safe page view received |
| Sentry                | `NEXT_PUBLIC_SENTRY_DSN`; optional private build `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Browser and Next.js server errors received with identifying fields removed            |
| Google Search Console | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` for HTML tag verification, or DNS verification                | Ownership accepted; sitemap fetched                                                   |
| Bing Webmaster Tools  | `NEXT_PUBLIC_BING_SITE_VERIFICATION` for HTML meta verification, or supported account/DNS method     | Ownership accepted; sitemap fetched                                                   |

Telemetry requires `NEXT_PUBLIC_TELEMETRY_ENABLED=true` in the intended Next.js
deployment, plus the individual service configuration. Analytics additionally
requires the visitor's saved choice. Sentry is separate from that choice.
Rebuild after changing public values. Keep ordinary preview deployments off.
Search verification does not depend on telemetry and loads no tracking script.

Follow [observability.md](observability.md) for provider settings, privacy,
route exclusions, shutdown and acceptance tests. Do not add duplicate GA/GTM
tags. Follow [seo.md](seo.md) for domain, indexing and sitemap checks. Set
budgets and retention before activation. Do not mark provider delivery complete
from a local test or from the presence of keys alone.

## Other services that are not required

- Maps: browser location and distance calculations work without a Mapbox account.
- Payments: households are paid directly by cash or UPI. Business escrow remains
  a demonstration; the application does not move funds. Do not create payment
  keys expecting this prototype to process money.
- Email and storage: Resend and Cloudflare R2 are not required. Existing private
  application documents use Convex storage.
- Native app distribution: follow the separate [app release checklist](app-releases.md)
  for Expo, Apple, Google, signing certificates, environment values and update feeds.

## Enable and verify

1. Configure the production values above. Follow
   [environments.md](environments.md) to deploy the Convex schema and functions
   before the matching frontend.
2. Create the admin at `/admin/setup`. Enable two-factor authentication and store
   its recovery codes securely. Check that `/admin` requires that session.
3. Back up existing data. Apply the
   [material-name repair](../migrations/2026-10-01-material-names.md) from the
   admin account. It fills absent translations and preserves existing names.
4. Enter real Bengaluru floor and fallback prices. Verify pilot shops through
   the normal application flow; sample/demo prices are not market evidence.
5. Test an SMS send and sign-in on a real approved template. Check a failed send,
   a resend, expiry and the server rate limit. Provider acceptance is not proof
   that a phone received the message; verify the handset too.
6. Book a pickup, decline or time out the first offer, and confirm the next shop
   receives it. Check the tracking link, quote, cancellation and audit history.
7. Confirm the weighed receipt adds stock and points once. Check the household
   payment directly with the operator; the application records it only.
8. If AI is enabled, check a valid scrap photo, a dark photo, a non-scrap photo,
   quota exhaustion and a provider failure. Manual entry must remain available.
9. Read the pilot report in the admin console. Review its time range and any
   truncation warning. It includes all records in that range, including demo
   records. Use a deployment with real pilot data for business decisions.
10. Have native speakers check Kannada, Hindi and the other launch languages.
    Review long material names and mobile/RTL layouts.

Native shells are implemented, but signing, store approval and device acceptance
remain release steps. Real escrow and other deferred work are not enabled by
adding keys. Check
[features.md](../product/features.md) for the current implementation boundary.
