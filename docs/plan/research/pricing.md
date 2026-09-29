# pricing

_Research brief, 29 September 2026. Headline:_ Bengaluru households get undated, round-number scrap prices: about half the mill price for newspaper (₹10/kg against roughly ₹20/kg) and about a sixth of the exchange price for aluminium cans (₹60/kg against MCX ₹347.50/kg on 28 Sep 2026). Exchange prices can't be republished without MCX or LME licences, so Luma.Green should build its price board from its own verified rate cards and trades.

# Luma.Green price engine — spec v0.1 (29 Sep 2026)

**Goal:** one dated, traceable price per city × material × level each day. It uses only data we own, keeps the admin in control, and follows the existing rules: integer paise per kg, integer grams, append-only history.

## 1. Levels

| Level | Who pays whom                                 | When                              |
| ----- | --------------------------------------------- | --------------------------------- |
| L1    | Kabadiwala → household (doorstep or drop-off) | Pilot, public                     |
| L2    | Yard → kabadiwala (sorted; loose or baled)    | Pilot, signed-in kabadiwalas only |
| L3    | Recycler → yard (baled, graded)               | Scale                             |
| L4    | Manufacturer → recycler (flakes, ingot, pulp) | Scale                             |

## 2. Inputs → `priceObservations` (append-only)

| Tier | Input                                                                 | Weight                                | Counts only if                                                                                                            |
| ---- | --------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| T1   | Pickup receipts (L1); completed yard collections (L2)                 | 1.0 (0.5 if under 1 kg in the window) | Weighed, confirmed by both sides (household by SMS code), payment method recorded; L2 also needs a weighbridge slip photo |
| T2   | Kabadiwala rate cards (L1); yard buy posts (L2)                       | 0.5                                   | Business verified; card fresh (§5)                                                                                        |
| T3   | Admin phone survey (≥3 businesses per material; name and time logged) | 0.5                                   | ≤7 days old                                                                                                               |
| T4   | MCX, LME, price reporters such as BigMint, IndiaMART asking prices    | **0**                                 | Admin reads them for judgment only (§8)                                                                                   |

Row fields: `city`, `zone?` (geohash-5), `materialId`, `level`, `paisePerKg`, `grams?`, `source`, `orgId`, `observedAt`, `basis` (pickup or drop-off; loose or baled; ex-GST).

## 3. Admin tables

- Existing: `priceFloors` and `fallbackRates` (city × material, dated). New: `priceBands` — a plausible min and max per material, plus the largest allowed daily move (±10% paper and plastic, ±5% metals).
- The console suggests values; the admin decides. Fallback = 28-day L1 median, rounded down to ₹0.50. Floor = 75% of fallback, rounded down to ₹0.50. Moves over 10% a week need a written reason. Bulk edit by CSV paste; every save writes new rows (`effectiveFrom`, author, reason) and an `auditLog` entry.

## 4. Daily calculation (Convex cron, 06:00 IST; the admin can re-run it)

1. Window: last 7 days, or 14 if fewer than 3 businesses report.
2. Drop rows outside the band, from unverified businesses, self-trades, and back-and-forth trades (the same kg reversed within 48 h). Merge related businesses (same owner phone, GSTIN, PAN or UPI ID) into one.
3. One value per business: the median of its T1 trades if it has any, otherwise its T2 or T3 price.
4. With 4 or more businesses, drop values more than 30% from the median.
5. Typical = weighted median. Range = lowest to highest remaining value. Round to ₹0.50 on screen; store paise.
6. **Live** needs ≥3 independent businesses, at least one with a trade. Otherwise **Guide**: show the fallback price with its review date.
7. Circuit breaker: a move bigger than the band's daily limit keeps yesterday's price until the admin confirms.
8. L1 prices are never shown below the floor.

Output: a `priceBoards` row {city, material, level, lowPaise, typicalPaise, highPaise, nOrgs, nTrades, status, computedAt}.

## 5. Freshness

| Item                       | Fresh for       | Then                                                          |
| -------------------------- | --------------- | ------------------------------------------------------------- |
| Rate card (paper, plastic) | 14 days         | Reminder at day 12; dropped after 30 days                     |
| Rate card (metals)         | 7 days          | Reminder at day 6; dropped after 14 days                      |
| Yard post                  | 7 days          | Expires; one tap to renew                                     |
| Floors and fallbacks       | Reviewed weekly | Admin banner at 10 days; the board shows "reviewed on <date>" |

