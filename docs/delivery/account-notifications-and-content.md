# Account, notifications and public content pass

Status: implementation and verification in progress, 2 October 2026.
Branch: `feat/account-notifications-detail`, based on UI checkpoint `0f052c0`.
Do not read a planned check below as a completed release gate.

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

## Remaining proof before completion

1. Finish auth and notification tests, including real-handler session/JWT
   withholding, expired/replayed codes, recovery, optional email reset and
   installation ownership/revocation.
2. Run the complete local check and format gate. Run the disconnected production
   build and focused browser flows; inspect current light/dark phone, tablet,
   desktop and translated captures. Keep fixture evidence explicitly labelled.
3. Rebuild the user guide and team document, inspect every page, record hashes
   and commit source, screenshot manifests and Word files together.
4. Commit coherent slices, update PRs and merge only after required checks pass.
   Do not monitor frontend deployments; the founder excluded that work.

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
