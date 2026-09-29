# Payments and finance

_Research brief, 29 September 2026. Headline:_ Escrow for scrap trades is doable without a licence through a payment aggregator, at about 0.1–0.25% per held transfer plus about ₹20 per bank-transfer collection (against about 2% + GST through checkout). But RBI's September 2025 rules only allow split settlement to sellers once Luma has more than ₹40 lakh of its own turnover, and collecting trade money makes Luma withhold 0.5% GST TCS and 0.1% income-tax TDS on every trade. So the pilot should keep money off-platform and only record it.

## Money flow 1: one household pickup (Bengaluru pilot)

**Example:** a verified kabadiwala picks up 24 kg from a home. Rates come from the prototype's Bengaluru fallback table. Luma stores every amount in paise and every weight in grams.

| Material       |     Weighed |   Rate |      Amount |
| -------------- | ----------: | -----: | ----------: |
| Newspaper      |     12.0 kg | ₹14/kg |     ₹168.00 |
| Cardboard      |      4.0 kg | ₹10/kg |      ₹40.00 |
| PET bottles    |      3.0 kg | ₹20/kg |      ₹60.00 |
| Iron and steel |      5.0 kg | ₹28/kg |     ₹140.00 |
| **Total**      | **24.0 kg** |        | **₹408.00** |

| #   | Step                                                                                                                               | Who pays whom                              |  Amount |                       Fee |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------: | ------------------------: |
| 1   | Photo estimate and booking, confirmed by SMS code                                                                                  | Nobody. Luma pays its own AI and SMS costs |      ₹0 |                        ₹0 |
| 2   | Kabadiwala weighs each material. The app prices each line from their rate card, never below the admin's minimum                    | —                                          | ₹408.00 |                        ₹0 |
| 3a  | Payment in cash at the door                                                                                                        | Kabadiwala → household                     | ₹408.00 |                        ₹0 |
| 3b  | Or UPI: the kabadiwala scans the household's UPI QR or pays their UPI number. Person-to-person, instant, up to ₹1 lakh per payment | Kabadiwala → household                     | ₹408.00 |                        ₹0 |
| 4   | Kabadiwala taps "Cash" or "UPI" and can add the 12-digit UPI reference. Luma saves the receipt                                     | —                                          |       — |                        ₹0 |
| 5   | Household gets an SMS link to the itemised receipt and their recycle points                                                        | —                                          |       — | About 1 SMS, paid by Luma |

**Result**

| Party      |                       Money | Other                     |
| ---------- | --------------------------: | ------------------------- |
| Household  |                    +₹408.00 | —                         |
| Kabadiwala |                    −₹408.00 | +24 kg of stock           |
| Luma       | ₹0 revenue, ₹0 payment fees | Moves no money (ADR 0009) |

**Tax notes**

- A household selling its own scrap owes no GST.
- A kabadiwala below the GST registration limit charges none.
- **Open question:** if Luma counts as an "e-commerce operator", 0.1% TDS applies, which is ₹0.41 here. People selling under ₹5 lakh a year are exempt only if they give their PAN or Aadhaar.
- **Later in the chain:** when the kabadiwala sells the 5 kg of iron to a GST-registered yard, the yard pays 18% GST on it under reverse charge.

## Money flow 2: one yard-to-recycler trade

