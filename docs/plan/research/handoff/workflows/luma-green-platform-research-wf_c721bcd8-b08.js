export const meta = {
  name: 'luma-green-platform-research',
  description: '18 web researchers on market, pricing, law, carbon, solar, integrations, users and support; then a synthesizer and a critic produce the platform plan',
  phases: [
    { title: 'Research', detail: '18 parallel web-research briefs, one per topic' },
    { title: 'Synthesize', detail: 'one planner turns the briefs into the platform plan' },
    { title: 'Critique', detail: 'one critic checks the plan against the research' },
  ],
}

const CONTEXT = `
You are researching for Luma.Green, an Indian platform for the recycling chain. Today is 2026-09-29.

What it is: a web app (Next.js, installable PWA, mobile first) with a Convex backend, in 12 languages (English, Hindi, Bengali, Marathi, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Urdu, Arabic), white theme. Material flows: households -> kabadiwalas (local scrap shops) -> yards/preprocessors (bulk sorting, baling) -> recyclers -> manufacturers. Saathis are gig workers (pickups, sorting, shifts). One admin verifies every business by hand (GST optional, pollution-board consent PDF for yards/recyclers/manufacturers, photo ID and selfie for Saathis). Households never register: they photograph scrap, get an AI estimate, book a pickup or drop-off, and pay/earn by cash or UPI. Kabadiwalas set their own prices over an admin floor table with a fallback table. Planned modules: live prices, raw-material exchange, escrow payments, carbon trading and credits, solar applications, documentation, legal services, a machinery data bank.

Built so far: phone-number + SMS-code sign-in, an admin console, onboarding applications for every role. Pilot: Bengaluru, mid-October 2026, a handful of testers. The founders now want an investor-ready prototype, then all of India and every industry, with the platform good enough that the industry adopts its norms. Keep recommendations simple and easy to integrate; data must be easy to change.

How to work:
- Use the WebSearch and WebFetch tools (load them with ToolSearch: "select:WebSearch,WebFetch"). Open the pages you cite; a search snippet is not a source. Prefer primary sources (government notifications, CPCB, MoEFCC, PIB, RBI, state boards, company sites) and recent material (2023-2026). Note anything specific to Karnataka/Bengaluru.
- You may read the repo's docs/ folder for context. Do NOT edit files, run git, or change anything.
- Be concrete: numbers with units, names, dates. Summarise in your own words; never copy long passages.
- Recommend features for Luma.Green with a priority: "prototype-now" (worth showing investors in the next weeks), "pilot" (needed for real users in Bengaluru), or "scale" (India-wide later).
`

const RESEARCH = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    headline: { type: 'string', description: 'The single most important finding, one sentence, with a number if possible' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string' },
          detail: { type: 'string' },
          sourceUrls: { type: 'array', items: { type: 'string' } },
        },
        required: ['point', 'detail', 'sourceUrls'],
      },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          feature: { type: 'string' },
          why: { type: 'string' },
          priority: { type: 'string', enum: ['prototype-now', 'pilot', 'scale'] },
          users: { type: 'array', items: { type: 'string' } },
        },
        required: ['feature', 'why', 'priority', 'users'],
      },
    },
    artifactMarkdown: { type: 'string', description: 'Markdown for the one table, catalogue or list this topic should produce (see the topic brief). Empty string if none.' },
    risks: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, url: { type: 'string' } },
        required: ['title', 'url'],
      },
    },
  },
  required: ['topic', 'headline', 'findings', 'recommendations', 'artifactMarkdown', 'risks', 'openQuestions', 'sources'],
}

