# 0014. Share the operational web UI inside native app shells

- **Status:** Decided
- **Date:** 1 Oct 2026
- **Deciders:** Founder delegates implementation choices; Codex implements and reviews

## Context

The founder requires Android, iOS, macOS and Windows apps in this repository,
with simple maintenance and routine updates that do not require manual installs.
The existing Next.js app contains the operational flows, authentication and 12
translations. It needs a server and cannot be exported as a static native bundle.

## Decision

Use Expo / React Native with a restricted WebView for Android and iOS. Use
Electron with a sandboxed renderer for macOS and Windows. Keep the Next.js app,
Convex business rules and message catalogues as the shared owners. The native
packages own navigation policy, offline recovery, native controls and updates.

Use one fixed HTTPS app origin, default `https://app.luma.green`. Operators can
deploy that origin separately from the public website. Keep web content updates,
compatible mobile JavaScript updates and signed native releases separate.
Use Expo fingerprint runtime versions and signed production EAS updates. Use
signed desktop releases through a public HTTPS feed. Never force an active form
to restart to apply an update.

## Consequences

One change to the operational UI serves all platforms. Native control text comes
from the same catalogues. Native packages do not duplicate the ledger or keep an
offline write queue. They require a network connection for operational work.
Mobile admin document work opens in the system browser with a separate sign-in.
Desktop private blobs stay in a restricted document window.

These are native shells around hosted screens, not a rewrite of every screen in
React Native. Native modules, permissions and runtime changes still require new
signed binaries. Store review, signing and actual device tests remain release
gates. In particular, native controls do not by themselves prove compliance with
Apple's minimum-functionality rule. See [native apps](../architecture/native-apps.md)
and the [release runbook](../operations/app-releases.md).

## Alternatives considered

- **Separate native screens:** more direct native behavior, but duplicate flows,
  validation and acceptance work across an almost complete application.
- **Static web export:** incompatible with this app's server components and auth proxy.
- **Only a PWA:** fewer packages, but does not supply the requested app installers
  or the desktop signed-update channel.
- **Never update the base binary:** leaves old native runtimes and cannot deliver
  new native capabilities safely or meet all store rules.
