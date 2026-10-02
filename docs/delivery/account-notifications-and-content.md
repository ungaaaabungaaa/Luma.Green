# Account, notifications and public content pass

Status: source, artifacts and local checks complete; final hosted checks pending, 2 October 2026.
Branch: `feat/account-notifications-detail`, based on UI checkpoint `0f052c0`.
Do not read a planned check below as a completed release gate.

Local checkpoint `bc986f4` saves the account, notification and public detail
source. Main then advanced to `af2e295` with the industry API. The combined work
preserves both features and extends that API screen to all 33 locales. Final
captures, artifacts and checks must describe this combined source.

## Accepted scope

- Keep household/operator phone codes. Add optional authenticator and recovery
  codes through the real auth session boundary. Admins retain password + TOTP.
- Add admin password visibility, useful password guidance and optional recovery
  through a configured email provider. No password flow for phone-only users.
- Add a private inbox, optional browser/Expo delivery and desktop notices while
  the app process runs. Explicit permission; no automatic prompt on arrival.
- Provide compact account navigation for households and operators. Revocation
  must finish before sign-out. Errors retain a retry path.
- Add distinct, compressed editorial images and useful content to How it works,
  Prices, Join, Participants, Standards and Help. Preserve square image edges,
  neutral themes, translated copy and server-rendered public sections.
- Finish account-free app code and local checks. Apple, Google Play and Expo/EAS
  accounts are not set up. Add the operator setup steps; do not create accounts,
  purchase services or claim store acceptance.
- Maintain the guide, current browser captures and both reviewed Word artifacts.
  Keep the existing Google Docs ID and its explicit update-pending state.

## Ownership and integration

| Area                                        | Owner during this pass | Shared boundary                                  |
| ------------------------------------------- | ---------------------- | ------------------------------------------------ |
| Auth, TOTP and admin recovery               | Account-security agent | Better Auth HTTP handler, Convex session and JWT |
| Inbox and optional delivery                 | Notification agent     | Existing booking/application event owner         |
| Public sections and guide                   | Documentation agent    | Shared image/banner components and guide inputs  |
| Native controls, navigation and integration | Root agent             | Trusted origin, install identity and sign-out    |

Root merges new catalogue fragments and regenerates native copy. Changes from
separate user-owned chats are not assumed present or silently copied. The PR
path in AGENTS.md owns main integration. Do not override a required red check.

## Evidence collected so far

- Native checks: 40 mobile tests and 21 desktop tests passed, with package types.
- Mobile export: Android and iOS Hermes bundles produced; 689 modules, about
  1.7 MB each. This is JavaScript export proof, not installable APK/AAB/IPA proof.
- Account controls: 20 focused tests passed across menu, logout, app shell and
  booking flow, with a 20-second diagnostic test limit under concurrent load.
- Independent native review found and corrected repeated inbox taps after a
  prior in-app navigation. It also identified the permission-dialog timeout and
  assigned its correction to the web bridge owner.
- Expo dependency compatibility passed against the installed SDK map. The CLI
  was offline; this is not an online latest-version audit.
- Expo native configuration introspection passed. The unsigned macOS package
  and Electron smoke test passed, including sandbox, blocked popup, private
  document preview and Arabic offline/retry behavior. No OS push was sent.
- The auth slice passed 48 tests. Real Better Auth handler tests include
  concurrent challenge and backup-code redemption, legacy trust-cookie
  rejection, and invalidation of earlier login proofs after password reset.
  Independent source review found no remaining blocking auth issue.
- Admin password controls passed all 18 tests after the validation refactor,
  covering show/hide, reset validation, provider errors and recovery links.
- The notification slice passed 50 focused cases, including optional-query
  failure isolation, slow consent dialogs and failed-cleanup retry after reload.
- After main integration, TypeScript and 1,382 source/backend tests passed.
  This preflight excludes the catalogue and document freshness suites while
  their final translations and artifacts are being prepared. The combined
  push/API/auth boundary also passed 112 focused tests.
- Application submission and approval now assert the new inbox audit event,
  unread state and recipient ownership. All 56 relevant workflow tests passed.
- A read-only public price-board check at 08:05 UTC confirmed 26 priced
  materials and 780 history points in both development and production. The
  code/today/series projections have the same SHA-256:
  `8931271fd0afe624f0f4c92c62ce72ffb3d86b14e57c216e58671d071293fb24`.
  This verifies the earlier sample import, not market-price accuracy.