const TOPICS = [
  { key: 'market', brief: `The Indian recycling and scrap market. Size by value and tonnage, growth, and the share handled by the informal sector (kabadiwalas, waste pickers). Flows by material (paper, plastic, metals, glass, e-waste, textiles, batteries, tyres). How many layers sit between a household and a factory, and where value leaks (price opacity, weighing fraud, moisture, cash, credit). City/state hotspots, Bengaluru in particular. artifactMarkdown: a table of materials with annual Indian volume, recycling rate and typical value per kg at the household and factory ends.` },
  { key: 'materials', brief: `The material taxonomy used in Indian scrap trade. For paper, plastics, ferrous and non-ferrous metals, glass, e-waste, batteries and textiles: the grades traders actually use, local trade names (Hindi/Kannada/Tamil words like raddi, bhangar, gatta), HSN codes, units, and quality factors (moisture, contamination). Recommend a catalogue schema (codes, families, grades, translated names) Luma.Green can publish as a shared standard. artifactMarkdown: a proposed catalogue of 40-60 material codes with family, grade, trade names and HSN code.` },
  { key: 'pricing', brief: `Live scrap pricing in India. Which sources publish prices today (apps, city rate lists, MCX and LME for metals, trade portals, WhatsApp groups), how often prices move, and the spread between the household price and the factory price at each layer. Design a price engine for Luma.Green: inputs (kabadiwala rate cards, yard buy prices, completed trades, commodity indices), admin floor and fallback tables, regional differences, freshness rules, anti-manipulation, and a public price board by city. Note data-licensing limits on using index prices. artifactMarkdown: the price engine design as a short spec with a worked example for newspaper and aluminium cans in Bengaluru.` },
  { key: 'competitors-b2c', brief: `Consumer-facing scrap pickup apps and services in India (for example The Kabadiwala, ScrapUncle, Kabadiwalla Connect, ScrapQ, Junkart, KabadiTechno, Recykal consumer products, city players in Bengaluru). For each: model, cities, funding, features (booking, price lists, payments, points, app vs WhatsApp), strengths, complaints in reviews. What households actually want. artifactMarkdown: a feature matrix of 8-12 players against Luma.Green.` },
  { key: 'competitors-b2b', brief: `B2B recycling marketplaces, EPR and traceability platforms in India (for example Recykal Marketplace, Karo Sambhav, Namo eWaste, Attero, Banyan Nation, Scrapo, Metaloop, EPR compliance consultancies) and global references (ScrapMonster, Rheaply, Rubicon, Metaloop, Circular). Their features: listings, bids, escrow, logistics, quality checks, EPR certificates, traceability, SaaS for yards. Gaps Luma.Green can fill. artifactMarkdown: a feature matrix of 10-15 players against Luma.Green.` },
  { key: 'epr', brief: `Extended Producer Responsibility in India: Plastic Waste Management Rules (2016, amendments to 2024-25), E-Waste (Management) Rules 2022 (including solar panels), Battery Waste Management Rules 2022, tyre and used-oil EPR, End-of-Life Vehicle rules 2025. The CPCB centralised portals, roles (producers, importers, brand owners, PWPs, recyclers, refurbishers), how EPR certificates are generated and traded, the records recyclers must keep, audits and penalties. What Luma.Green can automate for recyclers, yards and brands. artifactMarkdown: a table of EPR regimes with who is obligated, the certificate unit, the portal, and what our users must record.` },
  { key: 'legal', brief: `Legal and compliance for running this platform and for its users. GST (registration thresholds, reverse charge on metal scrap, TDS/TCS on scrap, e-invoicing thresholds, e-way bills for moving scrap, TCS for e-commerce operators under section 52), the Consumer Protection (E-Commerce) Rules 2020, IT Act intermediary rules, the DPDP Act 2023 and DPDP Rules 2025, RBI rules for payment aggregators and escrow, Legal Metrology (weighing-scale verification and stamping), pollution-board consents and Karnataka specifics, the Code on Social Security and the Karnataka platform-based gig workers law, and terms of service. artifactMarkdown: a compliance checklist for Luma.Green and one for each user type, with the feature that helps (auto-invoices, e-way bill helper, document vault, compliance calendar, weighing-scale records).` },
  { key: 'carbon', brief: `Carbon markets for recycling in India: the Carbon Credit Trading Scheme 2023 (compliance and offset mechanisms, notified sectors, BEE, the registry, timelines), voluntary markets (Verra, Gold Standard, plastic credit standards such as Verra 3R and PCX), methodologies that credit material recovery and recycling, MRV evidence they need, and prices. What Luma.Green's ledger must capture from day one (weights, chain of custody, photos, GPS, dates) so credits are possible later, and how revenue could be shared with kabadiwalas and Saathis. artifactMarkdown: the data fields to capture per transaction for future credits, with the standard that needs each.` },
  { key: 'solar', brief: `The renewable-energy side: PM Surya Ghar Muft Bijli Yojana (subsidies, national portal, vendor empanelment), rooftop solar for MSMEs such as recyclers and yards, net metering in Karnataka (BESCOM), PM-KUSUM, solar and green financing (SIDBI, banks), and solar-panel end of life under the E-Waste Rules 2022, plus battery-storage recycling. How Luma.Green can offer solar applications: savings calculator, installer leads, subsidy guidance, and collecting end-of-life panels. artifactMarkdown: a simple savings-calculator method with Karnataka tariffs and subsidy amounts, cited.` },
  { key: 'public-systems', brief: `Fitting into public systems: Swachh Bharat Mission-Urban 2.0, Bengaluru's solid waste management (BSWML/BBMP, dry waste collection centres, contracts), material recovery facilities, the Solid Waste Management Rules (including the 2024-26 revisions and bulk waste generators), waste-picker organisations (Hasiru Dala, SWaCH, KKPKP) and occupational ID cards, and government systems with APIs (CPCB portals, GST via GSPs, DigiLocker, Udyam, ONDC logistics, UPI). How Luma.Green plugs in: data sharing, dashboards for city officials, partnerships. artifactMarkdown: an integration map table: system, owner, what we exchange, API available or not, priority.` },
  { key: 'industry-integration', brief: `How yards, recyclers and manufacturers run today and how a platform fits into their work: tools (Tally, spreadsheets, WhatsApp groups, ERPs like SAP for large plants), documents (purchase orders, GRNs, invoices, weighbridge slips, lab reports, recycled-content certificates such as BIS, GRS, ISCC PLUS), chain of custody, and the roles inside a factory (owner, procurement, quality, EHS/compliance, finance, weighbridge operator, plant manager). Easy integrations: exports, Tally import formats, WhatsApp, email. artifactMarkdown: a table of factory user roles with what each needs from Luma.Green and the screen that serves them.` },
  { key: 'personas', brief: `Every user of the platform across India: households (apartments, RWAs, independent houses, rural), bulk generators (offices, hotels, malls, institutions), kabadiwalas, waste pickers/Saathis, yards/aggregators, recyclers, manufacturers and EPR-obligated brands, NGOs/SHGs, city officials, CSR teams, auditors, lenders/investors, and the Luma.Green team itself (operations, support, verification, finance, compliance, sales). For each: jobs to be done, pains, device, languages and literacy, how they pay and get paid, and how the company serves them. artifactMarkdown: a persona table with those columns.` },
  { key: 'support-training', brief: `Support, help and training for low-literacy, multilingual users in India: channels (WhatsApp, IVR, missed call, voice notes, in-app chat), help-centre structure, FAQs, short videos and illustrated step cards, in-person onboarding, training and certification programmes for kabadiwalas and Saathis (look at Hasiru Dala, ITC WOW, Saahas, Swiggy/Zomato/Urban Company partner training). Service levels and a first content plan. artifactMarkdown: the help-centre content plan: for each user type, 6-10 how-to guides and 8-12 FAQs with one-line answers.` },
  { key: 'logistics', brief: `Logistics in the scrap chain: household pickups (slots, routing, vehicles), kabadiwala to yard movement, yard to recycler bulk loads, weighbridges, reverse-logistics partners and freight marketplaces, costs per km and per tonne, e-way bills, and loading/safety. What Luma.Green should build (slot booking, route suggestions, load pooling, freight quotes) and what to leave to partners. artifactMarkdown: a table of logistics features by user with priority.` },
  { key: 'payments', brief: `Payments and finance: UPI and cash for households and kabadiwalas, B2B escrow (RBI rules, escrow providers, payment-aggregator nodal accounts), settlement times, invoicing, TDS/TCS, working-capital credit for kabadiwalas and yards (invoice discounting, TReDS, NBFC partners), insurance, and digital receipts. Name realistic partners (Razorpay, Cashfree, PhonePe, banks). artifactMarkdown: the money flows for one household pickup and one yard-to-recycler trade, step by step, with fees.` },
  { key: 'trust-safety', brief: `Trust, safety and quality: identity and KYC without storing Aadhaar (DigiLocker, masked Aadhaar, video KYC), fraud patterns in scrap (tampered scales, moisture in paper, mixed grades, fake listings, non-delivery), ratings, disputes, photo-based grading, weighing verification, and worker safety (PPE, child labour, injuries). artifactMarkdown: a table of fraud and safety risks with the platform control for each.` },
  { key: 'design', brief: `Design for these users: interfaces for low-literacy users (icons, pictograms, voice, large tap targets, few words), Google's Next Billion Users research, colour and accessibility, low-end Android and poor networks (PWA, offline), and an illustration strategy with licences: open or low-cost illustration libraries (unDraw, Open Peeps, Humaaans, Storyset and others; state each licence and attribution rule), Indian-context illustration sources, and material icons. Recommend how to extend a shadcn/Tailwind design system. artifactMarkdown: a table of illustration and icon sources with licence, attribution rule, Indian-context fit and recommendation.` },
  { key: 'business', brief: `Business model and investor story: revenue streams (commissions, SaaS for yards and recyclers, EPR certificate services, carbon-credit revenue share, data and price intelligence, financing referrals, solar leads), unit economics, comparable companies and their funding (for example Recykal, Attero, others), the city-by-city expansion playbook, partnerships, network effects, the KPIs investors expect at seed/Series A, and a strategy for Luma.Green's norms to become industry standards (open material codes, grading and weighing standards, certification). artifactMarkdown: a one-page investor narrative outline with the KPIs to show.` },
]

