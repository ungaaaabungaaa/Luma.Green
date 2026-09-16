# Architecture

## The loop

Luma.Green models one circular flow, and every screen is a view onto some part
of it:

```
  collection ──► inventory ──► listing ──► trade ──► settlement
                    ▲                                    │
                    └────────── purchase ◄───────────────┤
                                                         ▼
                                              carbon credit issued
                                                         │
                                        verified ──► held/traded ──► retired
```

Participants are **orgs**, each with a role (`collector`, `aggregator`,
`recycler`, `factory`, `verifier`) and a **sector**. Orgs only see and trade
within their own sector.

## Request path

```
browser
  └─ proxy.ts                locale negotiation, redirect/rewrite
      └─ app/[locale]/layout  fonts + dir + metadata + providers
          └─ route (RSC)      reads translations server-side
              └─ client island  Convex live queries, forms
```

Rendering is server-first. All 12 locales prerender statically at build time
(`generateStaticParams` + `setRequestLocale`); a page only becomes dynamic when
it reads per-request data.

## Data

Convex holds everything. `convex/schema.ts` defines eleven tables in three
groups:

**Identity** — `users`, `orgs`, `memberships`.
**Material** — `materials` (catalogue + emission factors), `inventory` (current
stock), `inventoryMovements` (append-only truth).
**Market and carbon** — `listings`, `trades`, `carbonCredits`,
`creditTransfers`, plus `auditLog` across all of it.

Three rules the schema exists to protect:

1. **Inventory is derived.** Movements are authoritative; the inventory row is a
   sum. Every stock change writes both, in one mutation.
2. **Credits freeze their factor.** `carbonCredits.factorUsed` is copied at
   issuance. Later revisions to `materials.co2eFactorPerKg` never restate an
   issued credit.
3. **Integers only.** Paise for money, grams for mass. Floats drift, and an
   audit finds the drift.

## Boundaries

| Concern          | Where it lives                          |
| ---------------- | --------------------------------------- |
| Business rules   | Convex functions — never in a component |
| Authorisation    | Convex functions — never in the UI      |
| Validation       | Zod schemas, shared client↔server       |
| Live data        | Convex `useQuery`                       |
| Other async work | TanStack Query                          |
| Copy             | `messages/*.json`                       |
| Colour, spacing  | Tokens in `globals.css`                 |
| Config           | `src/lib/env.ts`                        |

Payments, email, OTP and AI run in Convex **actions** (they need `fetch`), which
call mutations to persist results. Nothing writes to the database from an action
directly.

## Client boundary

Server components by default. `"use client"` goes as deep as possible — the
provider stack is the only client boundary near the root, and it is deliberately
thin. A client boundary in a layout pulls the whole page into the bundle.

## Failure modes we design for

- **Patchy mobile networks.** Operators work at collection sites. Keep payloads
  small, prefer optimistic UI for writes that can be retried.
- **Partial deployments.** Convex schema deploys before the frontend that needs
  it; new fields land optional, get backfilled, then become required.
- **A wrong number.** Any correction to inventory or credits is a new movement
  or transfer row — never an in-place edit of history.

## Mobile (planned)

`ios/` and `android/` are placeholders for Expo apps that will share the Convex
backend, the Zod schemas and the message catalogue. Business logic belongs in
Convex so both clients stay thin.