## 6. Anti-manipulation

One vote per business, with related businesses merged. Trades must be proven (§2). Rate cards can change at most 3 times a day. **Honour rate:** if more than 20% of a shop's pickups pay over 5% below its posted card, the card leaves the board and the shop drops in ranking. Admin overrides are logged and shown as "adjusted by admin". Individual shop prices appear only inside a household's booking, never on the public board.

## 7. Regions

Bengaluru city-wide for now. Store each business's geohash. Fallback order: area (≥5 businesses) → city → state → national, and the board says which it used. A new city copies the nearest city's fallback × an admin city factor.

## 8. Index data: licence limits (checked 29 Sep 2026)

| Source                                 | Show publicly?                                                                                            | Use in a formula?                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| MCX                                    | Delayed data only, under an MCX agreement; no resale. Feed ₹1,00,000 + tax a year plus product charges    | Needs explicit permission                                  |
| LME                                    | Only with a distribution licence: US$25k a year for real-time or 30-min delay; US$4k one-off for next-day | Prices built from LME data may need a derived-data licence |
| Price reporters (BigMint etc.)         | Only under a data licence                                                                                 | Same                                                       |
| IndiaMART and other apps               | No; don't scrape                                                                                          | No; these are asking prices, not trades                    |
| Our own rate cards, receipts and posts | Yes (our terms say so)                                                                                    | Yes                                                        |

**Pilot rule:** no exchange feed, no exchange number on screen, no formula tied to an exchange.

## 9. Public board

`/prices/bengaluru` and `/prices/bengaluru/{material}`: indexed, in 12 languages, cached until the next daily calculation. Each line reads "Households get ₹A–B/kg · typical ₹C · 7-day change · Live/Guide · N shops, N pickups · updated <time>", with a "How we calculate" link and a WhatsApp share image. The prototype shows a **Sample data** badge on every number.

## 10. Worked example: Bengaluru board for 29 Sep 2026

The input rows are **illustrative seed data**. The reference prices are real and dated.

### Newspaper `PAPER-NEWS` (L1)

Admin: floor ₹7.50, fallback ₹10.00 (reference: The Kabadiwala Bangalore ₹10/kg), band ₹5–20, largest daily move ±10%.

| Business | Input                           | ₹/kg  | Weight | Result                             |
| -------- | ------------------------------- | ----- | ------ | ---------------------------------- |
| K1       | Rate card                       | 10.00 | 0.5    | kept                               |
| K2       | 6 receipts, 84 kg               | 11.00 | 1.0    | kept                               |
| K3       | 5 receipts, 61 kg               | 12.00 | 1.0    | kept                               |
| K4       | 3 receipts, 40 kg (card ₹12.00) | 11.50 | 1.0    | kept; honour rate 96%, not flagged |
| K5       | Rate card                       | 25.00 | —      | outside band → admin queue         |

Weighted median of 10.00 (0.5), 11.00 (1), 11.50 (1), 12.00 (1): total weight 3.5, halfway mark 1.75, reached at **₹11.50**. Range ₹10–12. 4 businesses, 3 with trades → **Live**. Last week ₹11.00 → +4.5%, within the 10% limit.
**Board line:** Newspaper — households get ₹10–12/kg · typical ₹11.50 · ▲4.5% · 4 shops, 14 pickups · Live.
L2: two yards post ₹13.00 (300 kg minimum, yard collects) and ₹13.50 (500 kg, delivered). With only 2 yards, kabadiwalas see them as offers, not as a board price.
Admin reference (not displayed): dealer "baseline" ₹13.69 (scraprates.in, 28 Sep); Bengaluru IndiaMART asking prices ₹12–20; mill-grade ONP ₹20/kg (5 t minimum, Mumbai). The 2014 Bengaluru chain ran ₹10 → ₹11 → ₹12–13 → ₹14–15 at the mill.

### Aluminium cans `METAL-ALU-CAN` (L1)

Admin: floor ₹45, fallback ₹60 (reference: The Kabadiwala Bangalore ₹60/kg), band ₹30–150, largest daily move ±5%, rate cards fresh for 7 days.

