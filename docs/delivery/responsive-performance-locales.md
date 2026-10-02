# Responsive, performance and language follow-up — 2 October 2026

Initial base: `efccf9a` on `feat/ui-detail-pass`; final continuation is based on
`c1ed004` on `feat/responsive-locales-review`. Preserve the unrelated root PDF
and existing previews on ports 3004 and 3202. The task preview is port 3009.

## Accepted requests

1. Keep the navbar in one row. On phones and tablets, move appearance, language,
   sign-in and Sell scrap into the side menu. Keep the mobile logo as a mark.
2. Test all public route types and operational screens at phone, tablet and
   desktop widths, including long translations and right-to-left text.
3. Tighten heading/body spacing, especially Join role requirements and actions.
   The request to round images was withdrawn: keep image corners unchanged.
4. Show pricing loading placeholders until real data is available. The founder
   selected this instead of simulated charts.
5. Write a full demo seed plan: two businesses per industry, all materials,
   users and connected workflow records. One canonical dataset must reproduce
   the same logical records in local and production. Include gentle stress
   checks and scoped cleanup. The deployment isolation choice is pending. No database import or reset has run.
6. Audit SSR and caching; improve load speed where supported. Keep public
   prerendering and private data isolation.
7. After these changes, add more than 20 languages with full message coverage
   and audit existing translations. The founder selected an Indian/global mix.

## Final implementation

Work continues on `feat/responsive-locales-review`, based on merged PR #28
(`c1ed004`). That earlier checkpoint is deployed. This follow-up adds:

- One-row desktop navigation and compact phone/tablet menus, with appearance,
  endonym language selection and account actions together. Operational screens
  use two bottom destinations plus More; the full menu keeps every destination.
- Tighter heading/body rhythm, readable action labels, unrounded photographs,
  restrained text entrance, button sheen and static mesh accents. Reduced-motion
  preferences disable movement. No new effect dependency was added.
- Price loading placeholders when live values are absent. Demo testimonials
  remain explicitly labelled. The phone-to-code preview cannot send or sign in.
- 21 additional language catalogues: 33 total, each with 2,260 message values and
  26 material names. Script font priority and locale-aware numeric entry are
  tested. Native-speaker review remains required.
- Public static rendering preserved: 2,521 prerendered routes. Private records
  and live prices retain their existing data boundaries. See the
  [cache audit](rendering-cache-audit.md).
- Durable UI rules, a 62-case role/edge-case manual, an illustrated team pack,
  six-month proposal, provider account checklist and India-first legal
  preparation. The entity is not registered; no filing or provider approval is
  implied.

The final audit covers public route families, all protected fixture screens,
320–1440px widths, long translations and RTL. Original screenshot pixels are
retained. Protected fixtures reject writes and do not prove authenticated
access. Final integrated results are recorded in the [handoff](handoff.md).

## Remaining external gates

The offline manifest is deterministic and validated, but is not a database
import. Demo isolation is awaiting the founder's choice. Do not run the legacy
whole-table reset or place demo identities into live authentication. Stored
material names need the separate authenticated, audited migration after backend
deployment. The existing Google Docs ID is preserved; its in-place update is
pending a supported connection. Live SMS/provider tests, native signing/device
acceptance and legal review remain separate gates.

## Historical checkpoints

The following counts describe earlier builds, not final release evidence.

## Verified checkpoint: 07:22 IST

The 18-locale production build generated 1,381 static pages. All 40 navigation,
menu-resize and locale-number browser tests passed. All 18 language-specific
main-page groups passed at 320px and 768px: 432 route/width states. Native checks
passed (27 mobile, 20 desktop). The source now has 21 fully populated locales;
Thai, Russian and German await the next preview build. Each has 2,260 messages
and 26 material names. Remaining languages and the final guide refresh are in
progress. No deployed translation or database update is claimed.

## Verified checkpoint: 07:55 IST

The source has 28 complete catalogues, each with 2,260 message values and 26
material names. The latest built preview has 22 locales and 1,685 static pages.
All eight new Thai, Russian, German and Odia header/page test groups passed.
The web suite passed 1,237 tests; guide freshness checks remain excluded until
recapture. TypeScript passed. Full lint found fixture-audit script issues, now
fixed with scoped lint passing. Five language drafts remain in progress.

Review found the fixture harness was missing its locale-specific font variable.
It now reuses the exact class list from each built locale HTML page, and loads
any registered locale. Repeat final fixture checks after the complete build.
Earlier Arabic/Tamil/Malayalam fixture checks did not prove the current script
font metrics; public Next.js page tests did use their actual font classes.
