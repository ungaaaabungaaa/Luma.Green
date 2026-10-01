# Mobile demo readiness

Scope: improve the existing Android/iOS shell for a repeatable demonstration.
No new product features, providers, authentication bypass or production release
were added. The shell still shares the hosted Next.js screens and Convex data.

## Added

- `demo:ios`, `demo:android` and `demo:device` in `apps/mobile/package.json`.
- A bounded origin readiness check before Metro starts; `--check` runs it alone.
- Correct simulator/emulator host selection, with explicit HTTPS configuration
  required for physical phones. A release profile cannot run the demo command.
- Tests for host mapping, release-profile rejection, physical-device policy,
  unavailable servers and unsafe redirects.
- A run guide in `apps/mobile/README.md` for the native tools and installed
  development build required before a device demonstration.

The source had no Android development HTTP defect: the generated `debug` and
`debugOptimized` manifests already set `usesCleartextTraffic=true`. No permission
or manifest change was needed. Release origin restrictions remain in place.

## Local evidence

- `pnpm --filter @luma/mobile check`: TypeScript and **27 tests passed**.
- Scoped ESLint for the launcher and tests: passed.
- `pnpm --filter @luma/mobile export`: iOS and Android Hermes bundles exported
  to ignored `apps/mobile/dist` (627 iOS modules, 625 Android modules).
- Expo dependency check: bundled dependency map reports up to date; its remote
  version endpoint was unavailable, so this is an offline compatibility check.
- Both `demo:ios --check` and `demo:android --check` reached the current
  `http://localhost:3004` web preview through the correct host mapping.
- `demo:ios` launched Metro on port 8081 in development-client mode, printed
  its QR/deep link, and stopped cleanly with Ctrl+C. No simulator or phone
  connected during this launcher smoke.

The `dist` bundles are JavaScript assets, **not APK, AAB or IPA installers**.
No mobile OS runtime, sign-in, camera, location, signed update or store approval
was verified in this pass.

## Device and build gates

The current Mac has Apple's Command Line Tools only. `xcrun simctl` is absent,
`java_home` finds no Java runtime, `adb` is absent and `~/Library/Android/sdk`
does not exist. No large SDK downloads or account setup were performed.

1. For iOS simulator: install full Xcode and a simulator runtime, select its
   developer directory, then build with the intended development origin using
   `pnpm --filter @luma/mobile ios`. A physical iPhone also needs appropriate
   device signing and registration.
2. For Android: install the supported JDK and Android SDK/emulator or connect
   an approved USB device; build with `pnpm --filter @luma/mobile android` and
   the intended origin variables. The emulator development origin is
   `http://10.0.2.2:3004` with `EXPO_PUBLIC_ALLOW_LOCAL_HTTP=1`.
3. For a physical phone: set a tested HTTPS origin and matching Convex auth
   allowlist. Set the same origin for the installed development build and Metro.
   Use an approved test account for protected features.
4. EAS preview builds are an alternative after Expo project and signing setup.
   Follow `docs/operations/app-releases.md`; no EAS build was purchased or run.
5. Run the native acceptance list in `apps/mobile/README.md` on each actual OS
   before calling the mobile apps release-ready.

## Demo sequence

Open the homepage, Participants, role help and prices. Switch to Kannada and
Arabic. Show normal sign-in only against the configured test backend. Then show
Back, Reload, offline recovery and return to a trusted page. Use the desktop or
browser for admin pages; the mobile shell deliberately hands them off. Treat
illustrated public previews as explanations, not live transaction records.

Guide impact: add the demo launch commands and native toolchain limits to the
platform guide's app setup section. There is no mobile screen or permission
change to recapture. The parent task owns the guide/PDF rebuild.

Official references reviewed: [Expo development workflow](https://docs.expo.dev/get-started/start-developing/)
and [development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/).