| Business | Input              | ₹/kg | Weight           |
| -------- | ------------------ | ---- | ---------------- |
| K1       | Rate card          | 55   | 0.5              |
| K2       | 3 receipts, 1.9 kg | 60   | 1.0              |
| K3       | 1 receipt, 0.6 kg  | 60   | 0.5 (under 1 kg) |
| K5       | Rate card          | 70   | 0.5              |

Weighted median: total weight 2.5, halfway mark 1.25, reached at **₹60**. Range ₹55–70; every value is within 30% of the median. 4 businesses → **Live**.
**Board line:** Aluminium cans — ₹55–70/kg · typical ₹60 · 4 shops · Live. Show "≈ ₹ per can" only after weighing 100 local cans to set a cans-per-kg factor.
Admin reference (not displayed): MCX aluminium ₹347.50/kg and LME US$3,268/t (28 Sep); NALCO ingot ₹367–379/kg (19 Sep); UBC lots ₹120–290/kg (IndiaMART Delhi asking prices); Bengaluru utensil scrap ₹215–220/kg. A household's ₹60 is about 17% of MCX. In 2014 the Bengaluru chain was ₹45 (shop) → ₹60 (aggregator) → ₹110 (recycler). Metals rule: if exchange prices have moved more than 5% since the last review, re-check the aluminium floor and fallback that week.

## Recommendations

- **Public Bengaluru price board at /prices/bengaluru and /prices/bengaluru/{material}, in all 12 languages and indexed by search engines. Each material shows the price range households get, a typical price, the 7-day change, a Live or Guide status, how many shops and pickups it is based on, the update time, and a WhatsApp share image. Every number carries a visible 'Sample data' badge until real data flows.** (prototype-now): Nobody publishes a dated, sourced household price for Bengaluru: apps show undated round numbers and scraprates.in shows unexplained two-decimal figures. A board with honest ranges and freshness labels is the clearest thing to show investors, and 'scrap rate today' pages are something people already look for.
- **A 'Where your rupee goes' chart for newspaper and aluminium cans (household → shop → yard → mill or recycler), each step labelled with its source and date.** (prototype-now): The gap is the investor story. In 2014 Bengaluru newspaper went ₹10 → ₹11 → ₹12–13 → ₹14–15. Today a household gets ₹60/kg for cans against MCX aluminium at ₹347.50/kg, about 17%.
- **Admin price console (/admin/prices). Floors and fallbacks per city and material with effective dates, CSV paste for bulk edits, a plausible-price band per material, suggested values (fallback = 28-day median; floor = 75% of fallback, rounded down to ₹0.50; at most 10% change a week without a written reason), and every change in the audit log.** (prototype-now): Data has to be easy to change, and ADR 0008 already makes the admin own the floor and fallback tables. Suggested values and bands stop one-off mistakes like a stray ₹25/kg newspaper rate.
- **A daily price calculation (06:00 IST) from an append-only log of every price input. It takes one value per business (completed trades weigh 1.0; rate cards and admin survey quotes weigh 0.5), merges related businesses into one, drops the obvious outliers, uses the weighted median, and marks a price Live only when at least 3 independent businesses report, at least one with a trade. Daily moves above ±10% (paper and plastic) or ±5% (metals) are held until the admin confirms.** (pilot): Price reporters like BigMint build on confirmed trades with a published method. With only a handful of pilot testers, the minimum count and the Guide fallback stop thin data being shown as 'live'.
- **Freshness rules and reminders. Paper and plastic rate cards count as fresh for 14 days, metal rate cards for 7. Kabadiwalas get a one-tap 'Are your prices still right?' SMS or WhatsApp before a card goes stale, and stale cards drop out of the board. The admin sees a banner if the floor and fallback tables go 10 days without review.** (pilot): Metals move every trading day and paper can swing 20% in 10 days (Feb 2024). Rate cards that never change would underpay households or cause losses for kabadiwalas.
- **Honour-rate and anti-manipulation checks. Compare each shop's posted rate with what its receipts actually paid. A trade counts only if it was weighed, confirmed by both sides (the household by SMS code) and has a payment method recorded; yard trades also need a weighbridge slip photo. Merge related accounts (same phone, GSTIN, PAN or UPI ID) and exclude self-trades and back-and-forth trades.** (pilot): Karnataka's ₹2,384 crore fake-invoice scrap case (May 2026) shows circular trading is common. Advertising high prices to win bookings is also a likely trick in the pilot.
- **Yard buy-price posts: each yard posts price per material, minimum lot, loose or baled, and collected or delivered. Posts expire after 7 days and are shown to verified kabadiwalas nearby on the 'My stock' screen. Until enough yards post, the admin phone-surveys at least 3 yards per material each week.** (pilot): No free source gives yard buying prices for Bengaluru, and the kabadiwala-to-yard hand-off is 'the most important part'. Marketplace listings are asking prices, not trades.
- **No exchange data in the pilot: no automated feed, no exchange number on screen, and no price tied to an exchange by formula. Each table revision gets a 'market check' note giving the reason and what the admin looked at.** (pilot): MCX allows only delayed data on public websites, under an agreement, with no resale. LME needs a US$25,000-a-year licence (or US$4,000 one-off for next-day data), and prices calculated from LME data may need a separate licence.
- **Area-level boards that fall back from area to city to state to national, with an admin city factor for launching new cities. Store each business's location (geohash) now so areas can be split later without a migration.** (scale): The same app pays ₹3 vs ₹6/kg for carton in Bengaluru vs Delhi, and southern mills paid ₹13–13.5 vs ₹15.8–16.5/kg in the north (2023). A national rollout needs area and city pricing without rebuilding the design.
- **A licensed metals reference, taken as a delayed or end-of-day MCX feed through an authorised vendor or under a BigMint data licence, for business dashboards and automatic 'market moved' alerts, after legal review.** (scale): Yards, recyclers and manufacturers price aluminium, copper and brass against exchanges. A licence makes that legal and removes the admin's manual checks.
- **Publish the method, a complaints process and a monthly change log, so the board becomes a citable 'Luma.Green City Scrap Index'. Later, let escrow trades between businesses settle at the board price plus or minus an agreed premium.** (scale): The founders want the industry to adopt the platform's norms. Recognised benchmarks win trust through a public, audited method (BigMint follows IOSCO standards), and a shared settlement price reduces haggling and dependence on traders' credit.

