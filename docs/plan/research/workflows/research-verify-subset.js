export const meta = {
  name: 'luma-green-research-verify-subset',
  description: 'Research the clusters in args.subset that have no saved answer, then a sceptic verifies every cluster in the subset against its sources as of today',
  phases: [
    { title: 'Research', detail: 'only clusters with no saved answer' },
    { title: 'Verify', detail: 'a sceptic per cluster, reading the saved answer from the repo' },
  ],
}

const VERIFY_DATE = (args && args.today) || '30 September 2026'
const SUBSET = (args && args.subset) || null
// Clusters whose research is already saved in docs/plan/research/answers/<key>.research.json (desktop run, 29 Sep 2026).
const ANSWERED = new Set(['ecommerce-operator','scrap-tax','gig-workers','swm-2026','dwcc-partners','epr-portals','credits','escrow-payments','kabadiwala-economics','competitors','reference-prices','metrology-police','data-it-rules','identity','eway-gst-ops','logistics-facts','materials','support-ops','factory-integration','design-facts','investor-figures','risk-guards'])

const CONTEXT = `
Luma.Green is an Indian recycling-chain platform starting a Bengaluru pilot on 13 October 2026: households sell scrap to kabadiwalas (local scrap shops), who sell to yards, then recyclers, then manufacturers; Saathis are gig workers who do pickups and sorting; one admin verifies every business. The pilot records cash and UPI payments but moves no money; business escrow is simulated for now. The founders need answers they can act on, in plain English, with sources they can open.

On 30 September 2026 the founder refined the chain (docs/plan/inputs/2026-09-30-founder-research-part-1 in the repo): between the yard and the recycler sits a PRE-PROCESSOR who turns bales and lots into factory feedstock (PET flake and washing lines, plastic granulators, cable granulators, tyre shredders and pyrolysis, C&D crushers, e-waste dismantlers, battery breakers, used-oil re-refiners); a compounder or intermediate processor blends recovered material to a manufacturer's specification; dry-waste centres and MRFs, brands with EPR duties, authorised waste handlers and TSDFs are roles too. Every material carries a state (S0 discarded, S1 collected, S2 sorted, S3 baled, S4 shredded or stripped, S5 washed, S6 dried, S7 granule/pellet/pulp/ingot/crumb, S8 compound or alloy, S9 final feedstock or product). Every processing record has a main output, saleable by-products and residual waste, each a separate lot, and a yield. Prices have five levels: L1 kabadiwala to household, L2 yard to kabadiwala, L3 pre-processor or recycler to yard, L4 recycler or compounder to manufacturer, L5 manufacturer to industrial buyer. Industrial by-products (bagasse, fly ash, slag, dross, foundry sand, husk, whey and 400 more rows mapped to KSPCB category codes) are candidate listings. Research against this refined model.

Today is ${VERIFY_DATE}. HOW TO RESEARCH ON THIS MACHINE: web page fetches are refused by the network policy (WebFetch and curl fail for every host), but WebSearch works. So research through many focused searches (use allowed_domains to target official sites such as cpcb.nic.in, kspcb.karnataka.gov.in, egazette.gov.in, pib.gov.in, gstcouncil.gov.in, rbi.org.in, fssai.gov.in, bis.gov.in, and news sites), read the result snippets closely, and quote figures only when a snippet states them. Cite the URL and date from the result. In every source entry set the date field to what the result shows and prefix the title with 'snippet:' since the page was not opened; where a figure could not be confirmed from any snippet, say so in the answer and set status to partly or needs-pilot-or-counsel rather than guessing. Prefer official pages: gazettes, CPCB/KSPCB/BESCOM/KERC/RBI/CBIC/GSTN/FSSAI/BIS portals, ministry press releases, company pricing pages, dated news. Give the date of each source. If something cannot be settled from public pages (it depends on the pilot, a lawyer or a phone call), say so and give the best available default plus who to ask. Never invent figures: a missing number is a one-line open item.`

