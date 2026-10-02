# Offline demo manifest

Status: offline checks pass, 2 October 2026. No database was read or changed.
No users, files, prices, jobs or transactions were imported. Deployment isolation
remains undecided. This is the concrete review artifact for the
[demo seed plan](demo-seed-plan.md), not an importer or a production dataset.

## Files and repeatable commands

- `scripts/demo-seed/manifest.json`: fixed logical records and planned gaps.
- `scripts/demo-seed/coverage.json`: counts, role/family coverage, material and
  workflow coverage, balance evidence and the normalized content hash.
- `scripts/demo-seed/build.ts`: deterministic fixture construction using the
  current canonical material catalogue.
- `scripts/demo-seed/model.ts` and `validate.ts`: strict field, reference,
  role, state, integer, reservation and balance checks.
- `scripts/demo-seed/manifest.test.mts`: 35 offline regression tests, including
  deliberately invalid copies of the manifest.

Run from the repository root:

```bash
pnpm exec jiti scripts/demo-seed/generate.mts
pnpm exec jiti scripts/demo-seed/manifest.test.mts
pnpm exec eslint scripts/demo-seed
pnpm exec prettier --check scripts/demo-seed docs/product/demo-seed-manifest.md
```

The generator writes only the two JSON files beside it. It imports no database
client, auth API, reset function or provider adapter. It reads no environment
variables. The test uses Node's test runner through the installed `jiti` tool;
it is a separate command from the current web/Convex Vitest include list.
No new package or package script is required.

Version: `demo-v2-offline-1`. Namespace: `luma-green-demo-v2`.
Reference date: **15 October 2026**. Seed: **20261002**.
The 30-day price range is **16 September–15 October 2026**. Prices are synthetic
sample values for a future isolated demo only; these files do not change the
public price board or represent current market quotes.

Normalized SHA-256:

```text
87de2132933b2e2c01b505841b80f78167926c07dc844283d04aea14b3d6f5ff
```

The hash covers the parsed manifest serialized with recursively sorted object
keys, preserved array order, two-space JSON indentation and one trailing newline.
It is a content hash, not the hash of the Prettier-formatted file bytes. The
coverage report stores it as `manifestSha256`. Tests verify both JSON artifacts
against a fresh generation. No wall-clock date or unseeded randomness enters the
content. A canonical catalogue change must be reviewed and regenerated; the
artifact parity test fails until the saved data matches.

## Coverage

Each cell below contains two planned businesses. This gives 48 plans, with 48
separate synthetic owner identities.

| Business role | Paper | Plastic | Metal | Glass | E-waste | Other/textiles |
| ------------- | ----: | ------: | ----: | ----: | ------: | -------------: |
| Kabadiwala    |     2 |       2 |     2 |     2 |       2 |      2 pending |
| Yard          |     2 |       2 |     2 |     2 |       2 |      2 pending |
| Recycler      |     2 |       2 |     2 |     2 |       2 |      2 pending |
| Manufacturer  |     2 |       2 |     2 |     2 |       2 |      2 pending |

“Planned business” does not mean an approved organisation. The eight textile
businesses have `pending-schema` readiness and no operational records. Glass
and e-waste manufacturer plans have empty stock because the catalogue has no
matching recycled outputs.

| Record group         | Count | Review coverage                                                                   |
| -------------------- | ----: | --------------------------------------------------------------------------------- |
| Synthetic users      |    82 | 48 owners, 12 households, 12 Saathis, 10 applicants                               |
| Businesses           |    48 | All 24 role/family pairs, two each                                                |
| Materials            |    26 | Canonical codes, families, stages, English names and sample prices                |
| Price points         |   780 | 30 fixed dates per material, integer paise at or above sample floor               |
| Listings             |    81 | Open, fully allocated and withdrawn examples                                      |
| Trades               |    78 | 13 supported role/family handoffs × six states                                    |
| Household bookings   |    12 | Pickup and drop-off × six states; two-item baskets                                |
| Stock movements      |   118 | Explicit opening stock, pickup, dispatch and receipt                              |
| Inventory balances   |    75 | Derived from movements, with reservations checked                                 |
| Jobs                 |    12 | Four job kinds × open, assigned and done                                          |
| Application examples |    10 | Two per applicant kind; all six statuses represented                              |
| Submission snapshots |     8 | Logical version and document ownership references                                 |
| Document plans       |    19 | PDF/PNG content types and a required demo watermark; files not generated          |
| Support examples     |     2 | Open and answered                                                                 |
| Pending gaps         |     6 | Deployment, textiles, recycled outputs, identity/files, drop-off travel, services |

Trade status counts are 13 each for requested, accepted, paid-to-escrow,
dispatched, completed and declined. Every payment is marked `simulation-only`.
There are two bookings per status. Each role has a low-stock example of 500 g
and an empty-stock example. Other initial lots are 500,000 g or 2,500,000 g.

