# Workspace and form design coverage

Date: 2 October 2026. Source: `feat/design-system-polish`, base `e403503`.
This record covers the workspace agent's files. Shared tokens, public page
composition, admin, charts, browser captures and the maintained guide are owned
by the coordinator and the other design agents.

## Implemented design

- The desktop workspace has a neutral page surface and a separate sidebar.
  Primary work links and secondary record links form two groups. The mobile
  navigation retains the same role rules. Both menus identify the current
  section, including a request detail or a secondary menu destination.
- Page titles and actions share one header. Role dashboards start with current
  work and real query totals. Decorative dashboard images have been removed.
- Cards use 12px corners, controls use 8px corners, and status labels use compact
  corners. Large actions use 48px height. Dense cards use borders instead of
  repeated shadows. Field sections use a 24px or 32px rhythm.
- Materials now use one Lucide map in `components/app/material-family.ts`.
  Household, shop, market, public price and impact views use the same symbols.
  Neutral icon surfaces leave green for active controls and positive states.
- Sign-in uses a focused form on phones. A restrained role photograph remains
  on desktop. Role selection can show photographs; saved application forms do
  not repeat them. Household booking starts with a compact text header.
- Stock uses a continuous bordered list. Price editing uses a desktop grid.
  Trading forms switch to a two-column layout only at wide desktop widths.
  Tracking separates current status, schedule, shop, money, items and history.
- Error scrolling in the booking form is instant. This avoids motion during
  validation. Loading icons in applicant field controls respect reduced motion.

## Route and component inventory

All route wrappers in `(app)`, `(auth)`, `(join)` and `(household)` were inspected.
Wrappers retain their metadata, session checks and parameter handling. The
visual changes are made in their shared layouts and rendered components.