const CLUSTERS = [
  { key: 'ecommerce-operator', title: 'Is Luma.Green an e-commerce operator?', questions: [
    "Is Luma.Green an 'e-commerce operator' under CGST s.52 (0.5% TCS) and under the Income-tax Act 2025 (the successor to s.194-O, 0.1% TDS) for bookings and trades where money never passes through it? What changes once escrow through a payment aggregator starts?",
    "Are households 'consumers' under the Consumer Protection Act when they sell scrap and get a free pickup, and do the Consumer Protection (E-Commerce) Rules 2020 as amended in 2026 apply to Luma.Green (grievance officer, 48-hour acknowledgement, seller disclosures)? Or should it adopt those norms voluntarily?",
  ]},
  { key: 'scrap-tax', title: 'Tax on scrap: TCS, GST rates, HSN, metal-scrap TDS', questions: [
    "Did the Finance Act 2026 enact the 2% income-tax TCS on the sale of scrap (up from 1%)? Which sellers are covered (turnover thresholds), and does the exemption for buyers who use scrap in manufacturing survive under the Income-tax Act 2025? Which section carries it now?",
    "Does the Act's definition of 'scrap' cover post-consumer recyclables that yards sell, such as newspaper, PET bottles and cartons?",
    "After the GST rate changes of 22 September 2025 (Notification 9/2025-CT(Rate)), which GST rate and HSN code apply to each material family: waste paper (4707), plastic scrap (3915), ferrous scrap (7204), copper/aluminium/brass scrap (7404/7602), glass cullet (7001), rags (6309/6310), e-waste (8549), batteries? Which value threshold applies to the 2% GST TDS on metal scrap under Notification 25/2024?",
  ]},
  { key: 'gig-workers', title: 'Saathis and gig-worker law', questions: [
    "Has the Karnataka Platform-Based Gig Workers (Social Security and Welfare) Act 2025 been brought into force with rules, what welfare-fee rates and categories were notified (Feb 2026), and what is the status of the reported 2026 Karnataka High Court challenge?",
    "Is a scrap-pickup marketplace or a Saathi job board an 'aggregator' or 'e-marketplace' under the Karnataka Act and under the Social Security Code's Seventh Schedule and the Social Security (Central) Rules 2026, if the kabadiwala pays the Saathi directly rather than the platform? If so, which fee category, who pays, and does the internal dispute committee duty apply?",
  ]},
  { key: 'swm-2026', title: 'Solid Waste Management Rules 2026 and Bengaluru', questions: [
    "Are the Solid Waste Management Rules 2026 in force (reported 1 April 2026)? Must kabadiwalas, scrap dealers, aggregators or 'entities involved in sorting' register on CPCB's portal (rule 9, rule 17 environmental compensation), and can individual shops register or only larger entities? What is the bulk-generator threshold (100 kg/day)?",
    "Under the SWM Rules 2026, who issues EBWGR (bulk waste generator) certificates and at what price? Can a network of kabadiwalas and yards supply compliant collection to Bengaluru apartment societies?",
    "Will the Greater Bengaluru Authority (GBA) or BSWML recognise verified kabadiwalas as 'authorised' informal waste collectors, and what will Bengaluru's new SWM by-laws (due 31 March 2027) say? Do the 2026 rules add a separate household 'special care' stream (batteries, bulbs) and what bin colours do they prescribe?",
  ]},
  { key: 'dwcc-partners', title: 'Dry-waste centres, NAMASTE and NGO partners', questions: [
    "How many dry waste collection centres (DWCCs) operate in Bengaluru today (figures range from 119 in Sep 2025 to 164/166), who runs them and under what contracts with the city?",
    "Does the NAMASTE waste-picker component continue beyond FY2025-26, which resource organisation is empanelled for Karnataka, and has waste-picker registration started in Bengaluru?",
    "Would Hasiru Dala, Saahas, ITC WOW's centre operators or the Karnataka waste-pickers' union co-run kabadiwala and Saathi onboarding, or run a DWCC as a pilot yard, and on what terms do such NGOs usually work (fee per onboarding, grants, CSR)? What is Hasiru Dala Innovations' own traceable-plastic business with brands, and how should Luma.Green avoid competing with it?",
  ]},
  { key: 'epr-portals', title: 'EPR exchange, portals and evidence', questions: [
    "Has MSTC's EPR Electronic Trading & Settlement Platform been approved and launched since June 2026, and have direct buyer-to-seller certificate transfers on the CPCB portals stopped?",
    "What evidence do CPCB's verification guidelines under the 31 March 2026 plastic amendment (and Registered Environment Auditors) require from processors, and does the plastic EPR portal accept receipts without GST for purchases from informal collectors, as the e-waste portal does? Do the CPCB EPR and SWM portals accept bulk uploads or API connections?",
    "Are EPR regimes for non-ferrous metal scrap and for construction and demolition waste in force in 2026, and do they cover kabadiwala metal trades (copper, aluminium, brass)? What did the Delhi High Court decide on the e-waste EPR floor price (₹22/kg)? What are the current recycled-content requirements for plastic packaging after the 2024–2026 amendments?",
  ]},
  { key: 'credits', title: 'Carbon and plastic credits', questions: [
    "Will BEE add a material-recovery or recycling methodology to the Indian Carbon Market offset mechanism (waste is a listed sector), and what floor and forbearance prices has CERC approved for carbon credit certificates? How many offset methodologies are approved today?",
    "Can a tonne of plastic that generated a CPCB EPR certificate also earn a Verra plastic credit (WRC/WCC), given PWRM0001's additionality test? Is paper or cardboard creditable under any active methodology (VMR0007, GS 448)?",
    "Should Luma.Green be the project proponent of a Verra grouped plastic project or partner with a developer such as Hasiru Dala Innovations or Plastics For Change? What does verification cost in India and how many tonnes a year does a plastic-credit project need to pay for itself? What revenue share do collector programmes (Plastic Bank, others) pay collectors, and will a verifier accept ward-level household location as evidence of source?",
  ]},
  { key: 'escrow-payments', title: 'Escrow, payment partners and lending', questions: [
    "Will Razorpay Route or Cashfree Easy Split let a platform split settlements to sellers before it has ₹40 lakh of its own turnover under RBI's September 2025 payment-aggregator directions? If not, what are the alternatives: onboarding each yard as its own merchant, or a bank escrow with a trustee (RazorpayX Escrow+, Castler), with their pricing and KYC requirements for kabadiwalas without GST registration?",
    "Is the 0.4% UPI merchant fee on payments above ₹2,000 from 15 October 2026 confirmed by NPCI or RBI, what small-merchant limit avoids it, and what are today's UPI per-transaction limits?",
    "Which banks or NBFCs lend to small scrap dealers and yards in Bengaluru (Mudra loans through partner banks, NBFC purchase finance such as Oxyzo), and would they accept a platform's verified trade history as part of underwriting? Are there examples of recycling-sector lending programmes in India?",
  ]},
  { key: 'kabadiwala-economics', title: 'Kabadiwala economics in Bengaluru', questions: [
    "How many kabadiwalas operate in Bengaluru, and what share of household dry waste reaches them rather than the city's collection or DWCCs? What gross margin does a kabadiwala keep per material after rent, transport, credit and losses (any published studies or interviews)?",
    "What minimum load (kg or ₹) makes a home pickup worthwhile for a kabadiwala, how often does a household have enough scrap to sell, and is there evidence on whether households pick the nearest shop or the best price?",
    "What are the usual payment terms from yard to kabadiwala (cash at pickup vs 7–30 days' credit), typical lot sizes per material, who transports and who pays freight, and the smallest load worth a yard collection?",
  ]},
  { key: 'competitors', title: 'Competitor facts still unknown', questions: [
    "What does Scrapr (The Kabadiwala) charge partner kabadiwalas (subscription or commission), and how many of its kabadiwalas are active in Bengaluru? Is ScrapUncle actually operating in Bengaluru or only Delhi NCR?",
    "What do Recykal.Market and Attero's MetalMandi charge small aggregators, and what minimum lot sizes and payment terms do they set? Do the Android apps of The Kabadiwala, ScrapUncle, MetalMandi and Recykal offer Indian languages?",
  ]},
  { key: 'reference-prices', title: 'Reference prices and price policy', questions: [
    "Which reference-price sources can Luma.Green use legally and cheaply: MCX delayed data (terms and yearly cost through an authorised vendor), a BigMint data licence (price), mill price notices (paper mills publishing waste-paper buying prices)? May anonymised yard buy-price posts be combined into a public board line?",
    "Aluminium cans: should the household price be per kg or per can, and what does a beverage can weigh (cans per kg)? Above the household level, should prices be shown GST-inclusive or exclusive? Should drop-off pay a published premium over doorstep pickup, and is one city-wide floor enough for a pilot? What evidence is there that WhatsApp groups and calls from the next buyer set daily rates for kabadiwalas and yards?",
  ]},
  { key: 'metrology-police', title: 'Weighing scales, consents and police rules for scrap dealers', questions: [
    "What penalty applies to an unverified or unstamped weighing scale after the Jan Vishwas amendments to the Legal Metrology Act in force from 1 May 2026, and does Karnataka require yearly re-verification of electronic scales? What does e-Mapan (Karnataka) offer traders online?",
    "Do plain kabadiwala shops that only collect and store scrap need any KSPCB consent or authorisation under the waste rules? Does Bengaluru police require scrap dealers to hold a licence or keep purchase registers (any Karnataka Police Act provision or city order)? Which materials are high theft risk in Bengaluru (BESCOM copper, BWSSB manhole covers, metro fittings), and is there a police or utility alert channel?",
    "Can a Saathi apply for the Seva Sindhu Police Verification Certificate themselves, at what fee and turnaround, and should a kabadiwala's helpers who enter homes be verified too?",
  ]},
  { key: 'data-it-rules', title: 'Data protection, IT rules and accessibility', questions: [
    "After MeitY's January 2026 consultations, were the DPDP Rules 2025 deadlines (about 13 May 2027 for core duties) shortened for any class of company, and what applies to a small startup handling phone numbers and photos?",
    "Have amendments to the IT (Intermediary) Rules in 2025–26 changed the 36-hour takedown or the 24-hour/15-day grievance timelines? Which Indian accessibility rules (RPwD Act 2016, IS 17802, GIGW 3.0) apply to a private platform?",
  ]},
  { key: 'identity', title: 'Verifying people without storing Aadhaar', questions: [
    "Will UIDAI register an early-stage startup as an Offline Verification Seeking Entity (OVSE), at what fee and process, and does the Aadhaar app's credential-sharing flow work from a web app or PWA rather than a native app? Should a pilot accept masked Aadhaar at all given the QR-signature check, or only driving licence, voter ID, PAN or DigiLocker documents?",
    "How does a private company onboard as a DigiLocker requester through API Setu (process, cost, timeline), and can an NGO's attestation stand in for ID for undocumented migrant waste pickers under KYC-style verification?",
  ]},
  { key: 'eway-gst-ops', title: 'E-way bills, GST filing and MSME payment rules', questions: [
    "Is Karnataka's e-way bill limit for intra-state movement ₹50,000 for all goods (confirm from the e-way bill portal or a Karnataka notification), and is the SMS e-way bill facility enough for small yards? Do small yards need a GST filing partner (GSP) to generate e-way bills and e-invoices, and what do such services cost?",
    "Is the MSME 45-day payment rule (MSMED Act s.15–16 and Income-tax s.43B(h)) still in force in 2026, and do Bengaluru yards buying metal from unregistered kabadiwalas issue reverse-charge self-invoices in practice?",
  ]},
  { key: 'logistics-facts', title: 'Logistics facts for Bengaluru', questions: [
    "What are Bengaluru's standing entry hours and no-entry rules for goods vehicles (city-wide, not temporary notices)? What do local transporters and Porter/Vahak charge per km and for loading for mini-trucks and tempos?",
    "Can a startup use ULIP (the government's logistics data platform) to check transporters' vehicles and drivers, and what does access require?",
  ]},
  { key: 'materials', title: 'Material codes, names and factors', questions: [
    "What are the exact 8-digit ITC-HS lines for glass cullet (7001), lead scrap (7802), the 8549 sub-headings (lithium-ion cells, dry cells, CRT glass, circuit boards) and textiles (6309/6310)? Which E-Waste Rules 2022 schedule item codes (ITEW, CEEW, LSEEW numbers) match phones, laptops, TVs, fridges, washing machines and ACs?",
    "What words do Bengaluru kabadiwalas use for plastics and other scrap (Delhi's Teri, Phugga, Jhaap, Panni; English PET, PP, HD, LD; Kannada terms)? Is 'gujari' used for scrap shops in Bengaluru? Are milk pouches a separate paid stream? Are small appliances and fans priced per kg or per piece?",
    "Which published source should supply the CO2e emission factor for recycling each material (paper, PET, HDPE, PP, LDPE, ferrous, aluminium, copper, brass, glass, e-waste): CDM AMS-III.AJ, Gold Standard 448, India-specific studies? Who should own an open material-code standard long term (an industry body such as MRAI or IARPMA, a BIS committee, a foundation), and under which licence?",
  ]},
  { key: 'solar-facts', title: 'Rooftop solar facts for Karnataka', questions: [
    "Can a Gruha Jyothi household install rooftop solar under gross or net metering and keep its 200 free units (BESCOM/KERC position)? Which LT-5 and HT-2(a) energy charges apply in FY2026-27 after KERC's 3 March 2026 review order? What do rooftop systems actually generate in Bengaluru (CUF), and what do installers charge today for 1–3 kW DCR home systems and 10–200 kW business systems?",
    "Does BESCOM publish its empanelled installer list, and how does an installer register for PM Surya Ghar in BESCOM's area? Is Bengaluru one of PM Surya Ghar's City Accelerator Programme cities? When will CPCB publish PV-waste storage and recovery guidelines under rule 12 of the E-Waste Rules? What are the MSE-GIFT and MSE-SPICE scheme terms and do recycling units qualify? Do yards on leased land need the landlord's consent for rooftop solar, and what is KERC's no-unpaid-dues rule?",
  ]},
  { key: 'support-ops', title: 'Support line, voice and messaging', questions: [
    "For a pilot support line: SIM vs virtual number, and can the same number move from the WhatsApp Business app to the WhatsApp Cloud API or a provider such as MSG91 later without losing the number? Do outbound IVR or automated voice reminders need TRAI DLT registration (140/160 number series) before scale?",
    "Which text-to-speech service fits a pilot in Kannada, Tamil, Telugu, Hindi and Urdu: Google Chirp 3 HD, AI4Bharat Indic Parler-TTS, Bhashini, Sarvam? Compare pricing, language coverage and startup access. Who could record human voice clips quickly and cheaply in Bengaluru?",
  ]},
  { key: 'factory-integration', title: 'How yards, recyclers and mills work today', questions: [
    "Which accounting software do small scrap yards and recyclers in India use (Tally, Busy, Marg, Excel), which Tally release is common, and does Tally accept Excel imports or only XML? Do yards weigh on their own stamped weighbridge, a public weighbridge or platform scales, and do slips carry serial numbers?",
    "What grade names, quality parameters and deduction rules do Bengaluru or South Indian buyers and paper mills apply to waste paper, PET and metal (ISRI names, mill specs, moisture and contamination deductions)? Do recyclers hold CPCB processor (PWP) registration, and does the plastic portal accept bulk uploads or only single-entry forms? Would GRS, ISCC PLUS auditors or CPCB physical verification accept a platform's weight and photo record as supporting evidence?",
  ]},
  { key: 'design-facts', title: 'Languages, digits, pictures and offline behaviour', questions: [
    "Which languages do Bengaluru's likely pilot wards (Yeshwanthpur, Peenya, Malleshwaram, Rajajinagar, Mathikere) speak and read (census and local data), and how large is the share who can read numbers but not words? Do Bengali, Marathi and Urdu readers in India prefer international digits or native-script digits in apps and prices?",
    "Is there evidence on whether low-literacy users recognise materials faster from photos or drawn pictures? Do the SWM Rules 2026 bin colours (wet, dry, sanitary, special care) clash with a green/amber/sky palette for materials? Does the Convex React client keep unsent mutations across an offline reload, or must a weigh-and-pay queue be stored on the phone? What are the licence terms of IconScout, Blush and Icons8 illustrations for commercial apps?",
  ]},
  { key: 'investor-figures', title: 'Investor figures and product policy defaults', questions: [
    "For investors, should Luma.Green quote e-waste at 1.4 Mt (CPCB, FY2024-25) or 6.19 Mt (NITI Aayog, 2024)? Explain how each is measured and which to lead with. What figure is defensible for India's recycling market size and for the number of waste pickers?",
    "Recommend defaults with reasoning for the founders' open product decisions: should the pilot charge for pickups or set a minimum load; what should recycle points be worth and could CSR budgets fund them; can zero-value items (glass, film, old clothes) earn points without distorting cash prices; exclude batteries and e-waste from the household pilot until authorised routing exists; limit auto-accept to shop hours; a no-show rule; Saathi accident insurance options (cost of group personal-accident cover for gig workers in India); business fees after the pilot (subscription vs per-trade, with comparables).",
  ]},
  { key: 'city-systems', title: 'City dashboards and national programmes', questions: [
    "Which of the Greater Bengaluru Authority's five corporations would be the natural host for a ward dashboard pilot, who is the SWM nodal officer (role, not personal data), and which fields does a city report monthly to MoHUA's Swachhatam portal? Is SBM-Urban extended beyond 2026, and how does the Swachh Survekshan 2026-27 toolkit change dry-waste and digital-monitoring indicators?",
    "Do Bengaluru RWAs and tech parks expect to be paid for dry waste or to pay for compliant collection, what report format does BSWML ask of bulk generators, and how many kabadiwalas accept UPI and stay under the small-merchant limit? Which ID or attestation can undocumented migrant waste pickers provide?",
  ]},
  { key: 'risk-guards', title: 'Checks on the plan\'s 15 named risks', questions: [
    "For each of these risks, find the current legal or market position and say whether the plan's guard is enough: (1) legal review after real users arrive; (2) tracing by mass balance rather than bottle-level identity; (3) exchange prices (MCX/LME) on public pages; (4) shared price floors read as price-fixing under Competition Act s.3 (any CCI precedent on platform-set floors or MSP-like minimums); (5) price crashes and stale floors; (6) hazardous material to unauthorised buyers; (7) gig-worker law; (8) SWM 2026 making informal shops visible; (9) DPDP retention vs 90-day photo deletion; (10) app weights read as certified; (11) waste-picker politics in Bengaluru; (12) support promises one person can't keep; (13) plastic-credit additionality; (14) escrow eligibility; (15) demo data mistaken for real firms (checksum-invalid GSTINs).",
  ]},
  // --- Added 30 Sep 2026 from the founder's research part 1 (docs/plan/inputs/2026-09-30-founder-research-part-1) ---
  { key: 'pre-processors', title: 'Pre-processors in Bengaluru and Karnataka', questions: [
    "Who are the pre-processors within about 150 km of Bengaluru that turn yard bales and lots into factory feedstock: PET flake and washing lines (KSPCB Orange 1326), plastic reprocessors and granulators (Orange 1366), cable granulators, tyre shredders, crumb and pyrolysis units (Orange 1424), C&D processing plants (Orange 1414; BBMP's Chikkajala and Kannur plants), ELV scrapping centres and RVSFs (Orange 1405), e-waste dismantlers (Red 1120), used-oil re-refiners and foundry-sand reclaimers? Give counts, names where public (KSPCB XGN consent register, CPCB plastic-portal PWP list for Karnataka, CPCB e-waste and tyre recycler lists), capacities, and where they cluster (Peenya, Bommasandra, Jigani, Doddaballapur, Hoskote).",
    "What do these pre-processors pay yards for bales and lots (PET bale, HDPE bale, LDPE film bale, OCC bale, HMS bundles, UBC bales, whole tyres, insulated cable, intact lead-acid batteries) and what do they sell their outputs for (cold-washed and hot-washed PET flakes, rPET pellets, rHDPE and rPP granules, LDPE agglomerate, copper granules, shredded steel, crumb rubber, tyre pyrolysis oil, recycled aggregate)? What minimum lot sizes, payment terms, freight arrangements and quality deductions do they apply, and do they buy directly from kabadiwalas and dry-waste centres or only from yards and traders?",
  ]},
  { key: 'cpcb-2025-classification', title: 'CPCB 2025 industry classification and consents', questions: [
    "What exactly did CPCB's January 2025 'Classification of Sectors into Red, Orange, Green, White and Blue Categories' change: how many sectors are in Annexure I (the founder's sources say both 359 with 107/120/81/51 and 419 with 125/137/94/54/9, so settle it from the report), what pollution-index ranges define each colour, what the new Blue category (essential environmental services: STP, MSW facility, MRF, C&D facility, bio-methanation, waste-to-energy, e-waste collection) means for consent validity, and has KSPCB adopted the 2025 list in place of its 2016 Notification 1425 list? What consent validity applies now to Red, Orange, Green and Blue units in Karnataka?",
    "Under the 2025 classification and G.S.R. 702(E) of 12 November 2024 (consent exemption for White units by self-declaration), which of Luma.Green's roles need which consent: a kabadiwala shop (collect, sort, store), a yard that bales paper and plastic (White 3?), a dry-waste centre or MRF (Blue?), a PET flake line, a plastic granulator, a cable granulator, a tyre shredder, a C&D crusher, an e-waste dismantler, a battery breaker, a used-oil re-refiner, a compounder? For each, name the category, the consent or authorisation, the issuing body, what the public register shows, and the fee band, so the onboarding checklist per role can be written.",
  ]},
  { key: 'intermediate-grades', title: 'Grades and specifications for intermediate materials', questions: [
    "What grade attributes and thresholds do Indian buyers actually use for the intermediate states the platform will list: PET flakes (intrinsic viscosity ranges, PVC ppm, moisture, colour classes, hot-wash vs cold-wash), rPET pellets (IV, food-contact status under FSSAI's 2021-22 recycled-plastics rules and BIS IS 17899 T / CPCB's 2024-25 guidelines for recycled PET in food contact), rHDPE, rPP and rLDPE granules (MFI ranges, density, natural vs coloured), copper granules (Cu %, ISRI names), shredded steel (ISRI 210/211, density, size), crumb rubber (mesh sizes), recycled aggregate (IS 383:2016 recycled aggregate classes), furnace-ready cullet (ceramic/metal ppm), recovered pulp? Which standards, and which are enforced in trade versus only on paper?",
    "In the polyester chain, check the founder's technical note: rPET chips are melt-spun to polyester staple fibre with TiO2 as delustrant; are DMT, PTA and MEG used in mechanical rPET fibre production at all, or only in virgin polymerisation and in chemical recycling (glycolysis to BHET/MEG)? Describe the actual routes Indian PSF makers use for recycled input (mechanical rPET chips; SSP; chemical), typical rPET share, and what a manufacturer would want recorded about an rPET lot. Then do the same check for the HDPE, LDPE film, PP, paper, ferrous, aluminium, copper, tyre, lead-acid, e-waste, used-oil, glass, C&D, textile and solar-panel chains in the founder's process-chain sheet: what is wrong, missing or out of date, step by step.",
  ]},
  { key: 'byproduct-law', title: 'When an industrial by-product may be sold, and when it is waste', questions: [
    "Under the Hazardous and Other Wastes (Management and Transboundary Movement) Rules 2016 as amended to 2026 (including Rule 9 utilisation, the SOPs CPCB has issued for utilisation of specific hazardous wastes, Schedules I to IV, and any 2024-26 amendment or draft that defines 'by-product' or 'end of waste'), which of the founder's industrial by-product rows may be listed and sold on an ordinary marketplace by their generator (bagasse, molasses, press mud, rice husk and bran, fly ash and bottom ash, steel slag, mill scale, foundry sand, aluminium dross, zinc dross, copper dross, spent catalysts, spent solvents, used oil, paint sludge, ETP sludge, de-inking sludge, PET caps and labels, textile cuttings, sawdust, tyre steel, C&D concrete, whey, fish offal, hides, bones) and which may move only to an authorised recycler, co-processor or TSDF with a manifest (Form 10) and an SPCB authorisation? Cite the schedule entry or SOP for each family. What did the Fly Ash Notification (2021) and the 2024 amendments on utilisation change?",
    "What obligations fall on a platform that lists such materials: does hosting a listing for a Schedule I waste make Luma.Green an 'operator of a facility', a 'dealer' or otherwise liable under the HOWM Rules, the E-Waste Rules 2022 (which bar 'unauthorised' collection and require sellers to use registered recyclers) or the Battery Waste Management Rules 2022, and how do existing platforms (Recykal, Scrapcart, MetalMandi, Karo Sambhav, MSTC's e-auction of hazardous waste) handle it: buyer gating by registration number, manifests, or refusing the category? Recommend the buyer-gate rules per material family for Luma.Green.",
  ]},
  { key: 'intermediate-prices', title: 'Reference prices above the yard: flakes, granules, fractions and by-products', questions: [
    "What are current Indian trade prices (Rs per kg or per tonne, with date and source) for the intermediate materials the refined chain adds at levels L3 to L5: cold-washed and hot-washed PET flakes (clear, light blue, green), rPET pellets and food-grade rPET chips, rHDPE, rPP and rLDPE granules, LDPE agglomerate, PVC regrind, copper granules and copper cathode, shredded steel, aluminium ingots (secondary) and dross, crumb rubber, tyre pyrolysis oil and recovered carbon black, lead ingots, recycled aggregate and manufactured sand, furnace-ready cullet by colour, recovered pulp or paper mill deckle prices, bagasse, fly ash, rice husk, sawdust, cotton waste, PSF (recycled)? Which published sources exist for each (ScrapC, Polymerupdate, Plastics4Trade, IndiaMART, BigMint, MCX, NALCO or Hindalco list prices, mill price circulars, CPWD/BBMP rate schedules for aggregates), how often they move, and which may be shown on a public price board without a licence?",
    "How do buyers price grade differences at these levels (for example the premium of hot-washed over cold-washed PET flakes, food-grade over standard rPET, natural over coloured HDPE, clear over green PET, 1-4 mm crumb over 30 mesh), and how should Luma.Green's price board and rate cards represent a material state and grade so that the same code is not quoted at two levels at once? Recommend the board's grade dimensions per family and the reference figures to seed with.",
  ]},
  { key: 'yields-and-custody', title: 'Process yields, mass balance and chain-of-custody evidence', questions: [
    "What are typical mass yields for the processes in the refined chain, with sources: PET bale to raw flakes, raw flakes to washed flakes, washed flakes to pellets; HDPE and PP bale to granules; LDPE film to agglomerate; OCC and ONP to recovered pulp (and the reject and sludge shares); HMS to shredded steel and the shredder residue share; UBC to secondary aluminium (melt loss and dross share); insulated cable to copper granules; whole tyres to crumb, steel and fibre; lead-acid batteries to lead, PP and acid; e-waste dismantling fractions by device; C&D to recycled aggregate and manufactured sand; textiles to shoddy fibre; PV modules to glass, aluminium and cells? Give a defensible default yield and range per process for the platform's mass-balance checks, and say which are measured in Indian plants versus taken from international literature.",
    "What do the chain-of-custody and recycled-content standards that Indian recyclers and brands actually use (ISCC PLUS, GRS and RCS by Textile Exchange, EN 15343, ISO 22095, UL 2809, the CPCB plastic EPR portal's PWP evidence rules, the FSSAI food-grade rPET traceability requirement) require a processing record to contain: input lot links, weights, yields, by-product and waste outputs, timestamps, site, operator, scale, photos, and how they treat mass-balance versus segregated custody? Which of the founder's proposed transaction fields (input_lot_id, input_weight_kg, material_code, input_state, process_type, output_lot_id, output_material_code, output_weight_kg, byproduct_code and weight, waste_code and weight, yield_percent, buyer_role, destination, authorisation_status, traceability) satisfy those standards, which are missing, and what tolerance on yield should trigger a review?",
  ]},
  { key: 'new-roles-onboarding', title: 'Verifying the new roles: pre-processor, compounder, brand, authorised handler', questions: [
    "For each role the refined chain adds - pre-processor (PET flaker, plastic reprocessor, cable granulator, tyre processor, C&D plant, e-waste dismantler, battery breaker, used-oil re-refiner, ELV scrapping centre), compounder or masterbatch maker, manufacturer using recycled input, brand with EPR duties, authorised waste handler, co-processor and TSDF, and a dry-waste centre or MRF run under a city agreement - what registrations, consents, authorisations and certificates does it hold in Karnataka (KSPCB CTE/CTO with category, CPCB EPR portal registrations as PWP, recycler, refurbisher, producer or brand owner, e-waste Form 4 authorisation, battery recycler registration, tyre recycler registration, RVSF registration under the 2021 rules, used-oil re-refiner registration, HOWM authorisation, GRS or ISCC certificates, FSSAI licence for food-grade rPET, Udyam), and which of those can be checked on a public register or portal without a login (XGN, the CPCB EPR portals' public lists, the RVSF list on the VAHAN portal, the FSSAI licence search, the GST portal)? Write the admin's verification checklist per role with the document, the check, and the online source.",
    "Which of these roles should the Bengaluru pilot admit from 13 October 2026, which should wait, and why: for each, the count that exists locally, the supply the pilot's yards can offer them, the compliance risk of getting the gate wrong, and the cost of the checklist. Recommend the order in which the roles switch on and what a 'pre-processor' account should see first (buy requests for bales, lot listings by state and grade, a processing record that creates output lots).",
  ]},
]

