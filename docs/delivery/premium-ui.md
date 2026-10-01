# Visual refinement — 1 October 2026

Starting checkpoint: `f94fa6b`, clean branch `feat/pilot-readiness-cleanup`.

The founder requested a stronger, modern visual design with imagery, parallax and
scroll motion across the homepage and other screens. The direction is material
in motion: editorial typography, sculptural recycled materials, forest-green
feature panels, warm light surfaces and refined operational navigation.

## Delivered scope

- Homepage: larger editorial hero, generated material-loop art, clearer actions,
  numbered material chain, alternating role panels, dark trust section, material
  study and a stronger closing call to action.
- Public pages: shared large headings, refined header/footer, process and
  participant layouts, help search/topic/role/guide surfaces and contact panel.
  Shared primitives also reach prices, standards, solar and contact pages.
- App and admin: forest navigation, clearer page headers, metrics, status and
  empty states. Household material choices, offers and action bars are refined.
- Sign-in and joining: desktop image/form split, phone-first form, stronger role
  selection, document forms and application status surfaces.
- Motion: bounded GSAP homepage parallax and native secondary-page entrances.
  No scroll hijacking or animation on live operational numbers. Reduced motion
  cancels movement; routes clean up observers, listeners and animations.
- Images: two generated WebP sources total 226,768 bytes. Static imports preserve
  immutable cache keys. No new package or runtime service was added.

Existing translations and transaction behavior are preserved. The image prompts,
output names and encoding details are in [generated images](../design/generated-images.md).
The current design rules are in [frontend architecture](../architecture/frontend.md).
The earlier 200 ms limit still applies to control transitions; this request adds
longer decorative entrances on static content.

## Ownership and review

Root handled the hero, art, tokens, site chrome and integration. Three agents
handled public sections, operational surfaces, and motion. Work used separate
file ownership in the existing clean checkout. No extra worktree was needed.
An independent review found a sticky-header anchor issue; shared section headings
now have a scroll offset, covered by a browser check.

## Verification

- `pnpm check`: exit 0; lint/types, 1,065 web tests in 136 files, 23 mobile tests
  and 19 desktop tests.
- `pnpm format:check` and `git diff --check`: passed.
- Development browser motion checks: passed, including measured scroll movement,
  live reduced-motion changes, and 360 px English/Arabic overflow checks across
  six public routes.
- Visual inspection: desktop homepage, help and sign-in; 390 px Arabic help and
  sell states; English join. Authenticated app/admin pages need staging accounts
  for a full visual review with populated data.

The first incremental production build emitted old CSS despite current markup.
A browser screenshot exposed this. The compile cache was moved out of `.next`
and a fresh build was started. A smoke check now verifies the hero's computed
heading size, so absent production design styles fail the suite. Two older smoke
checks also needed their tagline locator scoped to the main landmark because
that copy is now present in several deliberate places.

The fresh `pnpm exec next build --webpack` passed with 925 generated pages.
`CI=1 PORT=3100 pnpm e2e` then passed all 48 Chromium tests in 20 seconds,
including the new computed-style and anchor checks. The production homepage was
visually checked again. `BASE_URL=http://localhost:3004 ONLY=home pnpm screenshots`
refreshed both repository homepage screenshots. The earlier incremental build is
not the final verification artifact. If this host emits stale CSS again, stop
the preview, move its compilation cache aside, rebuild, then run the browser
suite; do not treat a successful compile alone as proof of the visual result.

Verification confidence is B: local code and public browser evidence is strong;
populated authenticated screens and physical devices remain unverified. The next
most useful check is the connected staging review in the handoff queue. The pass
adds two bounded motion helpers and reuses existing primitives, copy and data
owners. No package, fallback backend, schema or permission change was introduced.

## Remaining launch gates

This pass does not establish live SMS, booking, provider delivery, signed native
updates or store acceptance. The local disconnected preview correctly shows the
sign-in/booking setup states. The help contact number remains a placeholder;
replace it with the actual support number before launch. Native-speaker review,
real-device checks and populated authenticated screens remain in the
[handoff queue](handoff.md). No deployment or main-branch merge is claimed.
