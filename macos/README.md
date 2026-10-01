# macOS app

The app lives in [`apps/desktop`](../apps/desktop/README.md). It reuses the hosted
Luma.Green web app and its existing Convex authentication.

From the repository root, `pnpm --filter @luma/desktop dev` starts Electron.
Use `DESKTOP_DEV_ORIGIN=http://localhost:3000` for a running local Next.js server.
`pnpm --filter @luma/desktop run pack` creates an unsigned host development directory.

A production release requires a macOS runner, Developer ID Application identity,
notarization credentials, an explicit HTTPS app origin and a public HTTPS update
feed. `pnpm --filter @luma/desktop dist:mac` builds DMG and ZIP files for Apple
Silicon and Intel. The ZIP is required for updates. Follow the desktop release
checklist before distribution; local tests are not signing or update proof.