const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    cluster: { type: 'string' },
    answers: { type: 'array', items: { type: 'object', properties: {
      question: { type: 'string' },
      answer: { type: 'string', description: 'plain English, 3-10 sentences, with figures and dates' },
      status: { type: 'string', enum: ['answered', 'partly', 'needs-pilot-or-counsel'] },
      decision: { type: 'string', description: 'the recommended default for the founders, one or two sentences, or empty' },
      whoToAsk: { type: 'string', description: 'if not settled from public pages: who confirms it (a CA, counsel, BESCOM, 10 shops), else empty' },
      sources: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' }, date: { type: 'string' } }, required: ['title', 'url'] } },
    }, required: ['question', 'answer', 'status', 'decision', 'whoToAsk', 'sources'] } },
  },
  required: ['cluster', 'answers'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: { type: 'array', items: { type: 'object', properties: {
      question: { type: 'string' },
      holds: { type: 'boolean' },
      problems: { type: 'string', description: 'what is wrong or unsupported, or empty' },
      correction: { type: 'string', description: 'the corrected answer if it did not hold, else empty' },
      extraSources: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' } }, required: ['title', 'url'] } },
    }, required: ['question', 'holds', 'problems', 'correction', 'extraSources'] } },
  },
  required: ['verdicts'],
}

