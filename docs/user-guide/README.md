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

Current publication state is recorded in [cloud.json](cloud.json). The reviewed
security and industry API revision from main commit `2ba8246` is **published** to
the existing native [Luma.Green platform user guide](https://docs.google.com/document/d/17B40PdN8IyvydXhAH4r2nsfgy9Nt15cyzW5WZw6ecFY).
Its document ID, folder and sharing settings are unchanged.

The native copy contains all 38 chapters, six tables, 548 body paragraphs and 72
image placements from the reviewed Word source. Readback checked every paragraph,
table cell, image source URL and image dimension. Three exact dates remain native
date fields. The Word source has 76 reviewed pages; the native Google Docs PDF has
78 reviewed pages because native typography and pagination differ. Every native
PDF page was inspected. Native page breaks keep the mobile demonstration and
verification-queue explanation with their related content.

One accessibility difference remains explicit: the Google Docs batch-update API
does not expose a setter for embedded image title/description alt text. The 72
image descriptions remain as visible editable captions. Do not claim that native
image-alt semantics match the Word source. See the [current request schema](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request).

For each later revision, update this same native document through the dedicated
Google Docs batch-update action. First compare its current revision with the last
verified record; preserve or reconcile any later human edits. Use revision guards,
retain the tab and table structures, and apply the reviewed source changes in
bounded batches. Use the committed screenshot bytes or immutable source URLs.
Verify all body and table text, native dates, headings and image placements after
writing. Export the native PDF, inspect every page, repair layout issues, then
record the exact source hash, native revision and verification in `cloud.json`.
Keep any unmerged or unreviewed revision pending.

The connected `google_drive_import_document` action creates a new document and
is only for the first import. The connected `update_file` action cannot replace a
native Google Doc with raw DOCX bytes. Neither action is the in-place update path.
Do not create a replacement document or change the link or sharing settings.

For the first import only, use the sanitized and visually reviewed DOCX with
`google_drive_import_document` and `upload_mode: "native_google_docs"`. A manually
uploaded Word document opened in Google Docs creates a different copy; it does
not update this guide. Any edits made in the native document must return to
`guide.md` before the next local rebuild. No automatic cloud synchronization is
configured.

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
