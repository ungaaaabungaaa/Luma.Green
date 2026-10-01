# Platform enhancement proposal

**Status: proposal for approval, 2 October 2026. No features in this document are approved for implementation yet.**

This proposal extends the existing platform. The caption removal and native demo
work are separate, already requested changes. The current app already has pickup
requests, weight and payment records, stock, shop rates, rate history, support
requests, admin review and role guides. Keep those owners; do not create parallel
systems.

## Recommended order

| Priority | Enhancement                              | User benefit                                                                | First version and acceptance evidence                                                                                                                                                                                                                     |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Support conversations                    | Households and kabadiwalas can follow a support issue without repeating it. | Extend the current support inbox with replies, open/resolved/reopen state, localized quick replies and an unread indicator. Prove that only the requester and authorized staff can read a thread.                                                         |
| 1        | Kabadiwala daily brief                   | Shop owners can see what needs action first.                                | Reuse current pickup, stock and rate data for a short Today view. Show next pickups, stock awaiting sale and relevant rate changes. Every item opens its source record; no duplicate counters or new analytics service.                                   |
| 1        | Practical material guides                | Better sorting reduces rejected material and disputes.                      | Add short local-language cards for paper, plastic, metal and e-waste: accepted condition, contamination, safe storage and when to use an authorized handler. Review the content with pilot shops; do not present images as certification.                 |
| 1        | Official help and opportunities          | Workers can find credible registration, training and benefit information.   | Curated links to Udyam, eShram, NAMASTE and myScheme, with audience, review date and source. Do not collect Aadhaar or imply guaranteed eligibility.                                                                                                      |
| 2        | Rain planning                            | Shops can protect paper and plan pickups.                                   | A compact area forecast with source, forecast time and stale state. Cache one result per coarse area, not one per customer. Never describe this forecast as an official Indian severe-weather warning.                                                    |
| 2        | Verified recycler and yard discovery     | Shops can find the next eligible buyer in the chain.                        | Combine existing approved platform profiles with manually reviewed official references. Keep registration evidence, review date and contact consent. A public registration does not prove current capacity, availability or Luma approval.                |
| 2        | Better receipt and repeat-pickup sharing | Customers can reuse a trusted shop and keep transaction evidence.           | Extend the existing receipt flow with a minimal printable/shareable receipt and an explicit repeat-pickup action. Check existing receipt access rules first; never publish private booking tokens in public QR codes.                                     |
| 2        | Buyer demand notices                     | Kabadiwalas can see what participating yards need.                          | Opt-in material, grade, area and expiry notices from approved buyers. Apply existing supply-chain permissions. No scraped personal leads or public disclosure of private negotiated rates.                                                                |
| 3        | Offline drafts and recovery              | A weak connection does not erase typed work.                                | Start with expiring local form drafts and explicit restore/discard. Shared devices need a clear deletion control. Stock acceptance, payment recording and ledger writes remain online until idempotency and conflict rules have been designed and tested. |
| 3        | Shop cost estimate                       | Owners can compare a potential load with transport and handling costs.      | An optional local calculator using integer paise and grams. Label the result an estimate, not profit or accounting advice. Do not add a paid pricing feed.                                                                                                |

Approve priorities 1 first. Add priority 2 only after pilot use shows demand.
Each approved feature needs twelve-locale copy, RTL and keyboard checks, bounded
queries, access tests, current browser captures and a rebuilt Word user guide.

## Support: build on the current inbox first

`convex/support.ts` and the admin support inbox already accept requests and mark
them answered. They do not yet provide a two-way conversation. Extending them
avoids a second identity system and a new database service.

Proposed bounds: text first; 25 messages per page; subscribe only while the
thread is open; cap message size and submission rate; no typing events, presence
pings or write-per-keystroke. Audit staff status changes. Define retention and
attachment limits before enabling files. Anonymous users need an explicit secure
access design; a guessable request ID is not sufficient.