## Risks

- The prototype's sample prices could mislead investors if they look live. Put a 'Sample data' badge on every number and keep the seed data separate from real data.
- The pilot has only a handful of testers, so most board lines will say 'Guide' for weeks. Plan a weekly admin phone survey of at least 3 yards and shops per material so the board has something to show.
- Competition law: a platform-set floor or fallback that competing kabadiwalas all copy could look like coordinated buying prices (the Competition Act 2002, s.3, covers agreements that directly or indirectly fix purchase prices). Get Indian counsel's view. Present floors as household protection and let shops price freely above them.
- Licence breach: if developers show MCX, LME or price-reporter numbers publicly, or tie a public price to them by formula, without a licence.
- Floors set too high could make kabadiwalas drop materials or refuse pickups, which is the pilot's named failure mode ('pickups unprofitable'). Cap weekly floor changes and watch acceptance rates.
- False precision (e.g. ₹13.69) and 'live' labels based on a few data points destroy trust. Round to ₹0.50 on screen and always show how many shops and pickups a price is based on.
- Manipulation through related accounts, advertising high rates then paying less, and fake or circular trades, as in Karnataka's ₹2,384 crore scrap-invoice case.
- Metals move daily while rate cards change slowly, so households get underpaid when prices rise and kabadiwalas lose when prices fall. Short freshness windows and the circuit breakers limit this but don't remove it.
- Disputes at the door if a shop pays less than the board's 'typical' price. Show the range, say the final price depends on weight at the door, and track each shop's honour rate.
- Marketplace listings (IndiaMART) are asking prices that mix grades. Never use them as inputs, only as a sanity check.

## Open questions

