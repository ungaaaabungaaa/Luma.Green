# Luma Green platform user guide

How to use the recycling platform and its admin console

Edition: 3 October 2026, recycling service redesign, account security, notifications, industry API and 33 languages. Source baseline: 732283d.

This edition includes the approved recycling design, collection steps and business layouts. It preserves the account security and industry API work from the current release branch. The capture manifests record the exact source hashes and test conditions.
Includes the UI detail pass, distinct work scenes and practical guides on the main public pages, plus safe account, recovery and business API examples.
Audience: households, kabadiwalas, yards, recyclers, manufacturers, Saathis and the platform owner.

![The current public homepage. Actual local browser capture; backend not connected.](screenshots/public-home.png)

This guide explains the current application. It does not claim that the service is live. The signed mobile and desktop releases, live account setup and provider checks remain launch tasks.

---

## 01 / Start here

Luma.Green records material collection and movement through the recycling chain. A household sells recyclable materials. A kabadiwala collects and sorts it. A yard buys and prepares bulk material. A recycler supplies recovered material. A manufacturer buys it. A Saathi takes local jobs.

### Read the screenshot labels

- Current local capture: an unchanged browser screenshot of the current app without a backend connection. Setup messages are real states, not errors added to the picture.
- Current configured local capture: the real app with test analytics keys. External browser requests are intercepted; no provider receives data.
- Current connected demo capture: the local app reads approved sample prices from the development backend. It proves that view can read the demo records, not production frontend deployment or verified market prices. No account is signed in and no record is changed.
- Synthetic documentation fixture: an unchanged browser screenshot of real application components supplied with sample records in a separate documentation server. It is not an authenticated session or proof of a working integration.

No screenshot is an AI-generated interface. Public pages contain generated decorative artwork, but the page screenshots themselves come from the browser. Text in the guide explains the controls; it does not paint controls over a screenshot.

### Explore the home page

The home page starts with Book a collection, View material prices and For businesses. The materials
section shows the main recyclable material groups. Each material row opens the collection entry page.
Choose your exact materials and quantities in the booking flow; the home page does not save a selection. The pickup section explains the steps and links to the first
pickup guide.

![Current materials section on the home page. This is an unchanged browser capture of the section.](screenshots/public-home-materials.png)

![Current pickup guide on the home page. Use the links to start a booking or read the household guide.](screenshots/public-home-pickup.png)

The shop section explains how a kabadiwala receives requests and records work.
Use its join link to start an application, or open the shop help page. The weighing
section explains how estimates become a final record. Payment takes place outside
the platform; the shop records the agreed amount after payment.

![Current shop section on the home page. Its links open application and help routes.](screenshots/public-home-shop.png)

![Current weighing and payment explanation. The illustration is context, not proof of a payment.](screenshots/public-home-payment.png)

The records section explains the information kept as materials move through the
chain. Read Standards for material codes and trading rules. The questions section
opens short answers and links to role-specific help. Reading these sections does
not create an account, submit an application or book a pickup.

![Current material records explanation on the home page.](screenshots/public-home-records.png)

![Current home page questions and help links.](screenshots/public-home-questions.png)

The moving material line names material groups; it is not a list of partners. Use its pause control to stop movement. Reduced-motion settings show the names without movement.

The testimonial section is labelled **Demo testimonials**. Its role-based quotes are sample content, not reviews from real customers.

![Clearly labelled demo testimonials. These quotes illustrate the layout and are not customer reviews.](screenshots/public-demo-testimonials.png)

### Three limits to remember

1. Household payments are recorded after cash or UPI payment outside the platform.
2. Business escrow and payment steps are demonstrations. No real funds are held or transferred.
3. EPR and impact records are supporting records, not issued certificates or verified carbon credits.

All paths in this guide are relative to the correct deployment address. Use the address supplied by the platform owner. This local design review uses http://localhost:3107. Protected component examples use a separate local fixture server and remain labelled. Capture manifests record the review origins. Do not assume a domain is live because it appears in source code.

---

## 02 / Choose your access

| User                         | Entry point        | What grants access                                 |
| ---------------------------- | ------------------ | -------------------------------------------------- |
| Visitor                      | /                  | No sign-in for public information                  |
| Household                    | /sell              | Confirm a phone number when booking                |
| Applicant                    | /join, then /login | Phone sign-in; application submission              |
| Kabadiwala                   | /app               | Approved shop application and phone sign-in        |
| Yard, recycler, manufacturer | /app               | Approved business application and phone sign-in    |
| Saathi                       | /app               | Approved Saathi application and phone sign-in      |
| Admin                        | /admin/login       | Configured admin email, password and authenticator |

An application awaiting review does not give operational access. Each business sees its own records. A link to another business's page does not grant permission. A household's contact details become available to the assigned shop after it accepts the booking.

### Before the owner opens the pilot

Connect the frontend to the intended Convex backend. Configure authentication. Enable the chosen SMS service only after its registration and templates are ready. Set actual prices and support contacts. Test the complete workflow with staging users. The end of this guide contains the owner checklist.

---

## 03 / Phone sign-in and languages

![Compact language selection in the disconnected local build. This screen remains available before SMS is configured.](screenshots/public-login.png)

1. Open /login. If the language chooser appears, use Search or scroll the list. Select a language, check the current choice below the list, then select Continue.
2. Enter your Indian mobile number. The form supplies the +91 country code.
3. When SMS is connected, request the code and enter the six digits from the message.
4. If an authenticator is on, complete that second check with its current code or an unused recovery code. Wait for the session to finish loading before opening a protected page.
5. Continue to your approved role or application status.

The language list uses each language's own name and its English name. Search
filters the list. Selecting a row sets the choice; Continue applies it and opens
phone entry. You can use the language control in the header later.

![First-run language picker at phone width in light mode. Search, the current choice and Continue remain visible around the scrolling list. Actual browser capture; no sign-in occurs.](screenshots/public-login-languages-phone.png)

![The same first-run language picker at phone width in dark mode. Actual browser capture; no backend connection or SMS is needed.](screenshots/public-login-languages-phone-dark.png)

If SMS is not configured, select Preview code screen after entering a valid mobile number. The next screen is labelled as a preview. You can inspect and enter the six code digits, but Verify and Resend are disabled. No SMS is sent, no account is created and no private page is opened. Use Change number to go back. The phone number stays in this browser tab, not in the address.

![The phone-entry screen at mobile width, with SMS unavailable. Actual browser capture.](screenshots/public-login-phone.png)

![The code-entry preview with a synthetic test phone number. Actual browser capture; no SMS was sent and no authentication occurred.](screenshots/public-login-otp-phone.png)

SMS codes expire after five minutes and allow five attempts. Wait 30 seconds before resending. Per-number limits also apply. Use the displayed retry control if delivery fails.

Phone sign-in is passwordless. See chapter 37 for authenticators, recovery codes and account settings. Sessions last up to 30 days. Sign in again after expiry, and sign out on shared devices. Your phone number identifies your account; language does not change your role.

The 33 languages are English, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Arabic, Assamese, Odia, Nepali, Sinhala, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Ukrainian, Turkish, Indonesian, Malay, Vietnamese, Thai, Japanese, Korean and Simplified Chinese. The language control shows the current language in its own script, for example English or العربية. On public pages and operational screens, phones and tablets keep it in the menu. Sign-in screens keep it in the header, as do wider desktop screens. Open the control to choose another language. On phones, the brand appears as its icon; the full name appears on wider screens. Arabic and Urdu use right-to-left layouts. The admin console is English-only. All translated catalogues have automated coverage checks; native-speaker review is still required before launch. Adding a language does not change the pilot region, Indian mobile-number requirement or rupee currency.

---

## 04 / Household: book a collection

![The current household entry page without a connected booking backend.](screenshots/public-sell.png)

The collection flow shows four progress labels: Materials, Partner, Time and Review. A filled circle marks the current step. A check marks a completed step. Material rows show their selection with a check; enter the estimated weight after you select a row. The household flow stays at /sell. Its address uses a step query parameter; there are no separate /sell/estimate or /sell/book pages.

