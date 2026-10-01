# App release and account checklist

> Status: implementation runbook, 1 October 2026. No account, paid build, store
> submission, signing identity or update feed was created by this change.

## Run checks without accounts

Use Node 24 and the pinned pnpm version from the root of the repository:

```sh
pnpm install --frozen-lockfile
pnpm apps:check
pnpm --filter @luma/mobile exec expo install --check
pnpm mobile:export
pnpm --filter @luma/desktop smoke
pnpm desktop:pack
```

The mobile export creates iOS/Android JavaScript bundles, not installable APK,
AAB or IPA files. Desktop packing makes an unsigned host-platform application
in `apps/desktop/release`. The desktop smoke test needs a graphical session.
None of these commands publishes a release.

The `App packages` GitHub workflow checks both packages and exports mobile code
on relevant pull requests. Its manual run also creates unsigned macOS and Windows
test packages. This workflow was added locally; a hosted run is separate proof.
Full mobile binaries use local SDK tools or EAS Build after setup below.

## Sign up and configure

| Setup                               | Required values                                                                      | Where to put them                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| App hostname and Vercel deployment  | `EXPO_PUBLIC_APP_URL`, `DESKTOP_APP_ORIGIN`, recommended `https://app.luma.green`    | Mobile build/update environment; desktop build environment                          |
| Matching Convex auth configuration  | `SITE_URL` or exact additional `EXTRA_TRUSTED_ORIGINS`                               | Convex deployment; see the [pilot checklist](launch-checklist.md) for backend keys  |
| Expo account and EAS project        | `EXPO_PUBLIC_EAS_PROJECT_ID` (real project UUID)                                     | Mobile build and update environments                                                |
| EAS production update signing       | `LUMA_UPDATE_CERTIFICATE`, `LUMA_UPDATE_KEY_ID`; matching private key for publishing | Public certificate at build time; private key in secured release storage, never Git |
| Apple Developer Program             | Registered iOS app ID, distribution credentials, App Store Connect record            | EAS credentials or secured native build runner                                      |
| Google Play Console                 | Android application ID, upload keystore, Play App Signing and test track             | EAS credentials / Play Console; keystore outside Git                                |
| macOS Developer ID and notarization | `CSC_NAME`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`               | macOS build runner keychain and secret store                                        |
| Windows code-signing provider       | `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`, `DESKTOP_WINDOWS_PUBLISHER`                  | Windows runner; use an Electron Builder supported certificate/provider setup        |
| Public HTTPS desktop download host  | `DESKTOP_UPDATE_URL`, separate platform directories                                  | Desktop build environment; publish only signed public artifacts and feed files      |

The proposed identifiers are `green.luma.app` for mobile and
`green.luma.desktop` for desktop. Verify ownership before the first signed
release. Public variables are embedded in installed applications. They must not
contain secrets. An Expo account does not prove access to every paid feature;
check current [EAS code-signing availability](https://docs.expo.dev/eas-update/code-signing/)
before selecting a plan. Signing keys and desktop publisher identities must stay
stable across updates.

## Build, test, then release

1. Deploy and test the chosen HTTPS app origin with its correct backend and auth
   allowlist. A hostname default in source code does not provision that service.
2. Follow the [mobile release guide](../../apps/mobile/README.md#updates-and-releases)
   for preview APK/device builds, production store builds, signed EAS updates and
   rollback tests. Keep preview and production channels separate.
3. Follow the [desktop release guide](../../apps/desktop/README.md#signed-releases-and-automatic-updates)
   on macOS and Windows. Verify OS signatures and notarization, then publish
   artifacts first and generated feed metadata last.
4. Test a previous signed install upgrading to the candidate. Confirm that Later
   keeps an active form intact, Restart requires a choice, and sign-in survives.
   Test a bad signature, an unavailable feed and recovery to a known-good version.
5. Run real-device tests: login/logout/session expiry, uploads and camera,
   location permission denial, offline recovery, Android back, private files,
   RTL, large text and screen readers. Record build IDs, device models and OS versions.
6. Complete store privacy declarations, permission reasons, review credentials,
   screenshots and the selected test track. Store acceptance is not established
   by successful compilation. Reassess minimum functionality before submission.

Use the [delivery record](../delivery/apps-and-motion.md) for local evidence.
Operational work needs an internet connection. No background location, push
service, offline write queue or independent native ledger is included.
