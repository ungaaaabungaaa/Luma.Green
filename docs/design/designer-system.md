# Designer system and page completion plan

Status: approved implementation scope from the founder request, 2 October 2026.

## Starting point

Base `e403503`, clean tracked main; preserve unrelated root
`luma-green-user-guide.pdf`. Work branch `feat/design-system-polish`. The previous
visual pass was rejected as too generic. This pass replaces its visual hierarchy,
not only its colours. All public, auth, onboarding, household, operator and admin
routes are in scope. Existing access rules, exact quantities and provider gates
remain unchanged. Future product enhancements remain a separate proposal.

## Design direction

Modern industrial: cool neutral white and charcoal, restrained forest green,
strong editorial type, fine separators, a consistent eight-pixel spacing rhythm
with four-pixel adjustments. White/card surfaces are clearly separated from muted
page surfaces. Dark mode is neutral charcoal, not a green wash. Primary actions
use one restrained green. Avoid lime glow, nested decorative panels, giant round
cards, decorative dashboard photos and repeated pill buttons.

Body text retains Noto for all twelve scripts. Geist supplies Latin display type through
next/font with Noto script fallbacks. Buttons share 44px regular/48px large
heights, 8px corners, 16/24px horizontal padding and stable focus/disabled states.
Cards use 12px corners; inputs use 8px. Public sections use 64/96px spacing;
operational sections use 24/32px. Content headers, action groups, empty states,
filters, tables and loading/error states use shared components.

Lucide is the single free icon system already installed. Use 18/20px icons for
controls, 24px for features, one consistent stroke weight. Keep the brand mark.
Add shadcn's Recharts component through its CLI; use existing query data only,
localized labels, semantic chart colours, tooltips, reduced motion and accessible
text/table equivalents. Never invent chart history or production statistics.

Marketing pages use wide editorial compositions and purposeful photo crops.
Generated artwork must show materials/processes, not phone/laptop app mockups.
No fake customers, testimonials, certifications, partner logos or live numbers.
Reuse existing strong assets; new art must have a clear role and be compressed.

## Skill provenance and adaptations

Installed `gpt-taste-skill` from
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/ce26fc25c0e5e8cab638f883de62d9a86ee5e45b/skills/gpt-tasteskill),
MIT. Installed at `~/.codex/skills/gpt-taste-skill/SKILL.md`.
The installer makes it discoverable next turn; it is read directly this turn.
Use its composition, image, grid-density and GSAP guidance. Its mock execution
instructions do not justify fabricated test output: design exploration uses an
actual seeded script. Random exploration does not override the requested cross-page
consistency. AIDA is for marketing, not admin forms. Mobile/RTL script needs override
rigid heading line counts. Existing Noto script support, reduced motion and
keyboard access remain mandatory. Do not use arbitrary remote Picsum assets.
The actual seeded exploration selected Cinematic Center, Cabinet Grotesk, marquee,
accordion and feedback patterns. These are inspiration, not required widgets.
Geist replaces Cabinet to use the existing Next font path; unsupported testimonial
carousels and repetitive marquees were omitted.

