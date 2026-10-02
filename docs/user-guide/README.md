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

   Home materials, pickup, shop, payment, records and questions are captured as
   separate browser sections so they remain readable in Word. Section screenshots
   are direct browser output, not cropped or composed after capture.

   The commands accept a local origin only and reject external requests. They
   visit real pages. The phone-preview capture enters the synthetic number
   `9000000000` and submits the local preview form to show the OTP screen. No
   backend call, SMS delivery, account creation or sign-in occurs. Other forms
   are not submitted. Use a disconnected or approved test environment with no
   real personal data. Inspect every PNG.

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

Current publication state is recorded in [cloud.json](cloud.json). The current
security and industry API revision is **pending publication**. The existing native
[Luma.Green platform user guide](https://docs.google.com/document/d/17B40PdN8IyvydXhAH4r2nsfgy9Nt15cyzW5WZw6ecFY)
remains at its last verified revision. Its document ID and sharing settings are
unchanged. No cloud update was performed for this local revision.

The last verified import contained all 37 chapters, six tables and 51 inline
images. Native readback matched the reviewed Word body and table text, with three
native date fields. The corresponding Word file had 56 visually reviewed pages.
Its DOCX hash, native readback hash, revision ID and verification details remain
under `last_verified_revision` in `cloud.json`. They describe that earlier
publication, not the current local source or Word rebuild.

The connected `google_drive_import_document` action creates a new document.
The connected `update_file` action does not accept raw DOCX replacement of an
existing native Google Doc. These actions therefore cannot complete the required
in-place update while preserving this document ID. Do not create a replacement
document or change the link. Keep the reviewed local DOCX and report this update
as pending until a supported in-place native document workflow is available.

For the first import only, the sanitized and visually reviewed DOCX can use
`google_drive_import_document` with `upload_mode: "native_google_docs"`. After
that import, every revision must reuse the recorded native document ID and
preserve its sharing settings. Do not reconstruct the guide in an empty Google
Doc. Verify native text, structure and images after any supported update before
marking the current revision as published.

A manually uploaded Word document can also be opened in Google Docs by its
owner, but a new copy does not update the existing guide. Any edits made in the
native document must return to `guide.md` before the next local rebuild. No
automatic cloud synchronization is configured.

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
