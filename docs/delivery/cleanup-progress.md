# UI and pilot readiness pass

> Implementation pass, 1 October 2026. Starting commit: `3d1e720`.
> Branch: `feat/pilot-readiness-cleanup`. Local work only; no push or deployment.

## Scope and baseline

Continue the existing application. Improve the UI, translations and user flows,
remove unused dependencies, and complete useful pilot work. Keep the white and
green design, twelve locales, integer paise and grams, and role permissions.
External accounts and credentials remain an operator setup task. No live data
was changed and no live SMS or AI request was made.

The clean clone passed lint, types and 900 unit tests in 107 files. Five isolated
worktrees separated UI, translations, pilot/backend work, photo estimates and
SMS notifications. The primary checkout integrated and checked the changes.

## Implemented

| Work                     | Result                                                                                                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile, keyboard and RTL | Larger controls, scrollable menus/dialogs, tablet navigation, skip links, focus handling, localized close labels; language changes preserve query and hash                                                                         |
| Translation coverage     | 2,176 matching message keys in all 12 locales; ICU variable/plural/tag checks; 26 materials named in every locale; 234 missing catalogue names filled                                                                              |
| Material-name repair     | Admin-only, two-factor protected and audited; fills missing known-code names without replacing existing names; not run against live data                                                                                           |
| Pickup dispatch          | Service radius, opt-in auto-accept with an actual shared location, 15-minute offer expiry, reassignment with quote protection, stale-timer guards and audit history                                                                |
| Household prices         | Basket and photo preview use the fallback table; selected-shop prices determine offers. Distinct market/fallback values are covered by tests                                                                                       |
| Sign-in                  | Per-number SMS limits, checked provider errors, duplicate-request guards, network recovery, bounded session wait and profile retry without resubmitting an accepted code                                                           |
| Photo estimates          | Optional and hidden without configuration; one transient image, catalogue validation, integer gram ranges, explicit review, 100g basket precision, paid-call quotas, bounded response and timeout; no stored photo or model output |
| Status SMS               | Eight event types, atomic outbox/deduplication, per-profile send limits, locale template map, stale-event suppression, audit history and no automatic retries                                                                      |
| Pilot report             | Admin period/cohort totals, acceptance/review time, receipt weights and payments, estimate comparison, empty states and truncation warnings                                                                                        |
| Dependency cleanup       | Removed Mapbox, Razorpay, Resend, query devtools and two unused AI SDK packages; load analytics only with configuration and keep the query provider scoped to admin                                                                |
| Account guide            | Exact environment locations and activation tests; corrected stale deployment-script claims and optional-service placeholders                                                                                                       |

## Verification

Verified on the integrated branch on 1 October:

- `next typegen` and `tsc --noEmit`: passed.
- `eslint .` and `prettier --check .`: passed.
- `vitest run --coverage`: **1,026 tests in 130 files passed**. Coverage: 78.24%
  statements, 71.76% branches, 76.06% functions and 79.07% lines.
- `pnpm build --webpack`: passed; **925 static pages generated**.
- `CI=1 PORT=3100 pnpm e2e`: **39 Chromium browser tests passed** against that
  production build, including phone/tablet navigation in English, Arabic and
  Urdu, skip links, URL-preserving language changes and reduced motion.
- `git diff --check`: passed. Commit hooks ran lint/format and commit checks.

Browser tests use the app without a connected Convex backend. Authenticated
flows and provider adapters are covered by component and Convex tests with
mocked providers; deployed end-to-end checks remain in the launch checklist.

Local implementation commits:

- `bb3eb1b`: analytics/dependency cleanup.
- `cfcad80`: material translations and ICU contracts.
- `e949586`: dispatch, SMS limits and pilot backend.
- `af9a027`: UI, admin reports and pricing correction.
- `c6b51a0`: auth recovery.
- `caf87bf`: optional photo estimates.
- `85b9d73`: status SMS outbox and hooks.

The final delivery commit records the setup guide, corrected product boundaries
and the two test expectations for the new demo/escrow wording.

Independent reviews found and resolved three notable issues: dispatch must not
skip eligible shops after an arbitrary first-200 slice; accepted-code recovery
must not ask for the consumed OTP again; photo midpoint precision must match the
editable basket. Notification review also confirmed stale-offer suppression and
manual/drop-off acceptance coverage.

## Remaining external proof and product limits

- [Launch checklist](../operations/launch-checklist.md): configure Convex,
  Vercel, MSG91 and optionally OpenRouter. Set a hard provider spending limit.
- The default Turbopack build is blocked on this host by an internal worker-port
  permission error. Webpack production verification is recorded separately.
- No hosted CI, production deployment, account approval, handset delivery or
  model accuracy is implied by local checks. Native speakers must review launch
  translations.
- SMS provider acceptance is not delivery. No delivery webhook or resend UI is
  implemented. Auto-accepted pickups and drop-offs do not send owner offer SMS;
  their live app views still work. Outbox rows have no automatic purge yet.
- Pilot reports include demo rows in their selected period. They do not measure
  photo conversion, original AI accuracy or abandoned forms. Reports cap each
  cohort at 1,000 rows and show warnings when truncated.
- Large-city dispatch may need a spatial index as the active-shop set grows.
  Device IDs can rotate; the global AI quota and provider spending limit bound
  paid calls, while manual entry stays available.
- Business escrow is a demonstration. Households receive cash/UPI directly;
  the application records payment. Native apps, live payment processing and
  later roadmap services remain separate work.
