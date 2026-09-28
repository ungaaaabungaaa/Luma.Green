# Product brief — running capture

> **Status:** the founder's own words, organised — kept as the record of what
> was asked for. The worked-out plan lives in the pages linked from
> [docs/README.md](../README.md); decisions and open questions are tracked in
> [open-questions.md](./open-questions.md).
>
> **Clickable prototype:**
> [Luma.Green Prototype](https://claude.ai/artifact/4hiq2r5tm5kWDBqTGEPD8C) —
> household, kabadiwala, login, onboarding for every role and the admin
> verification queue. Sample data only. Private until shared from the canvas's
> Share menu.

## 1. The idea

Luma.Green builds the infrastructure for the recycling chain — from the
household that throws something away to the manufacturer that buys recycled raw
material — and connects everyone in it on one platform where they can:

- exchange raw materials
- see the latest prices
- pay each other through escrow

At every hand-off the material is segregated further, and its **name and price
can change** at each step (mixed scrap → newspaper → graded paper bales …).

Later, on top of the chain: carbon trading and carbon credits, solar panel
applications, documentation, legal services, and auxiliary services for each
level — for example, a machinery data bank for yards.

> "Once everything is logged in and the platform is set up, we don't have to
> worry about it for the next 10 years, because laws change very slowly."

After launch the platform gets streamlined from real data and customer
feedback.

## 2. Who is on the platform

| Role                                       | Who they are                                                                                                            | Signs in?                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **User** (household, B2C)                  | Generates the waste                                                                                                     | No — browser storage until booking |
| **Kabadiwala**                             | Owns a small local scrap shop; may or may not have transport for pickups                                                | Yes                                |
| **Preprocessor** (yard)                    | Owns a large yard; buys from kabadiwalas and segregates further                                                         | Yes                                |
| **Recycler**                               | Turns segregated scrap into finished raw material manufacturers can use                                                 | Yes                                |
| **Manufacturer**                           | Sees how much recyclers are producing and places orders                                                                 | Yes                                |
| **Saathi** (working name, "foot soldiers") | Individuals who want to earn quickly: pickups, help at a kabadiwala shop, or shifts at a yard, recycler or manufacturer | Yes — personal onboarding          |
| **Admin** (our team)                       | Verifies every registration by hand                                                                                     | Yes                                |

Between each pair of roles the founder's diagram has a **"What all he wants"**
box — what each role needs from the next. **Open:** fill one in per hand-off.

### Naming the gig role

Suggested: **Saathi** (साथी, "partner"). Dignified for work that carries
stigma, one word, widely understood, and broad enough to cover pickups and
shifts alike. Alternatives: _Mitra_ (more familiar in the south) or plain
_Green Partner_. Each locale gets its own translation either way. **Open:**
confirm the name.

## 3. First release

- Test team: the founder and two others, testing a few flows first.
- Goal: real users within 2–3 weeks (about 13–20 Oct 2026), then collect data
  and optimise.
- First prototype covers: household side, kabadiwala side, login, and
  onboarding for every role.

## 4. Household flow

- No sign-in, no sign-up. State lives in browser storage until checkout.
- Takes photos → an LLM (self-hosted or via OpenRouter, whichever is cheaper)
  estimates what can be recycled and roughly what it's worth.
- Finds the nearest kabadiwala, then either **drops it off** or **books a
  pickup**.
- At checkout: phone number and location.
- Three screens covering: **when** the appointment is · **who** is coming ·
  **how many recycle points / how much money**.
- Payment happens off-platform: the kabadiwala pays cash or UPI at pickup. The
  platform records how much business it generated.
- Highest-volume part — hundreds of users — so it must be as seamless as
  possible.
- **Later:** a WhatsApp number that does the same (photos in → price, nearby
  shops and a booking out). To be planned separately.

## 5. Kabadiwala flow

- **Requests:** sees households who want a pickup → Accept or Reject. The
  household is notified.
- **Auto-accept:** can be switched on so bookings are accepted even at night.
- **UX:** many kabadiwalas have little formal education — keep it as simple as
  possible.
- **Multilingual is a must.** Every word hand-translated in locale files. Live
  LLM translation of AI output: on hold, but planned.
- After a pickup: brings the scrap to the shop and segregates it.

## 6. Kabadiwala → preprocessor hand-off

- The kabadiwala publishes what they have ("I have this many tonnes of
  newspaper, this much of …").
- The preprocessor sees it and books a slot, or tells the kabadiwala they're
  coming.
- "The most important part." **Open:** the founder is researching this.

## 7. Onboarding and verification

What each role gives us, from the founder's diagram:

| Collected                 | User | Kabadiwala | Preprocessor | Recycler | Manufacturer |
| ------------------------- | :--: | :--------: | :----------: | :------: | :----------: |
| Phone number              |  ✓   |     ✓      |      ✓       |    ✓     |      ✓       |
| Location                  |  ✓   |     ✓      |      ✓       |    ✓     |      ✓       |
| GST number (optional)     |      |     ✓      |      ✓       |    ✓     |      ✓       |
| Pickup services           |      |     ✓      |      ✓       |    ✓     |      ✓       |
| Operational timings       |      |     ✓      |      ✓       |    ✓     |      ✓       |
| Holidays                  |      |     ✓      |      ✓       |    ✓     |      ✓       |
| KSPCB                     |      |            |      ✓       |    ✓     |      ✓       |
| SPCB certificate (PDF)    |      |            |      ✓       |    ✓     |      ✓       |
| Machine photos and videos |      |            |      ✓       |    ✓     |      ✓       |
| Location tags             |      |            |      ✓       |    ✓     |      ✓       |

- Households register nothing.
- Kabadiwala: GST is optional.
- Manufacturer: one PDF upload (the PCB certificate).
- **Verification is manual**, on an admin page, within **12–24 hours**.

The prototype also collects, as proposals to confirm:

- **Materials handled** for yards, recyclers and manufacturers — without it we
  can't match sellers to buyers.
- **For Saathis:** area and travel radius, kinds of work, vehicle,
  availability, photo ID with a selfie, and an optional UPI ID for payouts.

## 8. Later — not in the first release

Carbon trading · carbon credits · solar panel applications · documentation ·
legal services · machinery data bank and other auxiliary services · escrow
between businesses · WhatsApp channel · live translation of LLM output.

## 9. Updates

Later answers from the founder, newest last.

- **29 Sep 2026 — user types.** Households (make the trash); kabadiwalas (small
  local shop, sometimes with transport); preprocessors (a big yard that collects
  from kabadiwalas and segregates further); recyclers (turn raw material into
  finished material for manufacturers); manufacturers (see how much recyclers
  produce and place orders); and a gig role — "purukramas" or foot soldiers —
  for people who want quick money doing pickups or working at a kabadiwala,
  recycler or manufacturer. Named **Saathi**.
- **29 Sep 2026 — onboarding.** Households register nothing. Kabadiwalas: GST
  optional. Manufacturers: one PDF upload. The documents diagram is transcribed
  in section 7. Verification is manual, in an admin page.
- **29 Sep 2026 — pilot and codes.** The pilot is in **Bengaluru**. Households
  confirm their number with a code — MSG91 with DLT registration.
- **29 Sep 2026 — prices.** Kabadiwalas set their own prices; Luma.Green keeps a
  minimum price table; a fallback table applies where a kabadiwala sets none.
- **29 Sep 2026 — Saathi pay.** Paid by the kabadiwala or the manufacturer; the
  payment structure is out of scope for now.
- **29 Sep 2026 — UI.** Ready-made components ("don't reinvent the wheel"),
  shadcn/ui as already in the repo; latest Tailwind; **white theme only, no dark
  mode**; mobile first — households and kabadiwalas are phone-only, other roles
  also use desktop. Plan the UI for everything; implement, test in the browser
  and publish straight to production.
- **29 Sep 2026 — admin.** One admin for the whole platform; team members later.
  The founder proposed name, email, Aadhaar, date of birth and phone as the
  login; the agreed approach keeps those as the admin's profile (Aadhaar last
  four digits only) and signs in with email, password and an authenticator code.
- **29 Sep 2026 — backend and ops.** Convex (free for now, easy to manage, good
  AI support), one dev and one production deployment, for the coming year.
  PostHog "and all that" later, once the partner commits. Backups planned in
  the docs, including **daily local backups**.

## 10. Where the rest went

- Differences between this brief and the first scaffold, and how they were
  resolved: [architecture/overview.md](../architecture/overview.md) and
  [architecture/data-model.md](../architecture/data-model.md#what-changes-from-v1).
- Open questions and the decisions log: [open-questions.md](./open-questions.md).