1. Select the materials you have. Enter estimated quantities.
2. If photo estimates are enabled, take or select a photo. Check each suggested material and weight. Correct them before continuing. Manual entry remains available.
3. Choose a nearby shop. Compare its material prices and whether it offers pickup or drop-off.
4. Choose pickup or drop-off and the offered time. Supply the location and address required by the form.
5. Review the material list, estimate, shop and time.
6. Use Confirm and book with the SMS code. If protection is on, also complete the authenticator or recovery-code check. Successful full verification submits the booking automatically. If already signed in, use the booking button once.
7. Save the tracking link shown after booking.

The estimate is not the final payment. The shop records the actual weight and the agreed material rate at collection. A photo estimate does not set a price and is not a certified measurement. It accepts one optional photo. Keep faces, documents and number plates out of the image. The photo goes to the configured AI provider for the estimate; Luma.Green does not save it.

The draft is kept in this browser tab during the flow. A closed tab or reset can remove the draft. A submitted booking is a backend record. Do not treat a draft as a confirmed booking.

![Current household material rows with a synthetic three-material catalogue and sample prices. The isolated component has local draft state only; no booking is submitted.](screenshots/household-basket-phone.png)

![Current pickup and drop-off radio rows. This isolated control fixture does not show a live shop offer or a complete shop-selection screen.](screenshots/household-mode-phone.png)

![Current date and time rows with a fixed synthetic date and sample shop hours. Scroll for the remaining address fields. This component fixture does not reserve a pickup.](screenshots/household-when-phone.png)

---

## 05 / Household: track, cancel and receive payment

![Current household tracking components with synthetic booking data. No real pickup is shown.](screenshots/household-tracking.png)

Open the saved /t/[token] link to see the booking status. Treat this link as private; do not post it publicly.

1. Check whether the request is waiting, accepted, complete or closed.
2. When accepted, check the assigned shop and the recorded visit details.
3. Use the contact action when it is available. Contact the shop if the time or address needs clarification.
4. At collection, check each material and the scale reading with the collector.
5. Check the final total. Receive cash or confirm the UPI payment outside Luma.Green.
6. Review the receipt and keep the tracking link for your records.

Use Cancel only when the page offers it and while signed in as the original household. A tracking link alone does not permit cancellation. Cancellation is available only before the shop is on its way. If no shop accepts the request, the dispatch logic can expire or reassign it within its limits. A notification is optional; the tracking page is the record to check.

A completed receipt preserves its recorded weights and prices. A later price change does not rewrite it. If the record is wrong, contact support. Do not create a second booking solely to correct a completed receipt.

---

## 06 / Join as a business or Saathi

![Current public role selection. Choose the role that describes the work you do. Each role row includes an illustrative image; select the row to start the real application.](screenshots/public-join.png)

1. Open /join and read the role descriptions.
2. Choose Kabadiwala, Yard, Recycler, Manufacturer or Saathi.
3. Sign in with the phone number that will own the application.
4. Complete the role form. Use the location and contact details for the actual operation.
5. Upload the documents requested by that role.
6. Review the form and submit it for a person to check.
7. Open /join/status to follow the decision.

Forms use compact option rows. Radio controls choose one option; checkbox rows
allow more than one. Check the selected state before you continue.

Households do not need to join as a business. They use /sell.

Kabadiwala forms ask about the shop, area, opening hours and collection options. Bulk businesses use /join/yard, /join/recycler or /join/manufacturer and then the documents step. Saathis use /join/saathi with an identity document and selfie.

![Top of the current kabadiwala application at phone width with a synthetic draft. Scroll for the remaining fields. This isolated component capture does not prove sign-in, draft saving or submission.](screenshots/join-kabadiwala-phone.png)

![Top of the current yard application with synthetic business details. Scroll for the remaining fields. All writes are disabled in this documentation preview.](screenshots/join-yard.png)

The interface describes review as usually taking 12-24 hours. This is an operational target, not a guaranteed response time.

---

## 07 / Documents and application status

Upload clear, readable files. For bulk businesses, supply the consent documents or exemption information requested by the form and photographs of the equipment. Supply GST information when applicable. For Saathi identity documents, mask an Aadhaar number except its last four digits.

Certificate PDFs, ID files, selfies and machine images are capped at 10 MiB each. Machine MP4/MOV videos are capped at 20 MiB, with at most ten machine files. JPEG/PNG preparation reduces large uploads automatically. The form remains the final authority for accepted file types.

![Current application status with a synthetic submitted shop application. No live review or SMS notification occurred.](screenshots/join-status-phone.png)

### Follow the status page

- Draft: finish and submit the application. A saved draft has not entered the review queue.
- Submitted: wait for the review. Check the page for a decision.
- Changes requested: read the admin's note, correct the listed items and submit again.
- Approved: continue to the operational app for your role.
- Rejected: read the reason and contact the owner if necessary. No self-service reopening control is provided.
- Suspended: operational access is unavailable. Contact the owner; the ordinary admin console has no suspension or reinstatement button.

If removing a file or discarding an application draft fails, the page shows an error. The file or draft remains visible so you can check its current state and try again.

Private files require a valid session and permission on every request. Do not share downloaded IDs or certificates. If a preview fails, sign in again if needed and use Try again. Large videos are not loaded until requested; video uploads are capped at 20 MB.

Files are not general attachments for customer conversations. Upload only what the application asks for. The mobile shell cannot open every private document path; use the authenticated browser or desktop flow when the app directs you there.

![Synthetic documentation fixture: a failed file removal keeps the document visible and shows an Arabic error.](screenshots/failure-file-ar-dark-phone.png)

![Synthetic documentation fixture: a failed draft discard keeps the confirmation open, so the user can retry or cancel.](screenshots/failure-discard-ar-light-phone.png)

---

## 08 / Kabadiwala: start the working day

![Current kabadiwala home components with synthetic documentation data. This is not a live session.](screenshots/kabadiwala-overview.png)

A kabadiwala runs a local collection shop. The approved shop uses /app to manage household requests, current stock, its rate card and onward trade.

1. Sign in with the phone number that owns the approved shop.
2. Open Home. Read the request and stock summary.
3. Check the Auto-accept setting and pickup radius. Enable auto-accept only when the shop can handle suitable work; location data is required.
4. Open Requests to check new bookings and the Today list.
5. Check Prices before accepting new work. A shop rate cannot be below the platform minimum.
6. Check Stock before offering material to another business.

Use the bottom navigation on a phone or tablet. Two frequent destinations stay visible. Open More for the role's additional pages, language, appearance and sign-out. On wider desktop screens the same app shows side navigation. The available destinations follow the approved role; typing a route does not change permission.

Auto-accept can accept suitable bookings without a separate manual tap. Check the radius and location before enabling it. There is no separate Taking pickups availability switch. Changing auto-accept does not cancel bookings already accepted.

---

## 09 / Kabadiwala: accept and manage requests

![Current shop request list with synthetic bookings.](screenshots/kabadiwala-requests.png)

1. Open /app/requests.
2. Read each offered booking: area, estimated materials, time and collection mode.
3. Accept only if the shop can do the work. Use Decline when appropriate.
4. After acceptance, open the booking to see its permitted contact and address details.
5. Use the Today tab to find accepted work.
6. Open the accepted booking and use Start trip before travelling for a pickup. Open Weigh and pay when the material is ready.

![Current request-detail components with fictional data. The screenshot is a component fixture, not an accepted live pickup.](screenshots/kabadiwala-request-overview.png)

Only the assigned shop can accept or act on the booking. A request that expired or moved to another shop cannot be accepted from an old page. Read the current error or status and refresh the record if needed.

If accepted work cannot be completed, contact the household and support. The shop page has no accepted-booking release or cancellation-with-reason control. Do not leave the household waiting or record a false completion.

Avoid repeated taps while a request is being submitted. An offline screen does not prove that an action failed; reconnect and inspect the booking before trying again.

---

## 10 / Kabadiwala: weigh and pay

![Current weighing form captured in the browser with synthetic data. Cash and UPI controls record payment; no provider transfer is made.](screenshots/kabadiwala-weigh.png)

1. Open the accepted booking at /app/requests/[id].
2. Weigh each material on the shop's scale. Enter the actual quantity for that material.
3. Check the price and line total. Remove or correct material that was not supplied.
4. Read the total with the household. Resolve a disagreement before recording completion.
5. Pay the household in cash or UPI outside the platform.
6. Choose the payment method and record the payment information requested by the form.
7. Confirm completion once. Check the receipt and updated stock.