- Will Bengaluru yards post buy prices on the platform, and may we combine them into a public board line, even anonymously?
- Cans: price per kg or per can? Households count cans; weigh a sample of local cans to set a factor.
- Price basis above the household level: GST-inclusive or exclusive, and do reverse-charge or TDS rules apply when businesses buy metal scrap from unregistered kabadiwalas? This needs a tax adviser before yard prices are shown.
- Doorstep vs drop-off: should drop-off pay a published premium, given that doorstep pickup usually needs 25–50 kg or a minimum value (e.g. ₹999 at Kabadiwala Online)?
- Should households see named kabadiwalas' prices side by side (open question 3 in pricing.md), or only the city range plus their chosen shop's card?
- Is one city-wide floor enough for Bengaluru (open question 2 in pricing.md)? The evidence supports city-wide for the pilot and areas later.
- How far do WhatsApp groups and phone calls from the next buyer set daily rates for Bengaluru kabadiwalas and yards? No source opened here documents it; ask in pilot interviews.
- At scale, which licensed metal reference (MCX delayed or end-of-day via a vendor, or BigMint), at what yearly cost, and who pays?
- Housekeeping: while trying to open the IOSCO benchmark-principles PDF on iosco.org, the Browser pane showed a file-save dialog. The file isn't needed; cancel the dialog if it is still open.

## Sources

- [MCX — Data Feed (categories, who may display, charges, terms)](https://www.mcxindia.com/technology/datafeed)
- [LME — Data distribution licence (fees, public website display)](https://www.lme.com/en/market-data/market-data-licensing/data-distribution)
- [LME — Derived data licence categories (incl. reference values)](https://www.lme.com/en/market-data/market-data-licensing/derived-data)
- [BBMP / SVP Bengaluru — Extracting Value from Bengaluru's Dry Waste Chain (Nov 2014)](<https://apps.bbmpgov.in/SWM/Home/Documents/ReportsandStudies/Extracting%20Value%20from%20Bengaluru's%20Dry%20Waste%20Chain_Full%20Report%20(Nov%202014).pdf>)
- [The Kabadiwala — Scrap prices in Bangalore](https://www.thekabadiwala.com/scrap-rates/Bangalore)
- [The Kabadiwala — Scrap prices in Delhi](https://www.thekabadiwala.com/scrap-rates/Delhi)
- [scraprates.in — Newspaper scrap rate today, Bangalore (28 Sep 2026)](https://scraprates.in/bangalore/newspaper-scrap-price)
- [Kabadiwala Online — Scrap price list, Delhi NCR](https://kabadiwalaonline.in/price-list/)
- [IndiaMART — Newspaper waste sellers in Bengaluru](https://dir.indiamart.com/bengaluru/newspaper-waste.html)
- [IndiaMART — Aluminium scrap sellers in Bengaluru](https://dir.indiamart.com/bengaluru/aluminium-scrap.html)
- [IndiaMART — Aluminium UBC scrap sellers in Delhi](https://dir.indiamart.com/delhi/aluminum-ubc-scrap.html)
- [IndiaMART — White old newspaper (mixed ONP) for paper mills, Mumbai](https://www.indiamart.com/proddetail/old-newspaper-onp-22982234462.html)
- [Aluminium Magazine — Current aluminium price (MCX, LME, NALCO), 28 Sep 2026](https://aluminiummagazine.com/mag/business/current-aluminium-price.html)
- [The Pulp and Paper Times — Domestic waste paper prices fall sharply (Feb 2024)](https://thepulpandpapertimes.com/news/india/domestic-waste-paper-prices-1003)
- [The Pulp and Paper Times — Waste paper prices up 10–15% in July (Jul 2023)](https://thepulpandpapertimes.com/news/waste-paper-price-increased-by-10-to-15-in-july-898)
- [The Pulp and Paper Times — Kraft paper mills: shutdowns and price moves, January 2025](https://thepulpandpapertimes.com/news/industry-news/kraft-paper-mills-2187)
- [BigMint — Commodity prices and indexes (methodology, IOSCO, data licensing)](https://www.bigmint.co/prices)
- [Recykal.Market — B2B circular marketplace](https://recykal.market/)
- [The Week — Decoding the amended e-waste management rules (Mar 2024)](https://www.theweek.in/news/india/2024/03/11/decoding-the-amended-e-waste-management-rules.html)
- [News Karnataka — Karnataka uncovers ₹2,384 crore fake GST credit racket (16 May 2026)](https://newskarnataka.com/bengaluru/karnataka-uncovers-%E2%82%B92384-crore-fake-gst-credit-racket/16052026/)
