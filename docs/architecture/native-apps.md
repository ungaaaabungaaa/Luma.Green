# Native apps

> Status: source implementation, 1 October 2026. Signed releases, native device
> acceptance and store approval are not yet verified. Decision: [ADR 0014](../decisions/0014-shared-web-ui-in-native-shells.md).

The repository has three application packages. The root Next.js package owns all
operational screens and calls the existing Convex backend. `apps/mobile` uses
Expo / React Native for iOS and Android. `apps/desktop` uses Electron for macOS
and Windows. Root `android/`, `ios/`, `macos/` and `windows/` folders contain the
platform entry guides; there are no duplicate applications in those folders.

The native packages load one exact trusted HTTPS origin. The proposed default is
`https://app.luma.green`, which must be deployed before release. It can point at a
separate Vercel project using this repository if app changes need a different
release schedule from `luma.green`. Authentication must trust the selected origin
through `SITE_URL` or `EXTRA_TRUSTED_ORIGINS` on the matching Convex deployment.
No native package gets a backend admin key or copies a login token to the browser.

| Owner             | Responsibility                                                                        |
| ----------------- | ------------------------------------------------------------------------------------- |
| Root Next.js app  | All role screens, browser forms, auth proxy, client-side validation                   |
| Convex            | Authentication, authorization, private files, durable records and business rules      |
| `messages/*.json` | All 12 web and native control languages; admin remains English                        |
| `apps/mobile`     | Safe areas, navigation, permission controls, offline recovery, EAS updates            |
| `apps/desktop`    | Sandboxed windows, local menus, safe downloads, offline recovery, signed updates      |
| `public/brand`    | Shared app icons, generated from the existing SVG by `scripts/generate-app-icons.mjs` |

## Update behavior

| Change                                    | Delivery                                                                  | When it applies                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Hosted operational UI                     | Deploy the trusted app origin                                             | Normal page navigation or reload; active forms are not forcibly refreshed |
| Mobile shell JavaScript/assets            | EAS Update, correct channel, compatible fingerprint, production signature | Later cold start or confirmed Restart                                     |
| Mobile native runtime/modules/permissions | New signed native binary and applicable store/test distribution           | OS installation/update                                                    |
| Desktop executable                        | Signed installer/ZIP plus generated feed metadata                         | Automatic download, installation on quit, or confirmed Restart            |

The app origin and backend must stay compatible with supported installed shells.
EAS Update updates the mobile shell, not the Next.js server. A native runtime
cannot be kept forever: security fixes and new permissions need binary releases.
The desktop updater also changes binaries; it removes the need to download each
installer by hand, but still needs a process exit or restart to apply it.

## Security and UX boundaries

Mobile navigation passes through an exact-origin policy. External destinations
require confirmation. Unknown schemes and blob URLs are blocked. Admin routes
open in the external browser because private blob documents require a different
file-handling path. Users sign in there separately. Offline recovery retains the
WebView's cookie store but does not allow offline transactions.

Electron does not expose Node, a preload bridge or arbitrary native IPC to hosted
pages. Context isolation and sandboxing stay on. Only app-origin navigation and
restricted private blob windows stay inside the app. Geolocation requires an
explicit grant; other native permissions are denied by default.

Native packages have their own TypeScript checks and dependency versions. Expo's
React version stays isolated from Next.js. Generated platform projects, app
bundles and signing secrets are ignored. Native controls use React Native
primitives and system fonts; DOM components remain in the web app.
The mobile package also uses the TypeScript version required by Expo, independently
of the web compiler; run both package checks before changing compiler versions.
Mobile runtime copy is a compact generated catalogue; its test rejects stale
output. Regenerate it with `pnpm --filter @luma/mobile messages:generate` after
editing the shared native/common/brand copy. Desktop extracts the same required
namespaces during `prepare:app`.

See the [mobile guide](../../apps/mobile/README.md) and
[desktop guide](../../apps/desktop/README.md) for platform behavior and tests.

## Official references checked

- [Expo update runtimes](https://docs.expo.dev/eas-update/runtime-versions/) and
  [update signatures](https://docs.expo.dev/eas-update/code-signing/).
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
  and [desktop updates](https://www.electronjs.org/docs/latest/tutorial/updates).
- [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/):
  downloaded-code restrictions and minimum functionality still apply.
- [Google Play developer policy](https://support.google.com/googleplay/android-developer/answer/16313518):
  update mechanisms do not remove policy obligations.
