# Apps, motion and imagery

> Implementation record, 1 October 2026. Start: `acd549e`, clean checkout on
> `feat/pilot-readiness-cleanup`. The previous pilot checks passed: 1,026 unit
> tests, 39 browser tests, lint/types/format and Webpack production build.

## Requested outcome and decisions

Add restrained GSAP motion and useful generated imagery. Provide Android, iOS,
macOS and Windows apps in this repository, with automatic updates where allowed.
Keep one backend and reuse the existing operational UI as much as practical.
The user explicitly authorizes self-assessed choices, parallel agents and local
commits. Account setup, signing and live release remain operator steps.

The native design uses Expo / React Native for Android and iOS, and Electron
for macOS and Windows. Both reuse the hosted Next.js UI and Convex backend.
Official Expo, Electron, Apple and Google references informed the update rules.
Hosted content, compatible JavaScript/assets and native binaries have separate
release paths. New native capabilities still need a signed binary release.
See [ADR 0014](../decisions/0014-shared-web-ui-in-native-shells.md).

## Work slices and ownership

1. Motion: lightweight GSAP boundary plus shared micro-interactions. Respect
   reduced motion, leave content visible without JavaScript, avoid animation on
   operational number changes, and clean up animations on navigation.
2. Imagery: generate a restrained recycling visual for the public home page;
   use it only where it improves the page, keep generated image provenance and
   the final prompt, compress for the web, and preserve all 12 locales.
3. Platforms: confirm native/update contract, then implement mobile and desktop
   packages with secure navigation, offline recovery and update/build settings.
4. Integration: workspace dependencies, tests, CI, architecture and release
   documentation, native/account checklist and independent review.

Agents own disjoint files in the main checkout. Root owns package installation,
workspace/build configuration, message catalogue integration, Git and the final
verification record. No production changes or paid provider calls are required.

## Implementation

- GSAP is loaded only for the public home page. Its short heading reveals clean
  up on navigation and respect reduced motion. Server-rendered content remains
  visible without JavaScript. Shared button feedback preserves focus and target size.
- A generated recycling illustration adds context below the home price card.
  The compressed WebP is 92,542 bytes. Its [prompt and provenance](../design/generated-images.md)
  remain in the repository; it does not claim to show a real pilot participant.
- The pnpm workspace isolates Expo's React version from Next.js. Native packages
  share catalogues and brand assets, and have their own type and policy checks.
  Platform entry guides replace the old Android/iOS placeholders.
- Mobile uses exact-origin navigation, native location controls, persistent
  web sessions, offline recovery and compatible signed EAS updates. Admin
  documents use an explicit external browser handoff with separate sign-in.
  Android photo capture delegates to the system camera app. Its config plugin
  adds the capture intent query; broad storage and direct camera permissions are
  blocked. Device backups are disabled for Android session storage.
- Electron uses sandboxed windows without Node or preload access. Private PDFs
  stay in a restricted blob viewer. Signed updates download in the background
  and install on quit; immediate restart requires a choice.
- The [app workflow](../../.github/workflows/apps.yml) checks both packages and
  exports mobile JavaScript. Manual runs package unsigned macOS/Windows test apps.
  Account setup and release steps are in the [app runbook](../operations/app-releases.md).

## Verification record

Local evidence, 1 October 2026:

- Web: 1,031 unit tests in 131 files pass with coverage. Statements 78.08%,
  branches 71.70%, functions 75.92%, lines 78.92%.
- Production: `next build --webpack` succeeds and generates 925 pages. Root
  TypeScript checks pass. The prior host-specific Turbopack worker restriction
  remains; no Turbopack success is claimed.
- Browser: all 42 Playwright tests pass, including real GSAP activity, preference
  changes, navigation cleanup, no-JavaScript content and Arabic reduced motion.
  An initial motion test expected `/en/sell`; corrected to canonical `/sell`
  under the existing `localePrefix: as-needed` rule, then reran the full suite.
- Visual: desktop home and 390px Arabic home inspected. Image loads and mobile
  content width equals viewport width. The main calls to action remain above it.
- Desktop: 19 policy/config/locale/updater tests, strict `checkJs`, real macOS
  Electron smoke and unsigned ARM64 directory packaging pass. The smoke uses a
  disposable profile and local fixture. It checks Node isolation, blocked file
  popups, actual built-in PDF viewer loading, Arabic offline text and recovery.

Independent review found and closed Android dead-renderer reload, history-only
navigation spinner, unsigned production OTA configuration, and delayed desktop
download-error reporting defects. Root review also closed English locale reset
and malformed external-handler URLs. PDF smoke was strengthened after a window
opening alone failed to prove the internal viewer had loaded.

The mobile shell now includes a 30,135-byte catalogue generated from the root
native/common/brand namespaces, with a stale-output test. It previously bundled
all 3,041,866 bytes of web copy. Hermes output fell from about 3.41 MB to 1.55 MB
per platform (about 55%). The root catalogues remain the only editable copy source.

Android config generation succeeds without SDK installation. The generated
manifest contains the capture intent query, permission removal directives and
disabled backups. `expo-system-ui` supplies the configured light theme. This is
prebuild configuration proof, not a Gradle build or final merged APK inspection.

Final `pnpm check` passes: repository ESLint, root TypeScript, 1,031 web tests,
23 mobile tests, 19 desktop tests and both native package typechecks. The final
format check and `git diff --check` pass. Android prebuild and both Hermes
exports pass after the permission and system UI changes. The frozen workspace
install also passes. Existing peer-range warnings remain for Unicorn/ESLint and
Better Auth/Vitest; they did not fail the fresh checks. No new peer mismatch was
introduced by the native packages.
Expo's online dependency check found that its SDK expects TypeScript 6.0.3; the
earlier offline compatibility map did not catch this. The mobile package now
uses its own 6.0.3 compiler, while the web package stays on 5.9.3. The online
compatibility check, mobile types, 23 tests and scoped lint then passed.
Both exports and the full aggregate check were rerun successfully after this
compiler change. The 42 browser checks and production build cover the unchanged
web code from the implementation commit.

## Git and handoff

Branch: `feat/pilot-readiness-cleanup`. Local implementation commits:

- `9ec96ce` — native clients, translated controls, guarded updates, GSAP and imagery.
- `e6d0e3a` — mobile TypeScript version required by the online Expo check.

Hooks ran successfully; no hook was bypassed. The documentation follows in a
separate commit. No new managed worktree was needed for these disjoint app/UI
slices. The existing primary checkout was used; the previous worktrees remain
archived. The production preview is left at `http://localhost:3004/`.

Local unsigned Mac artifact: `apps/desktop/release/mac-arm64/Luma.Green.app`.
Mobile JavaScript artifacts: `apps/mobile/dist`. Generated output is ignored by
Git. Nothing was published or submitted to a store. The next useful verification
is a signed preview mobile build and a Windows installer test with real accounts.

## Remaining release evidence

No native mobile binary was built on this host: full Xcode, Android SDK and a
working JDK are absent. Hermes exports prove bundle compilation only. Windows
execution, real-device permissions, real-backend native login, native private-file
flows, signing/notarization, EAS delivery, signed desktop update delivery, hosted
CI and store approval still need verification with the configured accounts.

Native apps require a network connection for operational work. There is no
offline ledger, push service or generalized native bridge. The new app origin
is a build setting and must be deployed; the code does not create DNS or a host.
The root Next.js app and Convex remain the only owners of operational flows.
