# Account and deployment checklist

> Status: approved setup plan, updated 6 October 2026. Account ownership and
> provider activation are unverified except the known GitHub, Convex and Vercel
> projects. No secret values belong in this file.

The founder should verify existing accounts before creating duplicates. The
required production paths are verified email/password and phone OTP, workspace
invites, and gateway-only B2B payments. Local development delivery is strictly
local. This plan supersedes older references to optional email, demo escrow or
cloud test-code delivery for this work. It does not claim these new flows are
implemented or deployed. Use the [Saturday test plan](../testing/launch-2026-10-10.md)
for test steps and release criteria.

## Accounts to prepare now

| Account or access            | Founder action and proof required                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                       | Reuse the existing repository. Confirm owner/recovery access, protected main, Actions and the required checks on the release SHA. No new account if access works.                                                                                                                                                         |
| Convex                       | Reuse the existing project. Verify access to development `glorious-rooster-470` and production `outstanding-buzzard-942`. Both were reset empty and paused on 6 October. Keep them paused until the validated release action. Prepare correctly scoped deploy keys and backups.                                           |
| Vercel                       | Reuse project `luma_green`. Verify repository/branch binding, owner/billing access, build command, per-environment variables and exact release deployment. Do not create another empty project.                                                                                                                           |
| Domain registrar or DNS host | Verify ownership and DNS access for `luma.green`. Configure only the records shown by Vercel and Resend. Verify HTTPS, canonical domain and any `www` redirect.                                                                                                                                                           |
| Better Auth                  | No account signup is needed for the self-hosted library already in the app. “Butter Auth” is interpreted as Better Auth. Configure the backend secret and approved origins; do not sign up for an unrelated product.                                                                                                      |
| Resend                       | Create an account or verify existing owner access. Verify an owned sending domain/subdomain through DNS, choose the sender and create a restricted sending API key. This enables the planned normal-user verification, reset and invite email path after implementation. Verify inbox delivery, expiry and one-use links. |
| MSG91 and India DLT access   | Create/verify MSG91 account, sender/entity access, approved header and content templates, OTP setup, matching language content, account balance and limits. Map approved DLT details into MSG91. Prove delivery on a controlled handset.                                                                                  |
| B2B payment provider         | Select a provider after confirming the marketplace/vendor settlement model, eligibility, business onboarding, settlement bank account, refunds and disputes. Obtain sandbox access first, then live approval. A standard gateway account alone does not prove split-settlement access. Provider not yet selected.         |