Chatwoot is an alternative if several support agents need a shared multichannel
inbox. Its Community Edition is MIT licensed and the software is free, but its
server, database, storage, backups and operations are not free. Its self-hosted
pricing page recommends a starting production server with 4 GB RAM and 2 CPUs.
This is extra infrastructure for the pilot, so it is a later option rather than
the default. Hosted tiers and messaging providers may charge separately.
Sources: [Community pricing](https://www.chatwoot.com/pricing/self-hosted-plans),
[licence FAQ](https://developers.chatwoot.com/self-hosted/faq/).

Do not add an AI support agent first. Collect common questions, publish approved
answers and measure unresolved cases. Any later model needs a bounded budget,
private-data controls and a human escalation route.

## Public sources and reuse limits

Checked on 2 October 2026. Free access does not automatically grant reuse rights.
An external link costs no API fee, but platform maintenance still has a cost.

| Source                                                                                            | Proposed use                                     | Cost and reuse boundary                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MET Norway Locationforecast](https://api.met.no/)                                                | Global forecast for a coarse pickup area         | Free, including commercial use; data attribution is required under CC BY 4.0 or NLOD. Use an identifying server User-Agent, respect cache headers and conditional requests. No SLA. Its Norwegian alerts and Nordic nowcast are not Bengaluru services. |
| [myScheme](https://www.myscheme.gov.in/about)                                                     | Official scheme discovery                        | Link to current guidance. A public API and bulk reuse permission were not confirmed. Do not promise benefits or copy a full catalogue.                                                                                                                  |
| [Udyam](https://www.udyamregistration.gov.in/)                                                    | Official MSME registration guidance              | Official registration is free. Direct users to the official process; Luma must not present itself as an authorized registration agent.                                                                                                                  |
| [eShram FAQ](https://eshram.gov.in/faqs)                                                          | Worker registration guidance                     | Link to official eligibility and registration steps. Not every shop owner qualifies. Identity documents stay in the official process.                                                                                                                   |
| [NAMASTE](https://socialjustice.gov.in/schemes/37-0)                                              | Waste-picker training and assistance information | The official scheme includes a waste-picker component. Benefits depend on the programme and eligibility; show a reviewed summary and official link, not an entitlement badge.                                                                           |
| [CPCB plastic processor SOP](https://eprplastic.cpcb.gov.in/plastic/downloads/SOP%20PWP_0001.pdf) | Explain why processor verification matters       | Link-first reference material. A current licensed recycler directory API was not confirmed. Review current rules and registration status before displaying a verified claim.                                                                            |
| [Government Open Data Licence](https://ap.data.gov.in/godl)                                       | Future explicitly licensed public datasets       | Permits reuse, including commercial reuse, for covered data with attribution and conditions. It does not grant rights to all government pages, personal data or logos. Check each dataset's licence, date and geographic relevance.                     |

Weather implementation must use a backend proxy and a bounded shared cache. Keep
precise customer coordinates out of public cache keys and logs. Respect provider
expiry, use Last-Modified/If-Modified-Since, and display a timestamp. Hide or label
stale results after a defined maximum age. Relevant terms:
[API terms](https://api.met.no/doc/TermsOfService),
[data licence](https://docs.api.met.no/doc/License.html),
[cache guidance](https://docs.api.met.no/doc/GettingStarted.html).

No reliable, openly licensed, current Bengaluru scrap-price API was confirmed.
Use existing shop quotes and reference rates with date, material, grade and
location. Show insufficient data instead of inventing a market price. Old waste
statistics from another city are not a local price feed.

## Keep costs and scope small

- Store editorial cards in versioned content and serve them through the existing
  site. A daily official-source review is an operational process, not a request
  per page view. Each card needs a source, review date and owner.
- Use compact indexed queries and pagination for support and demand notices.
  Measure database bytes, writes and storage before and after pilot use. Set
  explicit limits before enabling uploads or scheduled polling.
- Reuse existing image compression. Add new images only where they explain a
  task. No decorative video downloads on a shop's mobile data connection.
- Keep manual contact and user-initiated sharing first. WhatsApp API fees and
  template rules need a fresh official check before implementation; the Meta
  pricing page returned a rate-limit error during this research. No free API
  promise is made.
- Do not add an unlimited free-map assumption. OpenStreetMap data and public
  tile servers have different conditions. The public
  [tile policy](https://operations.osmfoundation.org/policies/tiles/) disallows
  bulk/offline prefetch; public
  [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) has a
  one-request-per-second maximum and disallows client autocomplete. Prefer an
  explicit open-in-maps action until a map service is justified.
- Defer an open social feed, scraped news, scraped contacts, paid commodity
  feeds and a self-hosted general chat model. Their moderation, freshness and
  hosting costs need evidence of use first.

## Approval and delivery boundary

This is a research proposal, not a committed release scope. Approval should name
the selected priorities or features. Before implementing each one, record its
access rules, data retention, cost limits and measurable acceptance checks.
Keep account setup and live provider verification separate from local tests.
