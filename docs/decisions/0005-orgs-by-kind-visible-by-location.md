# 0005. Orgs by kind, visible by location and material

- **Status:** Decided — supersedes the "sector isolation" rule in the first
  scaffold
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

The first schema gave every org a `role` (collector, aggregator, recycler,
factory, verifier) and a `sector`, and let orgs see only their own sector. The
brief describes a different chain: a kabadiwala buys paper, plastic and metal
from households and sells each to whichever yard is nearest; a household picks
the nearest kabadiwala.

## Decision

- Businesses are `orgs` with a `kind`: `kabadiwala`, `preprocessor`,
  `recycler`, `manufacturer`. The interface says "yard" for preprocessor.
- Saathis are people, not orgs: a `saathiProfiles` row per person.
- **Who sees whom is decided by location and material**, not sector: a
  household sees verified kabadiwalas near them; a yard sees stock near it in
  materials it handles. Locations carry a geohash index; the Convex geospatial
  component (beta) is the upgrade path.
- Membership links people to orgs (`owner`, `staff`), so one person can run two
  shops later.

## Consequences

- The v1 `sector` field and its isolation rule go; AGENTS.md is updated.
- "Nearby" needs a location for every org and Saathi — onboarding requires it.
- Verifiers return as a kind when carbon credits are built.

## Alternatives considered

- **Keep sectors** — forces a kabadiwala into one sector, which doesn't match
  the trade.