- Checkpoint PR 29 passed build, lint, formatting and types. Its full-catalogue
  seed integration cases exceeded the hosted unit test's 5-second default.
  Those cases retain all assertions with a scoped 60-second cap. Recheck the
  actual PR head before merge; the earlier green jobs do not cover later edits.
- That checkpoint's hosted browser run passed all 713 cases in 15.8 minutes.
  Its 20-minute job budget then expired during the separate analytics build.
  The budget is now 30 minutes so both builds and all browser checks can run;
  no assertions, cases or required checks were removed.

## Final combined verification

- All 33 catalogues include the industry API workflow. The 110 catalogue and
  validation checks passed. This proves key, argument and mechanical coverage;
  native-language review remains separate.
- The focused production-browser run passed 36 cases across account, auth,
  public detail and API routes. The public visual matrix passed 48 contexts
  with 144 original browser captures across six routes, both themes, phones,
  tablets, desktops, Arabic and Tamil. All originals were visually reviewed.
- Final public, showcase and team captures were recaptured from the combined
  source. The 72 protected captures use synthetic records and disabled writes;
  they do not prove authenticated access or live provider execution.
- Visual inspection corrected tablet image sizing, narrow Tamil/Malayalam
  action labels and Arabic/Urdu expiry-selector direction. The selector
  regression suite passed all 16 cases; its 90 API captures were refreshed.
- Configured analytics passed all five browser cases with fake keys and all
  external requests intercepted. Both current consent captures were inspected.
- The team Word document has 47 reviewed pages, 12 screenshot placements and
  a 92-case manual. Its source/screenshot freshness checks passed.
- The platform Word guide has 99 reviewed pages, 40 chapters and 93 image
  placements. All 13 document tests and both builder freshness checks pass.
- The final disconnected production build passes with 2,622 generated pages.
  The six API browser cases also pass against that final build.
- Final combined lint passed with no errors and one existing translation-review
  TODO warning. The complete `pnpm check` passed: TypeScript, 1,496 web/backend
  tests, 40 mobile tests and 21 desktop tests. Formatting passed. Hosted CI must
  still pass on the final PR head before merge.

## Remaining proof before completion

1. Commit source, screenshot manifests and Word files together, update PR 29
   and merge only after required checks pass. Do not monitor frontend
   deployments; the founder excluded that work.

## Security-main integration

Checkpoint `a3c890e` passed all five required hosted checks, 734 browser cases
and five configured analytics cases. During that run, PR 31 merged security
repair `2ba8246` into main. The next integration preserves its admin bootstrap
token, active-record limits, exact money arithmetic, safe async failures,
optional monitoring recovery and native navigation policy.

The existing account and admin sign-out hooks remain canonical: device
revocation runs before server sign-out, failed requests retain the current
screen, and pending actions cannot run twice. The unused incoming hook was
removed after its failure tests were moved into the canonical hook coverage.
All 33 catalogues include the new support-quota and invalid-total messages.

Current combined proof: production build (2,622 pages), 1,567 non-document
tests, 62 focused browser cases, five isolated analytics cases, 69 focused auth
cases, 88 focused controls cases, 43 mobile tests, 22 desktop tests and lint pass.
The final RTL selectors also pass 21 focused tests and original browser review.
All capture sets are refreshed. The user guide has 103 reviewed pages, 40
chapters and 99 image placements; the team pack has 47 reviewed pages and a
92-case manual. Both Word builder freshness checks and all 15 document tests pass. The final
complete `pnpm check` passes: lint, TypeScript, 1,582 web/backend tests, 43 mobile
tests and 22 desktop tests. Formatting passes. Earlier green hosted checks do
not establish the new head; wait for the final commit checks before merge.

The native Google Doc is verified through main `2ba8246`. The combined local
Word revision remains pending the coordinated in-place sync after PR 29 merges;
the stable document ID, folder and sharing are preserved. The security followup
also owns the backend integration and rollout that preserves the ecosystem,
API, account and notification schema together.

## Release limits

No new native signing, store upload, APNs/FCM/provider message or native device
acceptance is claimed. Optional push and admin recovery stay off without their
settings. See [app release setup](../operations/app-releases.md#notification-setup).
Production demo prices were imported in the earlier checkpoint; this pass does
not imply the new auth and notification functions have been released to Convex.
The [price import record](selection-prices-and-account-ux.md) owns that separate
production proof.

The parallel recycling-ecosystem task has deployed its own backend additions.
Do not deploy this branch over that schema. Integrate the branches and validate
the combined backend before its next release. The optional notification query
boundary keeps ordinary app pages available when new inbox/push functions have
not yet been released. Account security and inbox acceptance still need that
combined backend release and approved staging users.
