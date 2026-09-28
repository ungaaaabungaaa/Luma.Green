# Prices

> **Status:** agreed 29 Sep 2026. Decision record:
> [ADR 0008](../decisions/0008-prices-rate-cards-with-floor-and-fallback.md).

"See the latest prices" is one of the three things the platform promises. For
the pilot it works like this.

## Three tables

| Table                    | Owned by        | Per                   | Used for                                                                           |
| ------------------------ | --------------- | --------------------- | ---------------------------------------------------------------------------------- |
| **Kabadiwala rate card** | Each kabadiwala | Material, ₹ per kg    | What that kabadiwala pays households                                               |
| **Minimum price table**  | Admin           | City × material, ₹/kg | The floor. A rate card can't go below it                                           |
| **Fallback table**       | Admin           | City × material, ₹/kg | Used when a kabadiwala hasn't set a price for a material; also for early estimates |

Rules:

1. **Kabadiwalas set their own prices.** Per material, in ₹ per kg, from their
   app.
2. **Never below the minimum.** Saving a price under the floor is refused with a
   message showing the floor. If the admin raises a floor above an existing
   price, that price is lifted to the floor and the kabadiwala is told.
3. **Fallback when unset.** A material with no price on the rate card uses the
   fallback table.
4. **Every table is dated.** A change creates a new row with `effectiveFrom`;
   old rows are kept. We can always answer "what was the price on that day?".
5. **A completed pickup keeps its price.** The receipt records the rate used for
   each material, so later price changes never rewrite history — the same rule
   the carbon ledger uses for emission factors.
6. **Integers only.** Rates are stored as integer paise per kilogram and weights
   as integer grams. See [AGENTS.md](../../AGENTS.md#7-working-with-money-mass-and-carbon).

## What a household sees

- **Before choosing a kabadiwala** (estimate screen): a price range from the
  fallback table for Bengaluru — `estimated kg range × fallback rate`.
- **After choosing one** (booking screen): that kabadiwala's rates, or the
  fallback where they have none.
- **At the door:** the kabadiwala weighs each material; the app computes the
  amount from their rate card. What was paid, and how (cash or UPI), is recorded.

The AI estimate never sets a price. It only says _which materials_ and _roughly
how many kilograms_; the numbers in rupees always come from these tables — see
[architecture/ai-estimation.md](../architecture/ai-estimation.md).

## What a kabadiwala sees

- Their own rate card, with the minimum next to each price.
- **Later:** what nearby yards are paying today, and how that moved since
  yesterday (in the prototype's _My stock_ screen). This needs yards posting
  buying prices, which comes with the kabadiwala → yard hand-off.

## Open

1. Who maintains the minimum and fallback tables, and how often? (Assumed:
   the admin, weekly, from market rates.)
2. Does the floor vary by area inside Bengaluru, or is one city-wide table
   enough for the pilot? (Assumed: city-wide.)
3. Should households see a comparison of nearby kabadiwalas' prices?
