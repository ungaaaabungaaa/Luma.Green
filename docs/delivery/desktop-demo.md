# Desktop demo delivery

The desktop app now has an explicit local demonstration profile. This is separate
from a signed release and does not bypass web authentication.

## Changes

- `demo:pack:mac` creates `Luma.Green Demo.app` for the host Mac architecture.
- `demo:pack:win` creates a Windows x64 folder containing `Luma.Green Demo.exe`
  and its required resources. This can be cross-built on macOS.
- Demo configuration accepts only an exact HTTP loopback origin. The default is
  `http://localhost:3004`; set `DESKTOP_DEMO_ORIGIN` before packaging to change
  the loopback host or port. Runtime environment variables cannot redirect it.
- Demo packages have a distinct app ID, product name and cookie partition.
  Update feeds and release mode are forbidden. Production HTTPS, signing and
  notarization checks remain in place.
- A packaged-app smoke script checks public role pages in English and Arabic,
  Node isolation and local-file popup blocking. It uses a fresh local profile
  and records its screenshots/results in ignored build output.

## Local artifacts

The following outputs were built on the current Apple Silicon Mac. Build outputs
are ignored and must be regenerated on a fresh clone; they are not Git artifacts.

| Artifact                                                                           | Result                                                                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/desktop/release/demo/mac-arm64/Luma.Green Demo.app`                          | Built, unsigned, ARM64 Mach-O executable; folder about 290 MB                                   |
| `apps/desktop/release/demo/win-unpacked/Luma.Green Demo.exe` plus its whole folder | Built, unsigned, PE x64 executable; folder about 375 MB; execution on Windows is not yet tested |

Transfer archives are also present in the ignored `release/demo/` directory:
`luma-green-demo-mac-arm64.zip` (about 123 MB) and
`luma-green-demo-windows-x64.zip` (about 151 MB). Extract before use.

Both builds require a local web server on the demo computer. The web app is not
bundled into the executable. Start the root app with `pnpm exec next start --port
3004` after a successful root build. On Windows, copy the whole output folder,
not just its EXE. See the [desktop README](../../apps/desktop/README.md#local-demo-packages)
for commands and boundaries.

## Verification

- Desktop unit tests: 20 passed, including rejection of remote/LAN demo origins,
  demo update/release combinations and packaged-origin overrides.
- Strict desktop TypeScript: passed.
- Scoped desktop lint: passed after import/style fixes.
- macOS demo packaging: passed after allowing Electron build-resource downloads.
- Windows x64 cross-packaging: passed after allowing Electron build-resource downloads.
- Existing Electron fixture smoke: passed in real Electron. It verified Node
  isolation, local-file popup rejection, authenticated-blob-style PDF viewer
  handling with synthetic data, Arabic offline UI and retry. The deliberate
  server shutdown produced the expected connection-refused log.
- Packaged macOS public-page smoke: passed against `http://localhost:3004` in
  the actual unsigned ARM64 app. English/Arabic participant pages rendered;
  Node APIs were absent; local-file popup was blocked. Both screenshots were
  inspected. Local evidence is `apps/desktop/release/demo/evidence/smoke.json`
  plus `participants.png` and `participants-arabic.png`. These show the UI at
  the smoke run; later hosted UI changes require fresh captures.

## Remaining release gates

Windows execution and installation, Intel Mac acceptance, authenticated role
workflows, camera/location behavior on target systems, signature verification,
notarization and real update delivery are not established by these local builds.
Production still needs the deployed HTTPS origin and backend, Apple signing and
notarization credentials, Windows signing credentials, and an HTTPS update host.
A signed release is a separate build; this local demo cannot become a production
release through an environment override.

## Guide impact

The platform guide must explain the separate local demo packages, the need for
a local web server and the untested Windows execution boundary. Screenshots of
the public pages in Electron do not prove authenticated operational access.
