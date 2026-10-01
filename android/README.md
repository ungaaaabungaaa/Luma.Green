# Android

The shared Android/iOS app now lives in [`apps/mobile`](../apps/mobile/README.md).
It uses Expo managed configuration and Continuous Native Generation. The web
view keeps the existing Next.js/Convex flows and their authenticated app origin.

Run `pnpm --filter @luma/mobile android` from the repository root after installing
a supported JDK, Android SDK and emulator/device. Expo generates
`apps/mobile/android/`; do not create or commit a second native project here.
Generated Gradle files, APKs and AABs remain ignored.

JavaScript export is not a signed Android build or Google Play release. Play
Console ownership, signing, real-device permissions and update delivery remain
release checks in the mobile runbook. Compatible shell JS can use EAS Update;
native changes still need a new signed binary. Push/FCM setup is not included.