const WORK = SUBSET ? CLUSTERS.filter((c) => SUBSET.includes(c.key)) : CLUSTERS
const missing = WORK.filter((c) => !ANSWERED.has(c.key)).map((c) => c.key)
log(`${WORK.length} clusters in this run; researching ${missing.length} (${missing.join(', ') || 'none'}), verifying all`)

const SCEPTIC = (c, answersBlock) => `${CONTEXT}\n\nYou are the sceptic. ${answersBlock}\n\nFor each answer: check its cited sources through WebSearch (pages cannot be opened on this machine; search for the source's title, the figure and the date, with allowed_domains on the source's host) and confirm from result snippets that they exist, say what the answer claims, and are current as of ${VERIFY_DATE}; look for a newer development (a later notification, court order, launch or price change) the researcher may have missed; check arithmetic; and flag any figure that has no source. Also check the answer against the founder's refined material chain described above and say where it needs to change. Default to holds=false when a key claim is unsupported by any snippet you found; when a claim is plausible but no snippet confirms it, say 'not confirmed by snippet' in problems and keep holds=true only if the source itself was found. Where it does not hold, write the corrected answer with the sources you opened.\n\nReturn one verdict per answer, in order.`

const results = await pipeline(
  WORK,
  (c) => ANSWERED.has(c.key)
    ? Promise.resolve({ fromRepo: true })
    : agent(`${CONTEXT}\n\nCLUSTER: ${c.title}\n\nAnswer each of these questions. Research each one separately and thoroughly (several searches, open the pages), then write the answer the founders can act on. Where the question asks for a recommendation, give one with the reasoning.\n\n${c.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\nReturn the structured result with one entry per question, in order.`, { label: `research:${c.key}`, phase: 'Research', schema: ANSWER_SCHEMA }),
  (research, c) => research && agent(
    research.fromRepo
      ? SCEPTIC(c, `The researched answers for the cluster "${c.title}" were written on 29 September 2026 and are saved in this repository at docs/plan/research/answers/${c.key}.research.json. Read that file first (the Read tool; the working directory is the repository root). It has one entry per question with answer, status, decision, whoToAsk and sources.`)
      : SCEPTIC(c, `Below are researched answers, written today, to questions in the cluster "${c.title}".\n\nANSWERS:\n${JSON.stringify(research.answers, null, 1)}`),
    { label: `verify:${c.key}`, phase: 'Verify', schema: VERDICT_SCHEMA },
  ).then((v) => ({ key: c.key, research: research.fromRepo ? null : research, verdicts: v })),
)

const done = results.filter(Boolean)
log(`${done.length}/${WORK.length} clusters verified` + (done.length < WORK.length ? `; failed: ${WORK.map((c) => c.key).filter((k) => !done.some((r) => r.key === k)).join(', ')}` : ''))
return {
  verified: done.map((r) => r.key),
  failed: WORK.map((c) => c.key).filter((k) => !done.some((r) => r.key === k)),
  research: Object.fromEntries(done.filter((r) => r.research).map((r) => [r.key, r.research])),
  verdicts: Object.fromEntries(done.map((r) => [r.key, r.verdicts])),
}