| Route family                                         | Implemented coverage                                                                                                                                                  | State coverage and evidence limit                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/login`, `/login/verify`                            | Auth layout, language choices, phone entry, code entry, unavailable card                                                                                              | Existing phone/code recovery tests; provider sending is not proved                                    |
| `/join` role selection                               | Shared role cards, photographs, icons and action placement                                                                                                            | Existing role-card link tests; public page framing is owned by public agent                           |
| `/join/kabadiwala`, `/join/saathi`                   | Shared form header, choices, fields, tags, save state, consent, submit bar, field spacing                                                                             | Existing control, file and autosave tests; authenticated capture still required                       |
| `/join/yard`, `/join/recycler`, `/join/manufacturer` | Business form sections and shared applicant layout                                                                                                                    | All business kinds retain the same schema and ownership rules                                         |
| `/join/{business}/documents`                         | Document/declaration sections, upload rows, shared footer                                                                                                             | File validation/upload interaction tests; provider storage unchanged                                  |
| `/join/status`                                       | Draft, sent, changes requested, approved, rejected and suspended card frame                                                                                           | Existing status behavior preserved; state captures still required                                     |
| `/sell`                                              | Compact header; progress frame; material tiles; quantity controls; pickup/drop-off; shop cards; date/time choices; estimate; confirmation; phone controls; action bar | Existing basket, shop, time, photo and complete booking tests; data comes from fixtures in unit tests |
| `/t/{token}`                                         | Household layout, status/progress, schedule, shop, estimate/receipt, item list, history, cancel and next actions                                                      | Existing tracking state tests; token/privacy logic unchanged                                          |
| `/prices`                                            | Family headings, board rows, dialog metrics, price change labels                                                                                                      | Existing board/detail interaction tests; chart rendering owned by chart agent                         |
| `/app` — kabadiwala                                  | Compact greeting, requests/today panels, money/stock totals, price checks, dispatch form and quick links                                                              | Loaded/empty and owner/dispatch unit tests                                                            |
| `/app` — yard/recycler/manufacturer                  | Compact greeting/actions, four/three totals, waiting trades and current offers                                                                                        | Existing role-specific trade and stock rules retained                                                 |
| `/app` — Saathi                                      | Compact greeting, quiet earnings panel, active/open/upcoming job cards and actions                                                                                    | Existing take/finish/race/failure tests                                                               |
| `/app/requests`, `/app/requests/{id}`                | Tabs/counts, request cards, detail header, facts, call/map actions, weighing, payment and receipt                                                                     | Existing tab, dispatch, weighing and receipt tests                                                    |
| `/app/stock`                                         | Totals, continuous material list, accessible empty state and sell action                                                                                              | Existing stock and access tests                                                                       |
| `/app/prices`                                        | Family groups, rate editor grid, field/action rows and validation                                                                                                     | Existing rate-floor/save tests                                                                        |
| `/app/market`                                        | Filter controls, listing cards, buy dialog and empty/loading state                                                                                                    | Existing filtering and integer-quantity buy tests                                                     |
| `/app/sell`                                          | Wide-screen form/list layout, material choices, quantity/price/note, value summary and owned listings                                                                 | Existing stock availability and listing creation tests                                                |
| `/app/trades`                                        | Tabs, trade cards, compact status, next actions and invoice links                                                                                                     | Existing role/state-transition tests                                                                  |
| `/app/trades/{id}/invoice`                           | Print action, document frame and typography                                                                                                                           | Existing invoice rendering and access tests; print rules preserved                                    |
| `/app/impact`                                        | Metric spacing, stable material symbols, flow rows, earnings history and ledger explanation                                                                           | Existing organization/Saathi empty and loaded tests; charts owned by chart agent                      |
| `/app/compliance`                                    | Consent state, checklist, receipt list/table and EPR rows                                                                                                             | Existing consent/compliance tests; sensitive values and permissions unchanged                         |

## Validation

Workspace tests passed: **51 files, 338 tests**, including the twelve-locale
message contract. Scoped ESLint passed after correcting a test mock reference.
The workspace regression run took 9.95 seconds.
New regressions cover desktop/mobile active navigation, the secondary mobile
menu, Saathi navigation restrictions and signed-out child protection. The
booking flow test now checks instant validation scrolling.

No business calculation, Convex query/mutation, authentication contract or
translation string was changed. No dependency or Git operation was made by
this agent. Existing twelve-locale translation contracts remain in use.

## Required integration evidence

The coordinator must inspect the integrated UI at 360, 390, 768, 1024 and
1440px; light/dark; English/Arabic and a long-script locale. Verify keyboard
navigation, small-screen action wrapping and reduced motion. Unit tests do not
prove layout or authenticated provider execution.

Refresh guide screenshots for sign-in, applicant pages, household booking and
tracking, price board and all role workspaces. Use the actual current UI with
approved data. Keep synthetic protected-page fixtures labelled. Update the
source guide, capture manifest, reviewed Word artifact and cloud publication
state through the coordinator's required guide process. This agent has not
made or claimed browser, Word or cloud evidence.

## Longer homepage extension

The founder requested a substantially longer homepage during this pass.
Six new sections now sit between the existing hero and closing action:

1. Material directory: six supported scrap families, with translated examples
   selected from the canonical catalogue. No prices or live availability are
   invented. The section points to the existing booking flow.
2. Pickup journey: manual selection, shop offer, time and mobile confirmation;
   a contextual household image and links to booking and the maintained guide.
3. Shop workday: requests, weighing/payment and price control; a wide material
   yard image, shop signup and role-help links.
4. Weight and payment: final weighed value, direct cash/UPI payment and the
   itemized receipt. The current estimate wording remains explicit.
5. Material records: who/what/when/where, immutable past receipts and an explicit
   statement that carbon credits are not yet issued. No live escrow claim.
6. Questions and guides: six maintained FAQ disclosures, including the planned
   escrow limitation, with household, shop, Saathi and general help links.

The new headings are translated in all twelve catalogues. All explanatory copy
reuses existing maintained strings. New components use the existing GSAP reveal
and parallax boundary; motion remains optional and reduced-motion aware. The
existing hero price links remain unique. The six role-directory images and
role links are unchanged. New long button labels wrap at narrow widths.

Homepage focused verification passed: **5 files, 60 tests** (new content,
existing hero/role sections, live-price states, navigation and locale parity).
The eight new homepage tests cover canonical scrap examples, manual booking,
shop actions, future credit limits, measured payments, maintained FAQs and
Arabic content. Every new section renders against real English and Arabic
catalogues with missing-message errors configured to throw. This caught and
corrected the standards link to use `footer.standards`. Scoped ESLint passed
across all owned source and tests.

The first integrated Tamil 360px review found long guide buttons overflowing.
The new sections now have explicit one-column mobile grids, shrinking children,
wrapping button text and automatic button heights. A fresh browser check remains
required to confirm the correction.

Homepage screenshots, responsive evidence and guide changes remain with the
coordinator. The new sections require capture as part of the current guide
edition; no visual or provider proof is claimed by these unit tests.
