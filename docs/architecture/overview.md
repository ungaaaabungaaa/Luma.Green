# Architecture overview

> **Status:** updated for native shells, 1 Oct 2026. Each decision has an
> [ADR](../decisions/README.md); this page is the map. Product context:
> [product/vision.md](../product/vision.md).

## In one paragraph

Luma.Green is a **modular monolith on two managed platforms**: one Next.js 16
app on Vercel serves every screen, and one Convex backend holds all data and all
business logic. Convex gives us a transactional database, live queries, file
storage, scheduled jobs and HTTP endpoints in one place, so a team of one to
three people can run the whole chain — onboarding, pickups, prices, stock and
verification — without operating servers. Outside services (SMS, AI, maps) are
called only from Convex actions. Everything else is code in this repository.

Native shells in `apps/mobile` (Expo) and `apps/desktop` (Electron) load the
shared hosted UI. They own native controls and update delivery, while Next.js
and Convex remain the screen and data owners. See [native apps](native-apps.md)
and [ADR 0014](../decisions/0014-shared-web-ui-in-native-shells.md).

## Context

```
 Household ─┐                                          ┌─► MSG91        SMS codes and messages (DLT)
 Kabadiwala ├─┐                                        ├─► OpenRouter   vision model for photo estimates
 Yard       │ │     ┌──────────────────────────────┐   ├─► Mapbox       map pins and geocoding
 Recycler   │ ├────►│          Luma.Green          │───┤
 Manufacturer │     │  Next.js on Vercel + Convex  │   └─► later: WhatsApp, Razorpay (escrow), Cloudflare R2
 Saathi     ├─┘     └──────────────────────────────┘
 Admin ─────┘
```

## Containers

```
Browser — phone first, desktop for businesses and the admin
  │  HTTPS (pages)                          WebSocket (live queries + mutations)
  ▼                                          ▼
Next.js 16 app on Vercel                 Convex deployment (dev · preview · prod)
  • route-group areas: (site) (household)   • modules: identity · onboarding · orgs ·
    (auth) (join) (app) and admin/            catalogue & prices · bookings · stock ·
  • server components; client islands        notifications · ai · admin · analytics
    for forms, camera and live data         • Better Auth component: sessions, SMS
  • /api/auth/* → Better Auth handler         codes, email+password, authenticator
  • next-intl: 33 locales, RTL              • file storage: photos, PDFs, IDs
                                            • scheduler + crons: dispatch timeouts,
                                              SLA flags, notification retries
                                            • HTTP actions: webhooks, private files
                                              │ fetch — actions only
                                              ▼
                                            MSG91 · OpenRouter · Mapbox
```

## Modules

Each module is a folder in `convex/` that owns its tables. Other modules call
it through its internal functions, never by writing its tables directly.

| Module          | Owns                                                                        | Notes                                             |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| `identity`      | `profiles`, `adminProfiles`; Better Auth component                          | [auth.md](./auth.md)                              |
| `onboarding`    | `applications`, `applicationFiles`                                          | State machine, admin review, SLA                  |
| `orgs`          | `orgs`, `memberships`, `saathiProfiles`                                     | Location and material decide visibility           |
| `catalogue`     | `materials`, `priceFloors`, `fallbackRates`, `rateCards`                    | [pricing](../product/pricing.md)                  |
| `bookings`      | `households`, `bookings`, `bookingOffers`, `pickupReceipts`, `pointsLedger` | Dispatch, weigh and pay                           |
| `stock`         | `inventory`, `inventoryMovements` (+ later `listings`, `trades`)            | Append-only movements; sorting entries            |
| `notifications` | `notifications` outbox                                                      | SMS now, WhatsApp later; retried by the scheduler |
| `ai`            | Estimate records on bookings                                                | [ai-estimation.md](./ai-estimation.md)            |
| `admin`         | Queues and admin-only mutations                                             | Only the admin role can call it                   |
| `analytics`     | `events`, `auditLog`                                                        | Pilot numbers without PostHog                     |

Full table list: [data-model.md](./data-model.md).

## Rules that make it work

