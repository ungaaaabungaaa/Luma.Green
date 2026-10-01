# Illustrated platform guide — 1 October 2026

## Delivered

The maintained [user guide](../user-guide/guide.md) explains the current platform
in 34 chapters. Its [PDF](../../output/pdf/luma-green-user-guide.pdf) has 44 pages,
a linked contents page, bookmarks, captions and the application checkpoint in
each footer. The final file is about 4.5 MB.

Coverage includes access, phone sign-in, languages, household booking/tracking,
onboarding and private documents, kabadiwala dispatch/weighing/payment records,
stock and rates, business trade states, yards, recyclers, manufacturers, Saathis,
admin setup/recovery/review/prices/pilot/support, help, standards, native updates,
troubleshooting and owner account prerequisites. Unimplemented controls are not
presented as available. Simulated payments and non-certified impact records are
identified in the relevant chapters.

The screenshot collection contains 33 unchanged browser PNGs: 13 current local
public screens and 20 current-component synthetic fixtures. The PDF uses 32 of
these; the full request-detail capture is also retained as reference evidence.
The separate fixture server imports the actual components and current built CSS
and fonts. Its visible banner identifies synthetic data. Writes reject, no
backend client is created, and capture rejects external requests and browser
errors. Capture manifests record routes, time, source/component hashes, image
hashes and the evidence boundary. No older screenshot is presented as current.

## Required maintenance

`AGENTS.md` now requires a guide-impact assessment for user-facing changes. When
a change affects usage, update source text, browser captures, manifests and PDF
in the same commit. The capture/build/visual-review commands live in
[the maintenance README](../user-guide/README.md). Source Markdown owns the edition
and application checkpoint; the builder uses these in the footer.

Three repository tests enforce PDF and input hashes plus protected-component
capture hashes. They detect changed recorded inputs; they cannot determine
whether a new feature needs a chapter or prove that instructions are correct.
Review remains mandatory. Build dependencies belong in an ignored Python virtual
environment. No Python package is added to the application dependency graph.

The documentation harness is isolated tooling, with no production routes or auth
changes. Use approved staging captures once available; replace the labelled
fixtures and assess whether the separate harness is still needed at that point.
Temporary page renders stay ignored. The PDF, PNGs and manifests are intentional
tracked artifacts, as requested.

## Verification and scope

- `pnpm check`: passed lint/types, 1,068 web tests in 137 files, 23 mobile tests
  and 19 desktop tests.
- The final PDF rebuild and `scripts/build-user-guide.py --check` passed.
- Focused guide/documentation tests passed after the final layout change.
- `pnpm format:check` and `git diff --check` passed.
- All 44 final pages were rendered with Poppler and visually inspected. Text
  extraction found the required chapters and no replacement/black-square glyphs.
  The PDF contains 34 chapter bookmarks. Tracking and compliance figures were
  enlarged after the first layout review.
- The 20 protected-screen captures completed with zero browser errors or blocked
  external requests. All 13 public captures completed against port 3004.
- Independent user-role and admin workflow reviews corrected instructions against
  the current controls and server behavior before the final export.

No production application or native runtime code changed. The production build
and 48 browser checks from `db62fb7` remain historical implementation evidence;
this documentation pass did not repeat them. The documentation preview was stopped
after capture. The production preview on port 3004 was left running.

This is local documentation evidence, not a live sign-in, authorization, provider,
payment, deployment or native release result. The checkout had no connected
backend configuration. Actual authenticated staging workflows and signed device
releases remain the next verification gates. The guide explains these limits;
it does not infer launch readiness from a screenshot.

## Git continuation

Application checkpoint: `db62fb7`. Task-start documentation checkpoint:
`639e205533a3409e21247d01e3d6797090c0345f`. The guide commit is found with
`git log -1 --grep='illustrated platform guide'` on
`feat/pilot-readiness-cleanup`. Continue from that branch and read
[the handoff](handoff.md). The guide files and mandatory update rule are committed
together. Push equality and clean status must be checked separately from tests;
no PR, CI result, merge or deployment is implied by this record.
