# Integrated design review — 2 October 2026

This is a read-only product review of the stable public, workspace, admin and
chart changes on `feat/design-system-polish`. The reviewer changed this record
only. The coordinator owns integration checks, browser captures and the guide.

## Findings

No confirmed actionable regression was found in the stable files reviewed.
Source review covered navigation, locale links, form composition, shared
controls, workspace headers, admin charts and Solar keyboard behavior. This is
not a claim that every protected state has passed a rendered browser review.

The first inventory found a design coverage gap outside the page routes:
`src/app/global-error.tsx` still rendered a bare heading and retry button, and
none of the three coverage records listed it. The coordinator has since added
the shared CSS, theme bootstrap, logo and button. Source review confirms the
fallback still owns its HTML document, derives locale/direction without the
normal provider tree and calls the supplied retry handler. The coordinator owns
the fallback test result and rendered verification.

## Route mapping

The inventory found **41 `page.tsx` files**. Every page family maps to one or more
of the three coverage records below. Counts describe source wrappers, not each
locale or each generated dynamic URL.

- **Public:** [designer-public.md](designer-public.md).
- **Workspaces:** [designer-workspaces.md](designer-workspaces.md).
- **Admin/charts:** [designer-admin-charts.md](designer-admin-charts.md).

| Route group            | Count | Route wrappers                                                                                                                                                                         | Coverage record                                                          |
| ---------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `admin`                |     8 | `/admin`, `/admin/login`, `/admin/setup`, `/admin/pilot`, `/admin/support`, `/admin/verification`, `/admin/verification/[id]`, `/admin/prices`                                         | Admin/charts                                                             |
| `[locale]/(site)`      |    14 | `/`, `/standards`, `/help`, `/help/contact`, `/help/[role]`, `/help/[role]/[guide]`, `/how-it-works`, `/prices`, `/[...rest]`, `/sell`, `/join`, `/solar`, `/contact`, `/participants` | Public; Workspaces for prices/sell/join controls; Admin/charts for Solar |
| `[locale]/(auth)`      |     2 | `/login`, `/login/verify`                                                                                                                                                              | Workspaces                                                               |
| `[locale]/(household)` |     1 | `/t/[token]`                                                                                                                                                                           | Workspaces                                                               |
| `[locale]/(join)`      |     5 | `/join/saathi`, `/join/status`, `/join/[business]`, `/join/[business]/documents`, `/join/kabadiwala`                                                                                   | Workspaces                                                               |
| `[locale]/(app)`       |    11 | `/app`, `/app/prices`, `/app/impact`, `/app/sell`, `/app/stock`, `/app/requests`, `/app/market`, `/app/requests/[id]`, `/app/trades`, `/app/compliance`, `/app/trades/[id]/invoice`    | Workspaces; Admin/charts for the shared insight bars                     |

`[business]` covers yard, recycler and manufacturer. Dynamic help wrappers cover
their generated role and guide pages. Shared layouts, loading, not-found and
error boundaries are state coverage, not additional `page.tsx` entries.

## Local browser evidence

Checks used headless Chromium against `http://localhost:3005`, with optional
services disabled. These checks inspected the live DOM; they did not capture
screenshots, submit forms, send codes or call a configured provider.

- At 360 × 800, `/ar/solar`, `/ta/prices`, `/kn/join`, `/admin/login` and `/login`
  had document width equal to viewport width and no offscreen elements in the
  checked main/header content after fonts loaded.
- Solar estimates were displayed by entering a bill amount of 3000 in English,
  Arabic and Tamil. In both light and dark system preferences, document width
  remained 360px. The Tamil subsidy table exceeded its visible region inside
  the intended horizontal table scroll container; it did not widen the page.
- The Solar slider accepted keyboard Home and selected year 1 in all three
  locales. Mobile menus opened, and sign-in links retained `/login`, `/ar/login`
  and `/ta/login` respectively.
- `/ta/prices` also fitted a 1024 × 800 viewport. Its header used the expected
  two-row layout.

Chart source review confirmed that pilot charts use the existing report data,
keep integer grams as their data values, disable animation and retain visible
text/table equivalents. The bar list bounds its fill at 100% and does not draw a
false positive fill for zero. No new metrics or history were introduced.

## Remaining evidence

- The expanded homepage source and first mobile check are reviewed below. Repeat
  the narrow layout check after the confirmed overflow fix.
- Loaded protected states need the labelled fixture review. Public unavailable
  states do not prove protected layout, authenticated access or live operations.
- The wider coordinator matrix, screenshots, reduced-motion checks and guide
  publication remain separate proof gates. No new broad test, Git, build or
  screenshot command was run for this review.

## Expanded homepage review

Reviewed `material-directory`, `pickup-journey`, `shop-workday`, `weight-payment`,
`material-records` and `home-questions` after they were added to the page.

The sections use catalogue examples and maintained workflow/help copy. Payment
copy describes cash or UPI at collection, not platform payment processing.
Carbon credits remain explicitly unavailable; business escrow remains planned.
No invented price, transaction total or impact metric appears in these sections.
The role benefits repeat briefly in the household/shop sections and the role
directory, but serve different navigation contexts. No contradictory claim was
found in that repeated content.

