# solar

_Research brief, 29 September 2026. Headline:_ Karnataka has only 938 MW of rooftop solar, about 2.9% of India's 32.6 GW, even though KERC opened net metering to every consumer up to 1 MW in August 2026. Luma.Green's strongest solar offer is its own yards and recyclers (paybacks of about 2.5–5.5 years), not Bengaluru homes whose first 200 units are already free.

## Solar savings calculator: Karnataka (BESCOM) method v0, 29 Sep 2026

This gives an estimate, not a quote. Each constant is one editable config row: `key · value · unit · validFrom · validTo · sourceUrl`. Store money in paise, the unit KERC uses for energy charges.

### 1. Ask the user

| Input                                        | Example                                                                   | Why                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Tariff category (on the bill)                | LT-1 domestic · LT-3(a) commercial · LT-5 industrial · HT-2(a) industrial | Picks the tariff row                                                              |
| Sanctioned load or contract demand           | 4 kW · 25 HP · 300 kVA                                                    | Caps system size; 1 HP = 0.746 kW [S3]                                            |
| Units per month (average of recent bills)    | 350                                                                       | Upper limit for units solar can offset                                            |
| Energy charge printed on the bill (optional) | 520 paise/kWh                                                             | Overrides the defaults below, because business rates moved in 2026 (see §5)       |
| Gruha Jyothi beneficiary?                    | yes / no                                                                  | For these homes, savings come mostly from exported power                          |
| Module type (businesses)                     | DCR / non-DCR                                                             | Non-DCR modules qualify for net metering only if commissioned by 31 Dec 2026 [S7] |

### 2. Karnataka constants

| Key                                                                                      | Value                                                                                                                                    | Valid                          | Source    |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------- |
| Generation per kW, conservative                                                          | 100 kWh/kW/month (3 kW gives about 300 units/month)                                                                                      | –                              | [S1]      |
| Generation per kW, KERC norm                                                             | 138.7 kWh/kW/month (CUF 19%)                                                                                                             | 25.08.2026–30.06.2029          | [S5]      |
| PM Surya Ghar subsidy (homes only; none for businesses)                                  | Rs 30,000 for 1 kW · Rs 60,000 for 2 kW · Rs 78,000 for 3 kW or more (cap)                                                               | scheme period                  | [S1][S10] |
| Capital cost, homes 1–10 kW                                                              | Rs 45,000/kW (MNRE benchmark for 3 kW and above)                                                                                         | from 25.08.2026                | [S5]      |
| Capital cost, businesses                                                                 | Rs 27,090/kW non-DCR · Rs 36,015/kW DCR (includes 5% GST)                                                                                | from 25.08.2026                | [S5]      |
| Maintenance (O&M)                                                                        | 1% of capital cost a year, rising 5.72% a year                                                                                           | same                           | [S5]      |
| LT-1 domestic                                                                            | Rs 150/kW/month + 580 paise/kWh                                                                                                          | FY2026-27 (FY28: Rs 160 + 575) | [S3][S11] |
| LT-3(a) commercial                                                                       | Rs 215/kW + 680 paise (multi-year order); FY26 reset to Rs 235 + 710                                                                     | FY27 / FY26                    | [S3][S4]  |
| LT-5 industrial (covers MSMEs)                                                           | Rs 150/HP + 440 paise (multi-year order); FY26 reset to Rs 165/HP + 520                                                                  | FY27 / FY26                    | [S3][S4]  |
| HT-2(a) industrial                                                                       | Rs 350/kVA + 660 paise (multi-year order); FY26 reset to Rs 365/kVA + 670                                                                | FY27 / FY26                    | [S3][S4]  |
| Discounted Energy Rate Scheme (DERS, opt-in for business connections of 50 kW and above) | 500 paise/kWh for use above base consumption                                                                                             | FY27–FY28                      | [S3][S9]  |
| Domestic rooftop rebate                                                                  | Rs 25/kW/month off fixed charges (systems up to 10 kW)                                                                                   | FY26–FY28                      | [S3]      |
| Export tariff, home 1–10 kW, no subsidy                                                  | Rs 3.89/kWh (25-year contract)                                                                                                           | 25.08.2026–30.06.2029          | [S5]      |
| Export tariff, PM Surya Ghar home                                                        | Rs 1.96 (1–2 kW) · Rs 2.14 (>2–3 kW) · Rs 2.58 (>3 kW)                                                                                   | same                           | [S5]      |
| Export tariff, businesses                                                                | Rs 3.11 DCR · Rs 2.34 non-DCR; virtual and group net metering get 75% of these                                                           | same                           | [S5]      |
| Net-metering limit                                                                       | Sanctioned load or 1,000 kW, whichever is lower, until the state reaches 3 GW. Systems up to 10 kW may have 10% more panel (DC) capacity | from 24.08.2026                | [S2]      |
| Loans                                                                                    | PM Surya Ghar: 5.75%, 10 years, no collateral (up to 3 kW) · Businesses (KERC norm): 10.80%, 13 years, 70% debt / 30% equity             | 2026                           | [S6][S5]  |