References: [shadcn chart](https://ui.shadcn.com/docs/components/aria/chart),
[Recharts](https://recharts.github.io/). Recharts 3.8.0 was installed through the
shadcn CLI. Lucide remains the existing free icon package (ISC licence). Installed package
licences for Recharts and Lucide were checked locally.

## Owners and implementation

1. Coordinator: shared tokens, fonts, ui primitives, dependencies, art, plan,
   screenshot evidence, document/cloud maintenance and Git.
2. Public agent: site routes/components, help and public navigation/footer.
   Change page composition and information hierarchy; preserve translated copy.
3. Workspace agent: app shell and role pages, household flows, auth/onboarding,
   market/shop/saathi forms. Standardize action placement, field rhythm, tables,
   status and empty states. No ledger or auth changes.
4. Admin/charts agent: entire admin console/auth/forms/review and charts using
   real existing data. Shared chart renderer is isolated to consuming routes.

Agents own disjoint files. Only coordinator installs dependencies, changes global
styles/ui primitives, builds, captures, commits or pushes. Inspect every route
family; keep a route/component inventory with covered and unavailable states.
No blanket source replacement without inspecting each control's purpose.

## Verification and completion

TDD route: regression tests for chart/interactive behavior; browser evidence for
styling. No test may merely assert implementation class names. Run existing
functional suites, locale parity, keyboard and reduced-motion checks. Test widths
360, 390, 768, 1024 and 1440, light/dark, English/Arabic and long-script navigation.
Use real public pages and labelled isolated fixtures for protected roles. Test
both loaded and empty states. Do not claim fixtures prove live authentication.

After integration: independent visual and code review, `pnpm check`, formatting,
production build, public browser suites and configured analytics suite. Refresh
affected guide captures, rebuild and render Word, inspect every page. Update the
same native Google Doc if connected; otherwise retain the reviewed local file and
record the exact connection limitation. Commit and push a feature branch with a
reviewable PR; merge only with current checks green. Record remaining account,
signed native, live provider and staging acceptance gates separately.

## Checkpoints

- Shared system and all three page-family source passes implemented; 41 page
  wrappers covered, plus the root error fallback.
- Homepage expanded from six to twelve main sections. Added material directory,
  pickup journey, shop workday, weight/payment, material records and FAQs.
- Review fixed Tamil/Malayalam overflow, a missing translation namespace and
  Recharts 3.8 axis-label contrast in dark mode. Generated webpack CSS retained an
  old utility in its local cache; a clean `.next/cache/webpack` rebuild emitted the
  corrected selector. The fixture capture now checks computed tick colours.
- Final clean production build passed. All 107 Chromium tests passed with one
  worker (the CI setting), including widths 360/390/768/1024/1440 and all new
  translation/layout cases. A four-worker run during captures exposed menu
  hydration timing failures; all three isolated menu tests and the complete
  single-worker run passed. Do not count the failed run as green evidence.
- Isolated configured analytics suite: five tests passed, vendor requests blocked.
- `pnpm check` passed: 1,171 web, 27 mobile and 20 desktop tests, lint and types.
- Word guide: 56 pages reviewed, 51 screenshot placements and six freshness tests.
  Google Docs publication and Git integration are tracked in the handoff/cloud record.
- Evidence strength: local implementation and regression coverage passed. Live
  authenticated acceptance, hosted CI/deployment and signed device releases are
  separate gates; this pass does not claim those have completed.

## Detail pass — 2 October 2026

The founder approved refinement of the current identity across all screens. Base
`3b29ea7` is merged main; the working branch is `feat/ui-detail-pass`. Preserve
Geist/Noto, the neutral themes, the green action colour and existing workflows.
This direction supersedes the earlier permission for content cards: use open
sections, divided lists, compact metric rows and tables. Controls, dialogs and
small status badges retain their functional borders. No replacement theme,
extra dashboard figures or backend schema changes are in scope.

The mobile wordmark is hidden while the accessible brand mark remains. The
language selector shows its current endonym and a chevron, with the same names
in its menu. Public material names form a pausable marquee; reduced-motion mode
shows a static list. The founder explicitly approved **demo testimonials** in
this conversation. Label each section as illustrative content, not customer
reviews; use role names without fictional customer identities or partner logos.

Phone sign-in remains navigable through the code-entry screen with no SMS
configuration. This is a labelled interface preview. It sends no code, accepts
no successful verification, creates no session and preserves private-route guards.
The configured authentication flow keeps its existing server contract.

Installed UI/UX Pro Max (`09170eec67ee`, MIT), Vercel Web Design Guidelines
(`063bee94c3f4`), Baseline UI (`ebf5f26cd275`, MIT) and Impeccable (`4adabaf2c2bd`,
Apache-2.0). GPT Taste was already installed. Official sources:
[nextlevelbuilder](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill),
[Vercel](https://github.com/vercel-labs/agent-skills),
[ibelick](https://github.com/ibelick/ui-skills),
[Impeccable](https://github.com/pbakaus/impeccable).
Skills are guidance, not permission to replace the stack, fonts, colour tokens,
accessibility, or the founder's no-card instruction. Impeccable's context launcher
lacked execute permission; its written guidance and current repository context
were read instead. No hooks or optional binary were activated.

[Mobbin onboarding](https://mobbin.com/explore/mobile/flows/onboarding) and
[verification](https://mobbin.com/explore/mobile/screens/verification) public
listings informed progressive entry, back/edit controls and verification states.
Full signed-in screen flows were not accessible. No copied app assets were used.

Verification: production build, lint and types passed. All 115 browser checks
and five isolated analytics checks passed, including 320px Tamil/Malayalam
action labels, mobile endonym navigation, RTL and reduced-motion marquee states.
The 1,181 web component/logic tests, six guide freshness tests, 27
mobile tests and 20 desktop tests passed. Public and labelled protected-fixture
screenshots were refreshed. The guide now has 62 image placements over 66 pages;
every page passed visual review. The freshness record is in
`docs/user-guide/build.json`.
The stable Google Docs copy is pending an in-place update. No provider execution
or production deployment is implied by this local pass.

## Public banner follow-up — 2 October 2026

The founder requested banners on the main public pages, especially How it works.
Base `ff7bb64` contains the completed detail pass. This follow-up keeps its themes,
typography and open sections. A shared `PageBanner` places existing material and
work-scene artwork across the content width below each page's title and introduction.
Desktop uses a wide crop; phones use a taller crop. Text remains outside the image.

Scope: How it works, Participants, Prices, Standards, Solar, Join, public Contact,
and the help landing, role and contact pages. The homepage keeps its existing hero.
Help articles retain their reading layout. Do not add cards, change authentication
or change operational screens. Refresh affected browser evidence and the Word guide;
record the current Google Docs revision as pending without replacing its document ID.

Verification passed: production build, scoped lint, 143 component tests, six guide
freshness tests and 113 public browser checks. The browser suite includes 32
banner cases at phone and desktop widths, with Arabic coverage. The 66-page guide
was rendered and reviewed; unchanged pages were checked against the prior render.
