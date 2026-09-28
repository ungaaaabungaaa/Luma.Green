# 0008. Prices: rate cards with a floor and a fallback

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

The founder: kabadiwalas set their own prices; Luma.Green keeps a minimum price
table; where a kabadiwala sets no price, a fallback table applies. Households
need a trustworthy estimate before they choose a kabadiwala.

## Decision

- Three dated tables: `rateCards` (per kabadiwala), `priceFloors` and
  `fallbackRates` (per city, set by the admin). Integer paise per kilogram.
- A rate below the floor is refused; raising a floor lifts affected rates and
  tells the kabadiwala.
- Estimates before a kabadiwala is chosen use the fallback table; after, the
  kabadiwala's rates with fallback for gaps.
- Receipts record the rate used per line; price changes never rewrite a paid
  pickup.
- Spec: [product/pricing.md](../product/pricing.md).

## Consequences

- The admin must keep two tables current for Bengaluru before the pilot.
- "What yards pay today" arrives later, with the kabadiwala → yard hand-off.

## Alternatives considered

- **One platform price for everyone** — kabadiwalas compete on price; the
  founder wants them to set it.
- **Free pricing with no floor** — no protection for households.