| Concern          | Where it lives                                                                          |
| ---------------- | --------------------------------------------------------------------------------------- |
| Business rules   | Convex functions — never in a component                                                 |
| Authorisation    | Convex functions, via the Better Auth user — never in the UI, never in `proxy.ts` alone |
| Validation       | Zod on the client; Convex validators on the server; the same shape                      |
| Live data        | Convex `useQuery`                                                                       |
| Other async work | TanStack Query                                                                          |
| Outside services | Convex **actions**, which then call mutations to save results                           |
| Copy             | `messages/*.json` (admin console excepted — English only)                               |
| Colour, spacing  | Tokens in `globals.css` — white theme only                                              |
| Configuration    | `src/lib/env.ts` for Next.js; Convex environment variables for backend secrets          |
| Money and mass   | Integer paise and integer grams                                                         |
| History          | Append-only: movements, receipts, price rows, audit log. Corrections are new rows       |

## Key flows

**Joining.** Browser → `/login` (Better Auth phone plugin asks Convex to send a
code; Convex queues an SMS in the outbox and an action sends it through MSG91) →
`/login/verify` → session → `/join/{role}` forms save drafts through mutations,
files go straight to file storage → _submit_ moves the application to
`submitted`, writes the audit log and an event → it appears live in the admin's
queue → the admin's decision moves it on and queues an SMS.

**A pickup.** Household uploads photos → estimate action (OpenRouter) → priced
by our tables → booking created after the SMS code → offered to a kabadiwala
(auto-accept or a scheduled 15-minute timeout that re-offers it) → accepted →
on the way → weighed: a receipt is written, stock goes up, points are credited —
one mutation, all or nothing.

## Failure modes we design for

- **Patchy mobile networks.** Operators work in lanes and yards. Small payloads,
  optimistic updates for retryable writes, an offline banner; Convex reconnects
  on its own.
- **Partial deployments.** The Convex schema deploys before the frontend that
  needs it (the Vercel build runs `convex deploy` first). New fields land
  optional, get backfilled, then become required — [migrations](../migrations/README.md).
- **A wrong number.** Corrections to stock, receipts or prices are new rows,
  never edits of history.
- **A slow or failing provider.** SMS, AI and maps are called from actions with
  timeouts and retries; the interface always has a manual fallback (pick
  materials by hand; resend the code).
- **One region.** Convex runs only in the US or the EU; our deployments are in
  EU West (Ireland) and can't move without an export and import. Expect around
  150 ms from Bengaluru — fine for this app; keep round trips few.

## Environments

Local (your machine + the Convex dev deployment), Preview (a Vercel preview per
pull request + a Convex preview deployment per branch) and Production
(`lumagreen.vercel.app`, later `luma.green`, + the Convex production
deployment). Details: [operations/environments.md](../operations/environments.md).

## Optional observability

PostHog and Google Analytics 4 are implemented for consented manual public-page
views. Sentry captures filtered browser and Next.js server exceptions. All need
the explicit deployment telemetry flag plus their own configuration; analytics
also needs the visitor's saved opt-in. Private workflows are excluded from
analytics, and no session replay, profiling or performance tracing is enabled.
Convex and native shell crashes are not instrumented by these web integrations.
See [ADR 0016](../decisions/0016-optional-analytics-and-error-monitoring.md) and
the [observability runbook](../operations/observability.md). Convex pilot reports
remain the source of operational totals.

## How later features plug in

| Later feature                           | Plugs in as                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Kabadiwala → yard collections           | `stock` module: listings and collection requests; `bookings` patterns reused                                    |
| Escrow between businesses               | A `payments` module with Razorpay Route; `trades` settle through it                                             |
| Carbon credits                          | The v1 `carbonCredits` / `creditTransfers` design, fed by sorting and trade records; verifiers return as a role |
| Solar, documentation and legal services | A `services` module: providers, requests, statuses — the onboarding pattern again                               |
| Machinery data bank                     | `catalogue` gains machines; yards link the machines they own                                                    |
| WhatsApp for households                 | A channel adapter in `notifications` plus an HTTP-action webhook into `bookings`                                |
| Team members for the admin              | Staff roles in `identity` — [auth.md](./auth.md#later-team-members)                                             |
