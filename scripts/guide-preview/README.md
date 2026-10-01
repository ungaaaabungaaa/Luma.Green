# Isolated guide screenshot preview

This harness renders the existing Luma.Green React components in Chromium.
It does not copy their markup or change their styles. It uses the current
production build's CSS and Noto fonts. The yellow provenance banner is added
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

The preview listens only on `127.0.0.1:3202`. It does not use port 3004 or alter
its running production preview. Stop the preview with Ctrl+C after capture.

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
the controls remain readable in the PDF. The weighing capture scrolls to the
actual `#weigh` section; the documentation banner remains visible above it. No
image is cropped, repainted or composed after capture. `?role=` selects only the
harness fixture; it is not a production role-switching feature.

## Isolation and adapters

- `main.tsx` imports actual `ConsoleShell`, `AppShell` and page components.
- `fixtures.ts` contains sample data, with typed contracts for the main records.
- `queries.ts` replaces Convex hooks only in this Vite configuration. It creates
  no client, session, WebSocket or database connection. Unknown queries fail.
- Mutation and action adapters always reject. Sign-out also rejects. The harness
  cannot save a price, approve a business, send a message, or change an account.
- `translations.ts` resolves the actual async `HouseholdLayout` translation call
  from the committed English catalogue. Its markup is imported unchanged.
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

Six role home screens also have a `-phone` capture at 390 × 844 pixels to check the compact image placement and mobile navigation.

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
