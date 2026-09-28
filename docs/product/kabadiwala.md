# Kabadiwala app

> **Status:** agreed spec, 29 Sep 2026 — built after onboarding. Screens: the
> "Kabadiwala" page of the
> [prototype](https://claude.ai/artifact/4hiq2r5tm5kWDBqTGEPD8C).

Many kabadiwalas are using a smartphone app for work for the first time, and
some have little formal education. Everything below follows from that.

## Design rules for this app

- **Their language first.** The app opens in the language chosen at sign-in;
  switching is one tap. Every word is hand-translated.
- **Icons, colours and numbers carry the meaning.** Each material has one icon
  and one colour everywhere (paper, cardboard, plastic, metal…). Words are
  there to confirm, not to explain.
- **Big targets.** 48 px minimum, 56 px for the main actions. Accept and Reject
  differ in fill and icon, not only in colour.
- **Hear it.** A speaker button reads a request aloud in the chosen language.
- **Phone only.** No desktop layout is designed for this app.

## Screens

| Tab / screen      | What it does                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Requests**      | New household pickups: slot, distance, area, materials and kilograms, what they'll pay. Accept or Reject. Auto-accept switch at the top |
| **Today**         | Accepted pickups in time order: call, directions, "tell them I'm on the way", then **weigh and pay**                                    |
| **Weigh and pay** | One row per material: − / kg / + in half-kilo steps, the amount from their rate card, cash or UPI, save                                 |
| **My stock**      | What's at the shop, updated automatically by pickups and by hand after sorting; show it to yards or not                                 |
| **My prices**     | Their rate card, with the minimum beside each price ([pricing.md](../product/pricing.md))                                               |

## Rules

- **Auto-accept.** When on, every new request within their radius is accepted
  immediately — even at night. The household is told at once.
- **Accepting reveals** the household's phone number and exact address;
  before that they see only the area.
- **Rejecting** hands the request to the next nearest kabadiwala; the household
  isn't told who said no.
- **Weighing is the source of truth.** Stock goes up by what was weighed, not by
  the estimate. Sorting afterwards moves kilograms between materials (mixed
  paper → newspaper + cardboard + reject) and is recorded as a sorting entry,
  never a silent edit ([architecture/data-model.md](../architecture/data-model.md)).
- **Payment is recorded, not processed**, in the pilot.

## Hand-off to yards

The kabadiwala publishes stock ("I have 320 kg of newspaper") and a yard books a
collection or says it is coming. This is the part the founder called most
important; its details are still being researched —
[kabadiwala-to-yard.md](./kabadiwala-to-yard.md).
