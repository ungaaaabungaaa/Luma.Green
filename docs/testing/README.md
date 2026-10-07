# Historical prototype cases, A to Z

> **Status:** prototype case catalogue from 29 September 2026, reconciled on
> 6 October. Use the [10 October launch plan](launch-2026-10-10.md) and
> [current team manual](team-end-to-end-manual.md) for acceptance. They supersede
> this catalogue's old login, reset, role and payment assumptions.

The cases below retain useful journeys, sample calculations and case IDs. They
are not a completed test report or proof that the named data exists today. Both
cloud backends were reset to empty and paused on 6 October. Old sample prices,
shops, receipts, dates, legal references and screen text are historical examples.
Check each against the current candidate and approved local fixture manifest.
Never present these examples as market data, legal approval or real payments.
Cashfree Payment Gateway with Easy Split is selected; integration, activation,
marketplace-use approval, vendor KYC and payment/payout/refund proof are pending.
Local payment-dependent actions must remain blocked until verified integration.

## Before you start

- **Where.** Use the isolated local acceptance frontend at
  `http://localhost:3100` with local Convex on ports 3210/3211. See
  [environments](../operations/environments.md). Paths below are relative to
  that origin; retain the active locale. No cloud fallback is authorized.
- **Fresh data.** Use scoped local fixtures with a run ID. Record the starting
  counts, clock and synthetic prices. Reuse or remove only that run's records.
  Do not execute a whole-table reset. See [Z](#z-local-fixture-cleanup).
- **Separate profiles.** Keep one identity per browser profile. Use the current
  role roster, including owner/admin/member/viewer and all approved subtypes.
- **Phone and desktop.** Test actual current screens at the widths, themes and
  languages required by the current UI contract and launch plan.
- **Evidence.** Label fixtures and sample prices. Record actual results as NOT
  RUN, PASS, FAIL or BLOCKED. A fixture screenshot is not an authenticated pass.

### Local accounts

The old shared fixed code and cloud demo-phone instructions are withdrawn.
Create synthetic local accounts through supported email/password or phone-OTP
flows. Verification delivery must remain local with all live provider keys
absent. Server guards must reject cloud development, preview and production.
Keep email/password credentials and private challenge access only in the
restricted annex or password manager, outside Git and the shared guide.

| Alias          | Historical participant example | Local preparation                                               |
| -------------- | ------------------------------ | --------------------------------------------------------------- |
| SHOP-A         | Ramesh Kabadi Store            | Approved shop, pickups and permitted stock                      |
| YARD-A         | Peenya Paper & Plastic Yard    | Approved preprocessor; unpaid trade examples                    |
| RECYCLER-A     | GreenLoop Polymers             | Approved recycler; permitted stock and quality records          |
| MAKER-A        | Deccan Packaging Pvt Ltd       | Approved manufacturer; input buying and byproduct offer         |
| WORKER-A       | Lakshmi                        | Own permitted jobs and sample completed work                    |
| APPLICANT-A    | New applicant                  | Distinct fresh identity for each application kind               |
| APPLICANT-YARD | Irfan Metal & Plastic Yard     | Separate submitted preprocessor application                     |
| APPLICANT-SHOP | Kavitha Raddi Shop             | Separate submitted kabadiwala application                       |
| HH-A           | Priya                          | Own booking and receipt examples; no real contact data          |
| ADMIN-A        | Platform administrator         | Configured local admin with required TOTP; private setup access |

Map historical names and paths to this run's aliases privately. These rows do
not create accounts. Add the full launch roster; do not stop at these examples.
Local rate limits and invalid-code cases use the current server contract, never
a universal code. Live OTP needs separate MSG91 account and DLT/template proof.

### Reporting what you find

For each problem, note the step (for example **E4**), the login, the URL, phone
or desktop, the language, what you expected and what you saw, and take a
screenshot. The [results table](#results) at the end has a row for every flow.

## The flows

|     | Flow                                                                                                                      | Who                       | Starts at                 |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------- |
| A   | [Sign in with a demo login](#a-sign-in-with-a-demo-login)                                                                 | Any business              | `/login`                  |
| B   | [Household books a pickup](#b-household-books-a-pickup)                                                                   | Household                 | `/sell`                   |
| C   | [Household follows a pickup](#c-household-follows-a-pickup)                                                               | Household                 | `/t/priyademo1`           |
| D   | [Kabadiwala accepts and declines requests](#d-kabadiwala-accepts-and-declines-requests)                                   | Kabadiwala                | `/app/requests`           |
| E   | [Kabadiwala starts the trip, weighs and pays](#e-kabadiwala-starts-the-trip-weighs-and-pays)                              | Kabadiwala                | `/app/requests`           |
| F   | [Kabadiwala changes prices](#f-kabadiwala-changes-prices)                                                                 | Kabadiwala                | `/app/prices`             |
| G   | [Kabadiwala lists stock for yards](#g-kabadiwala-lists-stock-for-yards)                                                   | Kabadiwala                | `/app/stock`, `/app/sell` |
| H   | [Preprocessor trade, payment checks and delivery](#h-preprocessor-trade-payment-checks-and-delivery)                      | Yard and kabadiwala       | `/app/market`             |
| I   | [Recycler dispatches and buys](#i-recycler-dispatches-and-buys)                                                           | Recycler and yard         | `/app/trades`             |
| J   | [Manufacturer orders recycled flakes and confirms delivery](#j-manufacturer-orders-recycled-flakes-and-confirms-delivery) | Manufacturer and recycler | `/app/market`             |
| K   | [Manufacturer checks compliance and EPR](#k-manufacturer-checks-compliance-and-epr)                                       | Manufacturer              | `/app/compliance`         |
| L   | [Saathi takes and finishes a job](#l-saathi-takes-and-finishes-a-job)                                                     | Saathi                    | `/app`                    |
| M   | [A new applicant joins](#m-a-new-applicant-joins)                                                                         | New applicant             | `/login`, then `/join`    |
| N   | [Admin reviews applications](#n-admin-reviews-applications)                                                               | Admin                     | `/admin/verification`     |
| O   | [Admin edits prices](#o-admin-edits-prices)                                                                               | Admin                     | `/admin/prices`           |
| P   | [Admin answers support](#p-admin-answers-support)                                                                         | Admin                     | `/admin/support`          |
| Q   | [Public pages: prices and standards](#q-public-pages-prices-and-standards)                                                | Anyone                    | `/prices`, `/standards`   |
| R   | [Solar calculator and call back](#r-solar-calculator-and-call-back)                                                       | Anyone                    | `/solar`                  |
| S   | [Help centre and contact](#s-help-centre-and-contact)                                                                     | Anyone                    | `/help`                   |
| T   | [Languages: Kannada, Hindi and Urdu](#t-languages-kannada-hindi-and-urdu)                                                 | Anyone                    | `/kn`, `/hi`, `/ur`       |
| U   | [Access and privacy](#u-access-and-privacy)                                                                               | Several                   | Various                   |
| Z   | [Local fixture cleanup](#z-local-fixture-cleanup)                                                                         | A developer               | A terminal                |

### A. Sign in with a demo login

**Who:** the kabadiwala, SHOP-A; every business login works the same
way. **Start:** `/login`, in a new private window.

| #   | Do this                                                                                  | You should see                                                                                              |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A1  | Open `/login`                                                                            | **Choose your language**: all 33 languages, each in its own script, with ಕನ್ನಡ, हिन्दी and English first    |
| A2  | Select English, continue and choose a supported sign-in method                           | Current email/password and phone controls are labelled; no session exists before verification               |
| A3  | Type `12345` and tap **Send code**                                                       | "Enter a 10-digit Indian mobile number." under the field                                                    |
| A4  | Enter the synthetic SHOP-A phone from the private local fixture record; request code     | A local-only challenge is available through the approved private mechanism; no SMS leaves the machine       |
| A5  | Enter an invalid local challenge                                                         | Clear validation error; no session; server rate limits apply                                                |
| A6  | Complete the valid local challenge and any required second factor                        | SHOP-A session opens its permitted current workspace; reload preserves it; this does not prove SMS delivery |
| A7  | Sign out: **Sign out** at the foot of the sidebar, or **⋯** then **Sign out** on a phone | Back at `/login`, which doesn't ask for the language again                                                  |
| A8  | Signed out, open `/app/requests`                                                         | Sent to `/login`; after signing in you're back in the app                                                   |

### B. Household books a pickup

**Who:** a household, with a verified local account or signup during booking (HH-A). **Start:** `/sell`, at phone width.

| #   | Do this                                                                                  | You should see                                                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Open `/sell`                                                                             | Current scrap flow and sample-price labels; protected actions require a verified account                                                                                                                                                                                                                                          |
| B2  | Under **What do you have?**, tap Newspaper and PET bottles, and set about 10 kg and 2 kg | Each line says about what it's worth; **Worth about** adds them up, with the recycle points it would earn                                                                                                                                                                                                                         |
| B3  | Tap **Find buyers**                                                                      | **Who buys it?**: each shop's offer for your scrap from its own prices, marked **Verified**, with its hours and **Picks up** or **Drop-off only**. Ramesh Kabadi Store offers **₹187**: ₹14.50 a kg for newspaper and ₹21 for PET bottles. **Use my location** puts the nearest first; without it, shops are sorted by best price |
| B4  | Keep **Pickup from home**, choose **Ramesh Kabadi Store** and tap **Choose a time**      | **When should they come?**: Today or Tomorrow, then Morning, Afternoon or Evening, your pickup address and your name                                                                                                                                                                                                              |
| B5  | Review basket, shop, time and address before booking                                     | Current quote and ownership confirmation are clear; no booking claimed before the mutation succeeds                                                                                                                                                                                                                               |
| B6  | Start HH-A verification with invalid proof, or use a wrong-account session               | No booking from invalid proof; private ownership checks apply                                                                                                                                                                                                                                                                     |
| B7  | Complete valid local verification and book                                               | One owned booking, its current tracking route and actual status; no external SMS or email                                                                                                                                                                                                                                         |
| B8  | In a private window, sign in as the kabadiwala (SHOP-A) and open **Requests**            | Your booking under **New**, with its materials, kilograms, day and time, and "You'll see the full address and phone number once you accept."                                                                                                                                                                                      |
| B9  | As HH-A cancel an eligible booking; repeat as another account                            | Only the owner can cancel before the allowed cutoff; other account denied; tracking token alone grants nothing                                                                                                                                                                                                                    |

### C. Household follows a pickup

**Who:** HH-A, the synthetic household. The token may open its designed public
tracking view. Cancellation and other protected actions require the owner session.
**Start:** `/t/priyademo1`.

| #   | Do this                                                                                                                        | You should see                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Open `/t/priyademo1`                                                                                                           | "Waiting for Ramesh Kabadi Store to accept": a pickup today in the evening; **Your shop**, Ramesh Kabadi Store, **Verified**, with **Call**; about 12 kg of newspaper and 3 kg of PET bottles; "You'll get about ₹237" and about +23 recycle points after weighing |
| C2  | Keep it open. In another window, as the kabadiwala, accept Priya's request ([D2](#d-kabadiwala-accepts-and-declines-requests)) | Without a refresh: "Ramesh Kabadi Store accepted your pickup"                                                                                                                                                                                                      |
| C3  | Open `/t/priyademo2`                                                                                                           | "Done! You got **₹314.28**", paid by UPI 9 days ago: 17.5 kg of newspaper at ₹14.50/kg and 5.8 kg of cardboard boxes at ₹10.50/kg; the estimate was ₹324; **+31 recycle points** (one for every ₹10); the history from booked to weighed and paid                  |
| C4  | Open `/t/nosuchcode`                                                                                                           | "We couldn't find this booking", with nothing about anyone                                                                                                                                                                                                         |
| C5  | Open `/kn/t/priyademo1`                                                                                                        | The same pickup in Kannada, material names included                                                                                                                                                                                                                |

### D. Kabadiwala accepts and declines requests

**Who:** the kabadiwala, SHOP-A. **Start:** `/app/requests`, at
phone width.

| #   | Do this                                                    | You should see                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Open **Requests**                                          | Three tabs: **New**, **Today** and **Done**. Under New: **Priya**, today evening, 12 kg of newspaper and 3 kg of PET bottles, about ₹237; **Arjun**, tomorrow morning, 8 kg of cardboard boxes and 15 kg of iron and steel, about ₹526.50. Only the area shows, no numbers |
| D2  | On Priya's request, tap **Accept**                         | "Accepted. You can now see the address and phone number." She moves to **Today**, with **Call** and **Directions** to Flat 4B, Rose Apartments, Yeshwanthpur. `/t/priyademo1` says accepted                                                                                |
| D3  | On Arjun's request, tap **Decline**, then **Yes, decline** | "Request declined." It moves to **Done**; his number and address were never shown                                                                                                                                                                                          |
| D4  | Open **Home**                                              | "Namaste", with the new requests, today's pickups, money paid today and over the last 7 days, the stock's worth, and a price check against the market                                                                                                                      |

### E. Kabadiwala starts the trip, weighs and pays

**Who:** the kabadiwala, SHOP-A. **Start:** `/app/requests`, the
**Today** tab.

| #   | Do this                                                             | You should see                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Open the **Today** tab                                              | Today's accepted pickups, each with **Weigh and pay**: **Meena** (accepted, afternoon, 20 kg of newspaper, about ₹290, with **Start trip** too), **Rahul** (on the way, morning, 4 kg of small electronics and 2 kg of aluminium cans, about ₹357), and Priya if you accepted her in D |
| E2  | On Meena's, tap **Start trip**                                      | "The household can see you're on the way." Her pickup is **On the way**, and so is her tracking page                                                                                                                                                                                   |
| E3  | On Rahul's, tap **Weigh and pay**                                   | His pickup page at **Weigh and pay**: a row per material with the booking's guess, **−** and **+** in half kilos, and Ramesh's price: small electronics ₹31.50/kg, aluminium cans ₹115.50/kg                                                                                           |
| E4  | Set small electronics to 3.5 kg and leave aluminium cans at 2 kg    | **To pay** follows: ₹110.25 + ₹231 = **₹341.25**                                                                                                                                                                                                                                       |
| E5  | Under **Paid by** choose **UPI**, then tap **Confirm ₹341.25 paid** | "Paid ₹341.25" with each line, UPI and the time; 34 recycle points for Rahul; "Added to your stock." The pickup moves to **Done**                                                                                                                                                      |
| E6  | Open **Stock**                                                      | Aluminium cans went from 12 kg to 14 kg, and small electronics shows 3.5 kg                                                                                                                                                                                                            |

### F. Kabadiwala changes prices

**Who:** the kabadiwala, SHOP-A. **Start:** `/app/prices`
(**My prices**).

| #   | Do this                              | You should see                                                                                                                                                                                                    |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Open **My prices**                   | "What you pay households per kg. Never below the minimum." Every paper, plastic, metal and e-waste material he buys, each with its **Minimum** and the **Market** price. Newspaper is **₹14.50** (minimum ₹12/kg) |
| F2  | Set newspaper to 16 and tap **Save** | "Newspaper: ₹16/kg saved."                                                                                                                                                                                        |
| F3  | Set it to 10 and tap **Save**        | "Too low. The minimum is ₹12/kg." It stays ₹16                                                                                                                                                                    |
| F4  | Set it back to 14.50 and save        | Saved                                                                                                                                                                                                             |

### G. Kabadiwala lists stock for yards

**Who:** the kabadiwala, SHOP-A. **Start:** `/app/stock`.

| #   | Do this                                                                                   | You should see                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Open **Stock**                                                                            | "What you have now, and what it's worth today": newspaper 180 kg, cardboard boxes 300 kg, PET bottles 42 kg, iron and steel 260 kg and aluminium cans 12 kg, plus what E added, with the total weight and **Worth today** |
| G2  | Tap **Sell to a yard** (or open **Sell**)                                                 | "Offer your sorted stock to yards." **On sale now**: newspaper, 150 kg at ₹17.50/kg ("Dry, bundled"), and iron and steel, 250 kg at ₹33.50/kg                                                                             |
| G3  | Under **New listing**, choose cardboard boxes, 80 kg at ₹13 a kg, and tap **Put on sale** | "On sale." It joins **On sale now**, and the yard sees it under **Buy**                                                                                                                                                   |
| G4  | Try another 500 kg of cardboard boxes                                                     | "You have … free to sell." Nothing is listed                                                                                                                                                                              |
| G5  | Withdraw the cardboard lot from G3: **Withdraw**, then **Yes, withdraw**                  | "Cardboard boxes taken off the market." Yards no longer see it                                                                                                                                                            |
| G6  | Open Trades and Selling with current local fixtures                                       | Unpaid and historical unverified records are labelled correctly; no claim that money is safe or held                                                                                                                      |
| G7  | Try dispatch without verified gateway payment                                             | Dispatch is blocked; stock and receipt remain unchanged. Later gateway dispatch stays BLOCKED in the run log                                                                                                              |

### H. Preprocessor trade, payment checks and delivery

**Who:** the yard, YARD-A (Peenya Paper & Plastic Yard), with the
kabadiwala in a second window. **Start:** `/app/market` (**Buy**).

| #   | Do this                                                                                          | You should see                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Open Buy as the preprocessor and filter by material                                              | Eligible offers follow current approval/material rules; historical sample prices are not live quotes; no fixed next-role-only restriction |
| H2  | Request 100 kg at the synthetic ₹17.50/kg rate                                                   | Exact 175,000 paise total; permitted request is recorded; gateway unavailable is clear                                                    |
| H3  | Open **Trades**, then **Buying**                                                                 | The newspaper at **Requested**: "Waiting for Ramesh Kabadi Store to accept."                                                              |
| H4  | As the kabadiwala, in **Trades** → **Selling**, tap **Accept order**                             | "Order accepted"                                                                                                                          |
| H5  | Attempt B2B payment with gateway unavailable; try a manual reference or old simulated-pay action | All payment completion paths stay blocked; no paid receipt, stock movement or money-held claim                                            |
| H6  | As seller attempt dispatch without verified gateway payment                                      | Denied by server; stock unchanged. Retain verified-gateway dispatch as a later provider case                                              |
| H7  | As buyer attempt payment-dependent completion without verified gateway payment                   | Denied without false delivery, settlement or stock credit. Later verified-gateway completion remains BLOCKED                              |
| H8  | Open Selling and inspect the historical 2,000 kg PET example if present                          | Historical states remain unverified; current values come from records. Transport guidance is not legal clearance                          |
| H9  | Back in **Buying**, find the PET bottles from Sri Lakshmi Scrap (90 kg, ₹2,340)                  | Still **Requested**: its seller has no demo login                                                                                         |
| H10 | Try a counterparty-only action through UI and direct request                                     | Server checks current workspace capability and trade party; changing a URL grants no permission                                           |
| H11 | Open Home                                                                                        | Recorded quotes, requests and totals; no simulated escrow balance or unverified payment claim                                             |

### I. Recycler dispatches and buys

**Who:** the recycler, RECYCLER-A (GreenLoop Polymers), with the yard and
the manufacturer in other windows. **Start:** `/app/trades`.

| #   | Do this                                                                                          | You should see                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Open Trades and Selling for the synthetic 5,000 kg PET offer                                     | Exact quote at ₹65/kg is 32,500,000 paise; no funds-held claim; transport note is only guidance                                                                                                                                                                                         |
| I2  | Try dispatch before a verified gateway event                                                     | Blocked with stock unchanged; record later successful dispatch/replay case as BLOCKED                                                                                                                                                                                                   |
| I3  | Try completion on an isolated historical dispatched fixture with no gateway proof                | Historical state cannot authorize completion or release funds; no stock credit or paid receipt                                                                                                                                                                                          |
| I4  | Open Buy and filter permitted material                                                           | Offers follow approval and material eligibility; no next-role-only assumption or invented stock                                                                                                                                                                                         |
| I5  | Request 500 kg at synthetic ₹38/kg; accept where permitted; attempt pay, dispatch and completion | Exact quote is 1,900,000 paise; pre-payment steps agree across actors; gateway-dependent steps stay blocked; later full provider sequence retained                                                                                                                                      |
| I6  | Open **Compliance** (under **⋯** on a phone)                                                     | A **Checklist** (GST registration, pollution board consent, a stamped scale, a safety kit); the consent KSPCB/CFO/2025/2210, valid until 31 Mar 2028, with the days left; **Trade receipts**; and the **EPR record** for this financial year, with the plastic it received and recycled |

### J. Manufacturer orders recycled flakes and confirms delivery

**Who:** the manufacturer, MAKER-A (Deccan Packaging Pvt Ltd), with
the recycler in another window. **Start:** `/app/market` (**Buy**).

| #   | Do this                                                                                                 | You should see                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Open Buy and inspect eligible output offers                                                             | Current material-approved suppliers only; old sample quality labels do not prove food-grade or legal approval                                                   |
| J2  | On the PET flakes tap **Buy**, enter 500 kg and tap **Send request**                                    | Total ₹32,500, then "Request sent to GreenLoop Polymers"                                                                                                        |
| J3  | As the recycler, tap **Accept order**                                                                   | "Order accepted"                                                                                                                                                |
| J4  | Attempt payment and dispatch for the synthetic 500 kg PET trade with gateway unavailable                | Both remain blocked; 3,250,000 paise quote is not payment; no manual paid flag may unlock dispatch                                                              |
| J5  | Attempt completion on unpaid or historical unverified PET trades                                        | Blocked without stock change or settlement claim; verified-gateway delivery is a later provider case                                                            |
| J6  | Inspect transport guidance on a synthetic ₹65,000 quote                                                 | Current guidance is visible but is not legal clearance; verify applicable requirements outside this historical example                                          |
| J7  | Try a paid receipt for an unpaid/unverified trade; retain later gateway-backed print test               | No paid receipt without verified payment; later receipt must use exact values, one stable number and party permissions; printing alone is not a GST tax invoice |
| J8  | In **Trades** → **Buying**, find the recycled kraft paper from Bidadi Recycling Works (10 t, ₹3,80,000) | **Requested**: its seller has no demo login                                                                                                                     |

### K. Manufacturer checks compliance and EPR

**Who:** the manufacturer, MAKER-A. **Start:** `/app/compliance`.

| #   | Do this                                      | You should see                                                                                                                                                                                                   |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | Open **Compliance**                          | "Your licences and records in one place", a sample-data note, and a **Checklist**: GST registration (GSTIN 29AADCD9900P1Z6), the pollution board consent (KSPCB/CFO/2024/3301), a stamped scale and a safety kit |
| K2  | Look at **Consent validity**                 | Valid until 31 Mar 2029, the days left, and the reminder date, 90 days before it runs out                                                                                                                        |
| K3  | Inspect trade records and receipt access     | Unpaid/unverified trades cannot claim gateway payment; historical fixtures are labelled; only authorised parties read private records                                                                            |
| K4  | Inspect the financial-year material evidence | Totals use supported accepted records and clear provenance; no Luma-issued EPR certificate or gateway payment implied                                                                                            |
| K5  | Open **Impact**                              | "Your impact": recycled material bought and the CO₂e it avoided (from indicative factors), what was spent, and each material's share                                                                             |

### L. Saathi takes and finishes a job

**Who:** the Saathi, WORKER-A (Lakshmi Devi: home pickups and yard
sorting, within 5 km of Yeshwanthpur). **Start:** `/app`, at phone width.

| #   | Do this                                                                   | You should see                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Open **Home**                                                             | "Hello, Lakshmi…", **Earned this week**, **Your jobs today** (Home pickups, 4 houses: Mathikere, morning, ₹350) and **Open jobs**, those in her area first, such as **Home pickups, 6 houses** (Yeshwanthpur, today evening, ₹450, for Ramesh Kabadi Store) and **Sorting shift: paper and PET** (Peenya, tomorrow morning, ₹700) |
| L2  | On **Home pickups, 6 houses**, tap **Take this job**                      | "Job taken. It's on your list now." It's no longer open to other Saathis                                                                                                                                                                                                                                                          |
| L3  | Take **Sorting shift: paper and PET** too                                 | It waits under **Coming up**: "You can mark it done on the day."                                                                                                                                                                                                                                                                  |
| L4  | On **Home pickups, 4 houses**, tap **Mark done**, then **Yes, it's done** | "Well done! ₹350 added to your earnings."                                                                                                                                                                                                                                                                                         |
| L5  | Open **Earnings**                                                         | "Your earnings": ₹1,450 earned so far from 3 jobs (₹700, ₹400 and ₹350), by kind of work                                                                                                                                                                                                                                          |

### M. A new applicant joins

**Who:** the new applicant, APPLICANT-A, and the two waiting applicants.
**Start:** `/login`.

Use a different scoped local applicant for each kind. Do not reset other
accounts or the whole deployment between roles.

**Every role**

| #   | Do this                                                                 | You should see                                                                                                                                                               |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Sign in as a fresh local applicant; inspect current participant choices | Account identity is separate from organisation approval; test all launch-plan kinds; missing workflows remain BLOCKED                                                        |
| M2  | Choose **Kabadiwala**                                                   | **Before you start**: what's collected and why, and who can see it. **Start my application** needs both boxes ticked: 18 or older, and read what's collected                 |
| M3  | Tick both and start                                                     | The shop form: your name, shop name, GST number (optional), shop address with **Use my location**, home pickups and vehicle, other numbers, opening hours and weekly holiday |
| M4  | Tap **Send for verification** with the form empty                       | "Some answers need a look. They're marked below." Each missing answer is marked                                                                                              |
| M5  | Fill it in and pause                                                    | **Saved**: it keeps a draft as you type                                                                                                                                      |
| M6  | Close the window, then sign in again                                    | Your answers are still there                                                                                                                                                 |
| M7  | Tap **Send for verification**                                           | **Under review**, usually within 12–24 hours, with what we check                                                                                                             |
| M8  | Open `/app`                                                             | Sent back to `/join/status`: nothing opens before approval                                                                                                                   |

**Preprocessor, recycler or manufacturer** (separate local applicants)

| #   | Do this                                                                                                | You should see                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M9  | Sign in as APPLICANT-A, choose **Yard** (or recycler, or manufacturer), tick and start                 | Step 1, business details: name, GST number, materials handled (at least one), address and location tags, whether you collect from suppliers, other numbers, hours and weekly holiday |
| M10 | Fill it in and tap **Next: documents**                                                                 | Step 2: the issuing board (KSPCB, or another state's board), consent number, valid until, the certificate as a PDF, machine photos or videos, and a declaration                      |
| M11 | Upload a text file renamed to `.pdf` as the certificate                                                | Refused: the file isn't really a PDF                                                                                                                                                 |
| M12 | Upload a real PDF (up to 10 MB) and two photos, tick the declaration and tap **Send for verification** | **Under review**                                                                                                                                                                     |

**Saathi** (a separate local applicant)

| #   | Do this                                                       | You should see                                                                                                                 |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| M13 | Sign in as APPLICANT-A, choose **Saathi**, tick and start     | Your name, area and travel radius (2, 5 or 10 km), the work you want, your vehicle, when you can work, a photo ID and a selfie |
| M14 | Upload only synthetic watermarked identity samples and submit | Valid owned files can submit; no real ID or contact data is included in evidence                                               |

**The waiting applicants**

| #   | Do this                   | You should see                                                                |
| --- | ------------------------- | ----------------------------------------------------------------------------- |
| M15 | Sign in as APPLICANT-YARD | Mohammed Irfan's application for **Irfan Metal & Plastic Yard**, under review |
| M16 | Sign in as APPLICANT-SHOP | Kavitha S's application for **Kavitha Raddi Shop**, under review              |

### N. Admin reviews applications

**Who:** the admin; ask the founder for the sign-in. **Start:**
`/admin/login`, on a desktop.

| #   | Do this                                                                                                                                                                    | You should see                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | Sign in with the email and password, then the 6-digit code from the authenticator app                                                                                      | The console at `/admin`, in English                                                                                                                                                                                                                             |
| N2  | Open **Verification**                                                                                                                                                      | The queue: **Irfan Metal & Plastic Yard** (yard, submitted 19 hours before the recorded test time, so **Due soon**) and **Kavitha Raddi Shop** (kabadiwala, 2 hours), plus anything sent in M. After 18 hours an application is due soon; after 24, **Overdue** |
| N3  | Open Irfan Metal & Plastic Yard                                                                                                                                            | GSTIN 29AAIFI3344R1Z1; metal and plastic; Survey 42, Hegde Nagar, tagged Hegde Nagar and Thanisandra; 09:00–19:00, closed Fridays; KSPCB consent KSPCB/CFO/2025/4410, valid until 31 Mar 2028; the certificate PDF and two machine photos, which open           |
| N4  | Try **Approve** before ticking anything                                                                                                                                    | It stays off: "Tick every check above to approve."                                                                                                                                                                                                              |
| N5  | Tick every item under **Before you approve** (the GSTIN on the GST portal, the consent on KSPCB's register, the photos, a call to the owner), then **Approve** and confirm | Approved, and it leaves the queue                                                                                                                                                                                                                               |
| N6  | As APPLICANT-YARD, open `/app`                                                                                                                                             | Irfan Metal & Plastic Yard's dashboard                                                                                                                                                                                                                          |
| N7  | Open Kavitha Raddi Shop, tap **Ask for changes**, and try to send a 3-letter note                                                                                          | Refused: the applicant reads the note, so it needs at least 5 characters                                                                                                                                                                                        |
| N8  | Write "Please add a landmark to your address" and tap **Send back for changes**                                                                                            | "Sent back to … with your note."                                                                                                                                                                                                                                |
| N9  | As APPLICANT-SHOP, open `/join/status`, fix the address and resubmit                                                                                                       | The note and a way to fix and resubmit; then under review again                                                                                                                                                                                                 |
| N10 | Back in the queue, open Kavitha's application                                                                                                                              | Version 2, showing what changed                                                                                                                                                                                                                                 |
| N11 | Tap **Reject**, write why, and tap **Reject application**                                                                                                                  | Rejected. As APPLICANT-SHOP, `/join/status` shows the reason and how to reach us                                                                                                                                                                                |

### O. Admin edits prices

**Who:** the admin. **Start:** `/admin/prices`.

| #   | Do this                                                          | You should see                                                                                            |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| O1  | Open **Prices**                                                  | Bengaluru's **minimum** (the floor) and **fallback** price a kg for every material: newspaper ₹12 and ₹14 |
| O2  | Raise newspaper's minimum to ₹13 and save                        | Saved                                                                                                     |
| O3  | Open `/prices`                                                   | Newspaper's floor is ₹13                                                                                  |
| O4  | As the kabadiwala, open **My prices** and set newspaper to 12.50 | "Too low. The minimum is ₹13/kg."                                                                         |
| O5  | Put newspaper's minimum back to ₹12                              | Saved                                                                                                     |

### P. Admin answers support

**Who:** the admin. **Start:** `/admin/support`.

| #   | Do this                                             | You should see                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Open **Support**                                    | Open messages, newest first, each with a name, number, role, topic and message: **Manjunath** (kabadiwala, prices: "How do I change my price for cardboard?") and **Sunita** (household, solar: a 1,200 sq ft terrace in Jayanagar), plus any sent in R and S |
| P2  | Call Manjunath back, then mark his message answered | It moves out of the open messages                                                                                                                                                                                                                             |

### Q. Public pages: prices and standards

**Who:** anyone, signed out. **Start:** `/prices`.

| #   | Do this                                                   | You should see                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Open `/prices`                                            | **Today's scrap prices** in Bengaluru: every material by family, with today's price a kilo, the change this week and over 30 days, and the **Floor**; then **Factory gate** prices for recycled material. A note says the prices are samples |
| Q2  | Tap a material, such as newspaper                         | Its 30-day chart with the low, the high and the floor; **Show the numbers** gives the same as a table                                                                                                                                        |
| Q3  | Open `/standards`                                         | Current material/quality/weighing guidance; no live escrow promise, invented certificate or payment proof                                                                                                                                    |
| Q4  | Tap **Download the codes (CSV)**                          | A CSV file of the material codes                                                                                                                                                                                                             |
| Q5  | Open `/`, `/how-it-works`, `/participants` and `/contact` | Each loads with the site's header and footer, and links to the others work                                                                                                                                                                   |

### R. Solar calculator and call back

**Who:** anyone. **Start:** `/solar`.

| #   | Do this                                                                               | You should see                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Open `/solar`                                                                         | **Rooftop solar for your home or business**, for Karnataka                                                                                                                                                             |
| R2  | Choose **My home** and enter a monthly bill of 3000                                   | **Your estimate**: the suggested system in kW, the cost before subsidy, the **PM Surya Ghar subsidy**, your cost, what you save a month and when it pays for itself, with a chart of savings by year. "Estimates only" |
| R3  | Switch to **My business**                                                             | "Not for businesses" where the subsidy was                                                                                                                                                                             |
| R4  | Enter 50 sq ft of shade-free roof                                                     | "Your roof looks too small"                                                                                                                                                                                            |
| R5  | Under **Talk to us**, send with the mobile number `12345`                             | "Enter a 10-digit Indian mobile number."                                                                                                                                                                               |
| R6  | Send it with a name and a 10-digit number; the message is filled in from the estimate | "Thank you, …" and "We've got your message and will call you soon." It reaches the admin's **Support**, under solar ([P](#p-admin-answers-support))                                                                    |

### S. Help centre and contact

**Who:** anyone; then a signed-in business. **Start:** `/help`.

| #   | Do this                                                                             | You should see                                                                                                                        |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Open `/help`                                                                        | **How can we help?**: a search, topics such as signing in, pickups, prices and payments, and **Help for you**, one card for each role |
| S2  | Search for payment help                                                             | Clear separation: kabadiwala pays household directly; B2B payment-dependent actions wait for verified gateway integration             |
| S3  | Open **Kabadiwalas**                                                                | `/help/kabadiwala`: step-by-step guides, common questions, videos and training                                                        |
| S4  | Open a guide                                                                        | `/help/kabadiwala/…`: its steps, related questions and the next guide                                                                 |
| S5  | In **Training**, tap **Mark as done** on a lesson, then reload                      | Still done: "Your progress is saved on this device."                                                                                  |
| S6  | Signed in as the kabadiwala, open **Help** from the app's menu                      | The same kabadiwala help                                                                                                              |
| S7  | Open **Write to us** (`/help/contact`) and send with a one-letter name              | Refused, with a message by the name                                                                                                   |
| S8  | Send it with a name, a 10-digit mobile number, who you are, the topic and a message | Sent. It reaches the admin's **Support** ([P](#p-admin-answers-support))                                                              |

### T. Languages: Kannada, Hindi and Urdu

**Who:** anyone, then the kabadiwala. **Start:** `/kn`.

Non-English copy is machine-drafted and waiting for native review, and the
newest screens may still be in English in other languages: note any English you
find.

| #   | Do this                                                                | You should see                                                                                                                                                             |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Open `/kn`                                                             | The home page in Kannada. Addresses keep English words: `/kn/sell`, not a Kannada path                                                                                     |
| T2  | Open `/kn/prices`                                                      | Material names in Kannada: newspaper is ದಿನಪತ್ರಿಕೆ (ರದ್ದಿ)                                                                                                                 |
| T3  | In a new private window, open `/login` and choose **ಕನ್ನಡ**            | The page reloads in Kannada at `/kn/login`. Sign in as the kabadiwala: the app is in Kannada                                                                               |
| T4  | In the app, switch to **हिन्दी** with the language switcher at the top | The same screen in Hindi, at `/hi/app/…`, with Hindi material names: newspaper is अख़बार (रद्दी)                                                                           |
| T5  | Open `/ur`, then `/ur/app`                                             | Urdu, right to left: text lines up on the right, the desktop sidebar moves to the right and arrows point the other way. Phone numbers and amounts still read left to right |
| T6  | Open `/ar/t/priyademo1`                                                | Priya's pickup in Arabic, right to left                                                                                                                                    |

### U. Access and privacy

**Who:** several logins. **Start:** wherever each step says.

| #   | Do this                                                                                              | You should see                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| U1  | Signed out, open `/app`                                                                              | Sent to `/login`                                                     |
| U2  | As a waiting applicant (APPLICANT-SHOP), open `/app`                                                 | Sent to `/join/status`                                               |
| U3  | As the kabadiwala, open a request he hasn't accepted                                                 | "You'll see the full address and phone number once you accept."      |
| U4  | As the manufacturer, open a trade receipt and copy its address. As the kabadiwala, open that address | Refused or not found: a business sees only its own trades            |
| U5  | Open `/t/` with a made-up 10-character code                                                          | "We couldn't find this booking", and nothing about anyone            |
| U6  | Signed out, open `/admin`                                                                            | Sent to `/admin/login`                                               |
| U7  | Signed in as a business, open `/admin`                                                               | A page saying this account isn't the admin; nothing from the console |

### Z. Local fixture cleanup

**Who:** engineer and test lead. **Target:** this run's isolated local backend.
The old whole-table reset and cloud demo seed commands are withdrawn. A dev flag
alone does not prove safe target selection. Preserve the cloud reset exports.

| #   | Do this                                                                        | You should see                                                                                         |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Z1  | Verify the exact local target and manifest; run only its tested scoped cleanup | Only this run's records removed; an unrelated local record survives; cloud target refused              |
| Z2  | Recreate needed fixtures through guarded local tools and supported auth flows  | New manifest and actual timestamps recorded; no assumption that old tracking URLs still exist          |
| Z3  | Revoke disposable sessions and expire/remove credentials when the run ends     | No reusable session remains; restricted annex updated; no password copied into Git or the shared guide |

## Screenshots

Use [the maintained guide capture procedure](../user-guide/README.md) and the
launch plan's real-role browser evidence rules. First verify the exact local
target, candidate, fixture manifest and account access. Inspect every capture
for secrets and correct provenance. Never capture passwords, challenge links,
TOTP keys, backup codes or customer records.

The old `pnpm screenshots` workflow and screen list below are historical. Audit
and update any hardcoded login or remote-origin assumptions before reusing it.
Do not run it against cloud deployments, add trusted cloud origins for it or
reset data to make its captures pass. No screenshot proves provider delivery.

| Name                       | Screen                                                                      | Signed in as     |
| -------------------------- | --------------------------------------------------------------------------- | ---------------- |
| `home`                     | Home, `/`                                                                   | Nobody           |
| `prices`                   | Prices, `/prices`                                                           | Nobody           |
| `sell`                     | Sell, `/sell`                                                               | Nobody           |
| `tracking`                 | Tracking, `/t/priyademo1`                                                   | Nobody           |
| `join`                     | Join, `/join`                                                               | Nobody           |
| `kabadiwala-home`          | Home, `/app`                                                                | The kabadiwala   |
| `kabadiwala-requests`      | Requests, `/app/requests`                                                   | The kabadiwala   |
| `kabadiwala-weigh-and-pay` | Weigh and pay: the first pickup on the Today tab, `/app/requests?tab=today` | The kabadiwala   |
| `kabadiwala-rate-card`     | My prices, `/app/prices`                                                    | The kabadiwala   |
| `yard-market`              | Buy, `/app/market`                                                          | The yard         |
| `yard-trades`              | Trades, `/app/trades`                                                       | The yard         |
| `recycler-home`            | Home, `/app`                                                                | The recycler     |
| `manufacturer-compliance`  | Compliance, `/app/compliance`                                               | The manufacturer |
| `saathi-home`              | Jobs, `/app`                                                                | The Saathi       |
| `help`                     | Help, `/help`                                                               | Nobody           |
| `solar`                    | Solar, `/solar`                                                             | Nobody           |
| `standards`                | Standards, `/standards`                                                     | Nobody           |

The historical list lives in [scripts/screenshot-plan.ts](../../scripts/screenshot-plan.ts).
Use the current guide manifests for maintained evidence; do not relabel older
captures as authenticated or current.

## Results

Copy this table for historical-case tracking, and use the current launch-plan
run log for sign-off. Every row starts NOT RUN; record BLOCKED when a required
workflow is unavailable. This table contains no executed test result.

| Flow | Tester | Date | Phone or desktop | Language | Result | Notes |
| ---- | ------ | ---- | ---------------- | -------- | ------ | ----- |
| A    |        |      |                  |          |        |       |
| B    |        |      |                  |          |        |       |
| C    |        |      |                  |          |        |       |
| D    |        |      |                  |          |        |       |
| E    |        |      |                  |          |        |       |
| F    |        |      |                  |          |        |       |
| G    |        |      |                  |          |        |       |
| H    |        |      |                  |          |        |       |
| I    |        |      |                  |          |        |       |
| J    |        |      |                  |          |        |       |
| K    |        |      |                  |          |        |       |
| L    |        |      |                  |          |        |       |
| M    |        |      |                  |          |        |       |
| N    |        |      |                  |          |        |       |
| O    |        |      |                  |          |        |       |
| P    |        |      |                  |          |        |       |
| Q    |        |      |                  |          |        |       |
| R    |        |      |                  |          |        |       |
| S    |        |      |                  |          |        |       |
| T    |        |      |                  |          |        |       |
| U    |        |      |                  |          |        |       |
| Z    |        |      |                  |          |        |       |
