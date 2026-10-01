# Maintained platform user guide

**Status:** current usage guide, 1 October 2026; source baseline `6ca9391`, plus the role previews and generated imagery update.

- Editable content: [guide.md](guide.md).
- Published PDF: [luma-green-user-guide.pdf](../../output/pdf/luma-green-user-guide.pdf).
- Browser evidence: [screenshots](screenshots/), `public-captures.json` and the
  fixture capture manifest. Captures retain their original browser PNG pixels.
- Freshness record: `build.json`. Tests compare every listed source/image hash
  and the PDF hash. The record is generated, not manually edited.

## Required update flow

1. Assess guide impact whenever a user-facing route, role, permission, workflow,
   control, setup requirement or native update behavior changes. Update the
   affected chapter and its edition/source baseline in `guide.md`. The PDF
   footer uses that same metadata. Record this assessment in the delivery handoff.
2. Build the current app and run a local preview. Capture changed public pages:

   ```sh
   GUIDE_BASE_URL=http://localhost:3004 pnpm exec jiti scripts/capture-guide.mts
   GUIDE_BASE_URL=http://localhost:3004 pnpm exec jiti scripts/capture-showcases.mts
   ```

   The commands accept a local origin only and reject external requests. It visits the real pages; it does
   not sign in or submit forms. Use a disconnected or approved test environment
   with no real personal data. Inspect each resulting PNG.

3. For protected screens, use an approved staging account when available. Do
   not bypass authentication. The isolated `scripts/guide-preview` harness can
   illustrate current components with synthetic records. Follow its README;
   keep its visible fixture banner and metadata. It is not part of the app and
   does not prove live access, server permissions or provider behavior.
4. Capture analytics controls with fake keys and all external requests intercepted:

   ```sh
   NEXT_PUBLIC_TELEMETRY_ENABLED=true NEXT_PUBLIC_GA_MEASUREMENT_ID=G-LUMATEST NEXT_PUBLIC_POSTHOG_KEY=phc_luma_test NEXT_PUBLIC_SENTRY_DSN=https://public@example.invalid/1 SENTRY_AUTH_TOKEN= pnpm exec next build --webpack
   GUIDE_CAPTURE=true pnpm exec playwright test --config playwright.analytics.config.ts
   ```

   The dedicated production server uses port 3106. Rebuild with normal deployment
   settings after this test; the test keys belong only in this local build. It writes English/Arabic browser PNGs
   and `analytics-captures.json`. No live analytics account is used.

   All figures use current browser captures. Replace protected-screen fixtures
   with authenticated staging captures when access is available. Preserve the
   evidence distinction until then. Never silently relabel a fixture as live.

5. Install the PDF dependencies in a Python virtual environment:

   ```sh
   python3 -m venv .venv-guide
   .venv-guide/bin/python -m pip install -r scripts/user-guide-requirements.txt
   .venv-guide/bin/python scripts/build-user-guide.py
   .venv-guide/bin/python scripts/build-user-guide.py --check
   ```

   On Windows, use the virtual environment's `Scripts/python.exe`. Keep the
   environment outside Git. The builder uses ReportLab's bundled Vera fonts;
   it does not need a font download, external account or app secret.

6. Render the PDF using Poppler and inspect every page, including contents,
   page numbers, captions, tables and screenshots:

   ```sh
   mkdir -p tmp/pdfs
   pdftoppm -scale-to 1200 -png output/pdf/luma-green-user-guide.pdf tmp/pdfs/guide
   ```

   Check page text with `pypdf` as well; text extraction alone cannot establish
   visual quality. Do not deliver with clipped text, blank images or tiny tables.

7. Run `pnpm exec vitest run src/user-guide.test.ts` and the normal required
   repository checks. Commit Markdown, captures/manifests, `build.json` and PDF
   together. A source hash check detects stale artifacts; it cannot decide
   whether a changed product behavior was described correctly.

## Screenshot and privacy rules

Use test data only. Exclude passwords, authenticator setup keys/QR codes, backup
codes, real IDs and customer records. Keep screenshots unchanged; explanations
belong in captions and guide text. No AI-generated UI, redrawn controls or silent
image substitution. Decorative generated artwork already in the app can appear
in a browser screenshot of that app.

Capture manifests record routes, date/time, source revision, provenance and image
hashes. Current disconnected pages and synthetic current-component fixtures have
different evidence strength. The PDF labels each.

This guide is an operational manual, not proof of launch readiness. See
[the handoff](../delivery/handoff.md) for deployment, account, provider and signed
native release gates.