phase('Research')
const briefs = (await parallel(TOPICS.map((t) => () =>
  agent(`${CONTEXT}\n\nYour topic: ${t.key}.\n${t.brief}\n\nAim for 8-15 findings, 5-12 recommendations and 6-20 sources you actually opened.`, {
    label: `research:${t.key}`,
    phase: 'Research',
    schema: RESEARCH,
  })
))).filter(Boolean)
log(`${briefs.length} of ${TOPICS.length} research briefs back`)

const PLAN = {
  type: 'object',
  properties: {
    lead: { type: 'string', description: 'Two sentences: what Luma.Green becomes and the first thing it proves' },
    overview: {
      type: 'object',
      description: 'For a diagram: the platform as nodes (users and modules) and edges (material, money, data)',
      properties: {
        nodes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, label: { type: 'string' }, kind: { type: 'string', enum: ['user', 'module', 'external'] } }, required: ['id', 'label', 'kind'] } },
        edges: { type: 'array', items: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, label: { type: 'string' }, flow: { type: 'string', enum: ['material', 'money', 'data'] } }, required: ['from', 'to', 'label', 'flow'] } },
      },
      required: ['nodes', 'edges'],
    },
    personas: { type: 'array', items: { type: 'object', properties: { user: { type: 'string' }, who: { type: 'string' }, needs: { type: 'string' }, device: { type: 'string' }, language: { type: 'string' }, companyServes: { type: 'string' } }, required: ['user', 'who', 'needs', 'device', 'language', 'companyServes'] } },
    sections: {
      type: 'object',
      description: 'Markdown for each plan section, concise: lead sentence first, then a table or short bullets, with [source](url) links',
      properties: {
        market: { type: 'string' },
        competitors: { type: 'string' },
        pricing: { type: 'string' },
        compliance: { type: 'string' },
        carbonSolar: { type: 'string' },
        integrations: { type: 'string' },
        support: { type: 'string' },
        standards: { type: 'string' },
      },
      required: ['market', 'competitors', 'pricing', 'compliance', 'carbonSolar', 'integrations', 'support', 'standards'],
    },
    modules: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, purpose: { type: 'string' }, users: { type: 'array', items: { type: 'string' } }, features: { type: 'array', items: { type: 'string' } } }, required: ['name', 'purpose', 'users', 'features'] } },
    roadmap: { type: 'array', items: { type: 'object', properties: { phase: { type: 'string' }, window: { type: 'string' }, goals: { type: 'array', items: { type: 'string' } }, gate: { type: 'string' } }, required: ['phase', 'window', 'goals', 'gate'] } },
    prototypeScope: { type: 'array', description: 'What to build now for the investor demo, most important first', items: { type: 'object', properties: { feature: { type: 'string' }, users: { type: 'array', items: { type: 'string' } }, why: { type: 'string' }, demo: { type: 'string', description: 'How to show it in a demo, in one line' } }, required: ['feature', 'users', 'why', 'demo'] } },
    helpCentre: { type: 'string', description: 'Markdown: the help-centre content plan per user type (guides and FAQs with one-line answers)' },
    materialCatalogue: { type: 'string', description: 'Markdown table of the proposed material codes' },
    risks: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' } }, required: ['title', 'url'] } },
  },
  required: ['lead', 'overview', 'personas', 'sections', 'modules', 'roadmap', 'prototypeScope', 'helpCentre', 'materialCatalogue', 'risks', 'openQuestions', 'sources'],
}

