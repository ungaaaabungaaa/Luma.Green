# Data model (planned v2)

> **Status:** planned, 29 Sep 2026; material states, processing records and
> the new kinds added 30 Sep 2026
> ([ADR 0014](../decisions/0014-material-states-and-processing-records.md)). The live schema is `convex/schema.ts` (v1,
> written before the product brief). Tables land with the feature that needs
> them; each change follows [migrations](../migrations/README.md).

## What changes from v1

| v1 (scaffold)                                                   | v2                                                                                                               | Why                                                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `orgs.role`: collector, aggregator, recycler, factory, verifier | `orgs.kind`: kabadiwala, dwcc, yard, preprocessor, recycler, compounder, manufacturer, brand, handler            | The founder's roles, with the industrial middle of the chain (ADR 0014). Verifiers return with carbon credits |
| `orgs.sector` — orgs only see their own sector                  | Visibility by **location and material**                                                                          | A kabadiwala handles paper, plastic and metal and sells to whichever yard is nearest                          |
| `orgs.kycStatus`                                                | An `applications` table with a full state machine and history                                                    | Manual verification with notes, resubmissions and an audit trail                                              |
| No households                                                   | `households`, `bookings`, `bookingOffers`, `pickupReceipts`, `pointsLedger`                                      | The household flow                                                                                            |
| No gig workers                                                  | `saathiProfiles`                                                                                                 | Saathis are people, not businesses                                                                            |
| No platform staff                                               | `adminProfiles` (one row in the pilot)                                                                           | One admin now; team members later                                                                             |
| `materials.co2eFactorPerKg` only                                | Material catalogue with families, grades, **states** and codes; prices in separate dated tables with a **level** | Prices change daily; the catalogue doesn't. A bale and a flake are different items                            |
| No processing                                                   | `lots` with parent lineage and `processingRuns` with main, by-product and waste outputs                          | A process changes the material; by-products and waste are lots too                                            |
| `inventoryMovements.reason` has no sorting                      | Adds `sort_out` / `sort_in` with a shared `sortingRunId`                                                         | Sorting turns 50 kg of mixed paper into newspaper, cardboard and reject                                       |

No production data exists yet (29 Sep 2026), so v2 replaces v1 directly. From
the first real row onwards, every change is widen → migrate → narrow.

## Tables

Grouped by module. Money is integer paise, mass integer grams, times are
milliseconds since epoch. Every table also has `createdAt` / `updatedAt`.

### Identity

Better Auth keeps its own tables (users, sessions, accounts, verification codes,
two-factor secrets) inside its Convex component. Our tables reference its user
id.

| Table           | Key fields                                                                    | Indexes                     |
| --------------- | ----------------------------------------------------------------------------- | --------------------------- |
| `profiles`      | `authUserId`, `phone` (E.164), `name`, `locale`, `kind` (`member` \| `admin`) | `by_authUserId`, `by_phone` |
| `adminProfiles` | `profileId`, `email`, `dateOfBirth`, `aadhaarLast4` (4 digits only)           | `by_profileId`              |

### Participants and onboarding

Built 29 Sep 2026 (onboarding): `applications`, `applicationSnapshots`,
`applicationFiles`. The business and Saathi records are created when the
admin approves — until then everything lives on the application.

