# Roles

> **Status:** agreed 29 Sep 2026. What each role fills in to join:
> [onboarding.md](./onboarding.md). How sign-in works:
> [architecture/auth.md](../architecture/auth.md).

| Role                    | Who                                                                | On Luma.Green they…                                                                       | Main device       | Signs in with                                                 |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------- |
| **Household**           | Anyone with scrap at home                                          | Photograph scrap, get an estimate, book a pickup or drop-off, get paid in cash or UPI     | Phone             | Nothing. The phone number is confirmed by SMS code at booking |
| **Kabadiwala**          | Owner of a small local scrap shop; may or may not have a vehicle   | Accept pickups (or auto-accept), weigh and pay, record stock after sorting, sell to yards | Phone             | Phone + SMS code                                              |
| **Preprocessor (yard)** | Owner of a large yard that buys from kabadiwalas and sorts further | See stock near them, book collections, later sell to recyclers                            | Phone and desktop | Phone + SMS code                                              |
| **Recycler**            | Turns sorted scrap into raw material that manufacturers can use    | Buy from yards, publish what they produce                                                 | Mostly desktop    | Phone + SMS code                                              |
| **Manufacturer**        | Makes products from recycled material                              | See what recyclers produce and place orders                                               | Mostly desktop    | Phone + SMS code                                              |
| **Saathi**              | Anyone who wants to earn from short jobs                           | Home pickups, help at a kabadiwala shop, shifts at a yard, recycler or factory            | Phone             | Phone + SMS code                                              |
| **Admin**               | The Luma.Green operator — exactly one person for the pilot         | Verify every application; see everything on the platform                                  | Desktop           | Email + password + authenticator code                         |

Households never register. Every other role is checked by the admin before it
can do business — see [onboarding.md](./onboarding.md).

## What each role wants from the next

The founder's diagram has a **"What all he wants"** box between each pair of
roles. Filled in so far:

| Hand-off                | What the buyer wants                                      | Status                      |
| ----------------------- | --------------------------------------------------------- | --------------------------- |
| Household → kabadiwala  | A fair price, a pickup at a chosen time, paid on the spot | Known                       |
| Kabadiwala → yard       | —                                                         | **Open** — being researched |
| Yard → recycler         | —                                                         | **Open**                    |
| Recycler → manufacturer | See how much recyclers produce and order ahead            | Partly known                |

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
