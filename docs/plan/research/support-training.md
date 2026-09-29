# support-training

_Research brief, 29 September 2026. Headline:_ For low-literacy kabadiwalas and Saathis, the best-supported help model is a real person on WhatsApp or phone, backed by picture-and-voice step cards. Microsoft Research's India trials found text interfaces unusable by first-time low-literacy users and a live operator about 10x more accurate than text, and Meta charges nothing for WhatsApp support chats that the user starts.

# Luma.Green help centre: first content plan

**Where it lives:** `/help/{role}`, which the app shell already links to, plus a public `/help` index. Every guide and FAQ ends with **Still stuck? WhatsApp · Call · Write to us**. The form files a support request already tagged with role and topic. The topics come from `convex/support.ts`: account, pickup, prices, payments, documents, trade, solar, other.

**How items are built**

- **Guide:** 3-6 step cards. Each card has an icon, a real screenshot, one line of at most 12 words and a play button with a human voice. _(video)_ means the guide also gets a 30-60 second phone-shot clip with a real Bengaluru user.
- **FAQ:** a question and a one-line answer. The kabadiwala and Saathi hubs also get a voice clip for each answer.
- **Languages for Bengaluru:** Kannada, Tamil, Hindi, Urdu, Telugu and English get text and voice first. The other six locales show English marked "translation coming".
- **Data, not code:** each item is one record keyed by role, topic, language and slug, and the admin can edit it without a release. "Did this help? Yes / No" is logged to the pilot numbers.
- **[decide]** marks an answer that needs a founder decision before it is published.

## Channels and service levels (pilot, 13-20 Oct 2026)