| Table                  | Key fields                                                                                                                                                                                                                                                                                     | Indexes                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `applications`         | `profileId`, `kind` (`kabadiwala` \| `yard` \| `recycler` \| `manufacturer` \| `saathi`), `status`, `version`, `locale`, `ageConfirmedAt`, `privacyAcceptedAt`, the draft sections (`kabadiwala` or `business` + `documents` or `saathi`), `submittedAt?`, `decidedAt?`, `decidedBy?`, `note?` | `by_profile`, `by_status_submittedAt`                 |
| `applicationSnapshots` | `applicationId`, `version`, the sections as sent, `fileIds[]`, `submittedAt` — one per submit, so the admin sees what changed                                                                                                                                                                  | `by_application_version`                              |
| `applicationFiles`     | `applicationId`, `profileId`, `type` (`pcb_certificate`, `machine_media`, `id_proof`, `selfie`), `storageId`, `name`, `contentType` (from the file's bytes), `size`, `firstSubmittedVersion?`, `removedAt?`                                                                                    | `by_application`, `by_storageId`                      |
| `orgs`                 | `kind`, `name`, `slug`, `status`, `ownerProfileId`, `address`, `location {lat,lng}`, `geohash`, `locationTags[]`, `pickup {offers, vehicle?}`, `hours {opens, closes}`, `weeklyOff[]`, `phones[{number,label}]`, `gstin?`, `materials[]`, `pcb? {board, state?, number}` — created on approval | `by_slug`, `by_owner`, `by_kind_status`, `by_geohash` |
| `memberships`          | `profileId`, `orgId`, `role` (`owner` \| `staff`)                                                                                                                                                                                                                                              | `by_profile`, `by_org`                                |
| `saathiProfiles`       | `profileId`, `area`, `location`, `geohash`, `radiusKm`, `workTypes[]`, `vehicle`, `availability {times[], days[]}`, `status` — created on approval                                                                                                                                             | `by_profile`, `by_geohash`                            |

`applications.status`: `draft → submitted → approved | changes_requested |
rejected`, `changes_requested → submitted`, `approved ↔ suspended`
(`convex/lib/lifecycle.ts`). Illegal transitions throw; each legal one writes
`auditLog`. The field rules live once, in `convex/lib/onboarding.ts`: the
forms validate with them and `applications.submit` runs them again.

Uploads go to Convex storage first and are attached after a check of their
real type (the first bytes, not the name or declared type); a rejected one is
deleted at once. An upload that never gets attached — the tab closed half-way
— stays orphaned until a daily clean-up job, to be built with the admin
queue.

### Catalogue and prices

| Table           | Key fields                                                                                                                                                                                                | Indexes                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `materials`     | `code` (`PAP-ONP`), `family`, `grade?`, `state` (`S0`…`S9`), `level` (`H` \| `T` \| `P` \| `I` \| `F`), `buyerGate` (`open` \| `verified` \| `authorised`), `hsn?`, `messageKey`, `active`, `replacedBy?` | `by_code`, `by_family`, `by_family_state` |
| `priceFloors`   | `city`, `materialId`, `level` (`L1`…`L5`), `paisePerKg`, `effectiveFrom`                                                                                                                                  | `by_city_material_from`                   |
| `fallbackRates` | `city`, `materialId`, `level`, `paisePerKg`, `effectiveFrom`                                                                                                                                              | `by_city_material_from`                   |
| `rateCards`     | `orgId`, `materialId`, `level`, `grade? {…}`, `paisePerKg`, `effectiveFrom`                                                                                                                               | `by_org_material_from`                    |

### Household pickups

| Table            | Key fields                                                                                                                                                        | Indexes                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `households`     | `phone` (E.164, verified), `locale`                                                                                                                               | `by_phone`                                               |
| `bookings`       | `token`, `householdId`, `mode` (`pickup` \| `dropoff`), `photos[]`, `estimate {items[], model, promptVersion}`, `orgId?`, `slot`, `address`, `location`, `status` | `by_token`, `by_household`, `by_org_status`, `by_status` |
| `bookingOffers`  | `bookingId`, `orgId`, `offeredAt`, `response?`, `respondedAt?`                                                                                                    | `by_booking`, `by_org_pending`                           |
| `pickupReceipts` | `bookingId`, `lines[{materialId, grams, paisePerKg, paise}]`, `totalPaise`, `method` (`cash` \| `upi`)                                                            | `by_booking`                                             |
| `pointsLedger`   | `householdId`, `delta`, `reason`, `bookingId?`                                                                                                                    | `by_household`                                           |

`bookings.status`: `requested → accepted → on_the_way → picked_up →
completed`, plus `cancelled` and `expired`. Receipts are append-only and keep
the rate used, so a later price change never rewrites a paid pickup.

### Stock and trade

`inventory`, `inventoryMovements`, `listings` and `trades` stay as in v1 (movements
append-only, inventory derived), with the new `sort_out` / `sort_in` reasons and
`orgId` scoping. A listing carries the lot's material code (so its state), its
grade attributes and the catalogue's buyer gate, and is shown only to kinds the
gate allows. Their shape is revisited when the kabadiwala → yard hand-off is
designed.

### Material states and processing

Decided 30 Sep 2026
([ADR 0014](../decisions/0014-material-states-and-processing-records.md)).
Sorting at a kabadiwala or yard is the simplest processing run (`sort`, no
by-products); the same record covers baling, shredding, washing, drying,
granulation, remelting and compounding.

| Table            | Key fields                                                                                                                                                                                                                                                                                                                                                                    | Indexes                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `lots`           | `orgId`, `materialId` (implies the state), `grams`, `grade? {colour, moisture, contamination, iv, mfi, purity, mesh, …}`, `origin` (`household` \| `saathi` \| `business` \| `industrial`), `parentLotIds[]`, `processingRunId?`, `status` (`in_stock` \| `listed` \| `reserved` \| `traded` \| `consumed` \| `disposed`)                                                     | `by_org_status`, `by_material`, `by_processing` |
| `processingRuns` | `orgId`, `siteId?`, `processType` (`sort` \| `bale` \| `shred` \| `strip` \| `wash` \| `dry` \| `granulate` \| `pulp` \| `remelt` \| `compound` \| `dismantle` \| `crush` \| `refine`), `inputs[{lotId, grams}]`, `outputs[{lotId, role: main \| byproduct \| waste, grams}]`, `yieldPermille`, `scaleId?`, `operatorProfileId?`, `photos[]`, `startedAt`, `endedAt`, `note?` | `by_org_endedAt`                                |
| `wasteManifests` | `processingRunId`, `lotId`, `handlerOrgId`, `wasteCode`, `grams`, `manifestNumber?`, `status`                                                                                                                                                                                                                                                                                 | `by_lot`, `by_handler`                          |

Rules: input grams equal main + by-product + waste grams within the tolerance
the research sets per process (moisture and loss to air are recorded as a
`loss` output); a `waste` output cannot be listed; a run never edits an earlier
run, a correction is a new run that consumes the wrong lot. The material of an
output lot must be a state the catalogue allows after `processType` for the
input material's family. Every run writes `auditLog`.

### Operations

| Table           | Purpose                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `auditLog`      | Every state change that matters (as v1): who, what, before, after                                     |
| `events`        | Product events for pilot numbers — booking created, accepted, weighed; application submitted, decided |
| `notifications` | Outbox for SMS (and later WhatsApp): template, recipient, variables, status, attempts                 |
| `flags`         | Feature switches the admin can flip without a deploy                                                  |

## Access rules (enforced in every Convex function)

- A member reads and writes only their own org's rows; the check is in the
  function, never the UI.
- Household bookings are readable through their token or by the assigned
  kabadiwala after acceptance.
- The admin reads everything and is the only writer of `applications.status`,
  `priceFloors` and `fallbackRates`.
- Files are served through short-lived URLs issued by a function that performs
  the same checks.
