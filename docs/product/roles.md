# Roles

> **Status:** agreed 29 Sep 2026; the industrial middle of the chain added 30 Sep
> 2026 ([ADR 0014](../decisions/0014-material-states-and-processing-records.md)). What each role fills in to join:
> [onboarding.md](./onboarding.md). How sign-in works:
> [architecture/auth.md](../architecture/auth.md).

| Role                   | Who                                                                                   | On Luma.Green they…                                                                                                | Main device       | Signs in with                                                 |
| ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------- |
| **Household**          | Anyone with scrap at home                                                             | Photograph scrap, get an estimate, book a pickup or drop-off, get paid in cash or UPI                              | Phone             | Nothing. The phone number is confirmed by SMS code at booking |
| **Kabadiwala**         | Owner of a small local scrap shop; may or may not have a vehicle                      | Accept pickups (or auto-accept), weigh and pay, record stock after sorting, sell to yards                          | Phone             | Phone + SMS code                                              |
| **Dry-waste centre**   | A ward dry-waste collection centre, MRF or picker cooperative                         | Run as a yard account: daily weight sheet, sale register, stock, buyer prices                                      | Phone             | Phone + SMS code                                              |
| **Yard**               | Owner of a large yard that buys from kabadiwalas, grades and bales                    | See stock near them, book collections, bale and grade lots, sell to pre-processors                                 | Phone and desktop | Phone + SMS code                                              |
| **Pre-processor**      | Turns bales and lots into factory feedstock: flakes, granules, chips, fractions       | Buy bales from yards, record each process with its outputs and by-products, sell feedstock                         | Desktop and phone | Phone + SMS code                                              |
| **Recycler**           | Turns prepared feedstock into secondary raw material: pellets, pulp, ingots, base oil | Buy from pre-processors and yards, record processing, publish what they produce, make EPR claims on CPCB's portals | Mostly desktop    | Phone + SMS code                                              |
| **Compounder**         | Blends recovered material to a manufacturer's specification                           | Buy from recyclers, record the blend as a process, sell compounded feedstock                                       | Mostly desktop    | Phone + SMS code                                              |
| **Manufacturer**       | Makes products from recycled material                                                 | See what recyclers and compounders produce, place orders, record recycled content                                  | Mostly desktop    | Phone + SMS code                                              |
| **Brand**              | A producer or importer with EPR duties                                                | Buy recycled material and chain-of-custody evidence; never certificates                                            | Desktop           | Phone + SMS code                                              |
| **Authorised handler** | A licensed recycler for hazardous streams, a co-processor or a TSDF                   | Receive residual waste and regulated streams with a manifest; nothing else                                         | Desktop           | Phone + SMS code                                              |
| **Saathi**             | Anyone who wants to earn from short jobs                                              | Home pickups, help at a kabadiwala shop, shifts at a yard, recycler or factory                                     | Phone             | Phone + SMS code                                              |
| **Admin**              | The Luma.Green operator — exactly one person for the pilot                            | Verify every application; see everything on the platform                                                           | Desktop           | Email + password + authenticator code                         |

Households never register. Every other role is checked by the admin before it
can do business — see [onboarding.md](./onboarding.md). The pilot admits
households, kabadiwalas, yards and Saathis from 13 Oct 2026; dry-waste centres
join as yards; the other kinds switch on once their verification checklists
exist ([ADR 0014](../decisions/0014-material-states-and-processing-records.md)).

## What each role wants from the next

The founder's diagram has a **"What all he wants"** box between each pair of
roles. Filled in so far:

| Hand-off                             | What the buyer wants                                                                  | Status                      |
| ------------------------------------ | ------------------------------------------------------------------------------------- | --------------------------- |
| Household → kabadiwala               | A fair price, a pickup at a chosen time, paid on the spot                             | Known                       |
| Kabadiwala → yard                    | —                                                                                     | **Open** — being researched |
| Yard → pre-processor                 | Graded bales of a known weight, contamination within the code's limit, a steady flow  | Partly known (30 Sep)       |
| Pre-processor → recycler             | Flakes or fractions to a grade (IV, MFI, purity, moisture), with the process record   | Partly known (30 Sep)       |
| Recycler / compounder → manufacturer | A specification, a sample, QC records, acceptance history, and recycled-content proof | Partly known                |
| Any processor → authorised handler   | The waste class, quantity, manifest and destination                                   | Partly known                |

## Saathi

- **Name.** "Saathi" (साथी, "partner") was chosen on 29 Sep 2026 in place of
  "foot soldiers". It is dignified, one word, widely understood and broad enough
  for pickups and shifts alike. Each locale gets its own translation.
- **Why it exists.** Many kabadiwalas have no vehicle. Saathis can do home
  pickups for them, and fill short shifts at yards, recyclers and factories.
- **Pay.** Saathis are paid by the kabadiwala or manufacturer they work for.
  The payment structure is **out of scope** until after the pilot.

## Admin

One admin runs the whole platform during the pilot and can see everything.
Team members (reviewers, support) come later; the permission model already
separates "platform staff" from business users so adding them is not a rewrite.
