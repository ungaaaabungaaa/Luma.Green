# Windows app

The app lives in [`apps/desktop`](../apps/desktop/README.md). It reuses the hosted
Luma.Green web app and its existing Convex authentication.

From the repository root, `pnpm --filter @luma/desktop dev` starts Electron.
In PowerShell, set `$env:DESKTOP_DEV_ORIGIN = 'http://localhost:3000'` to use a
running local Next.js server. `pnpm --filter @luma/desktop run pack` creates an
unsigned host development directory.

A production release requires a Windows runner, a signing certificate and its
password, the exact publisher name, an explicit HTTPS app origin and a public
HTTPS update feed. `pnpm --filter @luma/desktop dist:win` builds NSIS installers
for x64 and ARM64. Follow the desktop release checklist. macOS package tests do
not prove Windows installer behavior, signature validation or update delivery.
