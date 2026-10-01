# iOS

The shared Android/iOS app now lives in [`apps/mobile`](../apps/mobile/README.md).
It uses Expo managed configuration and Continuous Native Generation. The web
view keeps the existing Next.js/Convex flows and their authenticated app origin.

Run `pnpm --filter @luma/mobile ios` from the repository root after installing
full Xcode and its simulator. Expo generates `apps/mobile/ios/`; do not create
or commit a second native project here. Generated Pods, builds and IPA files
remain ignored.

JavaScript export is not a signed iOS build or App Store approval. Developer
account ownership, signing, real-device permissions and update delivery remain
release checks in the mobile runbook. Compatible shell JS can use EAS Update;
native changes still need a new signed binary.