### 3. Steps

1. `kWcap` = sanctioned load in kW (HP × 0.746), no more than 1,000 kW for net metering. For homes, the subsidy stops at 3 kW.
2. `kW` = min(`kWcap`, units ÷ 100). This sizes the system to what the site can use. Round down to 0.5 kW.
3. `E` = kW × generation per kW. Show two values: low (100) and high (138.7).
4. Monthly saving:
   - **Net metering.** Units net off within the monthly bill, and surplus is paid monthly [S2].
     `min(E,U) × energyCharge + max(0,E−U) × exportTariff + rebate`
   - **Gross metering.** All generation is sold and the bill is unchanged.
     `E × exportTariff + rebate`
   - `rebate` = Rs 25 × kW for LT-1 systems up to 10 kW. Fixed and demand charges are never avoided [S2][S3].
5. `capex` = kW × benchmark (or the installer's quote). For homes, subtract the subsidy.
6. `annual` = 12 × monthly saving − O&M (1% of capex).
7. `payback` = net capex ÷ annual.
   `EMI` = P·r(1+r)^n ÷ ((1+r)^n − 1), where r = rate/12 and n = months.
8. Always show the net vs gross comparison and the low–high range, never a single promised figure.

### 4. Worked examples (this method, Karnataka numbers)

| Case                                                                       | System         | Net cost                                                                                          | Saving per month                                    | Payback                                                                                             |
| -------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A. Home that pays its bill, LT-1, 350 units/month, 4 kW load, net metering | 3 kW           | Rs 1,35,000 − 78,000 = **Rs 57,000**                                                              | Rs 1,815–2,246                                      | **2.2–2.8 years**; loan EMI about Rs 626 (5.75%, 10 years)                                          |
| B. Gruha Jyothi home, 150 free units/month                                 | 2 kW           | Rs 90,000 − 60,000 = Rs 30,000 (the benchmark is for 3 kW and above; real 2 kW quotes run higher) | Net metering Rs 148–300 · gross metering Rs 442–594 | Net: 11–34 years · **gross: 4.8–6.8 years, if BESCOM allows it**                                    |
| C. Sorting yard, LT-5, 25 HP, 2,500 units/month                            | 15 kW non-DCR  | Rs 4.06 lakh (no subsidy)                                                                         | Rs 6,600–10,816 (at 440–520 paise)                  | **3.2–5.4 years** (DCR: 4.3–7.3)                                                                    |
| D. Plastic recycler, HT-2(a), 300 kVA, 60,000 units/month                  | 200 kW non-DCR | Rs 54.2 lakh                                                                                      | Rs 1.32–1.83 lakh (at 660 paise)                    | **2.5–3.5 years** (3.4–4.7 on DERS at 500 paise); EMI on 70% debt about Rs 45,300 (10.8%, 13 years) |

### 5. What changes the answer

- **Business tariffs changed mid-cycle.** KERC's review order of 3 Mar 2026 raised the FY2025-26 rates for LT-5, HT-2(a) and LT-3(a). Confirm the FY2026-27 rate from a live bill, and prefer the user's bill rate [S4].
- **Charges solar cannot avoid.** BESCOM's FY25 true-up of 56 paise/unit (May 2026–Apr 2027) is billed on FY2024-25 consumption, so solar does not reduce it [S8]. Fixed and demand charges stay too [S2].
- **Left out, so estimates are conservative.** Electricity tax and fuel/power-purchase cost adjustments scale with units used [S3]. Including them would raise savings slightly.
- **DCR deadline.** Net-metered projects commissioned after 31 Dec 2026 must use cells from ALMM List-II, the approved list of domestic cell makers. KERC's DCR capital-cost benchmark is 33% higher [S5][S7].
- **DERS.** A business on DERS pays 500 paise for extra use, so solar is worth less at the margin [S9].
- **Gruha Jyothi.** It is not verified whether a beneficiary can take gross metering and keep the 200 free units. Ask BESCOM before showing case B.
- **Site limits.** Plants under 150 kW connect to the existing transformer, and total solar on it is capped at 80% of its rating. Consumers with unpaid dues are not eligible [S2].

**Sources:**

- [S1] [PIB, Cabinet approves PM Surya Ghar (Feb 2024)](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2010130)
- [S2] [KERC DSPV Regulations 2026](https://kerc.karnataka.gov.in/uploads/media_to_upload1787642381.pdf)
- [S3] [KERC Tariff Order 2025, Annexure-9](https://kerc.karnataka.gov.in/uploads/96731743148968.pdf)
- [S4] [KERC review order RP 08/2025 (3 Mar 2026)](https://kerc.karnataka.gov.in/uploads/18281772541323.pdf)
- [S5] [KERC DSPV generic tariff order (25 Aug 2026)](https://kerc.karnataka.gov.in/uploads/48561787653428.pdf)
- [S6] [PIB, PM Surya Ghar subsidy and 5.75% loans (28 Jul 2026)](https://pib.gov.in/newsite/erelcontent.aspx?relid=292054)
- [S7] [PIB, ALMM List-II window to 31 Dec 2026](https://pib.gov.in/newsite/erelcontent.aspx?relid=291400)
- [S8] [KERC, BESCOM APR order (17 Apr 2026)](https://kerc.karnataka.gov.in/uploads/17731776422105.pdf)
- [S9] [KERC DERS continuation (31 Mar 2026)](https://kerc.karnataka.gov.in/uploads/media_to_upload1774956472.pdf)
- [S10] [PIB, no subsidy for commercial buildings (28 Jul 2026)](https://pib.gov.in/newsite/erelcontent.aspx?relid=292051)
- [S11] [BESCOM Electricity Tariff 2026–2028](https://bescom.karnataka.gov.in/uploads/media_to_upload1775021662.pdf)

## Recommendations

- **Solar savings calculator driven by editable tariff and subsidy tables** (prototype-now): Gives investors a working solar module within days, with no external APIs. The user enters their tariff category, sanctioned load and monthly units (or the rate on their bill). The calculator returns system size in kW, a generation range, savings, payback, loan EMI, and a comparison of net and gross metering. Store every constant as a Convex row: value in paise, unit, valid-from and valid-to dates, and source URL. When KERC changes rates, as it did twice in 2026, the admin edits one row. Seed the tables with the Karnataka numbers in the artifact.
- **'Your yard could save Rs X a month' card on business dashboards** (prototype-now): Luma.Green's own verified businesses are the best first buyers: LT-5 and HT-2(a) paybacks are about 2.5–5.5 years with no subsidy paperwork. Add sanctioned load and tariff category to the business profile at onboarding, fill the card from that data, and let one tap create a quote request. It is a strong demo moment because the recycling chain becomes a clean-energy customer.
- **Solar quote requests in the planned services module** (prototype-now): Reuses the pattern the architecture already plans (providers, requests, statuses). A request moves through: admin triage, installer assigned, site survey, quote, applied (PM Surya Ghar portal or BESCOM), installed, commissioned, subsidy received. The statuses give investors visible funnel numbers. GESCOM's 4% application-to-install conversion shows where hand-holding is worth money.
- **Installers as a new verified provider role, with lead routing** (pilot): The admin verifies GST, PM Surya Ghar vendor registration in BESCOM's area and sample installations, the same way businesses are verified today. Start with a few KREA members in Bengaluru. Charge installers, not consumers, and show every eligible installer. Consumers pick their own vendor under PM Surya Ghar, so Luma.Green must not look like it is steering them.
- **Plain-language application guide for each consumer type** (pilot): Homes: the PM Surya Ghar steps (register, pick a vendor, install, net meter, subsidy by DBT in about 15 days, 5.75% loan). Businesses: the KERC 2026 rules (no unpaid dues, automatic approval up to 150 kW, 150 days to finish, inspection within 5 days, size capped at sanctioned load or 1,000 kW). Add a banner for the 31 Dec 2026 DCR deadline and the open question on Gruha Jyothi and gross metering. It is static content in 12 languages: cheap to build and builds trust.
- **Old solar panels, inverters and batteries as scrap categories, with routing rules** (pilot): Add catalogue items: PV modules as e-waste (category CEEW14), and lead-acid and lithium batteries under the battery rules. Apply one firm rule: kabadiwalas collect and weigh but never dismantle, and yards hand over only to CPCB- or KSPCB-registered recyclers. Keep a photo, weight and handover record for each item. This fits the existing pickup flow and creates the chain-of-custody data that EPR buyers need.
- **Fill the calculator from a photo of the electricity bill** (pilot): Reuses the AI-estimate pipeline to read units, sanctioned load, tariff category and energy charge from a BESCOM bill photo. Keep only the derived numbers, never the account number or address, to stay within DPDP. Manual entry stays as a fallback. Test accuracy on real bills before users rely on it.
- **Group business demand for third-party-owned or bulk installs, plus finance referrals** (scale): Bundle verified yards and recyclers in one industrial area into a single tender, either for third-party (RESCO) developers, which KERC allows, or for a bulk installer. Show finance options as referrals only: priority-sector bank loans up to Rs 35 crore, SIDBI GFS, 4E, MSE-GIFT and MSE-SPICE, and PM Surya Ghar loans. No lending on the platform.
- **Installer take-back with records ready for EPR** (scale): Installers and maintenance firms book business pickups for broken panels and replaced batteries. Each record holds serial number, weight, recycler and certificate ID. These records support producers' annual PV returns now, and any PV EPR scheme after 2034-35; battery EPR certificates already trade on the CPCB portal.
- **Solar gigs for Saathis** (scale): Add panel-cleaning and old-panel pickup jobs for trained Saathis. One installer's figure is about Rs 1,000 per home cleaning. This links to MNRE's Surya Mitra training (about 70,000 trained) and gives Saathis recurring work.
- **Tariff tables for every state, plus a generation log that feeds the carbon module** (scale): Extend the same config tables state by state: retail tariffs, export rates and net-metering caps (the Forum of Regulators' model uses 500 kW; Karnataka uses 1,000 kW up to 3 GW). Refresh them from MNRE's monthly state-wise capacity data. Log kWh from verified business rooftops, from meter photos, to feed the planned carbon-credit module.

## Risks

- Tariffs and subsidies change often: KERC reset export tariffs on 25 Aug 2026, revised business tariffs on 3 Mar 2026, and the ALMM List-II rule starts on 1 Jan 2027. A hard-coded calculator will be wrong within months. Keep every constant as a dated, sourced config row and label outputs as estimates.
- How Gruha Jyothi interacts with rooftop solar is not verified. Showing Bengaluru households a 2–3-year payback when their first 200 units are already free would mislead most of them.
- Savings figures can be read as financial advice or a guarantee. Show ranges, cite sources, and state that an installer's site survey sets the real number.
- Installer quality and lead fees are a risk. Bad installations damage Luma.Green's brand, and because consumers pick their own vendor under PM Surya Ghar, fees must not steer them. Charge installers, show every eligible one, and disclose any fee.
- Privacy: electricity bills carry account numbers, names and addresses. Storing bill photos creates DPDP obligations, so keep only the derived numbers.
- Rules may tighten. Karnataka's net metering is open only until the state reaches 3 GW; the Forum of Regulators' model rules use a 500 kW cap; and KERC may levy grid-support charges later. Any of these reduces business paybacks.
- E-waste compliance: kabadiwalas dismantling panels or batteries informally would breach the E-Waste and Battery Waste rules. Storing old panels may need KSPCB authorisation, and broken modules and batteries carry safety and liability risk.
- Grid and process limits can stall installs regardless of demand: the 80% transformer cap for plants under 150 kW, DISCOM delays, and unpaid dues that make consumers ineligible.

## Open questions

- Can a Gruha Jyothi household install rooftop solar under gross (or net) metering and keep its 200 free units? Ask BESCOM's DSM wing.
- Which LT-5 and HT-2(a) rates apply in FY2026-27 after the 3 Mar 2026 review order, which names only FY2025-26? Check a current BESCOM bill.
- What does a rooftop system actually generate in Bengaluru? KERC assumes 19% CUF (about 1,664 kWh/kW/yr) while installers argued for 13.5–17.5%. Check with 5–10 real generation-meter readings.
- What do Bengaluru installers charge today for 1–3 kW DCR home systems and 10–200 kW business systems, compared with the Rs 45,000, Rs 27,090 and Rs 36,015 per kW benchmarks?
- Does BESCOM publish its installer list (required by KERC regulation 14.1) in a usable format? How does an installer register for PM Surya Ghar in BESCOM's area?
- When will CPCB publish the PV-waste storage guideline and recovery norms that rule 12 of the E-Waste Rules refers to? Will any PV EPR target come before 2034-35?
- What are the terms of MSE-GIFT and MSE-SPICE (interest subvention, capital subsidy caps), and do scrap and recycling units qualify? Get these from SIDBI directly; the brochures were behind a bot check.
- Is Bengaluru one of PM Surya Ghar's 46 City Accelerator Programme cities, and could Luma.Green partner with it?
- Do yards on leased land need the landlord's consent for rooftop solar, and how many pilot yards fail KERC's no-unpaid-dues rule?

## Sources

- [PIB: Cabinet approves PM-Surya Ghar: Muft Bijli Yojana (Feb 2024)](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2010130)
- [PIB: PM Surya Ghar crosses 50 lakh rooftop installations (4 Aug 2026)](https://pib.gov.in/newsite/erelcontent.aspx?relid=292647)
- [PIB: PM Surya Ghar subsidy support and 5.75% loans; budget by year (28 Jul 2026)](https://pib.gov.in/newsite/erelcontent.aspx?relid=292054)
- [PIB: Over 48 lakh households benefit; no CFA for government and commercial buildings (28 Jul 2026)](https://pib.gov.in/newsite/erelcontent.aspx?relid=292051)
- [PIB: No change in ALMM policy; List-II exemption for net metering and open access until 31 Dec 2026 (18 Jul 2026)](https://pib.gov.in/newsite/erelcontent.aspx?relid=291400)
- [PIB: Annadata becoming Urjadata, PM-KUSUM progress and agrivoltaics (9 Sep 2026)](https://pib.gov.in/newsite/erelcontent.aspx?relid=294498)
- [MNRE: State-wise installed RE capacity as on 31.08.2026](https://cdnbbsr.s3waas.gov.in/s3716e1b8c6cd17b771da77391355749f3/uploads/2026/09/202609081073775955.pdf)
- [KERC: Generic tariff for Distributed Solar PV plants, 25.08.2026 to 30.06.2029](https://kerc.karnataka.gov.in/uploads/48561787653428.pdf)
- [KERC (Grid Interactive Distributed Solar PV Plants) Regulations, 2026](https://kerc.karnataka.gov.in/uploads/media_to_upload1787642381.pdf)
- [KERC Tariff Order 2025 for ESCOMs, FY2025-26 to FY2027-28 (27.03.2025)](https://kerc.karnataka.gov.in/uploads/96731743148968.pdf)
- [KERC review order RP 08/2025 revising LT-3a, LT-5, HT-2a and HT-2b tariffs (03.03.2026)](https://kerc.karnataka.gov.in/uploads/18281772541323.pdf)
- [KERC: BESCOM APR FY2024-25 order with FY25 true-up of 56 paise/unit (17.04.2026)](https://kerc.karnataka.gov.in/uploads/17731776422105.pdf)
- [KERC: Continuation of Discounted Energy Rate Scheme for FY2026-27 and FY2027-28 (31.03.2026)](https://kerc.karnataka.gov.in/uploads/media_to_upload1774956472.pdf)
- [BESCOM: Electricity Tariff 2026 to 2028](https://bescom.karnataka.gov.in/uploads/media_to_upload1775021662.pdf)
- [MNRE: PM-KUSUM national portal (FAQ on components and subsidy)](https://pmkusum.mnre.gov.in/)
- [MoEFCC: E-Waste (Management) Rules, 2022 (G.S.R. 801(E))](https://www.mppcb.mp.gov.in/proc/E-Waste-Management-Rules-2022-English.pdf)
- [CPCB: Battery Waste Management Rules, 2022](https://cpcb.gov.in/uploads/hwmd/Battery-WasteManagementRules-2022.pdf)
- [RBI: Priority Sector Lending Directions, 2025 (updated 11 Sep 2026)](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12799)
- [SIDBI: Incentive schemes for green loans (MSE-GIFT, MSE-SPICE)](https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans)
- [SIDBI: Green finance (Green Finance Scheme, 4E scheme)](https://www.sidbi.in/en/green-finance)