Luma.Green records the result. It does not make the cash or UPI transfer. A button labelled as a payment step must not be treated as bank confirmation.

The backend stores money in whole paise and mass in whole grams. The screen formats those values for the selected language. Review the displayed units before entering a number. Weight and price fields accept digits used by supported scripts. Enter quantities without thousands separators. Use at most three decimal places for weighed kilograms and two for rupees. A decimal comma is accepted where the selected language uses it; an ASCII decimal point also works.

The final receipt is the record of that transaction. If a correction is needed after completion, contact the owner; do not silently alter another record to hide the difference.

---

## 11 / Kabadiwala: rate card and stock

![Current shop rate-card components with synthetic sample prices.](screenshots/kabadiwala-ratecard.png)

### Change a shop price

1. Open /app/prices.
2. Find the material and read the minimum price.
3. Enter the shop's price per kilogram. Keep it at or above the minimum.
4. Save the change and read the confirmation.
5. Check the updated row before leaving the page.

A fallback price applies where the shop has no custom rate. If the admin raises a minimum above a shop price, the backend can lift the stored shop rate to that minimum. Old receipts keep their earlier price.

### Check stock

![Current stock page at phone width with synthetic newspaper quantities and value. This is not a live inventory balance.](screenshots/kabadiwala-stock-phone.png)

Open /app/stock to see recorded on-hand quantities and value. Completed pickups and trade movements update the records. Open the material chooser at /app/sell to see the quantity available to list. Reserved stock is not free stock; do not promise more than the available quantity.

To offer material onward, use /app/sell or the Sell action available to the role. To buy from a permitted supplier, use /app/market. The next chapter explains the common trade sequence.

---

## 12 / Business trade: buyer and seller

![Current yard trade list with synthetic records. Payment and escrow actions are simulated.](screenshots/yard-trades.png)

1. Seller: open /app/sell, select material, available quantity and asking price, add an optional note, then create the listing.
2. Buyer: open Market, choose a listing from an allowed supplier and inspect its material, available quantity and price.
3. Buyer: enter the requested quantity, review the offer and create the order.
4. Seller: open Trades, inspect the new order and accept or reject it as offered by the current state.
5. Buyer: complete the displayed demo payment step when it becomes available. This records a state only.
6. Seller: dispatch the material when the page offers Dispatch. Confirm the quantity and destination.
7. Buyer: check the delivered material and select Confirm delivery when the page offers it.
8. Both parties: inspect the completed trade and its receipt.

![Current business sale page with a synthetic open lot and available stock. No listing was created or withdrawn.](screenshots/yard-sell.png)

For an active listing you no longer want to offer, select Withdraw and confirm. Read the resulting listing state.

The sequence is state-driven. Only a permitted participant can use a transition. Stock is reserved and moved according to those transitions. Do not use screenshots as authority to skip an action in the current interface.

A price, quantity and total must fit the exact integer range. If a price is rejected, reduce the price or quantity and check the total before sending again. A failed request keeps the form open. Existing records with an invalid total remain visible with an error instead of an estimated amount.

![Synthetic documentation fixture: an invalid market total is rejected without sending a trade.](screenshots/failure-market-en-light-phone.png)

### Payment boundary

There is no live escrow or provider payment transfer. Adding payment keys does not turn the demonstration into a live payment service. Arrange real commercial terms outside this prototype until a reviewed payment implementation is released.

/app/trades/[id]/invoice is a printable trade receipt. It is not a GST tax invoice. It does not replace the supplier's required tax or transport documents.

![Current trade receipt with synthetic businesses and quantities. The displayed escrow state is a prototype example; no funds were transferred or held.](screenshots/yard-invoice.png)

---

## 13 / Yard: buy, sort and sell onward

![Current yard home components with synthetic documentation data.](screenshots/yard-overview.png)

A yard buys from kabadiwalas and supplies material onward to recyclers. Its screens use the same stock and trade records as the rest of the chain.

1. Open /app/market to inspect stock from permitted upstream businesses.
2. Check material, quantity and supplier before placing an order.
3. Follow the trade sequence in chapter 12.
4. Inspect /app/stock after dispatch and receipt events.
5. Use /app/sell to offer available material to the next permitted part of the chain.
6. Use /app/trades to follow orders that need a decision or movement.

Physical sorting, grading and baling happen outside the app. The current interface does not provide a complete industrial processing or mass-balance production system. Do not describe a sorting activity as a recorded processing batch unless there is an actual record for it.

Keep documentary evidence required by the business outside the demo payment flow. Review the relevant Standards information before making a certification claim.

![Current yard market with synthetic organisations and quantities.](screenshots/yard-market.png)

---

## 14 / Recycler: supply recovered material

![Current recycler home components with synthetic documentation data.](screenshots/recycler-overview.png)

1. Open Home to see the role's summary.
2. Use Buy to inspect available material from yards.
3. Use Trades to accept, dispatch or receive orders when the state allows it.
4. Use Stock to inspect collected materials and recycled-material groups.
5. Use Sell to offer available output to manufacturers.
6. Open /app/compliance and /app/impact where the role menu provides them.

There is no standalone Convert batch or Record processing run screen in this version. The guide does not infer one from the recycler role or from the fact that stock has several material groups.

Compliance shows a renewal warning when a consent has fewer than 90 days left. The renewal review date is 90 days before expiry; it is not a promise of an SMS reminder. Renew with the issuing board and contact support to update the certificate.

Compliance totals depend on the recorded transactions. They are supporting information. Check the date range, categories and underlying receipts before using them in an external report. No automated regulatory filing is performed.

---

## 15 / Manufacturer: buy and review compliance

![Current manufacturer home components with synthetic documentation data.](screenshots/manufacturer-overview.png)

1. Open Buy to inspect permitted recycled-material suppliers.
2. Check material, grade, quantity and price before placing an order.
3. Follow the trade state and receive the delivery only after the business checks it.
4. Open the printable trade receipt for the recorded transaction.
5. Open /app/compliance to inspect the recorded recycled-material and EPR information.
6. Check the displayed financial year and the transactions behind the total.

Manufacturers buy from recyclers; manufacturer selling is not supported in this version.

The platform supplies records, not a certification. It does not automatically file EPR returns, issue carbon credits or approve the business's environmental claims. The current payment path is still a demonstration.

Do not treat the trade receipt as a GST invoice. Obtain the actual supplier invoice and other required documents through the business's normal process.

![Current manufacturer compliance components. Synthetic totals are not certified results.](screenshots/manufacturer-compliance.png)

---

## 16 / Saathi: local work and earnings records

![Current Saathi job board components with synthetic documentation data. No payout is demonstrated.](screenshots/saathi-overview.png)

A Saathi is an approved worker who can take pickup, sorting or shift work offered by the platform's job flow.

1. Sign in with the approved Saathi phone number.
2. Open /app to view the job board.
3. Read the job's location, work, time and offered amount.
4. Accept only work you can attend.
5. Select Mark done on the current job when the work is complete, then confirm completion.
6. Open /app/impact to inspect the earnings record shown for the role.

Finish marks the job done and records that action. It does not call a payout provider. Confirm actual payment through the agreed payment method outside the platform.

The Saathi home is /app. There is no /app/saathi page. If an application is not approved, follow /join/status instead of trying to open another role's route.

---

## 17 / Admin: create access once

![Actual current /admin/setup page without a backend connection. It correctly refuses to start setup.](screenshots/public-admin-setup.png)

The system has one configured admin. There is no staff invitation screen. Phone sign-in never grants admin access.

1. Owner: confirm the intended frontend and Convex deployment.
2. Configure the backend authentication settings and the allowed ADMIN_EMAIL. Set a separate random ADMIN_SETUP_TOKEN of 32–512 characters on Convex. Keep it private and give it only to the person who will create the admin account.
3. Open /admin/setup.
4. Enter the full name, Indian mobile number, date of birth and only the last four Aadhaar digits.
5. Enter the configured email address and the private Setup token. Set and confirm a password of 12-128 characters.
6. Select Create the admin account.
7. Scan the authenticator QR code or enter its key in an authenticator app.
8. Enter the current six-digit code and turn on the authenticator.
9. Save the one-time backup codes securely. Confirm that they are stored, then go to the console.
10. Remove ADMIN_SETUP_TOKEN from the Convex environment. Sign out and test a normal password and authenticator sign-in.

