# Maintained platform user guide

The maintained guide is an editable Word document. A Google Docs copy must be
imported from the same reviewed Word document. Use the source baseline and
screenshot labels in the guide to understand its evidence limits.

- Repository content source: [guide.md](guide.md).
- Maintained Word document: [luma-green-user-guide.docx](../../output/docx/luma-green-user-guide.docx).
- Browser evidence: [screenshots](screenshots/) and the capture manifests.
  Captures retain their original browser PNG pixels.
- Freshness record: `build.json`. Tests compare the complete input set, all
  source and image hashes, the DOCX hash, and the visual review record.
- Earlier PDFs, including `output/pdf/luma-green-user-guide.pdf`, are archived
  snapshots. They are no longer rebuilt or used as freshness evidence. Any PDF
  already supplied outside this path remains unchanged.

Word text, headings and tables are editable. Browser screenshots remain images.
If you edit a Word or Google Docs copy, put those content changes into `guide.md`
before the next build. This prevents later builds from losing your changes.

## Required update flow

1. Assess guide impact whenever a user-facing route, role, permission, workflow,
   control, setup requirement or native update behavior changes. Update the
   affected chapter and its edition and source baseline in `guide.md`. Record
   this assessment in the delivery handoff.
2. Build the current app and run a local preview. Capture changed public pages:

   ```sh
   GUIDE_BASE_URL=http://localhost:3004 pnpm exec jiti scripts/capture-guide.mts
   GUIDE_BASE_URL=http://localhost:3004 pnpm exec jiti scripts/capture-showcases.mts
   ```

   The commands accept a local origin only and reject external requests. They
   visit real pages. They do not sign in or submit forms. Use a disconnected or
   approved test environment with no real personal data. Inspect every PNG.

3. For protected screens, use an approved staging account when available. Do
   not bypass authentication. The isolated `scripts/guide-preview` harness can
   show current components with synthetic records. Follow its README. Keep its
   visible fixture banner and metadata. It does not prove live access, server
   permissions or provider behavior.
4. Capture analytics controls with fake keys and external requests intercepted:

   ```sh
   NEXT_PUBLIC_TELEMETRY_ENABLED=true NEXT_PUBLIC_GA_MEASUREMENT_ID=G-LUMATEST NEXT_PUBLIC_POSTHOG_KEY=phc_luma_test NEXT_PUBLIC_SENTRY_DSN=https://public@example.invalid/1 SENTRY_AUTH_TOKEN= pnpm exec next build --webpack
   GUIDE_CAPTURE=true pnpm exec playwright test --config playwright.analytics.config.ts
   ```

   The dedicated production server uses port 3106. Rebuild with normal
   deployment settings after this test. These test keys belong only in this
   local build. The capture writes English and Arabic browser PNGs and
   `analytics-captures.json`. No live analytics account is used.

5. Build the Word document. In Codex, resolve the bundled Python runtime with
   `load_workspace_dependencies` and use it for all document work. Set
   `GUIDE_PYTHON` to that absolute executable path, then run:

   ```sh
   "$GUIDE_PYTHON" scripts/build-user-guide.py
   ```

   The dependencies are listed in `scripts/user-guide-requirements.txt`. For
   work outside Codex, install them in a project virtual environment. The
   builder needs no external account, app secrets or font download.

6. Before a Google Docs import, run the Documents skill title sanitizer. Use
   the `scripts/google_docs_title_sanitize.py` from the installed Documents
   skill. It must report no title borders. The builder sets the Title and
   heading styles to black and does not add decorative rules.

   ```sh
   "$GUIDE_PYTHON" "$DOCUMENTS_SKILL/scripts/google_docs_title_sanitize.py" output/docx/luma-green-user-guide.docx --out /tmp/luma-green-title-check.docx
   "$GUIDE_PYTHON" "$DOCUMENTS_SKILL/scripts/google_docs_title_sanitize.py" /tmp/luma-green-title-check.docx --check
   ```

   The sanitizer should make zero changes to this builder's output. Use the
   sanitized copy for a native import. If it changes document content or styles,
   fix the builder and rebuild before recording review.

7. Render the DOCX with the Documents skill `render_docx.py`. In Codex, use the
   bundled LibreOffice only. The renderer selects it from the bundled Python
   runtime; do not use a desktop LibreOffice installation.

   ```sh
   "$GUIDE_PYTHON" "$DOCUMENTS_SKILL/render_docx.py" /tmp/luma-green-title-check.docx --output_dir /tmp/luma-user-guide-review
   ```

   Inspect **every** page PNG at full size. Check headings, page numbers,
   captions, tables and screenshots. Text extraction alone cannot prove visual
   quality. Fix clipped text, blank images or unreadable tables and render again.
   Rendered PNGs and any temporary rendering PDF are review files, not published
   guide outputs.

8. Only after all pages pass inspection, record the actual page count. For
   example, replace `N` below with the number of reviewed page PNGs:

   ```sh
   "$GUIDE_PYTHON" scripts/build-user-guide.py --record-review N
   "$GUIDE_PYTHON" scripts/build-user-guide.py --check
   pnpm exec vitest run src/user-guide.test.ts
   ```

   A rebuild resets the visual review record to pending. The freshness check
   fails until review is recorded for that exact DOCX hash. Run the normal
   required repository checks. Commit Markdown, captures and manifests,
   `build.json` and DOCX together. Hash checks detect stale artifacts; they do
   not decide whether product behavior was described correctly.

## Google Docs copy

Current publication state is recorded in [cloud.json](cloud.json). The reviewed
51-page Word edition is ready. The first import accepted a sign-in request but
returned no document ID; the plugin tools then disappeared and the plugin
inventory reported it was not installed. Native Google Docs publication remains
pending reconnection. No automatic cloud synchronization is currently configured.

Import the sanitized and visually reviewed DOCX with the Google Drive plugin's
`google_drive_import_document` action and `upload_mode: "native_google_docs"`.
Do not create an empty Google Doc and reconstruct the guide with write calls.
If the plugin is unavailable, retain the local DOCX and report that native
Google Docs import is pending. Do not invent a Google Docs link or claim that a
local file is already stored in the user's Google account.

A manually uploaded Word document can also be opened in Google Docs by its
owner. Edits made there must return to the Markdown source before a later
repository build. After the first verified import, record its document ID and
actual URL in `cloud.json`. Update that same document after each accepted guide
revision; preserve its sharing settings. Do not create a replacement link on each
run. Verify the cloud content after writing, or record publication as pending.

## Screenshot and privacy rules

Use test data only. Exclude passwords, authenticator setup keys and QR codes,
backup codes, real IDs and customer records. Keep screenshots unchanged.
Explanations belong in captions and guide text. Do not use AI-generated UI,
redrawn controls or silent image substitution. Generated decorative artwork
already in the app can appear in a browser screenshot of that app.

Capture manifests record routes, capture times, source revision, provenance and
image hashes. Disconnected pages and synthetic component fixtures have different
evidence strength. The Word document labels each. Replace protected-screen
fixtures with authenticated staging captures when access is available. Never
silently relabel a fixture as live.

This guide is an operational manual. It is not proof of launch readiness. See
[the handoff](../delivery/handoff.md) for deployment, account, provider and signed
native release gates.