**Example** (from the prototype's demo world): Peenya Paper & Plastic Yard sells 2,000 kg of baled PET bottles to GreenLoop Polymers at ₹38/kg.

| Invoice line                                                                                     |                                                                                                      Amount |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------: |
| Taxable value: 2,000 kg × ₹38                                                                    |                                                                                                  ₹76,000.00 |
| GST at 18% (assumed rate for plastic scrap; confirm the HSN code)                                |                                                                                                  ₹13,680.00 |
| **Invoice total**                                                                                |                                                                                              **₹89,680.00** |
| Income-tax TCS on scrap, if GreenLoop gives the "for manufacturing" declaration                  |                                                                                                          ₹0 |
| Same TCS without the declaration, if the yard is a company or firm or has over ₹1 crore turnover | 1% = ₹896.80, or 2% (proposed from 1 Apr 2026) = ₹1,793.60 on the invoice value; confirm the base with a CA |
| Extra step if this were metal scrap                                                              |                                                       GreenLoop would also keep back 2% GST TDS = ₹1,520.00 |

### Path A, the pilot: Luma records, money goes bank to bank

| #   | Step                                                                                                                                                            |                             Money |                            Fee |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------: | -----------------------------: |
| 1   | GreenLoop accepts the yard's offer in Luma                                                                                                                      |                                 — |                             ₹0 |
| 2   | Yard dispatches the load with a tax invoice and an e-way bill (needed because the value is over ₹50,000)                                                        |                                 — |                             ₹0 |
| 3   | GreenLoop weighs the load at its weighbridge. The weight and a photo of the slip go into Luma. The invoice is adjusted if the weight differs                    |                                 — |                             ₹0 |
| 4   | GreenLoop pays the yard's verified bank account by NEFT or IMPS and enters the bank reference (UTR). UPI is only possible up to ₹1 lakh; RTGS starts at ₹2 lakh | ₹89,680.00 from GreenLoop to yard | The bank's own transfer charge |
| 5   | Luma marks the trade complete. If the yard is a Udyam micro or small enterprise, Luma shows the 45-day MSMED due date                                           |                                 — |                             ₹0 |

**Result:** the yard receives ₹89,680.00. Luma collects no money, so it owes no GST TCS. Any Luma fee is billed separately.

### Path B, later: escrow through a payment aggregator

This uses Razorpay Route as the example. It assumes Luma's fee is 1% of the taxable value, charged to the seller.

| #   | Step                                                                                                                                             |                     Money |                                                                    Fee (including 18% GST on fees) |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------: | -------------------------------------------------------------------------------------------------: |
| 1   | Luma creates a virtual bank account (VA) for this trade                                                                                          |                         — |                                                                                                  — |
| 2   | GreenLoop pays into the VA by NEFT or IMPS. The money sits in the aggregator's escrow account at a scheduled commercial bank                     |             ₹89,680.00 in | About ₹23.60 (₹20 flat, Cashfree's list price). Paying through checkout at 2% would cost ₹2,116.45 |
| 3   | Luma creates a Route transfer to the yard's linked account with `on_hold: true`                                                                  |           ₹88,327.20 held |                                              Route fee 0.25% = ₹260.57 (₹104.23 at the 0.1% offer) |
| 4   | Yard dispatches with an e-way bill. GreenLoop weighs the load and confirms in Luma within the agreed time. If GreenLoop disputes, the hold stays |                         — |                                                                                                  — |
| 5   | Luma sets `on_hold: false`, or the `on_hold_until` time passes. The money settles to the yard on its normal cycle, usually the next working day  |            ₹88,327.20 out |                                                                                                  — |
| 6   | Luma pays GST TCS at 0.5% (₹380.00) and income-tax TDS at 0.1% (₹76.00) to the government. The yard claims both back as tax credits              | ₹456.00 to the government |                                                                                                  — |
| 7   | Luma keeps its fee of ₹760.00 plus ₹136.80 GST                                                                                                   |                   ₹896.80 |                                                                                                  — |

**Check:** ₹88,327.20 + ₹380.00 + ₹76.00 + ₹896.80 = ₹89,680.00

**What each side ends up with**

- **Luma's margin** is about ₹760.00 − ₹240.82 in aggregator fees before GST (₹20.00 + ₹220.82) = ₹519.18, which is 0.68% of the taxable value. At Route's offer rate it is ₹651.67.
- **The yard's real cost** is ₹760.00. The TCS and TDS come back as tax credits, and the GST on Luma's fee is an input credit if the yard is GST-registered.

**Before Path B can go live, Luma needs:**

- More than ₹40 lakh of its own turnover in GST-3B returns (the RBI rule, which Razorpay applies)
- The payer-payee declaration
- GST registration as an e-commerce operator
- A TAN for deducting TDS
- A written policy on disputes and how much weight difference is accepted

The fees above come from two providers' public price lists: Razorpay for Route and Cashfree for the virtual account. In practice one aggregator would be used.