Do not include a real setup token, password, authenticator key, QR code, backup code or identity file in a screenshot or this guide. New account creation requires the configured email and setup token. It does not prove mailbox ownership through a verification email. If an unexpected account already exists, stop and use an owner-led recovery procedure.

If setup cannot connect, read the safe error message and try again after the connection returns. The control becomes available again. If the account already exists after an uncertain result, use admin sign-in and return to setup to complete it. Do not create another identity.

![Synthetic documentation fixture: the first-admin setup form includes a private, masked Setup token field. The fields are empty; this image does not show a completed or failed signup.](screenshots/failure-setup-en-light-phone.png)

---

## 18 / Admin: sign in and recover access

![Actual current /admin/login page. This local build has no connected backend.](screenshots/public-admin-login.png)

1. Open /admin/login on the intended deployment.
2. Enter Email and Password. Select Continue.
3. Enter the current authenticator code. Six digits can submit automatically.
4. If the authenticator is unavailable, select Use a backup code. Enter one unused code and select Sign in.
5. Use Start again to return to password entry.
6. Select Sign out when finished, particularly on a shared device.

If a password, authenticator or backup-code request fails, the form shows an error and allows another attempt. A failed sign-out keeps the current page open. It does not confirm that your session ended; retry before you leave a shared device. Phone codes cannot grant an admin session.

![Synthetic documentation fixture: an authenticator request failed, and the form allows another attempt. No real code or account is shown.](screenshots/failure-totp-en-dark-phone.png)

Admin sessions last at most 12 hours. Activity does not extend that limit. The console is English-only and has no locale prefix.

If setup was interrupted, reopen /admin/setup and complete the remaining profile or authenticator step. If signed in as a phone member, sign out before starting admin setup.

### Reset a lost admin password

1. On Admin sign-in, select Forgot password, or open /admin/forgot-password.
2. Enter the configured admin email and select Send reset link. Recovery needs the owner to configure the verified Resend sender. If configuration or delivery is unavailable, follow the displayed error.
3. Open the received link within 15 minutes. Use a unique password of 12–128 characters and enter it again. The visibility control helps check entry; the length hint is not a guarantee of password strength.
4. Select Update password once. After success, sign in with the new password and your authenticator or an unused recovery code.

A link works once. Missing, expired or previously used links cannot reset the account. Request a new link when needed. A successful reset ends existing sessions and invalidates earlier pending sign-in proofs and reset links. It keeps the authenticator and recovery codes. Unknown or non-admin addresses receive a neutral response and no email.

![Admin password recovery form with no address entered. Actual components in the isolated fixture; it sends no email.](screenshots/admin-password-recovery-light.png)

![Admin reset page in dark mode with a missing-token error. No password or reset token is supplied; this is an isolated fixture.](screenshots/admin-password-reset-missing-dark.png)

If neither an authenticator nor an unused recovery code is available, arrange owner-led recovery. A password reset does not bypass the second factor. There is no staff invitation screen. Changing ADMIN_EMAIL is not a safe way to invite another operator.

---

## 19 / Admin: daily overview

![Current admin overview components with synthetic records. No authenticated access is demonstrated.](screenshots/admin-overview.png)

Open /admin. Check Waiting for review, Overdue and Open support requests. Use the console navigation to open Verification, Prices, Pilot numbers or Support.

1. Process the oldest submitted applications first.
2. Treat 18 hours as due soon and 24 hours as overdue.
3. Check applications returned for changes in With the applicant.
4. Review support requests and the current reference prices.
5. Review current booking outcome totals and the count sent to another shop. Investigate individual cases through the operator workflow or an authorised backend review.

The Latest sign-ins list reflects first profile creation, not a complete login audit. The summary counts and queue reads are bounded for the pilot. They are not unlimited exports.

The console does not include a maintenance switch, staff invitation, suspension/reinstatement action, SMS resend tool or a report export button. Older plans that mention those actions are not instructions for this version.

---

## 20 / Admin: review an application

![Current application-review components with fictional applicant and records. No live decision is made.](screenshots/admin-review.png)

1. Open /admin/verification. Select Review on a submitted application.
2. Check the applicant, role, phone, language, submission time and version.
3. Inspect the form, files and any changes from a previous submission.
4. Complete the role checklist below.
5. Choose Approve, Ask for changes or Reject.
6. Read the confirmation and enter a note if required.
7. Confirm once, check success, then return to the queue.

| Role                       | Manual checks                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kabadiwala                 | Check map location; call the login number; GSTIN, if supplied, must be active and match the business                                                  |
| Yard/recycler/manufacturer | Check active matching GSTIN if supplied; valid consent matching business, address and activity, or checked exemption; working-unit photos; call owner |
| Saathi                     | Readable ID; matching name; masked Aadhaar if used; selfie match; call applicant                                                                      |

Approve becomes available after every checklist item is ticked. Checklist ticks are temporary page notes; they are not stored as an evidence checklist. Decisions are recorded in the audit trail. Change and rejection notes must contain 5-1,000 trimmed characters.

Already decided applications show status. There is no reopening or suspend button. Approved kabadiwalas start with fallback prices.

---

## 21 / Admin: reference prices

![Current admin price-table components with synthetic sample prices. No price is saved.](screenshots/admin-prices.png)

Open /admin/prices. The screen is fixed to Bengaluru and identifies its values as prototype sample prices. The owner must validate launch prices.

1. Find the material row.
2. Enter Minimum and Fallback in rupees per kilogram.
3. Check that both are positive and the minimum does not exceed the fallback.
4. Use at most two decimal places; the maximum is 10,000 rupees per kilogram.
5. Select that row's Save. Read the confirmation and any count of shop rates raised.
6. Use Undo only to discard unsaved edits.

Raising a minimum can raise stored shop rates below it. This operation has pilot query bounds; it is not an unlimited bulk rewrite. Fallback prices apply where a shop has not supplied its own rate and to the first household estimate. Old receipts keep their original values.

Add missing names fills missing catalogue names from the bundled translations. It preserves existing names and prices. It is not an online translation service. There is no city selector or price-history export control.

---

## 22 / Admin: pilot numbers

![Pilot report overview with synthetic totals, not measured results. Larger chart views follow.](screenshots/admin-pilot.png)

Open /admin/pilot. Choose Today, 7 days, 30 days or the fixed 13-20 October 2026 pilot period. Read the displayed date range in India time.

1. Check whether Partial report is shown. Choose a shorter period if it is.
2. Review booking count, reassignment count and average acceptance time.
3. Review collected kilograms and recorded payments.
4. Compare estimated and weighed kilograms for completed bookings with receipts.
5. Review booking outcomes and application decisions.

### Read the charts

The Booking outcomes chart compares the six current booking states. Read the
counts beside the chart for exact values. A zero count has no visible bar.
The Estimate and weighed material chart compares the two weights for each
material code. The table below gives the same values in kilograms.

Hover a bar to read its tooltip. The written counts and table are also available
without a mouse. The charts use records from the selected report period. They do
not create a price history or show a trend over time. If a report has no bookings
or material rows, the related chart is not shown.

![Current booking outcome chart with synthetic counts. The written counts remain available beside it.](screenshots/admin-pilot-outcomes.png)

![Current estimated and weighed material chart with synthetic weights. The table gives the same values in kilograms.](screenshots/admin-pilot-materials.png)

### What these numbers mean

Bookings are selected by date booked. Applications are selected by their latest submission date. Outcomes are the current record state, not a historical snapshot at the selected end date. The report reads at most 1,000 bookings and 1,000 applications; the backend accepts a maximum 31-day range.

Recorded payment is not proof of a provider transfer. Demo rows are included if present in the deployment. Drafts and previous review rounds are not complete application-funnel counts. The report does not measure photo-to-booking conversion, form abandonment or original AI accuracy. A basket weight can have been edited manually.

There is no CSV or PDF export control on this page. This user guide does not add one.

---

## 23 / Admin: support and private files

![Current support-inbox components with synthetic enquiries. No caller is contacted.](screenshots/admin-support.png)

