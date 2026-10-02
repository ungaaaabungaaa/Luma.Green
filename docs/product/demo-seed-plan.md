# Full-platform demo dataset

Status: planned, 2 October 2026. No local or production database was changed.
The founder’s deployment-isolation choice is pending: a separate demo deployment
or an explicitly isolated workspace alongside live records. Import depends on
that choice. The existing whole-table reset is not part of this plan.

## Goal

Create one versioned dataset that can be installed in both environments with
the same logical records and relationships. Cover each recycling role and all
six material families with enough activity to exercise the UI and run small
load checks. Clearly identify every record as demo data.

The founder chose **loading placeholders until real prices are available**.
Synthetic price history belongs only in an explicit demo workspace. It must
not replace the public price board or be presented as a current market quote.

## What exists today

`convex/lib/demo.ts` defines a small sample world. `convex/demo.ts` installs it,
with 30 days of price history and sample accounts, applications and transactions.
Its seed and reset functions require `AUTH_DEV_MODE=true`. The reset deletes
whole operational tables. It is unsuitable for a production database that may
contain real records. Do not enable development authentication in production
or use that reset for this plan.

The catalogue has 26 materials: 22 scrap inputs and four recycled outputs.
Recycled output codes currently cover paper, plastic and aluminium. Glass,
e-waste and textile processing cannot be shown as a complete manufactured-output
chain without new, reviewed material definitions. The catalogue has an `other` family,
but the onboarding forms accept only paper, plastic, metal, glass and e-waste.
Textile onboarding therefore needs a reviewed schema/form change before that
family can complete the same application flow. Normal kabadiwala approval assigns
paper, plastic and metal (`KABADIWALA_FAMILIES` in `convex/lib/review.ts`); the
planned glass/e-waste shops also need reviewed onboarding/import handling. Their
role kind is valid, but the current approval path does not assign those families.
Carbon credit issuance and
real escrow/payment execution are outside the implemented pilot.

## Dataset coverage

Interpret “two per industry” as two sample businesses for each combination of
business role and material family: paper, plastic, metal, glass, e-waste and
other/textiles. This yields 48 organisations: 12 shops, 12 yards, 12 recyclers
and 12 manufacturers. A business receives only items that its role can handle.
Do not place every material in every organisation just to fill a table.

| Area               | Planned records and useful states                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts           | 48 business owners, 12 households, 12 Saathis and 10 applicants. Use a separately approved real admin identity for review; do not create a production admin password in a seed. |
| Businesses         | Two per role/family combination. Sample names include “Demo”; fictional Bengaluru service areas and hours; no real contact or registry details.                                 |
| Materials          | Every current catalogue code represented in stock or a valid role workflow. Explicit coverage report for all 26 codes.                                                          |
| Prices             | 30 fixed daily points per code for isolated demo charts, integer paise and labelled sample floors. Public quotes stay unchanged.                                                |
| Inventory          | Small, medium and large lots; one low-stock example and one empty state per role. Quantities are integer grams.                                                                 |
| Listings/trades    | Each allowed chain handoff; requested, accepted, paid-to-escrow simulation, dispatched, completed and declined examples. Use simulated payment labels; no provider calls.       |
| Household pickups  | All six implemented states, pickup/drop-off, mixed-material baskets, measured adjustments, receipts and tracking links.                                                         |
| Work/jobs          | Available, assigned and completed work for each supported job type; synthetic earnings records only.                                                                            |
| Onboarding         | Two examples for each of the five applicant kinds. Include draft, submitted, changes_requested, approved, rejected and suspended states with valid snapshots.                   |
| Verification/files | Clearly watermarked sample documents and photos, safe content types and known storage ownership. No realistic government certificate numbers.                                   |
| Support            | Open and answered examples: these are the two statuses in the current schema.                                                                                                   |
| Reporting          | Consistent stock movements, trade totals, EPR summaries and impact estimates derived from the same records. Do not mint credits or invent independent dashboard totals.         |
| Notifications      | Demo outbox evidence if needed, with delivery suppressed. No SMS, email, payment, analytics or external webhook execution.                                                      |

The first implementation must inventory the existing status validators and
role permissions before constructing records. Unsupported workflow states must
be reported as coverage gaps, not forced into the database.

## Identical local and production content

Create a canonical manifest such as `demo-v2.json` with a fixed version,
reference date, random seed, logical IDs and SHA-256 hash. All quantities,
dates, locations, prices and names come from that file. “Copy pasted” means
the normalised content and relationships match; Convex document IDs and storage
IDs will differ between deployments.

Use logical references such as `org:plastic:yard:02`. Persist the mapping from
these references to deployment IDs in a seed-run manifest. An importer resumes
an interrupted run and treats the same version/hash as a no-op. It refuses an
unexpected existing logical ID rather than overwriting a real record.

Introduce an explicit demo dataset owner/namespace before import. Each inserted
record and generated file must be traceable to its seed run, including auth
component identities. Queries must keep demo and real records separate. Public
search, live price quotes and compliance reports must exclude demo records.
Demo access uses a separate controlled route/workspace and clear labels.

Do not use plausible phone numbers as a routing mechanism: an invented Indian
number may belong to someone. Use non-delivering synthetic identities in the
isolated dataset. If production authentication needs a phone, map only numbers
the founder controls, and keep that environment mapping outside the manifest.
There must be no production demo OTP bypass.

## Import and cleanup sequence

1. Validate the manifest offline: schemas, references, role permissions,
   non-negative stock, exact totals, mass balance, unique identifiers and no
   provider side effects. Check every catalogue code and role/family pair.
2. Produce a dry-run report for each target with its exact deployment name,
   manifest hash, insert counts, conflicts and file list. Abort on conflicts.
3. Import to a disposable local/test database in small bounded batches. Record
   each state change through the auditable write path and keep issued factors
   fixed wherever the existing model requires them.
4. Verify normalised record hashes and all UI workflows. Capture labelled demo
   screenshots. Run the gentle checks below.
5. Before production import, take and verify a backup. Confirm the explicit
   demo namespace, access controls and side-effect suppression, then apply the
   exact reviewed manifest. Verify content hashes again. Never copy auth secrets.
6. Produce a cleanup preview listing only the seed-run-owned records/files.
   Check for references from real records and stop if any exist. Archive or
   remove the demo run in dependency order, preserving required audit history.
   Verify real-record counts and hashes before and after. Never call the old
   whole-table `demo:reset` on production.

## Gentle stress checks

Start with one read-only browser session. Increase to three, then five concurrent
sessions for at most two minutes per step, with a one-request-per-second limit
per session. Exercise public pages, filtered lists, price history and workspace
reads. Record response time, query count, bytes and error rate; stop on errors,
rate limits or a sustained latency increase above twice the single-user baseline.
These are conservative starting limits, not a capacity claim.

Run state-changing load tests only in the disposable environment, using a
separate deterministic batch of owned records. Test double acceptance, duplicate
submission and competing stock reservations with assertions for exact final
balances. No broad production write load, real SMS, payments or mass uploads.

## Required implementation evidence

- Manifest hash and coverage matrix for all roles, families and current items.
- Idempotency, interrupted-run recovery and scope-limited cleanup tests.
- Proof that auth, provider execution and public reports stay isolated.
- Matching normalised dataset hashes in local and production after import.
- Before/after real-record hashes and tested restore/cleanup procedures.
- Updated user guide, seed runbook and clearly labelled browser captures.

This plan is ready for implementation review. It does not assert that the demo
dataset, production isolation or load test has been implemented or run.
