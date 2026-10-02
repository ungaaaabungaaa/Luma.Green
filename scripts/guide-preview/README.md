# Isolated guide screenshot preview

This harness renders the existing Luma.Green React components in Chromium.
It does not copy their markup or change their styles. It uses the current
production build's CSS and exact per-locale Geist/Noto font classes, read from its generated HTML. The yellow provenance banner is added
by the documentation harness outside the application shell.

All displayed accounts, applications, bookings, prices and report totals are
synthetic fixtures. The clock is fixed at 14 October 2026, 11:30 India time.
The screenshots show the interface with that sample data. They do not prove
successful sign-in, authorization, payment, provider execution or deployment.

## Capture again

Start from the repository root with dependencies installed and a current
production build. The build must contain `.next/static/css` and its font assets.
For this host, the supported build command is `pnpm exec next build --webpack`.

```sh
pnpm exec vite --config scripts/guide-preview/vite.config.mts
```

In another terminal:

```sh
node scripts/guide-preview/capture.mjs
```

The preview listens only on `127.0.0.1:3202`. If that port is already in use,
leave the existing process running and start a separate preview:

```sh
pnpm exec vite --config scripts/guide-preview/vite.config.mts --port 3203
GUIDE_FIXTURE_ORIGIN=http://127.0.0.1:3203 node scripts/guide-preview/capture.mjs
```

The origin override accepts only loopback HTTP origins. The harness does not use
port 3004 or alter its running production preview. Stop only the preview started
for the current capture after the work is complete.

Capture outputs go to `docs/user-guide/screenshots`. The script checks the
visible provenance label and each page heading, waits for fonts, rejects browser
errors and external network requests, then writes full-page PNG files. It records
routes, component paths and hashes, PNG hashes, production stylesheet hashes,
shared image/adapter source hashes, viewport sizes, scroll targets, the fixture clock and capture time in `fixture-captures.json`.
`sourceCommit` records HEAD at capture; individual source hashes identify the
component contents even when the working tree contains documentation changes.

The harness does not copy compiled CSS or fonts into Git. Rebuild them when
source styles change. Most screenshots are at 1440 × 1000 viewport pixels, with
reduced motion enabled. Household tracking uses a 480 × 1200 phone-width viewport. Most captures include the full page. The request overview,
weighing form and rate card use the unmodified 1440 × 1000 browser viewport so
the controls remain readable in the Word guide. The weighing capture scrolls to the
actual `#weigh` section; the documentation banner remains visible above it. No
image is cropped, repainted or composed after capture. `?role=` selects only the
harness fixture; it is not a production role-switching feature.

The shop and yard application captures show the upper form in the browser
viewport. The guide explains how to reach the remaining fields by scrolling.
This keeps field text readable in Word instead of shrinking a long form to one
page.

## Isolation and adapters

- `main.tsx` imports actual `ConsoleShell`, `AppShell`, `JoinLayout` and page components.
- `fixtures.ts` contains sample data, with typed contracts for the main records.
- `queries.ts` replaces Convex hooks only in this Vite configuration. It creates
  no client, session, WebSocket or database connection. Unknown queries fail.
- Mutation and action adapters always reject. Sign-out also rejects. The harness
  cannot save a price, approve a business, send a message, or change an account.
- `locale.ts` loads the active route language from the real message catalogue. `translations.ts` resolves the actual async `HouseholdLayout` translation call from that same catalogue. Its markup is imported unchanged. All registered locales are supported by the harness.
- `image.tsx` uses local Vite image URLs in place of the Next optimizer. It preserves image classes, sizing and fill positioning. This adapter does not test production image delivery; production browser checks cover that. Remove it when authenticated Next captures replace the fixture harness.
- `navigation.tsx` adapts Next links, paths and initial query parameters to the standalone preview. This
  tests component rendering, not the Next router or server route guards.
- `process.env` is an explicit empty configuration plus `NODE_ENV`. No application
  environment file, credentials, development auth flag or backend URL is loaded.
- The capture script blocks every non-local HTTP request. No private attachment
  is loaded; the review fixture is a kabadiwala application without documents.
- No file under `src/`, no authentication code, and no production route is changed.

The business homes use zero synthetic trades and one synthetic material offer.
The separate trades page shows one synthetic accepted purchase. The compliance
page uses visibly fictional registration identifiers and report quantities.
They remain prototypes: an “escrow” label in a screenshot does not establish
real payment processing. The guide must explain this boundary in its text.

Six role home screens also have a `-phone` capture at 390 × 844 pixels to check
mobile navigation. Operational phone screenshots use the actual viewport only,
so fixed bottom navigation remains at the bottom of the image. This also applies
to the stock and impact phone examples. Full-page screenshots of these screens
would place the fixed navigation over content in the middle of the long image.

## Current capture set