### Support inbox

1. Open /admin/support.
2. Select Open, Answered or All.
3. Read the requester, topic, role, message and time.
4. Use Call to open the device's telephone handler, then handle the conversation outside the app.
5. Select Mark answered after the matter is handled. Check the Answered tab.

The inbox includes help and solar enquiries and reads the newest 200 records. Mark answered changes the status only. It does not send an email or SMS. There is no reply composer, internal note, assignment, reopen or delete control.

### Private files

Use the application's image/PDF preview. Select Load the video before a video is fetched. Open or Download only when necessary. A valid session and permission are required on each file request. If the session has ended, sign in again. For a network error, use Try again.

Store downloaded identity documents only in an approved secure location. Do not add them to Git, this guide, a public support thread or a screenshot set. Temporary browser preview caching is not a document archive.

---

## 24 / Help, contact and training

![Current help centre, with search, topic filters and role guides.](screenshots/public-help.png)

1. Open /help and search for the task or problem.
2. Filter by topic or choose your role.
3. Open a guide and follow its steps.
4. Use /help/contact if the guide does not solve the problem.
5. Enter the requested contact information and a clear message. Submit once and read the result.

The illustrated topic links open the complete preparation, weighing/payment and business-verification guides. They keep the selected language. Use them when you know the task but not which role directory to open.

![Illustrated help topics in the current disconnected build. Each item opens an existing full guide.](screenshots/public-help-topics.png)

Training completion is stored in this browser's local storage. It is not a certificate and does not automatically follow the account to another device. Clearing browser data can remove the mark.

The current Call and WhatsApp number is a placeholder: +91 80 0000 0000. It is not an active support number. The owner must replace it before launch. When connected, the contact form creates a support request; it does not prove that a person has replied or that an SMS/email was delivered.

The contact form limits repeated messages from the same number within one hour. If the limit message appears, keep your draft and try again in an hour.

![Synthetic documentation fixture: the contact form shows its hourly limit and retains the sample message. No live message was sent.](screenshots/failure-support-en-light-phone.png)

---

## 25 / Standards, impact and rooftop solar

![Current standards page. It provides reference information, not certification.](screenshots/public-standards.png)

Use /standards for information about the material chain and industry schemes. Check the relevant official scheme before making an external claim. A platform record does not itself certify a business or issue a credit.

Use /app/impact for the summary available to your role. Keep recorded collection quantities, estimated impact and verified carbon credits separate. Carbon-credit issuance, trading and retirement are later product work.

![Current recycler impact screen with synthetic quantities, money and CO₂e estimates. These values are not measured recovery or verified emissions reductions.](screenshots/recycler-impact.png)

![The same synthetic impact example at phone width. The visible fixture banner identifies this as a documentation preview. Scroll to read the remaining sections.](screenshots/recycler-impact-phone.png)

Use /solar to explore the rooftop-solar information and estimator. The input reads local digits and decimal separators, such as 3000,50 in French or ٣٠٠٠٫٥٠ in Arabic. Check the displayed estimate after editing; malformed numbers show a field error. Treat estimates as planning inputs, not an installation quote or guaranteed return. Send an enquiry through the form if enabled. It enters the support workflow; no installer booking, finance approval or electricity connection is completed by that form.

The grading, weighing and custody sections now include relevant work scenes beside their rules. The images do not certify the work or show measured platform activity. The platform does not replace business compliance advice, physical inspection, product testing or a supplier's official documents.

---

## 26 / Mobile and desktop apps

The repository contains an Expo/React Native shell for Android and iOS and an Electron shell for macOS and Windows. They use the same hosted operational UI and backend. Signed, installable releases and store acceptance are still release tasks.

### When an approved release is available

1. Install the signed app from the owner's approved distribution channel.
2. Open the app and sign in to the correct service.
3. Grant camera or location access only when needed for the current task. If location is denied, use the form's available manual choice.
4. On desktop, choose an existing photo; direct camera capture is not enabled.
5. Follow a browser handoff for admin pages or private documents when requested. The external browser can require a separate sign-in.
6. If disconnected, restore the connection and inspect the current record before repeating an action.

Hosted website changes can update the shared UI. Compatible signed JavaScript updates and desktop updates have separate release paths. Mobile shell updates can apply at a later cold start; an immediate restart requires a choice. Desktop updates can install on normal quit or through the offered restart action. Select Later while a form is in progress. New native capabilities can still require a binary or store update; permanent freedom from updates is not promised.

Account notifications and device permission are explained in chapter 38. Android/iOS push requires EAS, APNs/FCM setup and controlled signed-device tests. Desktop notifications require the application process to remain open. Apple Developer, Google Play and Expo/EAS accounts are not yet set up.

There is no offline write queue, background location service or independent native ledger. A mobile JavaScript export is not an APK or IPA installer.

### Local desktop demonstration

The separate Luma.Green Demo app is available as an unsigned Apple Silicon Mac
build and a Windows x64 folder. Windows execution still needs a Windows test.
Start the built website on the same computer with `pnpm exec next start --port
3004`, then open the demo app. Copy the entire Windows folder, not only its EXE.
The app loads localhost:3004; it does not contain an offline copy of the website.

Rebuild with `pnpm --filter @luma/desktop demo:pack:mac` or
`pnpm --filter @luma/desktop demo:pack:win`. Demo cookies are separate from the
production app. Updates are disabled in the demo profile. It does not bypass
sign-in or make a disconnected backend work. Show public pages first; use only
an approved test backend and test account for protected workflows.

### Android and iOS demonstration

Run `pnpm --filter @luma/mobile demo:ios --check` or
`pnpm --filter @luma/mobile demo:android --check` to check the local web origin.
Omit `--check` to start Metro for an installed development build. iOS simulator
uses localhost; Android emulator uses 10.0.2.2 to reach the computer.

A real device needs a tested HTTPS origin, the matching development build and
native tools or an approved EAS build. Set EXPO_PUBLIC_APP_ORIGIN before building
and launching; then use `pnpm --filter @luma/mobile demo:device`. The app cannot
assume that any Expo Go installation contains its native modules. Full Xcode is
required for local iOS builds; Android needs the supported JDK and Android SDK.

This machine exported both JavaScript bundles and tested the launcher. It did
not produce an APK or IPA, and no phone or simulator acceptance was completed.
See apps/mobile/README.md and docs/operations/app-releases.md for build, signing
and device checks.

---

## 27 / Troubleshooting

| What you see                      | What to do                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Code-entry preview                | You can inspect the phone and code screens. The owner must connect auth/SMS before verification works.              |
| Admin console is not switched on  | Check the frontend/backend setup; no admin action can fix a missing connection from this screen.                    |
| SMS code is late                  | Check the number and resend timer. Avoid repeated sends. Check provider acceptance and handset delivery separately. |
| Code expired or attempts used     | Follow the screen to request a new code after the permitted delay.                                                  |
| Protected page redirects          | Sign in again; confirm that the correct role is approved.                                                           |
| Application requests changes      | Read the note, correct the specified fields and resubmit.                                                           |
| Booking cannot be accepted        | It may have expired or been reassigned. Read the current status.                                                    |
| File will not open                | Confirm session and permission; use Try again, or the browser/desktop path.                                         |
| Price cannot be saved             | Check units, decimal places and the minimum/fallback rule.                                                          |
| Pilot report is partial           | Select a shorter date range. Do not use a truncated total as complete.                                              |
| Payment button did not move money | Business payment steps are demonstrations; household payment happens outside the app.                               |
| App shows an update               | Finish or save your work, then use the offered restart action.                                                      |

For an uncertain submit, reconnect and inspect the record first. Do not repeatedly create a booking, trade or payment record. Provide the route, visible status, time and non-sensitive record identifier when reporting a fault. Never send passwords or recovery codes.

---

## 28 / Owner launch and account checklist

This is an owner/developer checklist, not a list of admin console buttons. The exact environment names and release commands live in the repository runbooks.