At 360 × 800 with reduced motion, English and Arabic had no offscreen section
content and a document width of 360px. Tamil exposed a **P2 mobile overflow**:

- `src/components/site/home/shop-workday.tsx`, the join and help action buttons
  (lines 53–64 at review), used unwrapped labels approximately 402px and 397px
  wide. Their grid grew past the viewport.
- `src/components/site/home/weight-payment.tsx`, the guide action button
  (line 70 at review), was approximately 371px wide and also widened its grid.
- The Tamil document width was 422px. These controls need wrapping labels and
  bounded width; the narrow grid children must be able to shrink.

The finding was sent to the coordinator before any product edit. The homepage
owner added shrinking grid tracks/children and bounded, wrapping action labels.
Source review confirms those fixes. The first repeat browser check could not
connect because the coordinator had stopped port 3005 for the production build;
rendered verification will use the next preview. These checks use live DOM
geometry after fonts load; they are not a screenshot review.

The coordinator also found a missing `nav.standards` key in the records section.
The owner replaced it with the existing `footer.standards`. An independent check
then extracted literal translator calls and enumerated the dynamic family,
role, ledger and FAQ keys in all six new sections: all **79 paths** resolved to
strings across **12 locales**. No further missing key was found.

## Coordinator verification report

The coordinator reported 1,157 passing product unit tests with the guide test
excluded until its captures are refreshed, three passing global-error tests and
a passing current typecheck. These results were reported to this reviewer; the
reviewer did not repeat those broad commands. The expanded responsive e2e matrix
is separate pending evidence and is not counted as passed here.

## Production and loaded-fixture follow-up

The 360 × 800 homepage retest on production preview `http://localhost:3004`
passed for English, Arabic and Tamil: document width was 360px and no inspected
section content extended beyond the viewport. The Tamil finding above is
resolved in that build. Temporary screenshots of the Tamil shop/payment sections
and Arabic records section were visually inspected. Wrapped actions and RTL
fact ordering were readable. Sticky headers can appear within tall element
captures because the capture scrolls the page; these temporary review images
are not the maintained guide evidence.

The added Malayalam check found another **P2 mobile overflow** in shared
`src/components/site/closing-cta.tsx` (lines 17 and 29–37 at review). Its base grid
and unwrapped buttons made the content column 353.5px wide, extending to 373.5px
in a 360px viewport. All six new sections fitted Malayalam. The shared closing
section finding was reported to the coordinator. The corrected production
preview subsequently passed Malayalam at 360px: document width 360px, no
inspected section content offscreen. A Tamil 768px homepage check also passed
with document width 768px and no inspected section content offscreen.

Loaded screens were checked at `http://127.0.0.1:3202` using the explicitly
labelled synthetic documentation fixtures. All record writes are disabled.

- Admin pilot at 1440px and 360px in both light and dark: two chart SVGs rendered,
  document width matched the viewport, and keyboard Enter on Today selected the
  period (`aria-pressed=true`). Visible bar values matched the adjacent totals;
  material bars matched the table's 40/40.5kg and 8/8kg sample rows.
- Yard and kabadiwala workspaces fitted 1440px light and 360px dark with no checked
  main-content element outside the viewport. Temporary workspace screenshots
  were visually inspected for hierarchy, readable controls and spacing.
- The mobile Yard More menu opened by keyboard Enter and exposed the secondary
  work links. ArrowDown moved focus, and Escape returned focus to the menu
  button. The immediate DOM count still included the menu during its exit;
  removal after the animation was not measured in that check.

Visual review found **P2 dark chart-label contrast** in shared
`src/components/ui/chart.tsx:67`. The installed Recharts renders parent class
`recharts-cartesian-axis-tick-label`; the vendor selector targets
`recharts-cartesian-axis-tick text`. DOM inspection confirmed that selector did
not match, leaving small labels at `rgb(102, 102, 102)` on the dark chart surface
instead of the semantic muted foreground. The coordinator changed the selector
to `recharts-cartesian-axis-tick-value`. A new browser session against the
restarted fixture server still computed `rgb(102, 102, 102)`: the DOM had the new
class, but `.next/static/css/3679cebb0a4b9ac5.css` still contained only the old
selector. This generated stylesheet mismatch was reported to the coordinator.
The clean build and refreshed fixture then loaded
`318faaa56684eddc.css`. The final dark-theme check at 360px returned
`oklch(0.725 0.009 250)` for every tick across both pilot charts, exactly matching
an SVG probe using `var(--muted-foreground)`. The corrected chart screenshot was
visually inspected. This finding is resolved.

Fixture results prove presentation and local control behavior only. They do not
prove authentication, server filtering, provider execution or live records.

## Final review status

All confirmed product findings from this review are resolved: the root fallback
has the shared presentation, Tamil and Malayalam overflow fixes pass their
targeted production checks, the standards link uses a valid catalogue key, and
dark chart labels use the semantic theme color in the rendered fixture.

The coordinator reported three isolated passing menu tests and the final
production browser suite: **107 tests passed with one worker in 58.8 seconds**,
including the new responsive cases and menus. These are coordinator-reported
results, separate from this reviewer's independent DOM, keyboard and chart-color
checks. No product file was changed by the reviewer.
