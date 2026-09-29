# Feature inventory

> **Status:** the investor prototype, 29 Sep 2026. A pull request that adds,
> changes or removes a feature updates this page. How to try each one, step by
> step: [the A-to-Z test plan](../testing/README.md).

Three lists: what's [built](#built) and where to find it, what runs on
[sample data](#sample-data), and what comes [next](#next). URLs are English
paths; every localized page also lives under a language code, such as
`/kn/sell` or `/ur/app`.

## Built

### Households, with no account

| Feature                                                                                                                                                                                                             | URL         | Notes                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sell scrap in four steps: what you have and about how many kilos; which shop, from each verified shop's offer for your scrap; when, for a pickup from home or a drop-off; then book with a code sent to your number | `/sell`     | Offers come from each shop's own prices, never from AI ([ADR 0011](../decisions/0011-ai-estimates-priced-by-our-tables.md)). Nearest shops first with your location, best price first without it |
| Track a booking: when, which shop, what's collected, what to expect; afterwards what was weighed, what was paid and the recycle points earned. Cancel for free until the shop is on the way                         | `/t/{code}` | A 10-character code that can't be guessed, and the page updates live. Demo: `/t/priyademo1` (booked), `/t/priyademo2` (paid)                                                                     |

### Signing in and joining

| Feature                                                                                               | URL                                                                                                                | Notes                                                                                                                             |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Language first, then phone number and a 6-digit code                                                  | `/login`, `/login/verify`                                                                                          | 5 tries a code, a new code after 30 seconds, 10 requests a minute per address ([auth](../architecture/auth.md))                   |
| What each role is and needs                                                                           | `/join`                                                                                                            | Public                                                                                                                            |
| The application: role, consent, the form for the role, drafts saved as you type, then where it stands | `/join/status`, `/join/kabadiwala`, `/join/{yard,recycler,manufacturer}`, `/join/{kind}/documents`, `/join/saathi` | One per person. Uploads are checked by their real file type; each submission is kept as a version ([onboarding](./onboarding.md)) |

### Kabadiwala app

| Feature                                                                                                                                                     | URL                                             | Notes                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Home: new requests, today's pickups, money paid, the stock's worth and a price check against the market                                                     | `/app`                                          |                                                                                |
| Requests in three tabs: **New** to accept or decline, **Today** to start the trip and weigh, **Done**                                                       | `/app/requests`                                 | The household's number and address show only once the shop accepts             |
| A pickup: its details and history, then weigh and pay: kilos per material in half-kilo steps, the amount from the shop's prices, cash or UPI, and a receipt | `/app/requests/{id}`                            | Weighing adds to stock and earns the household one recycle point for every ₹10 |
| My prices: the rate card, with the minimum and the market price beside each material                                                                        | `/app/prices`                                   | A price below the minimum is refused ([pricing](./pricing.md))                 |
| Stock and what it's worth today; lots put on sale for yards, and withdrawn                                                                                  | `/app/stock`, `/app/sell`                       | Only stock that's free to sell can be listed                                   |
| Trades with yards, impact, compliance                                                                                                                       | `/app/trades`, `/app/impact`, `/app/compliance` | Under **⋯** on a phone                                                         |

### Yard, recycler and manufacturer app

| Feature                                                                                                                                                                            | URL                        | Notes                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Home: what's in escrow, what's waiting for you, what's on sale, the latest lots                                                                                                    | `/app`                     |                                                                                                                                     |
| Buy: open lots from the step below, filtered by material                                                                                                                           | `/app/market`              | Yards see kabadiwalas' lots, recyclers see yards', manufacturers see recyclers'                                                     |
| Trades, buying and selling: requested, accepted, in escrow, dispatched, delivered                                                                                                  | `/app/trades`              | The seller accepts (or declines) and dispatches; the buyer pays into escrow and confirms delivery. Over ₹50,000 flags an e-way bill |
| An invoice for every paid trade                                                                                                                                                    | `/app/trades/{id}/invoice` | Numbered LG-26-0001 onwards, with both GSTINs                                                                                       |
| Stock, and lots put on sale for the next buyer up                                                                                                                                  | `/app/stock`, `/app/sell`  |                                                                                                                                     |
| Compliance: a checklist (GST, pollution board consent, a stamped scale, a safety kit), consent validity with a reminder, trade invoices, and the EPR record for the financial year | `/app/compliance`          | EPR totals come from completed trades; certificates themselves are issued on CPCB's portals                                         |
| Impact: kilos recycled, recycled material bought, CO₂e avoided, money earned and spent                                                                                             | `/app/impact`              |                                                                                                                                     |

### Saathi app

| Feature                                                                                        | URL           | Notes                                                                 |
| ---------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------- |
| Jobs: today's, coming up, and open jobs with the area first; take one, mark it done on the day | `/app`        | Pickups from homes, help at a shop, sorting at a yard, factory shifts |
| Earnings: this week, so far, by kind of work, and each job done                                | `/app/impact` |                                                                       |

### Admin console, English only

| Feature                                                                                                                                                   | URL                            | Notes                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Sign-in with email, password and an authenticator code; one-time setup with backup codes                                                                  | `/admin/login`, `/admin/setup` | A 12-hour session ([auth](../architecture/auth.md#the-admin))                                   |
| Verification: the queue, each application with its files, a checklist that unlocks **Approve**, **Ask for changes** with a note, **Reject** with a reason | `/admin/verification`          | Due soon at 18 hours, overdue at 24. Notes are shown to the applicant and kept in the audit log |
| Prices: Bengaluru's minimum and fallback price for every material                                                                                         | `/admin/prices`                |                                                                                                 |
| Support: messages from the help centre and the solar page, marked answered once dealt with                                                                | `/admin/support`               |                                                                                                 |

### Public site

| Feature                                                                                                                                                      | URL                                                              | Notes                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------- |
| Home, how it works, who it's for, contact                                                                                                                    | `/`, `/how-it-works`, `/participants`, `/contact`                |                                             |
| Today's scrap prices: every material with the week's and month's change and the floor, a 30-day chart, and factory-gate prices for recycled material         | `/prices`                                                        | Bengaluru                                   |
| The Luma.Green standard: one open code for every material (with a CSV download), grading, fair weighing, receipts and chain of custody, verification, escrow | `/standards`                                                     |                                             |
| Rooftop solar for Karnataka: system size, cost, the PM Surya Ghar subsidy for homes, savings and payback, and a call-back request                            | `/solar`                                                         | Requests reach the admin's support messages |
| Help centre: search, topics, and guides, questions, videos and training for every role; a contact form                                                       | `/help`, `/help/{role}`, `/help/{role}/{guide}`, `/help/contact` | Messages reach the admin                    |
| Join                                                                                                                                                         | `/join`                                                          |                                             |

### Across the platform

| Feature                                                                            | Where                                                           |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 12 languages, with Kannada, Hindi and English first; Urdu and Arabic right to left | Every page, at `/{code}/…`                                      |
| Search engines: canonical URLs, links between languages, sitemap, robots           | `/sitemap.xml`, `/robots.txt` ([URLs](../architecture/urls.md)) |
| Installable on a phone's home screen                                               | `/manifest.webmanifest`                                         |
| The demo world, and resetting it                                                   | `npx convex run demo:seed`, `demo:reset` (dev only)             |
| Screenshots for the README                                                         | `pnpm screenshots`                                              |

## Sample data

Everything below is there to show the idea. None of it is market data.

| What                                                                 | Where it comes from                                                                                                                   | Once it's real                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Businesses, people, pickups, lots, trades, jobs and support messages | [convex/lib/demo.ts](../../convex/lib/demo.ts), loaded by `demo:seed`                                                                 | Real applicants, verified by the admin                                                          |
| The material list and its names                                      | [convex/lib/catalogue.ts](../../convex/lib/catalogue.ts): 26 materials, named in English, Hindi and Kannada, and in English elsewhere | The admin keeps it                                                                              |
| Prices: minimum, fallback and 30 days of market prices               | Sample Bengaluru figures in the catalogue                                                                                             | The admin's tables ([pricing](./pricing.md)); a source for market prices is still open          |
| CO₂e factors                                                         | Indicative, rounded from published averages                                                                                           | Sourced factors before any public claim                                                         |
| Solar estimates                                                      | Indicative assumptions, shown on the page                                                                                             | A site visit by a verified installer                                                            |
| Escrow between businesses                                            | Simulated: no money moves                                                                                                             | A payment provider, after the pilot ([ADR 0009](../decisions/0009-money-off-platform-first.md)) |
| Paying households                                                    | Recorded, not processed: cash or UPI at the door                                                                                      | The same for the pilot                                                                          |
| Sign-in codes                                                        | 123456 for demo numbers; other numbers' codes go to the Convex log                                                                    | SMS through MSG91 once DLT registration is approved                                             |
| Documents in the demo applications                                   | A generated PDF and pictures ([convex/lib/demoFiles.ts](../../convex/lib/demoFiles.ts))                                               | Applicants' own uploads                                                                         |
| Recycle points                                                       | One for every ₹10 paid                                                                                                                | What they're worth is an [open question](./open-questions.md)                                   |

## Next

From the [roadmap](../delivery/roadmap.md). Several items after the pilot
already appear in the prototype as demos on sample data (trading between
businesses, escrow, solar, Saathi jobs); the work is to make them real.

**Before the pilot** (6 to 12 October):

- SMS through MSG91 once the DLT templates are approved: sign-in codes, booking
  confirmations with the tracking link, and application decisions.
- The AI photo estimate on OpenRouter, with a spend limit and a labelled set of
  Bengaluru photos ([AI estimation](../architecture/ai-estimation.md)).
- Kabadiwala auto-accept, and the rest of the dispatch rules: a booking moves
  to the next nearest kabadiwala after a decline or no answer
  ([household](./household.md#rules)).
- Real minimum and fallback prices for Bengaluru, and the pilot kabadiwalas
  onboarded through the real flow (founder).

**During the pilot** (13 to 20 October):

- A pilot numbers page in the admin console
  ([ADR 0012](../decisions/0012-pilot-analytics-in-convex.md),
  [pilot plan](../delivery/pilot.md)).
- Fixing what the pilot breaks, daily.

**Outside the code, and on the critical path:** DLT approval for MSG91,
pointing `luma.green` at Vercel, the Convex production deploy key in Vercel,
and an OpenRouter key with a spend limit.

**After the pilot:** kabadiwala-to-yard collections, once the research is in
([kabadiwala-to-yard](./kabadiwala-to-yard.md)); real trading between recyclers
and manufacturers; escrow payments; carbon credits; solar, documentation and
legal services; a machinery data bank; a WhatsApp channel; Saathi pay; native
apps; PostHog and Sentry; team members for the admin.