| Service or task      | Required setup                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting and domain   | Intended HTTPS origin; frontend deployment; NEXT_PUBLIC_SITE_URL                                                                                      |
| Convex               | Correct deployment and URLs; deployment-specific keys; schema/functions deployed before dependent UI                                                  |
| Authentication       | SITE_URL, BETTER_AUTH_SECRET and ADMIN_EMAIL; private ADMIN_SETUP_TOKEN for first setup, then remove it                                               |
| Phone SMS            | MSG91 account, DLT/template approval and OTP limits; configured OTP values                                                                            |
| Admin email recovery | Optional Resend account, verified sender, RESEND_API_KEY and ADMIN_RESET_FROM_EMAIL; HTTPS SITE_URL; test delivery and single-use reset               |
| Device notifications | VAPID keys for browsers; Expo/EAS and APNs/FCM for mobile; signed desktop/device acceptance. Inbox persistence and alert delivery are separate checks |
| Optional status SMS  | Separate approved Flow templates and outbox configuration; verify handset delivery                                                                    |
| Analytics/errors     | Optional PostHog, GA4 and Sentry projects; telemetry switch, service keys and provider settings                                                       |
| Search ownership     | Optional Google Search Console and Bing ownership tokens; deployed sitemap submission                                                                 |
| Optional AI          | OpenRouter credentials or authenticated HTTPS model gateway; quotas and evaluated model                                                               |
| Android/iOS          | Expo/EAS project, Apple/Google developer accounts, signing credentials and physical-device checks                                                     |
| macOS/Windows        | Stable signing identities, notarization where required and signed update feeds                                                                        |
| Support and prices   | Real contact details; verified pilot prices; staffed review/support process                                                                           |
| Operations           | Measured backups and restore drill, provider cost limits and incident procedure                                                                       |

Before the next Convex release, merge and review the backend changes from this work together with the parallel ecosystem branch. Preserve its current production schema and functions. Do not deploy this branch over those additions from an older checkout. Release the checked additive backend before merging the frontend update into main. No backend release of the new account-security or notification work is claimed by this guide.

Use docs/operations/launch-checklist.md, app-releases.md, push-notifications.md, low-cost-operation.md and sms-notifications.md. Keep secrets outside Git and the guide. AUTH_DEV_MODE belongs only to a development or preview environment.

A branch push is not deployment. A build is not provider approval. A provider accepting a message is not proof that a handset received it. Test each boundary before opening the pilot.

---

## 29 / Route reference

| Area                   | Routes                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Public                 | /, /how-it-works, /participants, /prices, /contact                                                 |
| Household              | /sell; /t/[token]                                                                                  |
| Sign-in                | /login; /login/verify                                                                              |
| Account settings       | /account/security; /account/notifications                                                          |
| Onboarding             | /join; /join/kabadiwala; /join/yard; /join/recycler; /join/manufacturer; /join/saathi              |
| Onboarding documents   | /join/[business]/documents; /join/status                                                           |
| Role home and requests | /app; /app/requests; /app/requests/[id]                                                            |
| Stock and prices       | /app/stock; /app/prices                                                                            |
| Business trade         | /app/market; /app/sell; /app/trades; /app/trades/[id]/invoice                                      |
| API connections        | /app/integrations; /api/v1/openapi.json                                                            |
| Reporting              | /app/impact; /app/compliance                                                                       |
| Help                   | /help; /help/[role]; /help/[role]/[guide]; /help/contact                                           |
| Reference/enquiry      | /standards; /solar                                                                                 |
| Admin access           | /admin/setup; /admin/login; /admin/forgot-password; /admin/reset-password                          |
| Admin work             | /admin; /admin/verification; /admin/verification/[id]; /admin/prices; /admin/pilot; /admin/support |

Replace bracketed parts with the real record, role or guide value. They are not literal links. User-facing routes support locale prefixes such as /kn, /hi and /ar. English normally uses no prefix. Admin routes never use a locale prefix. Unknown routes show a not-found page.

App routes have no organisation slug. In particular, do not use /app/[org]/stock, /app/saathi, /sell/estimate or /sell/book from older plans.

---

## 30 / Glossary and working rules

| Term           | Meaning in this platform                                                 |
| -------------- | ------------------------------------------------------------------------ |
| Kabadiwala     | A local collection shop that buys from households                        |
| Yard           | A bulk sorting/preprocessing business                                    |
| Saathi         | An approved worker who takes local jobs                                  |
| Minimum        | Lowest permitted shop price for a material                               |
| Fallback       | Reference price where a shop has no custom rate                          |
| Estimate       | A starting quantity/value that must be checked                           |
| Receipt        | Recorded material, weight, price and transaction details                 |
| Reserved stock | Quantity committed to an active trade                                    |
| EPR            | Extended Producer Responsibility; platform records can support reporting |
| Escrow         | Planned holding of business payments; simulated in this version          |
| TOTP           | Time-based code from an authenticator app                                |
| Partial report | A bounded report that did not include every matching record              |

Check the material, unit, quantity and price before you confirm an action. Keep real payment confirmation separate from a recorded payment state. Use the correct account and deployment. Preserve private files and recovery codes. Resolve errors through a correcting operation that keeps the audit history.

---

## 31 / Screenshot reference: prices and solar

![Current public price page in the disconnected build. Live values require a configured backend.](screenshots/public-prices.png)

Open /prices before comparing a shop offer. A connected demo deployment can show seeded sample prices with a visible sample-data notice. These values demonstrate the interface; they are not verified market quotes. Choose a material to inspect its price detail and any available history. Check the city, date, unit and sample-data notice. An unconfigured or empty backend shows placeholder rows and a status message. Placeholders move only while a request is loading; reduced-motion settings stop that motion. The interface does not create replacement prices when a request fails. This board is not independent market-price advice.

![Current local price board reads the approved development demo data. The sample-price notice remains visible. These are demonstration rates, not verified market quotes or proof of the hosted production frontend.](screenshots/public-prices-demo.png)

![Current local material-history dialog in dark mode, using the same development demo data. The chart supports keyboard navigation; the daily values also appear in a scrollable table. No price is edited.](screenshots/public-price-history-demo-dark.png)

The demo contains 26 materials. The 3 October capture shows 29 available daily samples in the rolling 30-day window; no new sample is added for the capture. Select a row to open its history. Use the arrow keys on the chart to read another date. Select Show the numbers to open the daily values below it. Close the dialog to return to the board. These sample values must be validated or replaced before operational use.

The weighing guide below the board explains the final amount: zero the scale, weigh each material separately, agree the amount and check the receipt. A reference price does not replace measured weight. Use Open guide to read the full household weighing instructions.

![Current price explanation in dark mode. The work scene is decorative; the text explains how weight and the agreed rate form the receipt.](screenshots/public-price-guide-dark.png)

![Current rooftop-solar page header and banner. Scroll to reach the estimator. Estimates require a real site survey.](screenshots/public-solar.png)

![Current solar details with compact single-choice rows. Choose the property, monthly bill and available area before reading the estimate. This is a disconnected local browser capture, not a site survey or quote.](screenshots/public-solar-details.png)

---

## 32 / Screenshot reference: language and contact

![Current Arabic homepage at phone width. This is an actual browser capture, not a translated image.](screenshots/public-arabic.png)

Use the language control to change language. On public pages and operational screens, phones and tablets keep it in the menu. Sign-in screens keep it in the header. The same workflows remain available; text direction and number formatting follow the locale. The admin console stays English-only.

![Current help-contact page header and banner. Scroll to reach the message form. Submission needs a connected backend; no message was sent to create this screenshot.](screenshots/public-contact.png)

---

## 33 / Screenshot reference: chain and review queue

![Current public explanation of the material chain.](screenshots/public-how-it-works.png)

![Current admin verification queue components with synthetic submitted applications.](screenshots/admin-verification.png)

The queue is an example of the current interface. It does not establish that a real application has been reviewed or approved. Follow chapter 20 for the decision process.

---

## 34 / Optional analytics and error reports

![Current local browser capture with test configuration. No real analytics account receives data.](screenshots/analytics-choice.png)

When the owner enables analytics, public information pages show Optional analytics. Select Allow analytics to enable PostHog and Google Analytics page-visit measurements, or Keep analytics off to continue without them. Both choices keep the platform available. Use Analytics settings to change the choice later. A successful change from allow to off reloads the page to remove loaded analytics scripts.

The choice stays on this browser/device. A blocked storage message means the choice could not be saved and analytics stay off in the current visit. Retry when storage is available. A different device or cleared browser storage needs a new choice.

