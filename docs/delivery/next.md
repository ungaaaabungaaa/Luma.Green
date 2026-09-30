# What happens next

> **Status:** plan of work as of Wed 30 Sep 2026, written when the build moved
> from the founder's Mac to a cloud session. The desktop session's record is
> [docs/plan/handoff.md](../plan/handoff.md). This page is the order of work
> from here; it is updated as each phase lands.

## What changed on 30 September

The founder's research, part 1, is in
[docs/plan/inputs/2026-09-30-founder-research-part-1](../plan/inputs/2026-09-30-founder-research-part-1/)
(the three original files plus CSV and Markdown extractions). It refines the
chain the plan was built on:

- **A pre-processor sits between the yard and the recycler.** It turns bales
  and lots into factory feedstock: PET flake and washing lines, plastic
  granulators, cable granulators, tyre shredders and pyrolysis, C&D crushers,
  e-waste dismantlers, battery breakers, used-oil re-refiners. It maps to KSPCB
  Orange 1326, 1366, 1405, 1414, 1424 and others.
- **New roles**: dry-waste centre or MRF as its own account, compounder or
  intermediate processor, brand with EPR duties, authorised waste handler,
  co-processor and TSDF, by-product buyer.
- **Every material carries a state**, S0 discarded to S9 final feedstock, and a
  trade changes both owner and state. A PET bottle, a bale, raw flakes, washed
  flakes, pellets and fibre are different marketplace items.
- **Every processing record has three outputs**: the main product, saleable
  by-products and residual waste, each a separate lot, with a yield.
- **Prices get a fifth level**, L5 manufacturer to industrial buyer, and every
  price carries a state and grade, not only a material name.
- **Industrial by-products are candidate listings**: 400 rows mapped to KSPCB
  category codes, with a CPCB January 2025 classification to re-verify.
- **Four small edits to the plan text**: a new lead paragraph, a new "at a
  glance" line, a diagram caption and a Bintix row in the competitor table.

These are decisions, not questions. They go into the product docs and the data
model (step 3). What they leave uncertain goes to research first (step 1).

## The order of work

### 1. Research (running)

The workflow `docs/plan/research/workflows/answer-open-questions-continue.js`
picks up the desktop run. The 22 clusters already answered are passed in as
`args` and are not researched again. It researches the 2 left over
(`solar-facts`, `city-systems`) and 7 new clusters from the founder's research,
then a sceptic checks all 31 against their sources as of today, then one writer
produces the "Answers to the open questions" section.

| New cluster                | What it settles                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pre-processors`           | Who they are around Bengaluru, what they pay for bales and charge for flakes and granules, lot sizes and terms     |
| `cpcb-2025-classification` | The January 2025 CPCB list (359 or 419 sectors?), the Blue category, White consent exemption, consent per role     |
| `intermediate-grades`      | IV, MFI, ppm and mesh thresholds buyers use; food-grade rPET rules; a step-by-step check of the founder's chains   |
| `byproduct-law`            | Which by-products a generator may sell on a marketplace and which move only to authorised handlers with a manifest |
| `intermediate-prices`      | Reference prices at L3 to L5 and how grade differences are priced; what a public board may show                    |
| `yields-and-custody`       | Default yields per process for mass-balance checks; what ISCC, GRS, EN 15343 and the CPCB portal want recorded     |
| `new-roles-onboarding`     | The admin's verification checklist per new role and which roles the pilot admits first                             |

Outputs: `docs/plan/research/answers/<cluster>.research.json`,
`<cluster>.verify.json` and `synthesis.md`. About 45 agents.

### 2. The plan doc

Fill the pending block at the end of "Risks and open questions" in the
[Luma.Green Platform Plan](https://claude.ai/artifact/Cj53WmgvqfF4Uqnug2pf9F)
with the synthesis; add the founder's material-chain chapter as a section of
the plan; carry the four small edits; append the new sources to the Sources
tab and to [docs/plan/sources.md](../plan/sources.md). Then re-export the doc
to [docs/plan.md](../plan.md) and produce a fresh Word file for the partner.

### 3. The repo docs

Record the refined chain where the code reads it from:
[roles.md](../product/roles.md), [glossary.md](../product/glossary.md),
[data-model.md](../architecture/data-model.md) (material states, processing
transactions with by-product and waste outputs, L5), a new ADR "material states
and by-products", [open-questions.md](../product/open-questions.md) (new
Decided rows dated 30 Sep), [features.md](../product/features.md). Update the
materials research brief with the state levels.

### 4. Build

Per the handoff, steps 4 to 8: update the build script for the refined model
(material states, processing transactions, the pre-processor role, by-product
listings), merge the seven WIP branches as starting points, run the 20-area
build, seed, test, translate, ship through a PR from `feat/pilot-qzkl7t`.

## What the founder still owes

- Research part 2 and any further documents. They are folded in the same way:
  originals under `docs/plan/inputs/<date>-<name>/`, decisions into the docs,
  questions into a research cluster.
- The decisions listed at the end of the plan's "Risks and open questions".
- The production switch-on items in the [roadmap](./roadmap.md): DLT, the
  Convex production deploy key, the domain, an OpenRouter key.