| File stem                     | Actual component                                             |
| ----------------------------- | ------------------------------------------------------------ |
| `admin-overview`              | `ConsoleHome` inside `ConsoleShell`                          |
| `admin-verification`          | `VerificationQueue` inside `ConsoleShell`                    |
| `admin-review`                | `ApplicationReview` inside `ConsoleShell`                    |
| `admin-support`               | `SupportInbox` inside `ConsoleShell`                         |
| `admin-prices`                | `PriceTables` inside `ConsoleShell`                          |
| `admin-pilot`                 | `PilotNumbers` inside `ConsoleShell`                         |
| `kabadiwala-overview`         | `KabadiwalaHome` through `RoleHome` inside `AppShell`        |
| `kabadiwala-request`          | `RequestDetail` inside `AppShell`                            |
| `kabadiwala-request-overview` | `RequestDetail` at the top of the browser viewport           |
| `kabadiwala-weigh`            | Actual `#weigh` section of `RequestDetail`, viewport capture |
| `kabadiwala-ratecard`         | `RateCardPage` inside `AppShell`, viewport capture           |
| `yard-overview`               | `BusinessHome` through `RoleHome` inside `AppShell`          |
| `recycler-overview`           | `BusinessHome` through `RoleHome` inside `AppShell`          |
| `manufacturer-overview`       | `BusinessHome` through `RoleHome` inside `AppShell`          |
| `saathi-overview`             | `SaathiHome` through `RoleHome` inside `AppShell`            |
| `household-tracking`          | `TrackView` inside the actual `HouseholdLayout`              |
| `kabadiwala-requests`         | `RequestsPage` inside `AppShell`, viewport capture           |
| `yard-market`                 | `MarketPage` inside `AppShell`, viewport capture             |
| `yard-trades`                 | `TradesPage` inside `AppShell`, viewport capture             |
| `manufacturer-compliance`     | `CompliancePage` inside `AppShell`                           |

## Loaded report chart evidence

The `pilot:summary` adapter returns a typed synthetic summary with eight bookings
and two material rows. The same `PilotNumbers`, `BookingOutcomeChart` and
`MaterialWeightChart` components used by the app render these records. The capture
script requires both SVG charts to have usable dimensions and visible bars before
it writes any pilot screenshot. It also captures the full report in dark mode and
at phone width. Separate outcome and material viewport screenshots keep the guide
charts readable. These values are examples, not measured pilot results.

## Added protected-screen coverage

The capture script also registers the following eight outputs. Capture and visual
review must finish before these are used as guide evidence. Existing capture
names, routes and provenance rules remain unchanged.

| File stem                | Actual component and state                                    | Heading       | Viewport    |
| ------------------------ | ------------------------------------------------------------- | ------------- | ----------- |
| `kabadiwala-stock-phone` | `StockPage`, one synthetic newspaper stock row                | Stock         | 390 × 844   |
| `yard-sell`              | `SellPage`, one synthetic open listing and available stock    | Sell          | 1440 × 1000 |
| `yard-invoice`           | `InvoicePage`, synthetic prototype escrow receipt             | Trade receipt | 1440 × 1000 |
| `recycler-impact`        | `ImpactPage` / `OrgImpactView`, synthetic material totals     | Your impact   | 1440 × 1000 |
| `recycler-impact-phone`  | Same impact example at phone width                            | Your impact   | 390 × 844   |
| `join-kabadiwala-phone`  | `KabadiwalaJoin` / `KabadiwalaForm`, existing synthetic draft | Your shop     | 390 × 844   |
| `join-yard`              | `BusinessJoin` / `BusinessForm`, existing synthetic draft     | Your yard     | 1440 × 1000 |
| `join-status-phone`      | `StatusView`, submitted synthetic shop application            | Under review  | 390 × 844   |

The three onboarding views use the current `JoinLayout` and query the isolated
`applications:mine` adapter. The forms start with synthetic draft values. The
capture script does not edit fields, submit a form, request location, upload files
or run autosave. No login number or customer contact details are supplied.
All mutations and actions still reject through the same write-disabled adapter.
Production session checks and application code are unchanged.

## Responsive fixture audit

The isolated preview also accepts `/ar`, `/ta` and `/ml` paths. It renders the
committed locale catalogues and sets the corresponding document direction.
Admin pages remain English. These adapters do not change application routing or
authentication.

Run the repeatable layout audit after rebuilding the application CSS and
restarting the task-owned preview:

```sh
GUIDE_FIXTURE_ORIGIN=http://127.0.0.1:3203 node scripts/guide-preview/responsive-audit.mjs
```

It checks all 40 registered fixture views at 320, 390, 640, 768, 1024 and 1440 px,
plus eight representative Arabic workspace views at the same widths. It checks
page overflow, clipped text controls and heading/label text bounds. Intentional
table scroll regions are reported separately. Larger invisible Radix hit areas
and progress fills inside clipped tracks are not text-layout faults. External
requests are blocked and no write actions are performed.

Results and unchanged browser PNGs for failures go to a unique
`luma-responsive-fixtures-*` directory under the OS temporary directory,
separate from the maintained guide evidence. The script prints the full path.
`GUIDE_AUDIT_OUTPUT` can select another output directory. `GUIDE_AUDIT_SCREEN`
filters view names for a targeted follow-up. Inspect every reported failure;
geometry checks do not replace visual or keyboard review.

The sale example has 260 kg of stock, a 60 kg open listing and 200 kg available.
The separate receipt example is an illustrative prototype state, not proof of
payment. The impact totals, including 100 kg of CO₂e, are synthetic. They must not
be described as measured recovery, verified emissions reductions or issued
credits. Add these screenshots to the stock, business sale, trade receipt, impact
and onboarding guide chapters only after browser capture and visual review.
