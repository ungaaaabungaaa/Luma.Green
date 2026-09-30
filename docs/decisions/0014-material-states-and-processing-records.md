# 0014. Material states, processing records and the pre-processor

- **Status:** Decided — extends [0005](./0005-orgs-by-kind-visible-by-location.md)
  (kinds) and [0008](./0008-prices-rate-cards-with-floor-and-fallback.md)
  (price levels)
- **Date:** 30 Sep 2026
- **Deciders:** founder (research part 1), Claude

## Context

The plan stopped the chain at "yard sells to recycler". The founder's research
of 30 Sep 2026
([docs/plan/inputs/2026-09-30-founder-research-part-1](../plan/inputs/2026-09-30-founder-research-part-1/))
shows the industrial middle that is missing: a PET bottle becomes a bale, raw
flakes, cold-washed flakes, hot-washed flakes, dried flakes, rPET pellets and
polyester fibre, and each is a different item with a different buyer and
price. The users who do that work — flake and washing lines, granulators,
cable granulators, tyre shredders and pyrolysis plants, C&D crushers, e-waste
dismantlers, battery breakers, used-oil re-refiners — are not yards and not
recyclers. Every one of those processes also makes by-products (caps and
labels, dross, tyre steel, bran, bagasse) and residual waste (sludge, slag,
fines), and today the platform has no way to say so.

Two names collided: the docs called the yard `preprocessor` (the code already
says `yard`), while the founder uses "pre-processor" for the new role.

## Decision

1. **Every material has a state.** `S0` discarded, `S1` collected, `S2` sorted,
   `S3` baled or compacted, `S4` shredded, ground or stripped, `S5` washed,
   `S6` dried or prepared, `S7` granule, pellet, pulp, ingot or crumb, `S8`
   compound, alloy or intermediate feedstock, `S9` final recycled product or
   feedstock. A material code names a material **and** a state; a trade
   changes owner and state together. The catalogue's H, T and I levels map to
   S0–S2, S2–S3 and S4–S9.
2. **A processing record has three outputs.** Input lots go in; a main output
   lot, zero or more saleable by-product lots and zero or more residual waste
   lots come out, each with its own material code, state and weight, plus the
   yield. Residual waste can never be listed on the ordinary market; it routes
   only to an authorised handler.
3. **New kinds.** `orgs.kind` becomes `kabadiwala`, `dwcc` (dry-waste centre or
   MRF), `yard`, `preprocessor` (the founder's meaning), `recycler`,
   `compounder`, `manufacturer`, `brand` (an EPR-obligated producer that buys
   material and evidence) and `handler` (authorised waste handler, co-processor
   or TSDF). The docs now follow the code and say `yard`; `preprocessor` is free
   for the founder's meaning.
4. **Five price levels.** L1 kabadiwala → household, L2 yard → kabadiwala, L3
   pre-processor or recycler → yard, L4 recycler or compounder → manufacturer,
   L5 manufacturer → industrial buyer. Every price row carries a level, a
   material code (which implies the state) and grade attributes.
5. **A listing answers four questions** before a buyer sees it: what material,
   what state, what grade, and which kinds of buyer may receive it (open,
   verified, or authorised only).
6. **Industrial by-products are candidate listings**, mapped to KSPCB category
   codes and, once verified, to CPCB's January 2025 classification. The
   pollution-category colour is not a hazard flag; a separate routing flag per
   material code says who may buy it.

## Consequences

- The pilot stays first-mile: households, kabadiwalas, yards and Saathis from
  13 Oct 2026. Pre-processors and the other new kinds switch on once their
  verification checklists exist (research cluster `new-roles-onboarding`).
- The schema gains `state` on materials, a `processingRuns` table, output
  lineage on lots, `level` on price rows and a buyer gate on listings — see
  [data-model.md](../architecture/data-model.md). Adding the new kinds touches
  the schema, lifecycle, onboarding rules and message keys in one PR.
- The price board needs grade dimensions per family so one code is never
  quoted at two levels at once (research cluster `intermediate-prices`).
- Mass balance becomes checkable: input weight = outputs + waste ± a tolerance
  the research sets (cluster `yields-and-custody`).
- The material catalogue grows from 60 codes to cover intermediate states and
  by-products; codes stay immutable and ASCII.

## Alternatives considered

- **Keep four kinds and treat processing as "sorting"** — hides the value
  created between bale and pellet and cannot express by-products or waste.
- **Model state as free text on a lot** — unqueryable; buyers search by state.
- **Call the new role `processor` to avoid the clash with the docs' old name
  for the yard** — contradicts every document the founder writes; the docs
  were wrong, not the code.