Better Auth is installed as a library with an application secret; see
[its installation guide](https://better-auth.com/docs/installation). Resend
requires an owned verified domain and offers restricted API keys; follow
[domain setup](https://resend.com/docs/dashboard/domains/introduction) and
[API-key setup](https://resend.com/docs/dashboard/api-keys/introduction).

For India SMS, verify DLT entity/header/template and provider mapping status in
the actual dashboards. MSG91's [template setup](https://msg91.com/help/template/how-to-create-flow-id-to-send-sms-via-api)
requires matching approved content and sender details. Its
[DLT guidance](https://msg91.com/help/dlt-registration-in-india/dlt-content-template-faqs/)
mentions 2–4 business days for content-template approval. That is not a delivery
promise or an approval SLA. Start now; do not assume approval by Saturday.

[Razorpay Route](https://razorpay.com/docs/payments/route/) and
[Cashfree Easy Split](https://www.cashfree.com/docs/payments/split/overview)
are examples to assess, not selected vendors. Route's published eligibility
includes annual turnover above ₹40 lakh domestic or ₹5 lakh export and review;
confirm Luma's eligibility with the provider. Easy Split requires account-manager
enablement. Do not promise a payment launch before provider fit, code, signed
webhook handling, sandbox reconciliation and live approval all pass.

## Required environment settings

“Existing” means the name is already used in this repository. It does not mean
the value is configured, the account is approved or the feature is ready.
“Proposed” means part of the approved implementation; confirm the final code
contract before setting it. Secrets go in provider/Convex secret storage or the
approved password manager. `NEXT_PUBLIC_*` values are public.

| Setting and status                                                 | Destination and use                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` — existing                                  | Next.js/Vercel. Set the exact public HTTPS origin for production; use the chosen local origin in L1.                                                                                                                                                |
| `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` — existing | Local frontend uses local backend/HTTP-action origins. Vercel should receive its matching backend URL through the reviewed deploy build command. Never point a preview at production.                                                               |
| `CONVEX_DEPLOYMENT` — existing                                     | Local CLI target only. Check the resolved target before any command; a saved name is not evidence that the cloud service is active.                                                                                                                 |
| `CONVEX_DEPLOY_KEY` — existing secret                              | Vercel build secret: production key in Production scope, preview key in Preview scope. Never place the production key in local acceptance configuration.                                                                                            |
| `BETTER_AUTH_SECRET` — existing secret                             | Matching Convex backend. Unique random value of at least 32 characters per environment; keep it stable across normal deployments.                                                                                                                   |
| `SITE_URL`, `EXTRA_TRUSTED_ORIGINS` — existing                     | Convex auth origin policy. Allow only required exact origins; no broad preview wildcard. Local tests use local origins only.                                                                                                                        |
| `ADMIN_EMAIL`, `ADMIN_SETUP_TOKEN` — existing                      | Convex. Configured founder identity and separate private setup secret; remove the token after admin setup. Require admin TOTP.                                                                                                                      |
| `RESEND_API_KEY` — existing secret                                 | Convex only. Existing admin recovery adapter uses it; normal verification/reset/invite uses require the new implementation and tests.                                                                                                               |
| `AUTH_FROM_EMAIL` — proposed                                       | Convex only. Approved verified sender for normal email verification, recovery and invitation delivery. Exact sender value remains a founder choice.                                                                                                 |
| `ADMIN_RESET_FROM_EMAIL` — existing                                | Convex only. Existing admin recovery sender; preserve the separate configured-admin recovery boundary and TOTP.                                                                                                                                     |
| `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID` — existing               | Convex only. Approved account key and OTP template ID. Keep absent from L1 to prevent real sends.                                                                                                                                                   |
| `AUTH_DEV_MODE` — existing name, guard being tightened             | Local acceptance backend only. Legacy documentation that permits cloud preview/log-code use does not authorize it for this pass. Verify the final server guard rejects every cloud/production origin. Do not publish tokens/codes in ordinary logs. |
| Gateway keys and webhook secret — proposed, names undecided        | Server secret storage only, after provider selection. Keep sandbox/live keys separate. Do not invent a `NEXT_PUBLIC` secret or use a manual paid state.                                                                                             |

Confirm the final auth implementation's local delivery controls with the
engineer. A browser flag cannot enable local verification. If local Better Auth
components or persistence fail, record the blocker; do not move these disposable
accounts to cloud development without a new explicit decision.

## Backend and frontend deployment

The repository's normal `pnpm build` builds the frontend only. Review the
[official Convex Vercel setup](https://docs.convex.dev/production/hosting/vercel)
and use the project build command only when the release owner is ready:

```sh
pnpm exec convex deploy --cmd 'pnpm build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

This command changes the backend. It is not a local verification command.
Check the selected deployment and separate preview/production deploy keys
before use. Remove conflicting static Vercel backend URLs after validating this
build setup; the local URL settings remain local. Verify schema/functions/auth
component first, then the matching frontend and exact commit. Reactivating a
paused backend is a separate release step. Preserve the reset exports and test
recovery; do not rerun obsolete prototype migrations against an empty new schema.

## Status SMS and optional service settings

Status SMS is separate from OTP. Existing Convex settings are
`MSG91_NOTIFICATION_TEMPLATES` (event/language to approved Flow ID map),
`SMS_NOTIFICATION_BASE_URL` and optional
`MSG91_NOTIFICATION_ENGLISH_FALLBACK`. Use the exact eight events and `VAR1`
contract in [SMS notifications](sms-notifications.md). The key is shared with
OTP; template IDs are not. A disabled event is not sent later merely because
keys are added. Verify provider acceptance and handset delivery separately.

These are optional feature accounts, not prerequisites for core onboarding:

| Account or service                             | Existing settings and activation proof                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenRouter or self-hosted vision               | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `PHOTO_ESTIMATE_DAILY_LIMIT`; or `PHOTO_ESTIMATE_PROVIDER`, `PHOTO_ESTIMATE_ENDPOINT`, `PHOTO_ESTIMATE_API_KEY`, `PHOTO_ESTIMATE_MODEL`. Convex only. Choose one path, cap costs and evaluate representative photos. Manual entry stays available.                   |
| Sentry                                         | `NEXT_PUBLIC_TELEMETRY_ENABLED`, `NEXT_PUBLIC_SENTRY_DSN`; optional private build `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. Verify scrubbed error receipt.                                                                                                                                          |
| PostHog and GA4                                | Telemetry flag plus `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Require visitor consent and safe public-page event receipt; no private form/record tracking.                                                                                                       |
| Google Search Console and Bing Webmaster Tools | DNS ownership or `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_BING_SITE_VERIFICATION`. Verify ownership and sitemap fetch; this does not prove indexing.                                                                                                                                              |
| NewsAPI                                        | Convex `INDUSTRY_NEWS_ENABLED`, `INDUSTRY_NEWS_API_KEY`, `INDUSTRY_NEWS_DAILY_LIMIT`. Verify a plan and rights that permit the intended production use.                                                                                                                                                        |
| data.gov.in and public weather data            | Convex `PUBLIC_DATA_ENABLED`, `DATA_GOV_IN_API_KEY`, `DATA_GOV_IN_AIR_RESOURCE_ID`, `MET_NORWAY_USER_AGENT`. Follow [public data](public-data.md); check source freshness, attribution and unavailable states.                                                                                                 |
| Browser push                                   | Convex `WEB_PUSH_ENABLED`, `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`. Generate the VAPID pair securely; obtain device permission and verify cleanup/revocation. No separate Mapbox or storage account.                                                                                 |
| Expo and mobile stores                         | Expo/EAS project; Apple Developer and Google Play Console for their store releases. `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_APP_URL`; optional server `EXPO_PUSH_ENABLED`, `EXPO_PUSH_ACCESS_TOKEN` and platform push credentials. Verify signing, devices, updates and store approval.                     |
| Desktop signing and release host               | Apple Developer ID/notarization and Windows signing as applicable. `CSC_NAME`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`, `DESKTOP_WINDOWS_PUBLISHER`, `DESKTOP_UPDATE_URL`, `DESKTOP_APP_ORIGIN`. Use secured build storage and signed update tests. |
| WhatsApp Business                              | Later channel. No current signup or launch requirement; approve its business/channel design before setup.                                                                                                                                                                                                      |
| CodeRabbit, uptime tool and backup destination | Optional operations/review tools. Verify existing access before adding accounts. Enable only a chosen service with an owner and tested alert/recovery path.                                                                                                                                                    |

Follow [observability](observability.md), [search](seo.md),
[push notifications](push-notifications.md) and [app releases](app-releases.md)
for the full feature contracts, including native update signing. Expo documents
store accounts and signing in its [build guide](https://docs.expo.dev/deploy/build-project/).
Keys alone do not prove delivery, store approval or a working release.

No Mapbox account is required now: location uses the browser. No Cloudflare R2
account is required now: private documents use Convex storage. No separate
Better Auth hosted subscription is needed for the library. Household cash/UPI
payment is between the kabadiwala and household; it does not require Luma to
open a gateway account for that payment.

## Founder setup record and acceptance

For each service record: owner, account/project alias, environment, requested
feature, approval status, expiry/rotation owner, cost limit, verification date
and evidence link. Never record a password, key, private token or full personal
identity document here. Use NOT STARTED, REQUESTED, APPROVED, CONFIGURED,
SANDBOX VERIFIED and LIVE VERIFIED as separate stages.

Before launch, run the dated test plan. In particular, prove both verified
signup methods, reset and TOTP, invite/revoke and cross-org denial, exact
household receipts, PET evidence, gateway blocking/reconciliation and signed-out
private-file denial. Check the actual inbox/handset for enabled messages.
Update the existing Google user guide from the reviewed Word source after the
browser tests; keep its document ID and sharing. Distribute local test passwords
only through the restricted annex to the named test team.

Current account blockers remain: Resend domain/sender and delivery, MSG91/DLT
approval and handset delivery, gateway selection/onboarding, final deployment
and native release accounts where required. No new account was created by
writing this checklist. Saturday launch remains conditional on the tested scope.