## How fast the money lands

| Payment rail                                   | Speed                                           | Limit                                                        |
| ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| UPI (person-to-person, most merchant payments) | Seconds                                         | ₹1 lakh per payment (₹2–5 lakh for some merchant categories) |
| NEFT                                           | Half-hourly batches, 24×7                       | —                                                            |
| RTGS                                           | Real time, 24×7                                 | Minimum ₹2 lakh                                              |
| Aggregator settlement (Razorpay, Cashfree)     | Next working day as standard; instant for a fee | —                                                            |
| Route transfer after release                   | Next working day                                | —                                                            |
| TReDS (a yard's invoice to a large buyer)      | Within 24 hours of the best bid                 | Sellers must be MSMEs                                        |

## Recommendations

- **Weigh-and-pay receipt: one tap for 'Paid in cash' or 'Paid by UPI', an optional UPI reference, and an SMS link to the itemised receipt** (prototype-now): Households and kabadiwalas already settle at the door in cash or person-to-person UPI, free and well under the ₹1 lakh UPI cap. Recording itemised receipts (grams × paise per kg, as ADR 0009 plans) proves 'business done through Luma' to investors without any payment licence. If a UPI app blocks the hand-off, the kabadiwala scans the household's own UPI QR instead.
- **Trade timeline with escrow stages and a live breakdown of fees and taxes, using simulated money** (prototype-now): The trades table already has a paid_to_escrow state. The screen shows the steps funded → dispatched (e-way bill) → weighed → released, with lines for GST, 0.5% GST TCS, 0.1% TDS, the payment aggregator's fee and Luma's fee. That shows investors the trust and compliance layer before any real money moves. Later the simulation can be swapped for Razorpay Route test mode, using held (on_hold) transfers.
- **A dated 'money rules' table in the admin console** (prototype-now): These rates change by government notification: e-commerce TCS went from 1% to 0.5% in 2024, scrap TCS was proposed to go from 1% to 2% in April 2026, and NPCI can revise UPI merchant limits. Store fee and tax rates as whole-number basis points, and limits (₹10,000 cash, ₹50,000 e-way bill, ₹1 lakh UPI, ₹2 lakh RTGS minimum) in paise, each with an effectiveFrom date like the price tables. The admin then changes data, not code, and old trades keep the rates they used.
- **A verified payout account at onboarding: a bank account or UPI ID whose holder name is matched** (pilot): With a reverse penny drop from Razorpay or Cashfree, the user sends ₹1 by UPI, gets it refunded, and the check returns the registered account name. The admin can compare it with the GST or PAN name in the application. Business buyers then pay a verified payee, and their bank's NEFT/RTGS name check (which RBI made mandatory from 1 Apr 2025) confirms it again.
- **Pay-on-delivery for kabadiwala-to-yard and yard-to-recycler trades: weighbridge confirmation, capture of the bank reference (UTR), and due-date reminders** (pilot): Money stays off-platform, so no payment aggregator and no GST TCS, while business payments become digital and traceable. Show the MSMED 45-day due date for Udyam micro and small sellers (compound interest at three times the bank rate after that). Warn yards before a cash payment above ₹10,000 per person per day, because it is not tax-deductible.
- **Yard compliance pack: self-invoice data for metal bought from unregistered kabadiwalas, e-way bill flags, and a monthly purchase register** (pilot): Registered yards pay the GST themselves (reverse charge) on metal scrap bought from unregistered sellers. They also need e-way bills for loads over ₹50,000, including goods bought from unregistered persons. Building this from Luma's receipts turns a compliance chore into a reason to use Luma. Every document should say 'confirm with your CA'.
- **Escrow through a payment aggregator: the buyer pays into a virtual account and Luma holds a Razorpay Route transfer until delivery (Cashfree Easy Split as a second provider; PhonePe's gateway as a checkout option)** (scale): A bank transfer into a virtual account (about ₹20) plus a held transfer (0.1–0.25%) keeps costs under about 0.3% of a trade, against about 2.4% through checkout. Money is released when the buyer confirms the weight, or automatically at on_hold_until. Before this can go live Luma needs:
- more than ₹40 lakh of its own turnover
- the payer-payee declaration
- GST registration as an e-commerce operator
- a TAN for deducting TDS
- **Bank escrow with a trustee for large recycler-to-manufacturer orders (RazorpayX Escrow+ or CastlerX)** (scale): A three-party escrow (depositor, trustee, bank) doesn't depend on the aggregator's ₹40 lakh turnover rule and fits orders of ₹10 lakh and more paid by RTGS. Pricing is quote-based, so start with one buyer-seller pair and one bank.
- **Working-capital offers inside Luma, with Luma acting as a lending service provider** (scale): Three existing products fit:
- NBFC purchase finance (Oxyzo-style) lets a yard pay the kabadiwala on the spot and repay in 60–120 days.
- TReDS gets Udyam yards selling to buyers with ₹250 crore+ turnover paid within 24 hours of the best bid.
- Mudra loans and the ₹5 lakh micro-enterprise credit cards suit kabadiwalas.

Luma's receipt history is the underwriting data. Luma must follow RBI's 2025 digital-lending rules: show all offers, keep no pooled accounts, and be paid by the lender, not the borrower.

- **Capture Udyam (or Udyam Assist) registration and GSTIN at onboarding, with the benefits explained in plain words** (pilot): Udyam registration is free, and Udyam Assist covers informal micro enterprises. It unlocks the 45-day payment protection, TReDS, Mudra loans and the Budget 2025 micro-enterprise credit cards. An optional field and a help link in onboarding cost almost nothing.
- **Built-in insurance: accident and health cover for Saathis and kabadiwalas, goods-in-transit cover on escrow trades, and help with e-Shram registration** (scale): Budget 2025 extended PM-JAY health cover and e-Shram registration to platform gig workers. One insurer partner could price accident cover and per-trade transit cover, which also reduces the risk of escrow disputes. Get quotes before promising any figures.

## Risks

- Letting trade money pass through Luma's own bank account would be unauthorised payment aggregation under the Payment and Settlement Systems Act. Every rupee held for a trade must sit in an authorised payment aggregator's escrow or a bank escrow.
- Razorpay switched off Route for accounts that had not proved their turnover and signed the payer-payee declaration by 31 Dec 2025. A pre-revenue Luma may not reach ₹40 lakh of its own GST-3B turnover, which would delay escrow unless it uses a bank escrow or onboards each seller as its own merchant.
- Escrow makes Luma a tax collector: registration as an e-commerce operator, 0.5% GST TCS deposits and monthly returns, and 0.1% TDS under a TAN. Missed filings bring interest and penalties.
- Luma could be treated as an e-commerce operator even while money stays off-platform. Then 0.1% TDS is deemed on sales paid directly between the parties, and households and kabadiwalas under ₹5 lakh a year are exempt only if they give their PAN or Aadhaar.
- Checkout fees (2% + GST, even on UPI) are larger than a 1% take rate. Business payments have to be steered to bank transfers, and UPI's ₹1 lakh cap blocks most truckloads anyway.
- If Luma records cash business deals, it is documenting yards' non-deductible payments (over ₹10,000 per person per day) and prohibited cash receipts (₹2 lakh or more). The app should steer these payments to digital methods.
- Reverse-charge GST on metal scrap, the 2% GST TDS and e-way bills are the yards' and recyclers' duties. Wrong HSN codes or rates on Luma's receipts could mislead their GST filings, so every document should say 'for information; confirm with your CA'.
- If the proposed rise of scrap TCS to 2% was enacted, recyclers that cannot give a manufacturing declaration will need more working capital.
- Some UPI apps may block or limit person-to-person payment links opened from another app. Scanning the household's UPI QR must stay available as the fallback.
- As a lending service provider, Luma takes on RBI conduct duties (showing all lenders' offers, no pooled accounts, a grievance officer) and reputational risk if kabadiwalas default.
- If Luma pays Saathis itself, Karnataka's welfare fee (1–5% of each payout) and registration duties may apply. Keep Saathi pay directly between the Saathi and whoever hires them until this is clear.

## Open questions

- Is Luma an 'e-commerce operator' under the Income-tax Act 2025 (section 393(1), row 8(v)) and under CGST section 52 for bookings where money never passes through it? This is repo open question 12.
- Does the Act's definition of 'scrap' cover post-consumer recyclables that yards sell (newspaper, PET, cartons)? And did Finance Act 2026 enact the 2% scrap TCS rate unchanged from 1 Apr 2026?
- Which GST rate and HSN code apply to each material in the catalogue after the 22 Sep 2025 rate changes? What value threshold applies to the 2% GST TDS on metal scrap?
- Will Razorpay or Cashfree let Luma split payments to sellers before Luma has ₹40 lakh of its own turnover? If not, should each yard and recycler be onboarded as its own merchant, or should escrow be a bank escrow with a trustee (RazorpayX Escrow+, CastlerX)?
- Who pays Luma's fee on business trades (buyer, seller or both)? Does Luma charge kabadiwalas for household pickups, per pickup or as a subscription?
- What weight difference and what time window release escrow? For example, within ±1% at the buyer's weighbridge, confirmed within 48 hours.
- Is Luma an 'aggregator' under Karnataka's gig-workers law for Saathi jobs? If so, which welfare-fee rate category applies?
- Which bank or NBFC partners will lend in the Bengaluru pilot (for example Mudra loans through a partner bank, or NBFC purchase finance)? Will they accept Luma's receipts as underwriting data?

## Sources

- [RBI Master Direction on Regulation of Payment Aggregator (PA), 15 Sep 2025](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12896&Mode=0)
- [RBI Statement on Developmental and Regulatory Policies, 9 Apr 2025 (UPI transaction limits)](https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=60178)
- [Reserve Bank of India (Digital Lending) Directions, 2025](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12848&Mode=0)
- [Income-tax (No. 2) Bill, 2025 as passed, now the Income-tax Act, 2025 (PRS copy)](<https://prsindia.org/files/bills_acts/bills_parliament/2025/Bill_as_passed_by_LS_Income_Tax_(No.2)_Bill.pdf>)
- [Finance Bill 2026: Memorandum explaining the provisions (TCS rationalisation)](https://www.indiabudget.gov.in/doc/memo.pdf)
- [Minutes of the 54th GST Council meeting, 9 Sep 2024 (metal scrap RCM and TDS)](https://www.gstcouncil.gov.in/sites/default/files/Minutes/54th_meeting_minutes_conv.pdf)
- [Minutes of the 53rd GST Council meeting, 22 Jun 2024 (e-commerce operator TCS cut to 0.5%)](https://www.gstcouncil.gov.in/sites/default/files/Minutes/53rd_minutes_converted.pdf)
- [GST e-Way Bill System (NIC portal)](https://ewaybillgst.gov.in/)
- [Razorpay pricing](https://razorpay.com/pricing/)
- [Razorpay Route product page (add-on pricing)](https://razorpay.com/route/)
- [Razorpay Route documentation (eligibility after RBI PA rules)](https://razorpay.com/docs/payments/route/)
- [Razorpay API: Modify Settlement Hold for Transfers](https://razorpay.com/docs/api/payments/route/modify-settlement-hold/)
- [Cashfree Payments: payment gateway charges (Easy Split, virtual accounts)](https://www.cashfree.com/payment-gateway-charges/)
- [RazorpayX Escrow+ accounts](https://razorpay.com/x/escrow-accounts/)
- [Invoicemart TReDS (Axis Bank and mjunction)](https://www.invoicemart.com/)
- [MSME Samadhaan: delayed payments under the MSMED Act](https://samadhaan.msme.gov.in/)
- [MUDRA: Pradhan Mantri MUDRA Yojana](https://www.mudra.org.in/)
- [Union Budget 2025-26 speech](https://www.indiabudget.gov.in/budget2025-26/doc/budget_speech.pdf)
- [Oxyzo purchase finance](https://www.oxyzo.in/en/products/purchase-finance)
- [PRS: The Karnataka Platform-based Gig Workers (Social Security and Welfare) Bill, 2025](https://prsindia.org/bills/states/the-karnataka-platform-based-gig-workers-social-security-and-welfare-bill-2025)