phase('Synthesize')
const plan = await agent(`${CONTEXT}

You are the planner. Below are ${briefs.length} research briefs (JSON). Turn them into Luma.Green's platform plan: decide, don't list options. Keep it simple and easy to integrate; the founders want an investor-ready prototype now, a Bengaluru pilot in October 2026, then all of India.

Rules for the markdown you write: lead sentence first; tables for items compared on several attributes; short bullets otherwise; numbers with units; every figure from a brief keeps its [source](url) link; no filler, no "this section outlines".

For prototypeScope: 8-14 features that make the whole chain demo-able with seeded data (every role has a screen worth showing), ordered by investor impact, each with a one-line demo script.

Research briefs:
${JSON.stringify(briefs)}`, { label: 'synthesize:plan', phase: 'Synthesize', schema: PLAN, effort: 'high' })

const CRITIQUE = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    gaps: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, fix: { type: 'string' } }, required: ['issue', 'fix'] } },
    unsupportedClaims: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'gaps', 'unsupportedClaims'],
}

phase('Critique')
const critique = plan ? await agent(`${CONTEXT}

You are a demanding reviewer. Check this platform plan against the research briefs it came from. Find: claims or numbers not supported by a brief's sources, important research findings the plan dropped, contradictions, legal or compliance risks it glosses over, and prototype features that would not demo well or are too big for a few weeks. Be specific and give a fix for each gap.

Plan:
${JSON.stringify(plan)}

Research briefs:
${JSON.stringify(briefs)}`, { label: 'critique:plan', phase: 'Critique', schema: CRITIQUE, effort: 'high' }) : null

return { briefs, plan, critique }