| Material code         | Price points | Stock examples | Trade examples |
| --------------------- | -----------: | -------------: | -------------: |
| PAPER-NEWS            |           30 |              6 |             12 |
| PAPER-CARTON          |           30 |              3 |              0 |
| PAPER-BOOKS           |           30 |              3 |              0 |
| PAPER-OFFICE          |           30 |              3 |              0 |
| PAPER-MIXED           |           30 |              3 |              0 |
| PLASTIC-PET           |           30 |              3 |             12 |
| PLASTIC-HDPE          |           30 |              3 |              0 |
| PLASTIC-PP            |           30 |              3 |              0 |
| PLASTIC-LDPE          |           30 |              3 |              0 |
| PLASTIC-MIXED         |           30 |              3 |              0 |
| METAL-IRON            |           30 |              3 |             12 |
| METAL-SS              |           30 |              3 |              0 |
| METAL-ALU-CAN         |           30 |              3 |              0 |
| METAL-ALU             |           30 |              3 |              0 |
| METAL-COPPER          |           30 |              3 |              0 |
| METAL-BRASS           |           30 |              3 |              0 |
| GLASS-BOTTLE          |           30 |              3 |             12 |
| EWASTE-SMALL          |           30 |              3 |             12 |
| EWASTE-PHONE          |           30 |              3 |              0 |
| EWASTE-CABLE          |           30 |              3 |              0 |
| EWASTE-BATTERY        |           30 |              3 |              0 |
| OTHER-CLOTHES         |           30 |              0 |              0 |
| RECYCLED-PET-FLAKE    |           30 |              2 |              6 |
| RECYCLED-HDPE-GRANULE |           30 |              2 |              0 |
| RECYCLED-KRAFT        |           30 |              3 |              6 |
| RECYCLED-ALU-INGOT    |           30 |              2 |              6 |

All 26 codes appear in the catalogue and price plan. Twenty-five appear in
stock. `OTHER-CLOTHES` remains a recorded coverage gap; it is not forced through
the five-family onboarding contract. Recycled stock is labelled fictional
opening stock. No invented conversion turns scrap into an output code.

## Validation evidence

The validator uses the current chain and application lifecycle helpers for
allowed transitions. It checks catalogue drift, every role/family pair, unique
record and tracking references, owner/worker roles, document ownership, ordered
histories, integer grams/paise, per-line rounding, listing allocations, stock
reservations and worker time conflicts. Unexpected user fields, including phone
numbers and credentials, are rejected. All seven side-effect flags must be false.

The whole-manifest mass equation is:

```text
71,502,000 g opening + 21,000 g recovered
= 71,354,000 g inventory + 169,000 g dispatched but not received
```

Derived sample totals are 701,400 paise across completed trades, 1,252,500 paise
in simulated escrow, and 150,000 paise across completed jobs. These totals are
computed from their records; they are not balances at a payment provider.

The 35 tests pass. They include repeatable generation and saved-artifact parity,
rounding boundaries, broken references, missing prices, invalid chain handoffs,
unsafe/fractional numbers, skipped state transitions, wrong receipt totals,
missing/duplicate movements, wrong balances, missing stock for reservations,
worker double-booking, cross-application documents, duplicate tracking references
and attempts to enable a service or target a deployment. Strict ES2017 TypeScript
and scoped ESLint/Prettier checks also pass.

## Limits before import

1. **Isolation:** no deployment is selected. A future importer needs an approved
   namespace, query isolation, controlled entry point, backup, conflict checks
   and run-owned cleanup. None exists in this artifact. Do not run the old
   whole-table reset.
2. **Textiles and outputs:** onboarding does not support `other`. Glass, e-waste
   and textiles have no recycled output codes. Keep these as gaps until reviewed
   schema/catalogue work is complete.
3. **Identity and files:** synthetic identity tags are non-routable labels. There
   are no phone numbers, credentials, auth users, registry numbers, government
   certificates or storage IDs. Application “approved” states are review scenarios,
   not real approvals. Snapshot/document plans still need valid submission and
   storage adapters, generated watermarked files and an authorised real admin.
4. **Booking meaning:** the shared booking state machine permits `on_the_way`
   for drop-off. That example is flagged for product review before import.
   Tracking references are logical placeholders, not public tracking tokens.
5. **Schema mapping:** these are domain review records, not Convex table rows.
   For example, planned booking estimates use integer grams, while the existing
   booking input stores `estKg`. Stock movements are an offline ledger, not a new
   database table. A future adapter must use the normal audited mutation paths.
6. **Unimplemented evidence:** no SMS, email, payment, analytics, webhook,
   notification outbox, credit issuance, EPR/impact report, provider check, load
   test, import idempotency, interrupted-run recovery or cleanup test is claimed.
   No signed-in screen or account permission changed. The user guide does not
   need new screen captures for these offline files.

Deployment IDs, safe controlled identity mappings and storage IDs must remain in
a separate, approved environment mapping. Do not turn these logical references
into an authentication bypass. Import, provider execution and production proof
remain separate future gates in the seed plan.
