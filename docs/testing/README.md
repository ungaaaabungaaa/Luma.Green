# Testing Luma.Green, A to Z

> **Status:** written 29 Sep 2026 for the investor prototype, against the demo
> data in [convex/lib/demo.ts](../../convex/lib/demo.ts). A pull request that
> changes a flow updates its section here.

Every flow in the prototype, step by step, with what you should see after each
step. It's for the founders, partners and testers: no code needed, except to
reset the data at the end. Every figure comes from the demo data, so these are
sample numbers, not market prices.

## Before you start

- **Where.** Use the address the team gives you, or `http://localhost:3000`
  when you run it yourself ([Run it locally](../../README.md#run-it-locally)).
  The URLs below are paths on that address: `/sell` means
  `http://localhost:3000/sell`.
- **Fresh data.** The demo world is dated from the moment it was seeded, so
  "today's" pickups are today only if it was seeded today. Start a session with
  a reset ([Z](#z-reset-the-demo-data)); the flows change the data, and a reset
  puts it all back.
- **Two windows.** Many flows have two sides: a yard buys, a kabadiwala
  accepts. Keep one login in a normal window and the other in a private window,
  side by side. Screens update by themselves, so there's no need to refresh.
- **Phone first.** Households, kabadiwalas and Saathis use phones: test their
  flows at phone width, on a phone or in the browser's device toolbar at
  390 px. Yards, recyclers, manufacturers and the admin also get a desktop
  layout.
- **Sample-data notes.** Screens with prices or impact figures say once that
  they're sample data. That's expected.

### Demo logins

Every demo number signs in with the code **123456**. They work only on the dev
deployment, and no SMS is ever sent to them. On production they're ordinary
numbers and 123456 opens nothing.

| Phone           | Role                 | Who                                                  | Starts with                                                                              |
| --------------- | -------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| +91 90000 00101 | Kabadiwala           | Ramesh Kumar, **Ramesh Kabadi Store**, Yeshwanthpur  | Two new pickup requests, one accepted, one on the way; a sale to a yard to dispatch      |
| +91 90000 00102 | Yard                 | Farida Begum, **Peenya Paper & Plastic Yard**        | A purchase paid into escrow; a sale on its way to a recycler                             |
| +91 90000 00103 | Recycler             | Suresh Reddy, **GreenLoop Polymers**, Bommasandra    | A sale of PET flakes paid into escrow, to dispatch; a delivery of PET bottles to confirm |
| +91 90000 00104 | Manufacturer         | Anita Rao, **Deccan Packaging Pvt Ltd**, Nelamangala | PET flakes paid into escrow; a kraft paper order waiting for its seller                  |
| +91 90000 00105 | Saathi               | **Lakshmi Devi**, Yeshwanthpur                       | Open jobs nearby, one job today, two done                                                |
| +91 90000 00106 | New applicant        | Nobody yet                                           | Nothing: join as any role                                                                |
| +91 90000 00107 | Yard applicant       | Mohammed Irfan, **Irfan Metal & Plastic Yard**       | An application waiting for the admin                                                     |
| +91 90000 00108 | Kabadiwala applicant | Kavitha S, **Kavitha Raddi Shop**                    | An application waiting for the admin                                                     |
| +91 90000 00109 | Household            | Priya Sharma                                         | Used at booking on `/sell`; her pickups are at `/t/priyademo1` and `/t/priyademo2`       |
| On request      | Admin                | The Luma.Green operator                              | `/admin/login` with email, password and an authenticator code: ask the founder           |

**Sign-in limit.** Sign-in takes 10 requests a minute from one address. If
"We couldn't send the code" appears after switching logins quickly, wait a
minute and try again.

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
| H   | [Yard buys, pays into escrow and confirms delivery](#h-yard-buys-pays-into-escrow-and-confirms-delivery)                  | Yard and kabadiwala       | `/app/market`             |
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
| Z   | [Reset the demo data](#z-reset-the-demo-data)                                                                             | A developer               | A terminal                |

### A. Sign in with a demo login

**Who:** the kabadiwala, +91 90000 00101; every business login works the same
way. **Start:** `/login`, in a new private window.

| #   | Do this                                                                                  | You should see                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Open `/login`                                                                            | **Choose your language**: all 12 languages, each in its own script, with ಕನ್ನಡ, हिन्दी and English first                                                                                                                                                     |
| A2  | Tap **English**                                                                          | **Log in with your mobile number**, with +91 fixed in front of the field                                                                                                                                                                                     |
| A3  | Type `12345` and tap **Send code**                                                       | "Enter a 10-digit Indian mobile number." under the field                                                                                                                                                                                                     |
| A4  | Type `90000 00101` and tap **Send code**                                                 | **Enter the 6-digit code**, sent to +91 90000 00101. No SMS arrives: it's a demo number                                                                                                                                                                      |
| A5  | Type `111111`                                                                            | "That code isn't right. Check the SMS and try again." The boxes empty and the cursor goes back to them                                                                                                                                                       |
| A6  | Type `123456`                                                                            | It signs in by itself on the sixth digit and opens `/app`, **Ramesh Kabadi Store**'s home. On a phone, a bottom bar with Home, Requests, Stock, My prices and Sell, and the rest under **⋯**. On a desktop, a sidebar with all of them under the shop's name |
| A7  | Sign out: **Sign out** at the foot of the sidebar, or **⋯** then **Sign out** on a phone | Back at `/login`, which doesn't ask for the language again                                                                                                                                                                                                   |
| A8  | Signed out, open `/app/requests`                                                         | Sent to `/login`; after signing in you're back in the app                                                                                                                                                                                                    |

### B. Household books a pickup

**Who:** a household, with no account; at the code step, Priya's number
+91 90000 00109. **Start:** `/sell`, at phone width.

| #   | Do this                                                                                                        | You should see                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Open `/sell`                                                                                                   | **Sell your scrap from home**, with no sign-in, in four steps: What, Who, When and Book. A note says the prices and shops are samples                                                                                                                                                                                             |
| B2  | Under **What do you have?**, tap Newspaper and PET bottles, and set about 10 kg and 2 kg                       | Each line says about what it's worth; **Worth about** adds them up, with the recycle points it would earn                                                                                                                                                                                                                         |
| B3  | Tap **Find buyers**                                                                                            | **Who buys it?**: each shop's offer for your scrap from its own prices, marked **Verified**, with its hours and **Picks up** or **Drop-off only**. Ramesh Kabadi Store offers **₹187**: ₹14.50 a kg for newspaper and ₹21 for PET bottles. **Use my location** puts the nearest first; without it, shops are sorted by best price |
| B4  | Keep **Pickup from home**, choose **Ramesh Kabadi Store** and tap **Choose a time**                            | **When should they come?**: Today or Tomorrow, then Morning, Afternoon or Evening, your pickup address and your name                                                                                                                                                                                                              |
| B5  | Fill it in and tap **Check and book**                                                                          | What, Who, When and Where to check, "You'll get about ₹187", and **Confirm your mobile number**                                                                                                                                                                                                                                   |
| B6  | Enter `90000 00109`, tap **Send code**, then type `000000`                                                     | "That code isn't right. Check the SMS and try again." Nothing is booked                                                                                                                                                                                                                                                           |
| B7  | Type `123456` and book                                                                                         | "Booked! Opening your booking…", then the tracking page at `/t/` and a 10-character code: "Waiting for Ramesh Kabadi Store to accept"                                                                                                                                                                                             |
| B8  | In a private window, sign in as the kabadiwala (+91 90000 00101) and open **Requests**                         | Your booking under **New**, with its materials, kilograms, day and time, and "You'll see the full address and phone number once you accept."                                                                                                                                                                                      |
| B9  | Back on the tracking page, tap **Cancel booking** and confirm, with your number and the code 123456 if it asks | The booking is cancelled, which is free until the shop is on the way, and it leaves the kabadiwala's **New** tab                                                                                                                                                                                                                  |

### C. Household follows a pickup

**Who:** Priya, the demo household. The link is the key: no sign-in.
**Start:** `/t/priyademo1`.

| #   | Do this                                                                                                                        | You should see                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Open `/t/priyademo1`                                                                                                           | "Waiting for Ramesh Kabadi Store to accept": a pickup today in the evening; **Your shop**, Ramesh Kabadi Store, **Verified**, with **Call**; about 12 kg of newspaper and 3 kg of PET bottles; "You'll get about ₹237" and about +23 recycle points after weighing |
| C2  | Keep it open. In another window, as the kabadiwala, accept Priya's request ([D2](#d-kabadiwala-accepts-and-declines-requests)) | Without a refresh: "Ramesh Kabadi Store accepted your pickup"                                                                                                                                                                                                      |
| C3  | Open `/t/priyademo2`                                                                                                           | "Done! You got **₹314.28**", paid by UPI 9 days ago: 17.5 kg of newspaper at ₹14.50/kg and 5.8 kg of cardboard boxes at ₹10.50/kg; the estimate was ₹324; **+31 recycle points** (one for every ₹10); the history from booked to weighed and paid                  |
| C4  | Open `/t/nosuchcode`                                                                                                           | "We couldn't find this booking", with nothing about anyone                                                                                                                                                                                                         |
| C5  | Open `/kn/t/priyademo1`                                                                                                        | The same pickup in Kannada, material names included                                                                                                                                                                                                                |

### D. Kabadiwala accepts and declines requests

**Who:** the kabadiwala, +91 90000 00101. **Start:** `/app/requests`, at
phone width.

| #   | Do this                                                    | You should see                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Open **Requests**                                          | Three tabs: **New**, **Today** and **Done**. Under New: **Priya**, today evening, 12 kg of newspaper and 3 kg of PET bottles, about ₹237; **Arjun**, tomorrow morning, 8 kg of cardboard boxes and 15 kg of iron and steel, about ₹526.50. Only the area shows, no numbers |
| D2  | On Priya's request, tap **Accept**                         | "Accepted. You can now see the address and phone number." She moves to **Today**, with **Call** and **Directions** to Flat 4B, Rose Apartments, Yeshwanthpur. `/t/priyademo1` says accepted                                                                                |
| D3  | On Arjun's request, tap **Decline**, then **Yes, decline** | "Request declined." It moves to **Done**; his number and address were never shown                                                                                                                                                                                          |
| D4  | Open **Home**                                              | "Namaste", with the new requests, today's pickups, money paid today and over the last 7 days, the stock's worth, and a price check against the market                                                                                                                      |

### E. Kabadiwala starts the trip, weighs and pays

**Who:** the kabadiwala, +91 90000 00101. **Start:** `/app/requests`, the
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

**Who:** the kabadiwala, +91 90000 00101. **Start:** `/app/prices`
(**My prices**).

| #   | Do this                              | You should see                                                                                                                                                                                                    |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Open **My prices**                   | "What you pay households per kg. Never below the minimum." Every paper, plastic, metal and e-waste material he buys, each with its **Minimum** and the **Market** price. Newspaper is **₹14.50** (minimum ₹12/kg) |
| F2  | Set newspaper to 16 and tap **Save** | "Newspaper: ₹16/kg saved."                                                                                                                                                                                        |
| F3  | Set it to 10 and tap **Save**        | "Too low. The minimum is ₹12/kg." It stays ₹16                                                                                                                                                                    |
| F4  | Set it back to 14.50 and save        | Saved                                                                                                                                                                                                             |

### G. Kabadiwala lists stock for yards

**Who:** the kabadiwala, +91 90000 00101. **Start:** `/app/stock`.

| #   | Do this                                                                                   | You should see                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Open **Stock**                                                                            | "What you have now, and what it's worth today": newspaper 180 kg, cardboard boxes 95 kg, PET bottles 42 kg, iron and steel 260 kg and aluminium cans 12 kg, plus what E added, with the total weight and **Worth today** |
| G2  | Tap **Sell to a yard** (or open **Sell**)                                                 | "Offer your sorted stock to yards." **On sale now**: newspaper, 150 kg at ₹17.50/kg ("Dry, bundled"), and iron and steel, 250 kg at ₹33.50/kg                                                                            |
| G3  | Under **New listing**, choose cardboard boxes, 80 kg at ₹13 a kg, and tap **Put on sale** | "On sale." It joins **On sale now**, and the yard sees it under **Buy**                                                                                                                                                  |
| G4  | Try another 500 kg of cardboard boxes                                                     | "You have … free to sell." Nothing is listed                                                                                                                                                                             |
| G5  | Withdraw the cardboard lot from G3: **Withdraw**, then **Yes, withdraw**                  | "Cardboard boxes taken off the market." Yards no longer see it                                                                                                                                                           |
| G6  | Open **Trades** (under **⋯** on a phone), then **Selling**                                | His sales to Peenya Paper & Plastic Yard: newspaper, 400 kg, ₹7,000, **Delivered**; cardboard boxes, 180 kg, ₹2,340, **In escrow**, with "The money is safe in escrow. Send the load, then mark it dispatched."          |
| G7  | Tap **Mark as dispatched** on the cardboard boxes                                         | "Marked as dispatched." The yard can now confirm delivery ([H7](#h-yard-buys-pays-into-escrow-and-confirms-delivery))                                                                                                    |

### H. Yard buys, pays into escrow and confirms delivery

**Who:** the yard, +91 90000 00102 (Peenya Paper & Plastic Yard), with the
kabadiwala in a second window. **Start:** `/app/market` (**Buy**).

| #   | Do this                                                                                         | You should see                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Open **Buy**                                                                                    | "Sorted scrap from kabadiwalas near you", and only theirs: Ramesh Kabadi Store's newspaper (150 kg at ₹17.50/kg) and iron and steel (250 kg at ₹33.50/kg); Sri Lakshmi Scrap's newspaper (110 kg at ₹17); Koramangala Scrap Traders' iron and steel (400 kg at ₹33); HSR Waste Buyers' cardboard boxes (200 kg at ₹13, "Flattened boxes"); Indiranagar Kabadi Point's PET bottles (75 kg at ₹26). A filter by material |
| H2  | On Ramesh's newspaper tap **Buy**, enter 100 kg and tap **Send request**                        | Total ₹1,750 (100 kg × ₹17.50/kg), then "Request sent to Ramesh Kabadi Store" and "You'll pay into escrow once they accept."                                                                                                                                                                                                                                                                                           |
| H3  | Open **Trades**, then **Buying**                                                                | The newspaper at **Requested**: "Waiting for Ramesh Kabadi Store to accept."                                                                                                                                                                                                                                                                                                                                           |
| H4  | As the kabadiwala, in **Trades** → **Selling**, tap **Accept order**                            | "Order accepted"                                                                                                                                                                                                                                                                                                                                                                                                       |
| H5  | As the yard, tap **Pay ₹1,750 into escrow**                                                     | "Paid into escrow. Receipt LG-…". The step is **In escrow**: "₹1,750 held in escrow". No real money moves                                                                                                                                                                                                                                                                                                              |
| H6  | As the kabadiwala, tap **Mark as dispatched**                                                   | "Marked as dispatched"                                                                                                                                                                                                                                                                                                                                                                                                 |
| H7  | As the yard, tap **Confirm delivery** on the newspaper, and on Ramesh's cardboard boxes from G7 | "Delivery confirmed. The money is released to the seller." Both are **Delivered**                                                                                                                                                                                                                                                                                                                                      |
| H8  | Open **Selling**                                                                                | The PET bottles to GreenLoop Polymers: 2,000 kg at ₹38/kg, ₹76,000, **Dispatched** and waiting for the recycler, with "Over ₹50,000: an e-way bill must travel with this load."                                                                                                                                                                                                                                        |
| H9  | Back in **Buying**, find the PET bottles from Sri Lakshmi Scrap (90 kg, ₹2,340)                 | Still **Requested**: its seller has no demo login                                                                                                                                                                                                                                                                                                                                                                      |
| H10 | Look for a button that isn't yours to press                                                     | There's none: the seller accepts and dispatches, the buyer pays and confirms                                                                                                                                                                                                                                                                                                                                           |
| H11 | Open **Home**                                                                                   | At a glance: what's in escrow, what's waiting for you, what's on sale and what's done this month                                                                                                                                                                                                                                                                                                                       |

### I. Recycler dispatches and buys

**Who:** the recycler, +91 90000 00103 (GreenLoop Polymers), with the yard and
the manufacturer in other windows. **Start:** `/app/trades`.

| #   | Do this                                                                                                                                                                                                     | You should see                                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Open **Trades**, then **Selling**                                                                                                                                                                           | Recycled PET flakes to Deccan Packaging Pvt Ltd: 5,000 kg at ₹65/kg, ₹325,000, **In escrow**, with the e-way bill note                                                                                                                                                                  |
| I2  | Tap **Mark as dispatched**                                                                                                                                                                                  | "Marked as dispatched." The manufacturer can now confirm delivery ([J5](#j-manufacturer-orders-recycled-flakes-and-confirms-delivery))                                                                                                                                                  |
| I3  | Open **Buying**: PET bottles from Peenya Paper & Plastic Yard, 2,000 kg, **Dispatched**. Tap **Confirm delivery**                                                                                           | "Delivery confirmed. The money is released to the seller."                                                                                                                                                                                                                              |
| I4  | Open **Buy**                                                                                                                                                                                                | Sorted, baled material from yards only: Peenya's cardboard boxes (5,000 kg at ₹18/kg, "Baled OCC, 500 kg bales") and PET bottles (1,200 kg at ₹38, "Sorted clear PET, baled"); Hebbal Metal Yard's iron and steel (3,000 kg at ₹42)                                                     |
| I5  | Buy 500 kg of Peenya's PET bottles (₹19,000). Then, as the yard, **Accept order**; as the recycler, **Pay ₹19,000 into escrow**; as the yard, **Mark as dispatched**; as the recycler, **Confirm delivery** | Requested, Accepted, In escrow, Dispatched and Delivered, the same on both sides                                                                                                                                                                                                        |
| I6  | Open **Compliance** (under **⋯** on a phone)                                                                                                                                                                | A **Checklist** (GST registration, pollution board consent, a stamped scale, a safety kit); the consent KSPCB/CFO/2025/2210, valid until 31 Mar 2028, with the days left; **Trade invoices**; and the **EPR record** for this financial year, with the plastic it received and recycled |

### J. Manufacturer orders recycled flakes and confirms delivery

**Who:** the manufacturer, +91 90000 00104 (Deccan Packaging Pvt Ltd), with
the recycler in another window. **Start:** `/app/market` (**Buy**).

| #   | Do this                                                                                                 | You should see                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Open **Buy**                                                                                            | Recycled material from recyclers only: GreenLoop Polymers' recycled PET flakes (8,000 kg at ₹65/kg, "Hot-washed flakes, food-grade trial lot") and recycled HDPE granules (3,500 kg at ₹70); Bidadi Recycling Works' recycled kraft paper (12 t at ₹38, "120 GSM kraft rolls") and recycled aluminium ingots (2,000 kg at ₹210) |
| J2  | On the PET flakes tap **Buy**, enter 500 kg and tap **Send request**                                    | Total ₹32,500, then "Request sent to GreenLoop Polymers"                                                                                                                                                                                                                                                                        |
| J3  | As the recycler, tap **Accept order**                                                                   | "Order accepted"                                                                                                                                                                                                                                                                                                                |
| J4  | As the manufacturer, tap **Pay ₹32,500 into escrow**; as the recycler, **Mark as dispatched**           | **In escrow**, then **Dispatched**                                                                                                                                                                                                                                                                                              |
| J5  | As the manufacturer, tap **Confirm delivery**, and again on the 5,000 kg of PET flakes dispatched in I2 | Both **Delivered**                                                                                                                                                                                                                                                                                                              |
| J6  | Start buying 1,000 kg of PET flakes (₹65,000)                                                           | Before you send it: "Over ₹50,000: an e-way bill must travel with this load."                                                                                                                                                                                                                                                   |
| J7  | Open **Compliance**, then **View invoice LG-26-0007** under **Trade invoices**                          | The invoice for the recycled HDPE granules: GreenLoop Polymers (GSTIN 29AAGCG4321L1Z8) to Deccan Packaging Pvt Ltd (GSTIN 29AADCD9900P1Z6), 2,500 kg at ₹70/kg, ₹175,000                                                                                                                                                        |
| J8  | In **Trades** → **Buying**, find the recycled kraft paper from Bidadi Recycling Works (10 t, ₹380,000)  | **Requested**: its seller has no demo login                                                                                                                                                                                                                                                                                     |

### K. Manufacturer checks compliance and EPR

**Who:** the manufacturer, +91 90000 00104. **Start:** `/app/compliance`.

| #   | Do this                                            | You should see                                                                                                                                                                                                   |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | Open **Compliance**                                | "Your licences and records in one place", a sample-data note, and a **Checklist**: GST registration (GSTIN 29AADCD9900P1Z6), the pollution board consent (KSPCB/CFO/2024/3301), a stamped scale and a safety kit |
| K2  | Look at **Consent validity**                       | Valid until 31 Mar 2029, the days left, and the reminder date, 90 days before it runs out                                                                                                                        |
| K3  | Look at **Trade invoices**                         | Its purchases, newest first: invoice number, date, seller, material, amount, and whether an e-way bill was needed                                                                                                |
| K4  | Look at the **EPR record** for this financial year | "Recycled material you bought this financial year (April to March)": plastic under the Plastic Waste Management Rules, 2016, starting from the 2,500 kg of recycled HDPE granules, plus anything delivered in J  |
| K5  | Open **Impact**                                    | "Your impact": recycled material bought and the CO₂e it avoided (from indicative factors), what was spent, and each material's share                                                                             |

### L. Saathi takes and finishes a job

**Who:** the Saathi, +91 90000 00105 (Lakshmi Devi: home pickups and yard
sorting, within 5 km of Yeshwanthpur). **Start:** `/app`, at phone width.

| #   | Do this                                                                   | You should see                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Open **Home**                                                             | "Hello, Lakshmi…", **Earned this week**, **Your jobs today** (Home pickups, 4 houses: Mathikere, morning, ₹350) and **Open jobs**, those in her area first, such as **Home pickups, 6 houses** (Yeshwanthpur, today evening, ₹450, for Ramesh Kabadi Store) and **Sorting shift: paper and PET** (Peenya, tomorrow morning, ₹700) |
| L2  | On **Home pickups, 6 houses**, tap **Take this job**                      | "Job taken. It's on your list now." It's no longer open to other Saathis                                                                                                                                                                                                                                                          |
| L3  | Take **Sorting shift: paper and PET** too                                 | It waits under **Coming up**: "You can mark it done on the day."                                                                                                                                                                                                                                                                  |
| L4  | On **Home pickups, 4 houses**, tap **Mark done**, then **Yes, it's done** | "Well done! ₹350 added to your earnings."                                                                                                                                                                                                                                                                                         |
| L5  | Open **Earnings**                                                         | "Your earnings": ₹1,450 earned so far from 3 jobs (₹700, ₹400 and ₹350), by kind of work                                                                                                                                                                                                                                          |

### M. A new applicant joins

**Who:** the new applicant, +91 90000 00106, and the two waiting applicants.
**Start:** `/login`.

+91 90000 00106 can hold one application at a time: reset the demo data
([Z](#z-reset-the-demo-data)) before trying the next role.

**Every role**

| #   | Do this                                                        | You should see                                                                                                                                                               |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Sign in as +91 90000 00106 ([A](#a-sign-in-with-a-demo-login)) | `/join/status` asks what you do: kabadiwala, yard, recycler, manufacturer or Saathi, each with what you'll need. Households are pointed to selling instead                   |
| M2  | Choose **Kabadiwala**                                          | **Before you start**: what's collected and why, and who can see it. **Start my application** needs both boxes ticked: 18 or older, and read what's collected                 |
| M3  | Tick both and start                                            | The shop form: your name, shop name, GST number (optional), shop address with **Use my location**, home pickups and vehicle, other numbers, opening hours and weekly holiday |
| M4  | Tap **Send for verification** with the form empty              | "Some answers need a look. They're marked below." Each missing answer is marked                                                                                              |
| M5  | Fill it in and pause                                           | **Saved**: it keeps a draft as you type                                                                                                                                      |
| M6  | Close the window, then sign in again                           | Your answers are still there                                                                                                                                                 |
| M7  | Tap **Send for verification**                                  | **Under review**, usually within 12–24 hours, with what we check                                                                                                             |
| M8  | Open `/app`                                                    | Sent back to `/join/status`: nothing opens before approval                                                                                                                   |

**Yard, recycler or manufacturer** (after a reset)

| #   | Do this                                                                                                | You should see                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M9  | Sign in as +91 90000 00106, choose **Yard** (or recycler, or manufacturer), tick and start             | Step 1, business details: name, GST number, materials handled (at least one), address and location tags, whether you collect from suppliers, other numbers, hours and weekly holiday |
| M10 | Fill it in and tap **Next: documents**                                                                 | Step 2: the issuing board (KSPCB, or another state's board), consent number, valid until, the certificate as a PDF, machine photos or videos, and a declaration                      |
| M11 | Upload a text file renamed to `.pdf` as the certificate                                                | Refused: the file isn't really a PDF                                                                                                                                                 |
| M12 | Upload a real PDF (up to 10 MB) and two photos, tick the declaration and tap **Send for verification** | **Under review**                                                                                                                                                                     |

**Saathi** (after a reset)

| #   | Do this                                                       | You should see                                                                                                                 |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| M13 | Sign in as +91 90000 00106, choose **Saathi**, tick and start | Your name, area and travel radius (2, 5 or 10 km), the work you want, your vehicle, when you can work, a photo ID and a selfie |
| M14 | Fill it in with any ID picture and a selfie, and send it      | **Under review**                                                                                                               |

**The waiting applicants**

| #   | Do this                    | You should see                                                                |
| --- | -------------------------- | ----------------------------------------------------------------------------- |
| M15 | Sign in as +91 90000 00107 | Mohammed Irfan's application for **Irfan Metal & Plastic Yard**, under review |
| M16 | Sign in as +91 90000 00108 | Kavitha S's application for **Kavitha Raddi Shop**, under review              |

### N. Admin reviews applications

**Who:** the admin; ask the founder for the sign-in. **Start:**
`/admin/login`, on a desktop.

| #   | Do this                                                                                                                                                                    | You should see                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | Sign in with the email and password, then the 6-digit code from the authenticator app                                                                                      | The console at `/admin`, in English                                                                                                                                                                                                                   |
| N2  | Open **Verification**                                                                                                                                                      | The queue: **Irfan Metal & Plastic Yard** (yard, sent 19 hours before the last reset, so **Due soon**) and **Kavitha Raddi Shop** (kabadiwala, 2 hours), plus anything sent in M. After 18 hours an application is due soon; after 24, **Overdue**    |
| N3  | Open Irfan Metal & Plastic Yard                                                                                                                                            | GSTIN 29AAIFI3344R1Z1; metal and plastic; Survey 42, Hegde Nagar, tagged Hegde Nagar and Thanisandra; 09:00–19:00, closed Fridays; KSPCB consent KSPCB/CFO/2025/4410, valid until 31 Mar 2028; the certificate PDF and two machine photos, which open |
| N4  | Try **Approve** before ticking anything                                                                                                                                    | It stays off: "Tick every check above to approve."                                                                                                                                                                                                    |
| N5  | Tick every item under **Before you approve** (the GSTIN on the GST portal, the consent on KSPCB's register, the photos, a call to the owner), then **Approve** and confirm | Approved, and it leaves the queue                                                                                                                                                                                                                     |
| N6  | As +91 90000 00107, open `/app`                                                                                                                                            | Irfan Metal & Plastic Yard's dashboard                                                                                                                                                                                                                |
| N7  | Open Kavitha Raddi Shop, tap **Ask for changes**, and try to send a 3-letter note                                                                                          | Refused: the applicant reads the note, so it needs at least 5 characters                                                                                                                                                                              |
| N8  | Write "Please add a landmark to your address" and tap **Send back for changes**                                                                                            | "Sent back to … with your note."                                                                                                                                                                                                                      |
| N9  | As +91 90000 00108, open `/join/status`, fix the address and resubmit                                                                                                      | The note and a way to fix and resubmit; then under review again                                                                                                                                                                                       |
| N10 | Back in the queue, open Kavitha's application                                                                                                                              | Version 2, showing what changed                                                                                                                                                                                                                       |
| N11 | Tap **Reject**, write why, and tap **Reject application**                                                                                                                  | Rejected. As +91 90000 00108, `/join/status` shows the reason and how to reach us                                                                                                                                                                     |

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
| Q3  | Open `/standards`                                         | **The Luma.Green standard**: one open code for every material, grading (dry, sorted, no contamination), fair weighing, receipts and chain of custody, verification, and escrow between businesses                                            |
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
| S2  | Search for "escrow"                                                                 | Answers about escrow, each marked as a guide or a question                                                                            |
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

| #   | Do this                                                                                         | You should see                                                       |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| U1  | Signed out, open `/app`                                                                         | Sent to `/login`                                                     |
| U2  | As a waiting applicant (+91 90000 00108), open `/app`                                           | Sent to `/join/status`                                               |
| U3  | As the kabadiwala, open a request he hasn't accepted                                            | "You'll see the full address and phone number once you accept."      |
| U4  | As the manufacturer, open an invoice and copy its address. As the kabadiwala, open that address | Refused or not found: a business sees only its own trades            |
| U5  | Open `/t/` with a made-up 10-character code                                                     | "We couldn't find this booking", and nothing about anyone            |
| U6  | Signed out, open `/admin`                                                                       | Sent to `/admin/login`                                               |
| U7  | Signed in as a business, open `/admin`                                                          | A page saying this account isn't the admin; nothing from the console |

### Z. Reset the demo data

**Who:** someone with access to the dev deployment on Convex, usually a
developer. **Start:** a terminal in the repository.

| #   | Do this                         | You should see                                                  |
| --- | ------------------------------- | --------------------------------------------------------------- |
| Z1  | Run `npx convex run demo:reset` | `{ "seeded": true }` after a few seconds                        |
| Z2  | Open `/t/priyademo1`            | Priya's pickup is waiting for the kabadiwala again, dated today |
| Z3  | Sign in as +91 90000 00106      | A new applicant again: any application from M is gone           |

A reset deletes the prototype's data (the material list and prices,
businesses and their stock, pickups, lots, trades, jobs, support messages, and
the demo logins' applications with their files) and seeds the demo world again.
Sign-ins survive, so nobody is signed out. It refuses to run wherever
`AUTH_DEV_MODE` isn't `true`, so production can't be reset by mistake.
`npx convex run demo:seed` fills an empty deployment, and does nothing if the
demo world is already there.

## Screenshots

`pnpm screenshots` takes the pictures in the README's "See it" gallery:
17 screens at phone (390 × 844) and desktop (1440 × 900) sizes, saved as
`docs/screenshots/<name>-phone.png` and `<name>-desktop.png`. It only opens
pages: it never accepts, pays or saves anything.

1. Reset the demo data ([Z](#z-reset-the-demo-data)), so the pictures show
   today.
2. Start the app on port 3100: `pnpm dev --port 3100`. If sign-in fails there,
   let the deployment trust the port:
   `npx convex env set EXTRA_TRUSTED_ORIGINS http://localhost:3100`.
3. Once per machine, install the browser: `pnpm exec playwright install chromium`.
4. Run `pnpm screenshots` in another terminal. It signs in once per demo login
   and skips the admin, whose sign-in needs an authenticator app. A screen that
   fails is logged and skipped; the run ends by listing what wasn't taken, with
   exit code 1.
5. Look through the pictures, then commit them.

Another address: `BASE_URL=https://… pnpm screenshots`. Some screens only:
`ONLY=yard-market,yard-trades pnpm screenshots`, with names from this list.

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

The list lives in [scripts/screenshot-plan.ts](../../scripts/screenshot-plan.ts);
a unit test fails if the README's gallery and the list drift apart.

## Results

Copy this table for each test session.

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
