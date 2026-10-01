<p align="center">
  <img src="public/logo.svg" width="96" height="96" alt="Luma.Green" />
</p>

<h1 align="center">Luma.Green</h1>

<p align="center"><strong>Cleaner Tomorrow in Motion</strong></p>

<p align="center">
  A city's whole recycling chain on one platform: from the household selling
  old newspaper to the factory buying recycled PET flakes. Fair prices, weighed
  pickups and every hand-off on the record. Piloting in Bengaluru, October 2026.
</p>

<p align="center">
  <a href="#see-it">See it</a> ·
  <a href="#try-it-with-the-demo-logins">Try it</a> ·
  <a href="docs/testing/README.md">Test it</a> ·
  <a href="#run-it-locally">Run it</a> ·
  <a href="docs/product/features.md">Features</a> ·
  <a href="docs/README.md">Docs</a>
</p>

> **This is the investor prototype.** Every screen runs against a live backend
> filled with a demo world of sample Bengaluru businesses, prices and trades.
> What's real and what's sample: [Status](#status).

## What Luma.Green is

Recyclable material in an Indian city passes through many hands, and every
hand-off is informal: prices are opaque, weights are guessed and nothing is
written down. Luma.Green connects the whole chain on one platform, where
everyone sees the latest prices, trades material with the next step up and,
between businesses, pays through escrow.

```
Household ──► Kabadiwala ──► Yard ──────► Recycler ──────► Manufacturer
scrap from    buys, weighs   sorts and    turns it into    buys recycled
home          and sorts      bales        flakes and       raw material
                                          granules
```

Material is sorted further at every step, so its name and price change on the
way: a household's newspaper becomes baled paper at a yard and kraft rolls at a
recycler. The platform keeps who sold what to whom, how much and at what price.

| Role                         | Who they are                                 | On Luma.Green they…                                                              | Sign in with                                   |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Household**                | Anyone with scrap at home                    | Book a pickup, follow it, get paid at the door in cash or UPI                    | Nothing: a code confirms the number at booking |
| **Kabadiwala**               | A local scrap shop, sometimes with a vehicle | Accept pickups, weigh and pay, set their own prices, sell stock to yards         | Phone and SMS code                             |
| **Yard** (preprocessor)      | A large yard that sorts and bales in bulk    | Buy from kabadiwalas, sell bales to recyclers                                    | Phone and SMS code                             |
| **Recycler**                 | Turns sorted scrap back into raw material    | Buy from yards, sell flakes, granules and kraft to factories                     | Phone and SMS code                             |
| **Manufacturer**             | Makes products from recycled material        | Order recycled material, keep recycled-content and EPR records                   | Phone and SMS code                             |
| **Saathi** (साथी, "partner") | Anyone who wants short, paid work            | Take pickup, sorting and shift jobs posted by the businesses above               | Phone and SMS code                             |
| **Admin**                    | The Luma.Green team                          | Verify every business and Saathi by hand, keep the price tables, answer messages | Email, password and authenticator app          |

A person checks every business and every Saathi before they can trade. The
interface speaks 12 languages, including Kannada, Tamil, Telugu, Urdu (right to
left) and Hindi for Bengaluru, and is made for people using a smartphone for
work for the first time: plain words, icons, big buttons, and numbers that carry
the meaning, with rupees grouped in lakhs.

## What's in the prototype

Each screen works on a phone first; the business screens also have a desktop
layout. The full inventory, with every URL, is
[docs/product/features.md](docs/product/features.md).

**Households**, with no account:

- **Sell** at `/sell`, in four steps: what you have, which verified shop (each
  one's offer for your scrap, nearest first), when to pick it up or drop it
  off, then book with a code sent to your number.
- **Track** at `/t/{code}`, the link shown after booking (and sent by SMS once
  SMS is switched on): when, which shop and how much to expect, live;
  afterwards, what was weighed and paid, and the recycle points earned.
  Cancelling is free until the shop is on the way.

**Kabadiwalas**, in the app at `/app`:

- **Requests** (`/app/requests`): **New** pickups to accept or decline,
  **Today**'s to start and weigh, and **Done**. The household's number and
  address appear only once the shop accepts.
- **Weigh and pay** (`/app/requests/{id}`): weigh each material in half-kilo
  steps and pay in cash or UPI. The receipt reaches the household and the stock
  updates itself.
- **My prices** (`/app/prices`): the shop's rate card, beside the market price
  and never below the admin's minimum.
- **Stock and Sell** (`/app/stock`, `/app/sell`): what's in the shop and what
  it's worth, and lots put on sale for yards. Then **Trades**, **Impact** and
  **Compliance**.

**Yards and recyclers**, at `/app`:

- **Buy** (`/app/market`): lots from the step below, by material, weight and
  price.
- **Trades** (`/app/trades`): each purchase and sale through escrow (requested,
  accepted, in escrow, dispatched, delivered), a trade receipt once the buyer pays
  (`/app/trades/{id}/invoice`), and a flag when goods over ₹50,000 need an
  e-way bill.
- **Stock**, **Sell**, **Impact** and **Compliance**, as for kabadiwalas.

**Manufacturers**, at `/app`:

- **Buy** recycled PET flakes, HDPE granules, kraft paper and aluminium ingots
  from verified recyclers, through the same escrow steps.
- **Compliance** (`/app/compliance`): the EPR record of recycled material
  bought this financial year, trade receipts, and a checklist of the factory's
  own GST, consent and safety.
- **Impact** (`/app/impact`): recycled material used and the CO₂e it avoided.

**Saathis**, at `/app`:

- **Jobs**: home pickups, help at a shop, sorting shifts and factory shifts,
  those in their area first, with the day, time and pay. Take one, and mark it
  done on the day.
- **Earnings** (`/app/impact`): this week's and in all, job by job.

**The admin**, at `/admin` (English only, for the one operator):

- **Verification** (`/admin/verification`): every application with its
  documents and photos and a 12–24 hour target. Approve once every check for the
  role is ticked, ask for changes with a note, or reject with a reason.
- **Prices** (`/admin/prices`): Bengaluru's minimum and fallback price for
  every material.
- **Support** (`/admin/support`): messages from the help centre and the solar
  page.

**Public pages**, open to everyone and in every language (`/kn/prices`,
`/hi/help`, …):

| Page      | URL                                          | What it's for                                                                          |
| --------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Home      | `/`                                          | What Luma.Green is, for each role                                                      |
| Prices    | `/prices`                                    | Today's Bengaluru scrap prices, the floor, a 30-day chart and factory-gate prices      |
| Standards | `/standards`                                 | The Luma.Green standard: open material codes, grading, fair weighing, receipts, escrow |
| Solar     | `/solar`                                     | A rooftop solar calculator with the PM Surya Ghar subsidy, and a call-back request     |
| Help      | `/help`                                      | Guides, answers and training for every role, and a contact form                        |
| Join      | `/join`                                      | What each role needs to apply, then the application itself                             |
| More      | `/how-it-works`, `/participants`, `/contact` | How the platform works, who it's for, how to reach us                                  |

## See it

Taken by `pnpm screenshots` from the prototype on its demo data (sample
figures), at phone (390 × 844) and desktop (1440 × 900) sizes. Open a picture
for full size; how to take them again is in
[docs/testing](docs/testing/README.md#screenshots).

<details open>
<summary><strong>Households and the public site</strong>: home, prices, sell, tracking, join, help, solar, standards</summary>

| Screen                          |                                            Phone                                             |                                             Desktop                                              |
| ------------------------------- | :------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------: |
| **Home**<br>`/`                 |      <img src="docs/screenshots/home-phone.png" width="180" alt="Home page on a phone">      |      <img src="docs/screenshots/home-desktop.png" width="460" alt="Home page on a desktop">      |
| **Prices**<br>`/prices`         |    <img src="docs/screenshots/prices-phone.png" width="180" alt="Price board on a phone">    |    <img src="docs/screenshots/prices-desktop.png" width="460" alt="Price board on a desktop">    |
| **Sell**<br>`/sell`             |    <img src="docs/screenshots/sell-phone.png" width="180" alt="Selling scrap on a phone">    |    <img src="docs/screenshots/sell-desktop.png" width="460" alt="Selling scrap on a desktop">    |
| **Tracking**<br>`/t/priyademo1` | <img src="docs/screenshots/tracking-phone.png" width="180" alt="Pickup tracking on a phone"> | <img src="docs/screenshots/tracking-desktop.png" width="460" alt="Pickup tracking on a desktop"> |
| **Join**<br>`/join`             |       <img src="docs/screenshots/join-phone.png" width="180" alt="Joining on a phone">       |       <img src="docs/screenshots/join-desktop.png" width="460" alt="Joining on a desktop">       |
| **Help**<br>`/help`             |     <img src="docs/screenshots/help-phone.png" width="180" alt="Help centre on a phone">     |     <img src="docs/screenshots/help-desktop.png" width="460" alt="Help centre on a desktop">     |
| **Solar**<br>`/solar`           |  <img src="docs/screenshots/solar-phone.png" width="180" alt="Solar calculator on a phone">  |  <img src="docs/screenshots/solar-desktop.png" width="460" alt="Solar calculator on a desktop">  |
| **Standards**<br>`/standards`   |   <img src="docs/screenshots/standards-phone.png" width="180" alt="Standards on a phone">    |   <img src="docs/screenshots/standards-desktop.png" width="460" alt="Standards on a desktop">    |

</details>

<details>
<summary><strong>Kabadiwala</strong>: home, requests, weigh and pay, rate card</summary>

| Screen                                    |                                                   Phone                                                    |                                                    Desktop                                                     |
| ----------------------------------------- | :--------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------: |
| **Home**<br>`/app`                        |    <img src="docs/screenshots/kabadiwala-home-phone.png" width="180" alt="Kabadiwala home on a phone">     |    <img src="docs/screenshots/kabadiwala-home-desktop.png" width="460" alt="Kabadiwala home on a desktop">     |
| **Requests**<br>`/app/requests`           |  <img src="docs/screenshots/kabadiwala-requests-phone.png" width="180" alt="Pickup requests on a phone">   |  <img src="docs/screenshots/kabadiwala-requests-desktop.png" width="460" alt="Pickup requests on a desktop">   |
| **Weigh and pay**<br>`/app/requests/{id}` | <img src="docs/screenshots/kabadiwala-weigh-and-pay-phone.png" width="180" alt="Weigh and pay on a phone"> | <img src="docs/screenshots/kabadiwala-weigh-and-pay-desktop.png" width="460" alt="Weigh and pay on a desktop"> |
| **Rate card**<br>`/app/prices`            |     <img src="docs/screenshots/kabadiwala-rate-card-phone.png" width="180" alt="Rate card on a phone">     |     <img src="docs/screenshots/kabadiwala-rate-card-desktop.png" width="460" alt="Rate card on a desktop">     |

</details>

<details>
<summary><strong>Yard, recycler and manufacturer</strong>: market, trades, recycler home, compliance</summary>

| Screen                                            |                                                     Phone                                                      |                                                      Desktop                                                       |
| ------------------------------------------------- | :------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------: |
| **Yard: buy**<br>`/app/market`                    |       <img src="docs/screenshots/yard-market-phone.png" width="180" alt="The yard's market on a phone">        |       <img src="docs/screenshots/yard-market-desktop.png" width="460" alt="The yard's market on a desktop">        |
| **Yard: trades**<br>`/app/trades`                 |       <img src="docs/screenshots/yard-trades-phone.png" width="180" alt="The yard's trades on a phone">        |       <img src="docs/screenshots/yard-trades-desktop.png" width="460" alt="The yard's trades on a desktop">        |
| **Recycler: home**<br>`/app`                      |        <img src="docs/screenshots/recycler-home-phone.png" width="180" alt="Recycler home on a phone">         |        <img src="docs/screenshots/recycler-home-desktop.png" width="460" alt="Recycler home on a desktop">         |
| **Manufacturer: compliance**<br>`/app/compliance` | <img src="docs/screenshots/manufacturer-compliance-phone.png" width="180" alt="Compliance and EPR on a phone"> | <img src="docs/screenshots/manufacturer-compliance-desktop.png" width="460" alt="Compliance and EPR on a desktop"> |

</details>

<details>
<summary><strong>Saathi</strong>: jobs</summary>

| Screen             |                                            Phone                                            |                                             Desktop                                             |
| ------------------ | :-----------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------: |
| **Jobs**<br>`/app` | <img src="docs/screenshots/saathi-home-phone.png" width="180" alt="Saathi jobs on a phone"> | <img src="docs/screenshots/saathi-home-desktop.png" width="460" alt="Saathi jobs on a desktop"> |

</details>

## Try it with the demo logins

Sign in at `/login` with a number below and the code **123456**. Demo logins
work only on the dev deployment, where `AUTH_DEV_MODE=true`, and no SMS is ever
sent to them; on production they are ordinary numbers and the code opens
nothing. Every flow, step by step with what you should see, is in the
[A-to-Z test plan](docs/testing/README.md).

| Phone           | Who                                                             | What to try                                                                                   |
| --------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| +91 90000 00101 | **Kabadiwala**: Ramesh Kumar, Ramesh Kabadi Store, Yeshwanthpur | Accept Priya's pickup, weigh and pay the one on its way, change a price, list stock for yards |
| +91 90000 00102 | **Yard**: Farida Begum, Peenya Paper & Plastic Yard             | Buy a kabadiwala's newspaper, pay into escrow, confirm delivery; sell PET bales to a recycler |
| +91 90000 00103 | **Recycler**: Suresh Reddy, GreenLoop Polymers, Bommasandra     | Dispatch Deccan Packaging's paid order of PET flakes, buy PET from a yard, check EPR records  |
| +91 90000 00104 | **Manufacturer**: Anita Rao, Deccan Packaging, Nelamangala      | Order recycled PET flakes, confirm a delivery, check compliance and recycled content          |
| +91 90000 00105 | **Saathi**: Lakshmi Devi, Yeshwanthpur                          | Take a job near you, mark one done, see earnings                                              |
| +91 90000 00106 | **New applicant**                                               | Join as any role from scratch                                                                 |
| +91 90000 00107 | **Yard applicant**: Mohammed Irfan, Irfan Metal & Plastic Yard  | An application waiting for the admin                                                          |
| +91 90000 00108 | **Kabadiwala applicant**: Kavitha S, Kavitha Raddi Shop         | An application waiting for the admin                                                          |
| +91 90000 00109 | **Household**: Priya Sharma                                     | Book a pickup at `/sell` with this number; follow hers at `/t/priyademo1` (no sign-in needed) |
| On request      | **Admin**                                                       | `/admin/login`: email, password and an authenticator-app code. Ask the founder for access     |

## Run it locally

You need Node 24 (see `.nvmrc`), pnpm 11 through Corepack, and a Convex account
with access to the Luma.Green project.

```bash
corepack enable          # pnpm 11, pinned in package.json
pnpm install
cp .env.example .env.local
npx convex dev           # sign in to Convex and pick the Luma.Green project;
                         # writes the Convex URLs into .env.local and keeps your
                         # functions in sync with your dev deployment. Leave it running.
```

Convex gives each person on the team their own dev deployment. The first time
you use yours, set its sign-in variables and fill it with the demo world, in a
second terminal:

```bash
npx convex env set SITE_URL http://localhost:3000
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set AUTH_DEV_MODE true   # demo logins; other numbers' codes go to the Convex log
npx convex run demo:seed                # the demo world (does nothing if it's already there)
pnpm dev                                # http://localhost:3000
```

Then sign in at `http://localhost:3000/login` with a demo login.

- **Start over:** `npx convex run demo:reset` wipes the prototype's data and
  seeds it again; sign-ins survive. Seed and reset refuse to run unless
  `AUTH_DEV_MODE=true`, so production is never touched.
- **Another port:** sign-in trusts `SITE_URL` only. Add more with
  `npx convex env set EXTRA_TRUSTED_ORIGINS http://localhost:3100`.
- **Everything else** (SMS, AI, payments, maps, analytics) switches itself on
  when its key appears in `.env.local` or on the deployment; see
  [docs/operations/environments.md](docs/operations/environments.md).

```bash
pnpm check          # lint + typecheck + unit tests: run before every push
pnpm test           # unit tests (Vitest, Testing Library, convex-test)
pnpm e2e            # Playwright end-to-end tests
pnpm build          # production build
pnpm screenshots    # the "See it" pictures, from a running app
```

## Tech stack

| Layer     | Choice                                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App       | Next.js 16 (App Router, Turbopack), React 19, TypeScript in strict mode                                                                                              |
| Interface | Tailwind CSS v4, shadcn/ui on Radix, lucide icons, Noto fonts; white theme, mobile first                                                                             |
| Backend   | Convex: database, server functions, file storage and live queries (EU West)                                                                                          |
| Sign-in   | Better Auth inside Convex: phone codes for everyone, password and authenticator for the admin                                                                        |
| Languages | next-intl: 12 languages, English URLs, right to left for Urdu and Arabic                                                                                             |
| Forms     | React Hook Form and Zod; the server checks the same rules again                                                                                                      |
| Quality   | Vitest, Testing Library, convex-test, Playwright; type-aware ESLint, Prettier, commitlint, CodeRabbit                                                                |
| Hosting   | Vercel for the web app, Convex for the backend; pnpm 11                                                                                                              |
| Waiting   | MSG91 and OpenRouter: implementation ready for account setup and provider checks. PostHog and Sentry are optional. Maps use browser location. Payments remain a demo |

## Docs

| Where                                                              | What's in it                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [docs/README.md](docs/README.md)                                   | The index: the plan, and the reasons behind it. Start here                                 |
| [docs/product/features.md](docs/product/features.md)               | Every feature: what's built (with URLs), what's sample data, what's next                   |
| [docs/testing/README.md](docs/testing/README.md)                   | The A-to-Z test plan: every flow, step by step, with expected results                      |
| [docs/product/vision.md](docs/product/vision.md)                   | What and why, starting with the vision; roles, flows, onboarding and pricing sit beside it |
| [docs/architecture/overview.md](docs/architecture/overview.md)     | How it's built, then URLs, frontend, sign-in, data model and AI estimation                 |
| [docs/decisions/README.md](docs/decisions/README.md)               | One record per architecture decision                                                       |
| [docs/operations/environments.md](docs/operations/environments.md) | How it's run: environments, services, backups, data protection, incidents                  |
| [docs/delivery/roadmap.md](docs/delivery/roadmap.md)               | Week by week to the pilot, and the pilot plan                                              |
| [AGENTS.md](AGENTS.md)                                             | How code is written here, for people and agents alike                                      |
| [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md)    | From branch to merge · reporting a vulnerability                                           |

## Status

A prototype with a local pilot implementation pass on 1 October 2026, ahead
of the Bengaluru pilot on 13–20 October 2026. See the
[delivery log](docs/delivery/cleanup-progress.md) and the exact
[account and environment checklist](docs/operations/launch-checklist.md).

**Existing development flows** (deployment status must be checked before launch):

- Sign-in with phone codes, and the admin's password and authenticator, with
  fixed-length sessions and rate limits.
- Onboarding for every role: drafts saved as you type, uploads checked by their
  real file type, a version kept for each submission, and the admin's decision.
- Every screen reads and writes live data, and updates without a refresh:
  pickups go from request to receipt, stock follows what's weighed, trades move
  through each escrow step, jobs are taken and finished, messages reach the
  admin.
- 12 languages, right-to-left layouts, phone and desktop.

**Sample**, there to show the idea:

- The demo world: every business, person, pickup, lot, trade and job, defined in
  [convex/lib/demo.ts](convex/lib/demo.ts). The names are invented, and the
  demo GSTINs and pollution-board consent numbers are made up (the GSTINs fail
  the official checksum on purpose).
- Prices are Bengaluru sample figures, not market data. CO₂e factors and solar
  figures are indicative. Screens that show them say so.
- No money moves. Households are paid at the door and the amount is recorded
  ([ADR 0009](docs/decisions/0009-money-off-platform-first.md)); escrow between
  businesses is simulated.
- SMS requires approved MSG91 templates and Convex configuration. Only explicit
  development mode uses demo codes or log delivery. Local provider tests use mocks.
- The optional AI photo estimate needs an OpenRouter key and an evaluated model;
  rupee amounts always come from the price tables
  ([ADR 0011](docs/decisions/0011-ai-estimates-priced-by-our-tables.md)).
- Documents in the demo applications are generated samples.

**Next**: the [roadmap](docs/delivery/roadmap.md), and the list at the end of
[features.md](docs/product/features.md#next).

## Contributing

Read [AGENTS.md](./AGENTS.md) first: it's the source of truth for how code is
written here, and the index of the playbooks in `.claude/skills/`. Then
[CONTRIBUTING.md](./CONTRIBUTING.md) for the branch-to-merge workflow. Every
pull request runs Lint, Format, Typecheck, Unit tests and Build, and E2E when
app code changes; red checks don't merge.

## License

UNLICENSED: all rights reserved.