---

## 35 / Analytics privacy, errors and owner setup

![Current Arabic analytics controls at phone width with test configuration. This is an actual browser screenshot.](screenshots/analytics-choice-arabic.png)

Only the home, how-it-works, participants, prices, standards, solar and help landing pages are measured. Sign-in, booking, tracking, onboarding forms, the business app and admin pages are excluded. Events omit query strings, tracking tokens, customer records, form text and full referrers. Session replay, autocapture and user profiles are off. These limited page counts do not replace the admin pilot report.

### Error reports and owner settings

Sentry error reports are separate from optional visit analytics. When the owner configures Sentry, it receives error types and scrubbed code locations. Reports remove error messages, request details, user data and breadcrumbs. Performance tracing and replay are off. If the application shows its general failure screen, use the retry control. Retry refreshes the failed page data; it does not submit the failed operation again automatically. A failure in error reporting does not disable this control.

The general failure screen uses the same appearance and translated retry control. Its safe retry and accessibility behavior are covered by tests. This guide does not include a forced-failure browser capture.

The owner supplies the telemetry switch and each service key in the web deployment, then rebuilds it. GA4 Enhanced Measurement must be switched off in the property settings. Do not install a second tag through Google Tag Manager. Use docs/operations/observability.md for exact settings, tests, and spend controls. Empty keys keep services disabled. Browser/Next.js Sentry setup does not capture Convex backend or native-shell errors.

Google Search Console and Bing verification tags are optional ownership checks. Configure their tokens, deploy, verify ownership and submit sitemap.xml. These tags do not collect visit analytics and do not prove search indexing. See docs/operations/seo.md. Existing language alternates, canonical URLs and private-page noindex rules remain in place.

---

## 36 / Appearance and role pages

The main public pages place a wide artwork banner below the title and introduction.
This includes How it works, Participants, Prices, Standards, Solar, Join and the
help pages. Each banner uses a material or work scene. On phones, the image uses
a taller crop so the scene remains clear. The artwork does not show a live
customer, business or platform record.

How it works now includes a practical preparation section for paper, bottles, metal and e-waste. Join adds the checks used for business review and the explanation of why document files are needed. These links open complete help guides; they do not submit an application or approve a business.

![Current preparation section below How it works. The image gives context; the text explains what to do before collection.](screenshots/public-sorting-guide.png)

![Current business-review explanation below the Join role list. It links to the full verification guide.](screenshots/public-join-preparation.png)

The interface uses neutral light surfaces and charcoal dark surfaces. Green marks
the main action and selected states. Public pages have wider spacing; workspaces
keep records and controls closer together. Buttons, form fields and panels use
consistent shapes across roles. Read the text label before selecting an icon.

Geist supplies the large display headings. Noto supplies body text and the script
fallbacks for all 33 languages. The language control changes text, direction
and number formatting; it does not change access or stored records.

Use Appearance in the desktop header, phone or tablet menu, or workspace controls
to select Light, Dark or System. System follows the device setting. Your selection stays in this browser
when browser storage is available. It does not change another person's account
or device. Admin and public pages use the same local preference.

![Current homepage in dark mode. Actual local browser capture, with no backend connection.](screenshots/public-home-dark.png)

The wide desktop header keeps its links and controls on one row. The phone menu button stays disabled until the page controls are ready. On phones and
tablets, the header shows the logo and menu control. Open the menu for navigation,
appearance, language, sign-in and Book a collection. The menu scrolls on short screens.
Press Escape to close it and return keyboard focus to the menu control.

![Current phone menu. Navigation, appearance, language and actions are grouped inside the menu.](screenshots/public-navigation-phone.png)

![Current tablet menu. The header remains compact and the menu uses the side of the screen.](screenshots/public-navigation-tablet.png)

![Current Arabic phone menu. Labels and layout follow right-to-left direction.](screenshots/public-navigation-arabic-phone.png)

The logo mark turns once when you hover over it or use the keyboard to focus its
link. The name stays still. Reduced motion in your device settings disables the turn.

![Current Participants page in dark mode. Role descriptions and work scenes replace device mockups.](screenshots/public-participants-dark.png)

The Participants and role-help pages explain each role with work scenes and
written guidance. There are no phone or laptop mockups. The generated photos
provide context; they are not evidence of actual staff, facilities, customers,
safety certification or operational results. Tables and transaction records
remain the source for operational activity.

![Current household section on Participants. The work scene supports the role description.](screenshots/showcase-household.png)

![Current yard section on Participants.](screenshots/showcase-yard.png)

![Current admin section on Participants. Access still requires the admin sign-in and authenticator.](screenshots/showcase-admin.png)

![Current Arabic role-help image. The page uses right-to-left navigation and text.](screenshots/showcase-arabic.png)

On a role-help page, use the links at the top to jump to guides, questions or
training. Decorative images do not sign you in or create a record. Reduced
motion settings stop the decorative scroll effects.

![Current Arabic homepage in dark mode on a phone.](screenshots/public-arabic-dark.png)

![Current admin workspace in dark mode with synthetic documentation records. This is not authenticated access.](screenshots/admin-overview-dark.png)

![Current kabadiwala workspace in dark mode with synthetic documentation records.](screenshots/kabadiwala-overview-dark.png)

---

## 37 / Optional account security

Phone users keep phone-code sign-in. They do not need a password, and there is no phone-account password-reset form. An authenticator is an optional second check after the phone code. The admin still requires a password and an authenticator.

### Turn on an authenticator

1. Sign in with your phone code. Open the menu, then Account security.
2. Check that the authenticator status is Off. Select Set up.
3. If the page asks you to sign in again, use that action and complete sign-in. Security changes require a recent sign-in within five minutes. With protection already enabled, that sign-in must also pass the second check.
4. On your own device, scan the setup QR code with an authenticator app, or enter the setup key there.
5. Enter the current six-digit code to confirm setup.
6. Save the recovery codes in your private password manager or another secure place. Confirm that you saved them before leaving the page.
7. Check that the status is On. Sign out and complete one controlled sign-in to check your authenticator.

Never share or include a setup QR code, key or recovery code in a screenshot, chat, support request or team document. The screenshots below show only the status screen. They do not prove enrollment or sign-in.

![Account security with the authenticator off. Actual components, synthetic identity and disabled writes. No setup secret is present.](screenshots/account-security-en.png)

![Account security with the authenticator on in dark mode. This is a synthetic status fixture, not an enrolled account.](screenshots/account-security-enabled.png)

### Sign in when protection is on

After the SMS code, enter the current code from your authenticator. If the app is unavailable, select Use a recovery code and enter one unused recovery code. A recovery code works once. If the challenge expires, start sign-in again. Repeated invalid attempts can cause a temporary limit. Keep the device clock accurate for time-based codes.

The same second check appears during a household booking. The booking must wait until both sign-in steps finish. Closing a challenge does not confirm a booking.

![Empty authenticator challenge at phone width. This isolated screen does not contain or verify a real code.](screenshots/account-challenge-en.png)

![Empty recovery-code challenge. The field remains blank; no recovery credential is supplied.](screenshots/account-recovery-challenge.png)

### Replace codes or turn protection off

Open Account security after a recent full sign-in. Select Get new codes to replace the set. Read the confirmation: replacement invalidates the previous set. Store the new set securely. To turn off the optional authenticator, use its separate confirmation action. This option does not apply to the required admin authenticator.

If both the authenticator and all unused recovery codes are lost, contact the platform owner. There is no instant support bypass or self-service phone-number change. Never treat a screenshot or possession of an old tracking link as proof of account ownership.

---

## 38 / Inbox and device notifications

Open the account menu and select Notifications. Approved businesses also have account links in their workspace menu. The inbox belongs to the signed-in user. The device setting applies only to the current installation.

![Account menu at phone width. The synthetic session marker displays signed-in controls; all account changes are disabled.](screenshots/account-menu-en-light.png)

### Read an update

1. Open Notifications after sign-in.
2. Read Your updates. Pickup and application events appear with their date and time.
3. Select Mark read for one unread row. Read all changes at most 100 unread entries per press; use it again if unread entries remain.
4. Use Show more for older updates. The first read loads 20 rows.
5. If an action fails, check the error and retry after the connection returns. A failed action must not be treated as a saved read state.

