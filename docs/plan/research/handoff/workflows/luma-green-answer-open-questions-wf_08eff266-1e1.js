export const meta = {
  name: 'luma-green-answer-open-questions',
  description: 'Answer the 167 open questions and 15 risks in the Luma.Green plan: 24 research clusters, each answer adversarially checked, then one synthesis for the plan doc',
  phases: [
    { title: 'Research', detail: '24 clusters of related questions, one web researcher each' },
    { title: 'Verify', detail: 'a sceptic checks every answer against its sources' },
    { title: 'Synthesise', detail: 'one writer turns confirmed answers into the plan section' },
  ],
}

const TODAY = '29 September 2026'
const CONTEXT = `
Luma.Green is an Indian recycling-chain platform starting a Bengaluru pilot on 13 October 2026: households sell scrap to kabadiwalas (local scrap shops), who sell to yards, then recyclers, then manufacturers; Saathis are gig workers who do pickups and sorting; one admin verifies every business. The pilot records cash and UPI payments but moves no money; business escrow is simulated for now. The founders need answers they can act on, in plain English, with sources they can open.

Today is ${TODAY}. Use web search and open the pages you cite (a search snippet is not a source). Prefer official pages: gazettes, CPCB/KSPCB/BESCOM/KERC/RBI/CBIC/GSTN portals, ministry press releases, company pricing pages, dated news. Give the date of each source. If something cannot be settled from public pages (it depends on the pilot, a lawyer or a phone call), say so and give the best available default plus who to ask. Never invent figures: a missing number is a one-line open item.`

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

phase('Research')
const results = await pipeline(
  CLUSTERS,
  (c) => agent(`${CONTEXT}\n\nCLUSTER: ${c.title}\n\nAnswer each of these questions. Research each one separately and thoroughly (several searches, open the pages), then write the answer the founders can act on. Where the question asks for a recommendation, give one with the reasoning.\n\n${c.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\nReturn the structured result with one entry per question, in order.`, { label: `research:${c.key}`, phase: 'Research', schema: ANSWER_SCHEMA }),
  (research, c) => research && agent(`${CONTEXT}\n\nYou are the sceptic. Below are researched answers to questions in the cluster "${c.title}". For each answer: open its cited sources and check that they exist, say what the answer claims, and are current as of ${TODAY}; look for a newer development (a later notification, court order, launch or price change) the researcher may have missed; check arithmetic; and flag any figure that has no source. Default to holds=false when a key claim is unsupported. Where it does not hold, write the corrected answer with the sources you opened.\n\nANSWERS:\n${JSON.stringify(research.answers, null, 1)}\n\nReturn one verdict per answer, in order.`, { label: `verify:${c.key}`, phase: 'Verify', schema: VERDICT_SCHEMA }).then((v) => ({ cluster: c, research, verdicts: v })),
)

const done = results.filter(Boolean)
log(`${done.length}/${CLUSTERS.length} clusters researched and verified`)

phase('Synthesise')
const synthesis = await agent(`${CONTEXT}\n\nYou are writing the "Answers to the open questions" section of the Luma.Green Platform Plan, for the founders. Below are 24 clusters of researched answers, each with a sceptic's verdict. Where the verdict says an answer does not hold, use the correction. Where it holds, use the answer, tightened.\n\nWrite Markdown (no top-level heading; start with a one-paragraph lead that says what was settled, what needs a call, and the three most consequential findings). Then one "### <cluster title>" section per cluster, in the order given, each with: the answer to each question as a short paragraph starting with the answer itself (numbers, dates), then a **Decision:** line where the founders must choose (the recommended default), then a **Confirm with:** line where a CA, counsel, BESCOM, a partner or the pilot must confirm. Cite sources inline as [name](url) next to the claim they support; every figure, date and rule cites a source. Plain English, sentences under 25 words, no jargon without a gloss, no bullet lists inside paragraphs, no filler. End with a "### Still open" list of anything that no public page can settle, each with who settles it and by when (before 13 Oct 2026, during the pilot, or at scale).\n\nDATA:\n${JSON.stringify(done.map((r) => ({ title: r.cluster.title, answers: r.research.answers, verdicts: r.verdicts ? r.verdicts.verdicts : null })), null, 1)}\n\nReturn the Markdown only.`, { label: 'synthesise', phase: 'Synthesise' })

return { clusters: done.length, synthesis, raw: done }
