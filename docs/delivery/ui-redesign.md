# Shared UI redesign and demo checkpoint

**Status: locally verified; Google Docs connection pending, 2 October 2026.**

## TaskStartSnapshot

Starting HEAD: `9fb82cd`, branch `feat/pilot-readiness-cleanup`. Native demo
launchers/packages and removal of visible illustration captions are already in
progress in this checkout. Preserve those changes and the user-owned, untracked
root `luma-green-user-guide.pdf`. The PDF under `output/pdf` is now archived;
the maintained artifact is `output/docx/luma-green-user-guide.docx`.

The user explicitly requested a complete visual redesign, light and dark mode,
Next.js components, shimmer effects, generated hero artwork and an updated
browser-screenshot guide. This authorizes the design change and supersedes the
previous white-only design rule. It does not approve new support/data features
in `docs/product/enhancement-proposal.md`.

## Design direction

A material-focused editorial site and a compact work console share one token
system. Use warm light surfaces, deep neutral green dark surfaces, legible Noto
text, purposeful large photography and a restrained lime accent. Use visible
navigation at desktop widths and a full, clear mobile menu. Use layered cards
and concise action groups to avoid empty panels. Operational tables and forms
remain first-class controls; images support discovery and role context.

Inspiration: the clear navigation and focused working surfaces of modern AI
apps, plus expressive editorial illustration. Do not copy their branding or
invent live transaction values. Accessible React UI remains real text and
controls; generated artwork is decorative.

## Implementation slices

1. Theme and navigation: persistent light/dark/system preference, first-paint
   theme, shared headers, twelve-locale labels, keyboard/RTL/mobile behavior.
2. Operational surfaces: app/admin shells, auth/onboarding/household layouts,
   shared page parts, cards and role home panels. Preserve permission logic.
3. Public pages: full-viewport hero, generated art, denser shared page/help
   headers, role photos and supporting sections; restrained shimmer motion.
4. Verification: component and browser tests, contrast/overflow/image checks,
   all required checks, native demo smoke against the final web build.
5. Guide: recapture affected public/synthetic/analytics views, record provenance,
   rebuild Word document and inspect pages. Commit/push code and guide together.

ArchitectureReviewRequired: yes, only the theme policy changes. Document the
superseding theme decision; no auth, ledger or backend boundary changes planned.
TDD route: proportional behavior tests for theme/navigation; screenshot review
for styling. Root owns Git, global builds, capture scripts and the guide.

Latest user correction: remove all device mockups and maintain Word/Google Docs
instead of PDF. Existing PDF is archived, not a current artifact. Google Drive
accepted authentication during import, but its tools then disappeared and the
plugin inventory reported `installed: false`. No import result or document ID
was returned. The reviewed Word file is retained; cloud publication is pending
reconnection. Do not claim a shared Google Docs link exists yet.

## Continuation

Native demos: [desktop](desktop-demo.md), [mobile](mobile-demo.md).
Future feature proposal remains unapproved. Final verification and guide impact
are recorded below and in the handoff.

## Verification and guide impact

- `pnpm check`: passed lint, types, 1,151 web tests in 148 files, 27 mobile tests
  and 20 desktop tests. `pnpm format:check` and `git diff --check` passed.
- Production webpack build: passed with optional providers disabled. Chromium
  suite: 60 passed; 29 motion/site checks passed again after the final 360px
  solar-card repair. Configured analytics suite: 5 passed with fake settings and
  intercepted provider requests. No live analytics event was sent.
- Theme checks include persisted light/dark/system choice, denied storage,
  Arabic phone controls, Tamil/Malayalam navigation at 1024/1280px, and reduced
  motion. Independent visual review covered public and synthetic role screens.
- Eighteen public, four role-photograph, two analytics and 28 protected component
  captures were refreshed. Protected captures use visibly labelled synthetic
  records, not authenticated production accounts.
- The editable Word guide contains 43 screenshot uses. All 51 rendered pages
  passed review, including an independent second review of pages 26–51.
  Sanitization changed no bytes. All six guide freshness tests passed.
- Mac ARM64 and Windows x64 desktop demo packages were built. The packaged Mac
  smoke passed against the redesigned site; Windows execution remains untested.
  Both mobile JavaScript bundles exported; this host lacks native mobile SDKs.

No schema, authentication, ledger or provider contract changed. New native
installers, signing, store review, live provider tests and production deployment
remain release gates. Google Docs import returned an authentication request but
no completed document; see `docs/user-guide/cloud.json`. Source, screenshots and
the reviewed DOCX are retained for that import. The earlier PDFs are unchanged.