An empty inbox means that no update is available in the loaded account view. A loading placeholder means that the read has not finished. These states do not mean that a notification reached a device.

![Notification inbox in light mode, with three synthetic events and no device provider. No provider request or delivery occurs.](screenshots/account-inbox-en-light.png)

![The same notification inbox in dark mode. Dates and event labels come from the real components and message catalogue.](screenshots/account-inbox-en-dark.png)

![Empty inbox example at phone width. The device setting is unavailable in this isolated fixture.](screenshots/account-inbox-empty.png)

### Enable alerts on this device

1. Read the status under This device. If delivery is unavailable, the connected inbox can still work.
2. Select Enable when the device and service support it. In the mobile app, read the app explanation, then choose whether to permit notifications in the operating-system prompt.
3. If permission is denied, the app remains usable. If the operating system blocks another prompt, change its notification setting before trying again.
4. When enabled, alerts use general Luma.Green text. Private pickup and application details remain in the signed-in application.
5. Open an alert to reach the inbox in the active language. If the session has ended, sign in before reading private updates.
6. Select Turn off to stop alerts for this installation. Inbox history stays available. Sign-out revokes this installation's registration before clearing the session. The notification control stays disabled while sign-out is pending. If sign-out reports an error, retry; do not assume that access or delivery has already ended.

Each explicit mobile alert tap opens the inbox, including a second tap after you visited another page. A notification does not grant account access. There is no action in the user interface to send an arbitrary notification to another person.

The server checks that the linked sign-in session is still active before starting each delivery. A notification already in transit can still arrive.

If device cleanup fails, its pending state remains after a reload. Retry sign-out
on that device; a reload alone does not prove that cleanup or sign-out finished.
If the matching backend has not been released yet, notification controls show
an unavailable state. Other pages and their unsaved forms remain usable.

Browser push needs HTTPS, browser support and backend VAPID settings. Mobile push needs an EAS project, APNs/FCM credentials and a suitable signed build. Desktop alerts work only while the Electron process is running. There is no claim of delivery after the desktop app quits.

Apple Developer, Google Play and Expo/EAS accounts are not yet set up. Use the release runbook before attempting a real device test. A local fixture, permission test, JavaScript export or provider acceptance receipt is not proof that a physical device received the alert.

![Arabic account menu in dark mode. The menu follows right-to-left layout; the visible note marks this as a synthetic documentation fixture.](screenshots/account-menu-ar-dark.png)

![Tamil inbox after a rejected Read all action. The real error state is shown; no stored record is changed.](screenshots/account-inbox-error.png)

---

## 39 / Connect your business systems

An approved business can give its ERP, stock or reporting system read access to
Luma.Green. This applies to kabadiwalas, yards, recyclers and manufacturers. The
first API version reads the business profile, material catalogue, recorded stock
and trade records. It can also supply optional industry news when the platform
operator has enabled the news provider. It cannot change stock, place orders,
transfer money or certify carbon credits.

### Create an API key

1. Sign in as the approved business owner. Open Compliance, then API access.
2. Enter a short key name that identifies the receiving system.
3. Select its read permissions. Select only the records the system needs.
4. Choose 1, 7, 30 or 90 days before expiry. The default is 30 days.
5. Select Create key. Copy the key into the receiving system's protected secret
   settings before you close the result. The full key is shown only once.
6. Give your integration operator the website address followed by /api/v1.
   Use OpenAPI specification for the exact request and response contract.
7. Test a request for a permission you selected. To confirm the business first,
   select Business details (`organization:read`) and test the organization request.

Staff and Saathis cannot manage keys. Each business can have up to five active,
unexpired keys. A key belongs to one business and one deployment. Development
and production credentials are separate. The API does not use a language prefix.

![API access with synthetic key metadata and no real secret. Actual application component in the isolated documentation preview; all writes are disabled.](screenshots/api-access-en-1440-light.png)

### Protect and replace a key

Keep the key in the server's secret store. Do not put it in a spreadsheet cell,
browser code, source repository, URL or support message. Give each system a
separate key. The screen shows the key name, safe prefix, permissions, expiry and
last-used date and time. It does not reveal the full secret again.

To replace a key, create another key, install it in the receiving system, test a
request, then revoke the old key. Revoke an unused key first if all five slots are
occupied. To stop access, select Revoke beside the key and confirm the action.
If the key is lost, revoke it and create a replacement. Removing its issuer's
owner membership or suspending the business also stops the connection.

![The API key list and actions at phone width after scrolling, with synthetic records. This capture checks layout; it does not prove authentication or an ERP connection.](screenshots/api-controls-en-390-light.png)

### Read the data correctly

The API uses integer grams for mass and integer paise for money. Keep Luma.Green
material codes beside your system's item codes. Material labels can be translated;
they are not stable identifiers. A factory can import its recorded purchases and
compare its stock with the ERP. A recycler can import its recorded sales.

Read all pages when importing inventory, materials or trades. List pages contain
up to 100 records; the default is 50. Trades have separate buyer and seller lists.
Records can change between requests, so a set of pages is not a guaranteed change
feed. Stage a full import and reconcile it before changing local records. An
incomplete scan does not prove that a record was removed.

A key permits 60 accepted requests per minute; the business total is 180 across
its keys. On a rate-limit response, wait for the stated retry period. An expired
or revoked key needs replacement. A denied permission needs an owner to issue a
key with the required scope. Never send the key when reporting an error; send the
request ID, route, time and response status.

Business payment states are still simulated. A trade record is not proof of bank
payment or a GST tax invoice. API access does not approve specialised or hazardous
waste handling. Material-specific evidence and workflows remain separate work.

### Optional industry news

The news permission reads English headlines selected from the business's recorded
material families. Each item includes its publisher, date and original article
link. Show those details when displaying a headline and open the publisher's link
for the article. The platform does not provide full article text or a news feed
screen in this release.

The platform operator must configure an approved NewsAPI plan and a daily quota.
News stays unavailable when it is disabled, the quota is used, or the provider
fails. The API does not substitute invented headlines. Provider access and a
successful live request must be checked separately from local tests.

### Language and appearance

The API access controls follow your selected app language and appearance.
Technical paths and key prefixes remain left-to-right. The examples below show
Arabic and Tamil with the same synthetic records.

![API access in Arabic and dark mode. This synthetic component capture checks right-to-left layout and does not show a live key.](screenshots/api-access-ar-390-dark.png)

![API access in Tamil at phone width. The translated labels wrap within their controls. Synthetic fixture, with all writes disabled.](screenshots/api-access-ta-390-light.png)

For developer examples, field definitions, setup and the planned webhook, write,
MCP and GraphQL stages, read docs/architecture/industry-api.md. The current release
is REST and read-only. Treat future stages as plans.

---

## 40 / Evidence and maintenance

The editable repository source is docs/user-guide/guide.md. The maintained Word document is output/docx/luma-green-user-guide.docx. The old PDF is an archived edition. Screenshots and their capture manifests live with the source. The repository README in that folder gives capture and rebuild commands.

The guide is based on the current route files, operational components, Convex functions and the native release runbooks. Primary owners include src/components/sell, app, market, saathi, join and admin; convex/households.ts, review.ts, adminPrices.ts, pilot.ts and support.ts; and docs/operations/app-releases.md.

Screenshots are retained as browser-produced PNG files. Public capture metadata records the route, capture time, Git revision and image hash. Protected-screen fixture metadata records the component and sample-data boundary. All guide figures were captured from the current build or its actual components. Replace protected-screen fixtures with authenticated captures when an approved staging environment is available; retain the evidence distinction until then.

### Required update procedure

When a route, role, permission, workflow, visible control, setup requirement or app update behavior changes, update the matching chapter. Re-capture changed screens with synthetic or approved test data. Update the capture metadata. Rebuild the Word document, check every rendered page, and commit source, screenshots, build record and Word document together. Once the Google Drive connection and document import are set up, update the same Google Docs document and retain its existing sharing settings and link. A UI commit alone does not automatically update an external document.

Do not silently substitute a mock for an authenticated screenshot. Do not claim provider delivery or account approval from a fixture. Keep the chapter's current limitations until a real verification record replaces them.