| Channel                                           | Hours                                       | First reply                        | Resolved within                                 | Notes                                                     |
| ------------------------------------------------- | ------------------------------------------- | ---------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| WhatsApp (text or voice note), one support number | 8 AM-8 PM, every day                        | 15 min                             | Pickup-day issues: same day. Other issues: 24 h | Free when the user writes first. Away message after hours |
| Phone call, same number                           | 8 AM-8 PM                                   | Answer, or call back within 30 min | As above                                        | Missed calls get a call back                              |
| In-app help form                                  | Any time                                    | 2 h during hours                   | 24 h                                            | Lands in the admin inbox with role and topic              |
| Application questions                             | -                                           | -                                  | Decision in 12-24 h                             | Existing clock: "Due soon" at 18 h, "Overdue" at 24 h     |
| Safety (harm, threat, theft, accident)            | Any time (founder's phone during the pilot) | Call back within 10 min            | Same day; pause the account if needed           | Benchmark: Swiggy's SOS averages about 11 min             |
| Saathi pay or termination complaint               | -                                           | Acknowledge within 48 h            | 14 days                                         | Karnataka gig-worker Bill's standard                      |
| Account paused, appeal                            | -                                           | Reason shown at once               | Review within 7 days [decide]                   | Written to the audit log                                  |

## Every hub (shown at the top)

- **How do I change the language?** Tap the language button at the top and pick yours; 12 languages are available.
- **The SMS code didn't come.** Wait 30 seconds and tap Resend, and check the number. If it still doesn't come, WhatsApp us.
- **How do I put Luma.Green on my home screen?** Open luma.green in Chrome and tap Install or "Add to Home screen".
- **Can I use it without reading?** Yes. Tap the speaker on any card to hear it, and send us voice notes.
- **How do I reach a person?** WhatsApp or call our support number, 8 AM-8 PM every day, or write to support@luma.green.
- **Where does Luma.Green work?** Pilot areas of Bengaluru first; more cities later.
- **What do you do with my data?** We keep only what we need to check you and run bookings. Ask us any time to see or delete it.
- **Is Luma.Green free?** Yes for households. For businesses: free during the pilot [decide what comes after].

## Household (no account)

**Guides**

1. **Sell your scrap in 3 steps** _(video)_: snap photos → check the estimate → book → get paid at the door.
2. **Take photos that estimate well:** use daylight → spread items out → one photo per pile → correct the kilos if you know them.
3. **Book a home pickup:** choose Pickup → pick a shop and a time slot → confirm the address pin → enter your mobile → type the 6-digit SMS code.
4. **Drop off at a shop:** choose "I'll drop it off" → pick an open shop → show your drop-off code at the counter.
5. **Track your pickup:** open the SMS link → see when, who (with the verified badge) and how much → tap Call if needed.
6. **Weighing and payment at the door** _(video)_: watch the scale → check the kilos for each material → take cash or UPI → see the amount paid on your tracking page.
7. **Cancel or change a booking:** open the tracking link → Cancel (free until the kabadiwala is on the way) → book a new slot.
8. **Your points and past pickups:** open any tracking link sent to the same number → see kilos, rupees and recycle points.

**FAQs**

- **Do I need an account?** No. You confirm your mobile once with an SMS code when you book.
- **What do you take?** Paper, cardboard, plastic, metal, glass and e-waste. Not food, sanitary or medical waste.
- **Why was I paid a different amount from the estimate?** The estimate comes from photos; you are paid for the weighed kilos at the shop's price.
- **Who sets the price?** Each kabadiwala sets a price per kg, and Luma.Green never lets it go below our minimum.
- **How am I paid?** Cash or UPI from the kabadiwala at your door. Luma.Green records the payment but never holds your money.
- **Is there a pickup charge or a minimum amount?** [decide] Proposal: pickups are free during the pilot, and small loads are better dropped off.
- **What if no shop accepts?** After 15 minutes we offer the booking to the next nearest shop and send you an SMS.
- **Is the person who comes safe?** Only shops we have checked by hand get bookings. The tracking page shows their name, shop and a call button.
- **Who sees my number and address?** Only the kabadiwala who accepts your booking, and only after they accept.
- **What are recycle points worth?** [decide] You earn them for every kilo weighed; what they can be used for will be announced.
- **What happens to my photos?** We use them for the estimate and delete them after 90 days.
- **The weight looks wrong.** Ask for a re-weigh in front of you, then WhatsApp us your booking code.

## Kabadiwala

**Guides**

1. **Join Luma.Green** _(video)_: pick your language → phone → SMS code → "Kabadiwala" → shop form → Send for verification.
2. **After you apply:** you see "Under review, 12-24 hours" → answer our call → if it says "Changes requested", fix it and resubmit.
3. **Set my prices** _(video)_: My prices → type Rs per kg for each material (the minimum shows beside each) → Save.
4. **Accept or reject a pickup** _(video)_: Requests → tap the speaker to hear the request → Accept (the address and phone appear) or Reject.
5. **Auto-accept:** switch it on at the top of Requests → every request in your area is accepted at once, even at night → switch it off when you are closed.
6. **Today's pickups:** Today → Call → Directions → "I'm on the way".
7. **Weigh and pay** _(video)_: weigh each material → use − / + in half-kilo steps → check the amount → Cash or UPI → Save.
8. **Record sorting:** My stock → Sort → move kilos from mixed paper to newspaper, cardboard and reject → Save.
9. **Show stock to yards:** My stock → turn on "Show to yards" → a yard books a collection or tells you it is coming.
10. **Shop settings:** hours, weekly holiday, home pickups and vehicle, and up to two extra phone numbers (helper, partner).

**FAQs**

- **Do I need GST?** No, it is optional; just mark "Not GST-registered".
- **How long does verification take?** Usually 12-24 hours. We call your login number to check the shop.
- **Does Luma.Green take a commission?** [decide] No, not during the pilot.
- **Who pays the household?** You do, in cash or UPI at the door. The app only records it.
- **Why can't I set a lower price?** Luma.Green keeps a minimum for each material so households get a fair rate.
- **Rates changed today?** Update My prices before you leave; the weighing screen uses your current rates.
- **I have no vehicle.** Keep home pickups switched off. Households can still drop off at your shop.
- **When do I see the address and phone?** Right after you accept. Before that you see only the area.
- **What if I reject a request?** It goes to the next nearest shop, and the household is not told who said no.
- **The customer isn't home.** Call them from Today. If they don't answer, WhatsApp us the booking code. [decide the no-show rule]
- **I changed my phone.** Sign in with the same number and SMS code. If your number changed, call us.
- **My account says "paused".** The screen shows why; tap Contact us to talk to the team.

## Yard (preprocessor)

**Guides**

1. **Join as a yard:** business name → materials you handle → address pin and area tags → whether you collect from suppliers → hours.
2. **Upload documents:** issuing board (KSPCB, or your state's board) → consent number → valid-until date → certificate PDF → 2 or more machine photos or videos → declaration.
3. **"My unit needs no consent":** tick "Not required for our unit" → explain why (for example, paper baling only) → we check the claim.
4. **Find stock near you:** browse the stock kabadiwalas have published, by material, kilos and distance.
5. **Book a collection:** pick a lot → choose a day → tell the kabadiwala you are coming. (Details depend on how the kabadiwala-to-yard hand-off is designed.)
6. **Team numbers and hours:** Settings → up to two more numbers, hours and weekly holiday.
7. **Renew your consent:** we remind you 30 days before it expires → upload the renewed PDF.

**FAQs**

- **Which consent do I upload?** Your KSPCB consent in Karnataka, or your own state board's consent elsewhere.
- **My file won't upload.** PDFs and photos can be up to 10 MB, and videos up to 20 MB (MP4 or MOV).
- **Is GST required?** Optional now. It may become required once payments through Luma.Green start.
- **Why do you want machine photos?** So we can see a working unit. Show the main machines and the yard.
- **How do you check us?** We find your consent on KSPCB's public register, check your GST if you gave it, and call you.
- **How long does it take?** 12-24 hours from when you submit.
- **Who sees my documents?** Only you and the Luma.Green admin.
- **Who sets the price with kabadiwalas?** [decide] For now you agree it with the kabadiwala; live yard prices come later.
- **Who weighs and pays at collection?** [decide] This is being designed with the pilot yards.
- **I run more than one yard.** One address per account for now. WhatsApp us and we will set up the others.

## Recycler

**Guides**

1. **Join as a recycler:** business details → materials → address and area tags → hours.
2. **Upload documents:** consent and certificate PDF. Plastic recyclers also add their Plastic Waste Processor registration.
3. **Find sorted material:** browse yards' stock by material and distance _(when live)_.
4. **Request material from a yard:** pick a lot → quantity → date → send _(when live)_.
5. **Publish what you produce:** material, grade, monthly quantity and price → Publish _(when live)_.
6. **Team numbers and hours:** Settings.

**FAQs**

- **Do plastic recyclers need anything extra?** Yes: your Plastic Waste Processor registration from CPCB's EPR portal.
- **What can I do on Luma.Green today?** Get verified and list what you make. Buying and selling open after the Bengaluru pilot.
- **Do payments go through Luma.Green?** Not yet; escrow payments between businesses are planned.
- **Is GST required?** Optional now; it will probably be needed once escrow invoicing starts.
- **How long is verification?** 12-24 hours. We check your consent on the board's register and call you.
- **What are the file size limits?** PDFs and photos up to 10 MB; videos up to 20 MB.
- **What do buyers see about us?** Your business name, area, materials and whatever you publish. Your documents stay private.
- **Are yards checked?** Yes. Every yard's consent, or its "not required" claim, is checked by hand.
- **What about carbon credits?** Planned for later; not in the pilot.

## Manufacturer

**Guides**

1. **Join as a manufacturer:** business details → materials you buy → address → hours.
2. **Upload your certificate:** one PDF, your pollution-board consent or certificate.
3. **See what recyclers produce:** filter by material, grade and area _(when live)_.
4. **Place an order:** pick a lot → quantity → delivery date → send _(when live)_.
5. **Book Saathis for shifts:** choose the shift, number of people and date _(after the pilot)_.
6. **Team numbers and hours:** Settings.

**FAQs**

- **What do I need to join?** Your business details and one PDF (your pollution-board certificate). GST is optional.
- **How long is verification?** 12-24 hours.
- **Are recyclers verified?** Yes. Every recycler's consent, and GST if given, is checked by hand.
- **Can I pay through Luma.Green?** Not yet; escrow payments are planned.
- **Can I get traceability or recycled-content papers?** Planned as part of documentation services; not in the pilot.
- **I can't find the grade I need.** WhatsApp us the grade and monthly quantity, and we will ask recyclers.
- **Can I hire Saathis?** After the pilot. You will pay them directly.
- **Who sees my orders?** Only you, the seller and the Luma.Green admin.

## Saathi

**Guides**

1. **Join as a Saathi** _(video)_: name as on your ID → area and radius → work you want → vehicle → when you can work.
2. **Photo ID and selfie:** upload a voter ID, driving licence, PAN, DigiLocker document or masked Aadhaar → take a selfie.
3. **After you apply:** status in 12-24 hours → answer our call → fix anything we ask for.
4. **Saathi Ready** _(video)_: 5 picture cards (safety, what never to touch, honest weighing, behaviour at homes, SOS) → short picture quiz → badge.
5. **Take a job** _(after the pilot)_: see jobs within your radius → Accept → call the shop → go.
6. **Do a home pickup:** arrive → greet → weigh in front of the household → hand the scrap to the kabadiwala.
7. **Get help fast:** tap Help → WhatsApp or call us. In danger, call 112 first.
8. **Change your details:** area, radius, vehicle, working times.

**FAQs**

- **Which ID can I use?** Voter ID, driving licence, PAN, a DigiLocker document, or an Aadhaar showing only the last 4 digits.
- **Why a selfie?** To match your face with your ID. Only the admin sees it.
- **How long does verification take?** 12-24 hours. We call your number.
- **When do jobs start?** After the Bengaluru pilot. We will SMS you when jobs open near you.
- **Who pays me?** The kabadiwala or company you work for. [decide] Pay will be shown before you accept a job.
- **Do I need a vehicle?** No. Choose "None"; shop and yard shifts need no vehicle.
- **How far will I travel?** Only within the radius you chose: 2, 5 or 10 km.
- **Can I say no to a job?** Yes, always.
- **Do I need police verification?** [decide] Possibly, for home pickups.
- **Is there insurance?** [decide] Not yet.
- **I'm hurt or unsafe.** Call 112 in an emergency, then call us. We call back within 10 minutes.
- **My account is paused.** We show you the reason. Tap Appeal and we reply within 14 days.

## Admin and support team (internal playbook)

**Guides**

1. **Verify an application:** open the queue ("Due soon" at 18 h, "Overdue" at 24 h) → tick the checklist → call the login number → Approve.
2. **Ask for changes or reject:** write one plain sentence in the applicant's language → send. It is shown to them and logged.
3. **Answer a support request:** read the role and topic → reply on WhatsApp or by phone → mark it Answered.
4. **Weight or payment dispute:** call both sides → compare weighed kilos × rate card → record the outcome.
5. **Safety incident:** call back within 10 minutes → pause the account if needed → follow `docs/operations/incidents.md`.
6. **Pause or restore an account:** choose a reason → the user sees it → the appeal clock starts.
7. **Edit a help card:** change the text → mark the other languages "translation coming" → re-record the voice clip.

**FAQs**

- **Someone sent a full Aadhaar.** Delete it and ask for a masked copy.
- **The applicant can't read our note.** Call them, then follow up with a voice note in their language.
- **A household says they were underpaid.** Check weighed kilos × the shop's rate card. If the shop got it wrong, warn the shop.
- **A kabadiwala keeps rejecting requests.** Check their prices against the minimum and call them. Unprofitable pickups trigger the pilot's stop rule.
- **A night booking got no answer.** Dispatch moves it after 15 minutes. Call the household when support opens.
- **A voice note came in a language we don't speak.** Transcribe and translate it, then reply with a recorded answer.
- **What do we measure?** Requests by role and topic, time to first reply, time to resolve, and "Did this help?" rates.
- **When is it an incident?** Safety, exposed personal data, or a money dispute not settled within a day: follow `incidents.md`.

## Ship order

- **Now (investor prototype):** the "Every hub" block; Household guides 1, 3, 5 and 6; Kabadiwala guides 1, 3, 4 and 7; Saathi guides 1 and 4; all FAQs as text in English, Kannada and Hindi; the Help button with WhatsApp, Call and the form.
- **Before the pilot (by 12 Oct):** voice clips for every household and kabadiwala item in Kannada, Tamil, Hindi and Urdu; the 5 videos; the printed A5 shop card and household door card; the support number live on the WhatsApp Business app.
- **During the pilot:** each week, add answers to the 10 most-asked real questions; settle every [decide].
- **After the pilot:** the yard, recycler and manufacturer "when live" guides; Telugu voice; the other six languages; IVR and the shared inbox.

## Recommendations

- **A Help button on every screen that opens WhatsApp with the context filled in** (prototype-now): The button offers three ways to get help:
- WhatsApp: a wa.me link whose prefilled message includes the role, the screen, the booking or application code and the language.
- Call: a tel: link.
- Write to us: the existing form in convex/support.ts.
  It needs no API and costs Rs 0, because chats the user starts are free. It is also one tap to a real person, the channel that worked best for low-literacy users in Microsoft Research's India trials. It is easy to show investors now.
- **Per-role help hubs at /help/{role}, built from picture-and-voice step cards and stored as data** (prototype-now): The app shell already links to these hubs. Each hub has 6-10 how-to cards and 8-12 FAQs (see the plan below). Each step shows an icon, a screenshot, one line of text and a human voice clip, using the same material icons and colours as the app. Content is keyed by role, topic, language and slug, with an English fallback marked 'translation coming'. A 'Did this help?' tap is logged to the pilot events (ADR 0012). This follows the founder's rule that data must be easy to change, and the evidence that pictures and voice beat text for these users.
- **'Saathi Ready': a short first-job module with a picture quiz and a badge** (prototype-now): Five picture cards: safety and gloves, what never to pick up, weighing in front of the customer, behaviour inside homes, and how pay and SOS work. A 5-question picture quiz follows. Passing puts a 'Ready' badge on the Saathi's profile that kabadiwalas can see. Swiggy makes training mandatory at onboarding, and Urban Company certifies through NSDC. It tells investors a strong workforce-quality story and reuses the step-card component. It can be mapped to a skill-council certificate later.
- **A pilot help desk on the free WhatsApp Business app, with published service levels** (pilot): One number for calls and WhatsApp, open 8 AM to 8 PM every day during 13-20 October 2026:
- Greeting and away messages, and quick replies in Kannada, Tamil, Hindi, Urdu and English.
- Labels by role and status.
- The founder and two testers on linked devices (the app allows up to 10).
- Each chat also logged as a support request, so support volume shows up in the pilot numbers.
  Targets: first reply within 15 minutes during hours; pickup-day problems fixed the same day; everything else within 24 hours; safety call-back within 10 minutes. It costs nothing and beats the competitor norm of 'within 24 hours'.
- **Voice-first support: accept voice notes, answer with recorded voice, add transcription as volume grows** (pilot): WhatsApp voice notes work on day one at no cost. Add a hold-to-record button to the in-app help form, saving the recording as a private file. Keep pre-recorded voice answers for the top 20 questions in each pilot language. When a note arrives in a language the team doesn't speak, send it through Sarvam speech-to-text and translation, at about Rs 0.25 per 30-second note, across 22 Indian languages including Kannada, Tamil, Telugu and Urdu. Many kabadiwalas and Saathis cannot or will not type.
- **A doorstep onboarding kit for every pilot kabadiwala and yard** (pilot): A 20-30 minute visit to the shop covering:
- Installing the app to the home screen, signing in and setting prices.
- One practice booking run end to end with a demo household, and auto-accept switched on if wanted.
- Naming a 'digital buddy' (a family member or helper).
- Leaving a laminated A5 picture card with the support number, a WhatsApp QR code and the 5 key steps in Kannada, Tamil, Urdu and Hindi.
  This follows the models that worked: Hasiru Dala's youth facilitators and peer trainers, ITC WOW's field demonstrations and Digital Green's facilitators. The pilot plan already includes weekly check-in calls.
- **'Show-me' videos with real Bengaluru kabadiwalas** (pilot): Five vertical clips of 30-60 seconds each: book a pickup, accept and reach, weigh and pay, set my prices, show stock to yards. Shoot them on a phone in Kannada, then dub or subtitle into Tamil, Hindi, Urdu and Telugu. Keep each file under 5 MB or host it as an unlisted video, and link each one from its matching step card. Digital Green saw 7x the adoption from peer-made local video. The clips double as investor material.
- **Complaints and appeals with visible clocks** (pilot): Give each request type a clock in the admin inbox, like the existing 18/24-hour verification clock. Types: pickup problem, weight or payment dispute, price complaint, account paused, Saathi pay or termination, safety. The 'account paused' screen always shows the reason and a one-tap Appeal. Saathi pay and termination complaints are tracked to 14 days, the Karnataka Bill's standard, and every step is written to the audit log. Karnataka's gig Bill, Fairwork's appeal-and-redress principle and the 2024 Urban Company protests in Bengaluru all point here.
- **A household door card and a help link in the follow-up SMS** (pilot): At the first pickup, the kabadiwala or Saathi hands over a small picture card: what is taken and not taken, keep dry scrap apart, and how to rebook (a QR code to /sell and the WhatsApp number). The two-question follow-up SMS already in the pilot plan gains a 'Need help? WhatsApp us' link. In ITC WOW's Bengaluru survey, having a working collection service (71.9%) and collectors' reminders changed behaviour more than campaigns (44.3%).
- **One number, many ways in: IVR, missed-call callback and a shared inbox** (scale): Move to MSG91 Hello (Rs 1,500-3,000 a month plus GST) for a shared inbox with service-level tickets and a knowledge base. MSG91 is already the SMS vendor. Add an IVR language menu and missed-call-to-callback on the same number, plus spoken status checks such as 'press 1 for today's pickups'. This is the National Consumer Helpline's model and Gram Vaani's reach, and it serves helpers with feature phones.
- **A community trainer network and certification partners** (scale): In each new city, contract community trainers, paid per active onboarded user. Candidates: waste-worker groups such as Hasiru Dala and Saahas, dry waste collection centre operators, and digitally skilled youth from waste-worker families. Give them a train-the-trainer kit (cards, videos, quiz, checklist) and record in Convex which trainer onboarded which user. Route Saathis to NSDC or skill-council certification and help them sign up for government schemes. Evidence: Hasiru Dala's 2,314 trainings for 61,114 people, ITC's 83 community resource persons, and Digital Green's 10x cost-effectiveness. This is how onboarding reaches all of India without a large staff.

## Risks

- One WhatsApp number is a single point of failure. If users report it as spam or the account is restricted, support goes dark. Keep the phone line and the in-app form, and use only official WhatsApp apps and APIs.
- The founder is both admin and support. With auto-accept, bookings arrive at night, so problems will too. Without published hours, an away message and a rota, response times will slip and burn the team out.
- Machine translation and text-to-speech in lower-resource languages (Urdu, Tamil dialects) can get money and safety details wrong. Use human-recorded voice for prices, payments, safety and account actions.
- Privacy: voice notes, screenshots and ID photos sent on WhatsApp land on staff phones. Use a dedicated work phone with linked devices, never ask for Aadhaar numbers in chat, and delete media after the case closes, following docs/operations/data-protection.md.
- Content sprawl: 7 roles × about 18 items × 12 languages is about 1,500 strings and clips. Without one data model, one owner and 'translation coming' flags, help content will go stale. Keep five voice languages for Bengaluru first.
- Kabadiwalas lose shop time in training. Classroom sessions and long modules will be skipped, so keep onboarding at the shop, under 30 minutes, and tied to real first bookings.
- Most tickets will be disputes over estimate versus weighed payout. Without a 'weigh in front of the customer' rule and a clear FAQ, households will blame Luma.Green, not the shop.
- Saathi suspensions without reasons or an appeal path risk a repeat of the 2024 Urban Company protests in Bengaluru, and non-compliance with Karnataka's gig-worker law.
- Meta can change template prices at any time, and India billing must move to INR by 31 December 2026. Budget for proactive notifications separately from free support chats.

## Open questions

- Which number becomes the support line (a new SIM or a virtual number)? Can the same number move from the WhatsApp Business app to the Cloud API or MSG91 later without losing chat history?
- Who answers after 8 PM when auto-accepted night bookings go wrong, and should auto-accept be limited to opening hours during the pilot?
- Is Luma.Green an 'e-commerce entity' under the Consumer Protection (E-Commerce) Rules 2020? If so it needs a grievance officer, and (to be verified with counsel) must acknowledge complaints within 48 hours and resolve them within one month. What complaint response times do the DPDP Rules 2025 set?
- Has Karnataka's Platform-based Gig Workers Bill 2025 been notified along with its rules, and does the internal dispute committee and 1-5% welfare fee apply to Saathis at pilot scale?
- Would Hasiru Dala, Saahas or ITC WOW's dry waste collection centre operators co-run kabadiwala and Saathi onboarding in Bengaluru, and on what terms (fee per onboarding, data sharing)?
- Who records the human voice clips in Kannada, Tamil, Hindi and Urdu before 13 October, and is Telugu needed for the pilot neighbourhoods?
- Several FAQ answers need founder decisions: whether pickups carry a charge or minimum quantity, what recycle points are worth, fees for businesses after the pilot, the no-show rule, Saathi pay display, insurance and police verification.
- Do outbound IVR or automated voice reminders need TRAI/DLT registration (for example the 140/160 number series) before they are used at scale?

## Sources

- [Designing mobile interfaces for novice and low-literacy users (Microsoft Research, ACM ToCHI 2011)](https://www.microsoft.com/en-us/research/publication/designing-mobile-interfaces-for-novice-and-low-literacy-users/)
- [Digital Green: Participatory Video for Agricultural Extension (Microsoft Research, ITID 2009)](https://www.microsoft.com/en-us/research/publication/digital-green-participatory-video-for-agricultural-extension/)
- [WhatsApp Business Platform pricing (Meta for Developers)](https://developers.facebook.com/docs/whatsapp/pricing/)
- [WhatsApp Business app features](https://whatsappbusiness.com/products/business-app-features/)
- [MSG91 Hello pricing (India)](https://msg91.com/in/pricing/hello)
- [Sarvam AI API pricing](https://www.sarvam.ai/api-pricing)
- [Sarvam speech-to-text API: supported languages and formats](https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe)
- [With help from next-generation AI, Indian villagers gain easier access to government services (Microsoft, Jugalbandi, 2023)](https://news.microsoft.com/source/asia/features/with-help-from-next-generation-ai-indian-villagers-gain-easier-access-to-government-services/)
- [National Consumer Helpline (Government of India)](https://consumerhelpline.gov.in/)
- [Gram Vaani: About (Mobile Vaani IVR)](https://gramvaani.org/about-us/)
- [Hasiru Dala: Training Programmes](https://hasirudala.in/initiatives/training)
- [ITC WOW Integrated Impact Assessment: Delhi, Bengaluru, Hyderabad (March 2025)](https://itcportal.com/content/dam/itc-corporate/pdfs/sustainability-corporate-social-responsibility/impact-assessment-07-08-2025.pdf)
- [Saahas: About us](https://saahas.org/about-us/)
- [Swiggy: Community (delivery partner training and welfare)](https://www.swiggy.com/corporate/sustainability-overview/community/)
- [Urban Company (Wikipedia: NSDC training agreement, 2024 Bengaluru protests)](https://en.wikipedia.org/wiki/Urban_Company)
- [Fairwork India Ratings 2024](https://fairwork.oii.ox.ac.uk/en/ratings/india/)
- [PRS: The Karnataka Platform-based Gig Workers (Social Security and Welfare) Bill, 2025](https://prsindia.org/bills/states/the-karnataka-platform-based-gig-workers-social-security-and-welfare-bill-2025)
- [Bangalore (Wikipedia: Census 2011 languages)](https://en.wikipedia.org/wiki/Bangalore)
- [Diataxis documentation framework](https://diataxis.fr/)
- [ScrapUncle (WhatsApp support hours)](https://scrapuncle.com/)
