# Platform refinement interview

> **Status:** implementation requested on 6 October 2026. This is the single
> running record of the founder's refined requirements. Append each new
> interview decision here first, then update the linked product summaries.
> Unresolved commercial and legal choices remain open while compatible
> implementation proceeds.

The editable Word copy is
[luma-green-platform-refinement-interview.docx](../../output/docx/luma-green-platform-refinement-interview.docx).
Keep this Markdown record and the Word copy in sync after each interview update.

## How this interview works

Record what the founder says, then test each unclear claim against the actual
user flow, current implementation and current source material. Separate a
confirmed requirement from an example, assumption or feasibility question.
When two statements differ, record both and ask a focused question. Update the
implementation plan only after the team verifies the requirement and its
feasibility. Only confirmed behavior can become a live workflow. A proposal
can become an internal or evidence-only capability while its owners remain open.

## Interview entry — 4 October 2026

### Confirmed direction

- **Business model:** Luma.Green is a software-as-a-service (SaaS) business.
  Subscription prices, billing and the paying customer are still open.
- **Household collection and payment:** the kabadiwala buys household material
  and pays the household. Luma does not intervene in that payment. The
  household team's operational role still needs definition. Keep both S2P
  segment models open until the founder chooses one.
- **Procure-to-pay (P2P):** the new example uses P2P for the procurement
  execution flow after supplier sourcing and approval. Do not use P2P to mean
  “peer-to-peer.” The flow covers purchase request, purchase order, dispatch,
  receipt, quality acceptance, invoice matching, payment approval and status.
- **Business model:** Luma.Green provides SaaS and does not own material simply
  because it records a trade. Keep the physical-material price, Luma service
  price and any optional transaction service fee as separate price objects.
- **Business segmentation:** keep both models open: (1) household sourcing
  uses S2P, and business purchases use P2P; or (2) business buyers use S2P
  supplier sourcing followed by P2P procurement execution. Manufacturers are
  included, including when they offer byproducts. A manufacturer may buy
  material, offer byproducts, or do both.
- **Participant term:** use **non-household material generators** for
  manufacturers, apartment communities, offices, hotels, resorts and similar
  organisations that may supply material. This term describes the source group;
  it does not create a new legal entity type or require every member to sell.
- **Role name:** use **preprocessor** for the participant previously described
  as an aggregator. “Yard” may describe the physical site. Use “preprocessor”
  for the participant in product language and documentation.

### Participant list

- **Household team** — may coordinate household collection; it does not buy
  or pay for the material. Its exact work with kabadiwalas remains open.
- **Kabadiwalas** — trade participants; their buying and selling process is
  open.
- **Preprocessors** — trade participants; their buying and selling process is
  open.
- **Recyclers** — buyers of processed material and possible sellers of recycled
  outputs; their sourcing and procurement scope is open.
- **Manufacturers** — include all manufacturers; they may buy material and may
  offer byproducts through the material-trade workflow.
- **Apartment communities, offices, hotels and resorts** — included as
  non-household material generators and material-trade participants.
- **Other non-household material generators** — included under the same term
  when they can offer relevant material.
- **Saathis** — retain the participant role. Their work and payment flow needs
  a separate interview decision; do not treat job payments as material trades.
- **Luma.Green administrators** — operate the SaaS; they are not material-trade
  counterparties by default.

## Items still to define

These points are not decided by the confirmed direction above:

1. Which business segmentation model should Luma use: household-only S2P with
   P2P for business purchases, or S2P supplier sourcing followed by P2P
   procurement execution for business buyers too? The founder asked to keep
   both models open for now.
2. Who is the buyer and supplier at each PET lifecycle stage? Which party
   sources suppliers, approves them, issues the purchase order and pays?
3. Does P2P cover every non-household material purchase, or only procurement
   after suppliers have been sourced and approved?
4. Which payment gateway will execute B2B trades, and who may collect a
   disclosed transaction service fee? Until it is integrated and verified,
   payment-dependent actions remain blocked.
5. Which material grades launch first, and what buyer-specific limits apply to
   contamination, moisture, colour, PVC, labels and polyolefins?
6. Which tests and documents prove quality at each hand-off? Who can approve an
   inspection, and what correction process records a changed result?
7. What exact organisation, facility, site and staff model should generators,
   preprocessors, recyclers and manufacturers use?
8. Which checks apply to each organisation, facility and material? Which
   parties need GST, state pollution-control consent or CPCB registration?
9. Should Luma only store compliance evidence and portal references, or prepare
   portal submissions too? Any integration needs legal and technical approval.
10. For each movement, who is responsible for the invoice, e-way bill, transport,
    receipt, payment and dispute?
11. Who buys the SaaS subscription, how does billing work, and do plans vary by
    participant type, site, seats or use?
12. Is Saathi work a separate service marketplace, and who hires and pays a
    Saathi?
13. Which reports distinguish household collection, business procurement,
    material transformations, quality and compliance evidence?
14. What buyer specification and test method applies at each hand-off, and who
    owns the final acceptance decision?
15. How does the household team work with the kabadiwala who buys and pays?
    The kabadiwala is the material buyer and payer; staff, pickup, receipt and
    stock-custody responsibilities still need definition.
16. During file review, should every accepted image format have GPS metadata
    removed before storage? The founder deferred this choice to that review.

## Interview entry — 4 October 2026: PET circular-plastics example

This example is a working business-flow model for discussion. It is not a
verified quality standard, legal opinion or approved implementation design.

### Example physical flow

```text
Household
  → sells segregated or mixed dry scrap
Kabadiwala
  → weighs, pays, records source and material; sorts and bales PET bottles
Preprocessor / material recovery facility
  → receives and inspects bales; removes contaminants; makes and washes flakes
Recycler
  → buys accepted flakes; makes rPET fibre, pellets, sheet, strapping or resin
Fibre manufacturer
  → makes polyester staple fibre (PSF)
Textile manufacturer
  → makes yarn and fabric
Garment manufacturer
  → makes garments or other products
```

PET bottle bodies, caps and neck rings, labels, and rejects may follow separate
material paths. The example proposes that PET flakes sink while PP/HDPE
fractions float during sink-float separation. Processors must record the actual
outputs and losses for each batch; the flow does not assume every bottle or
label has the same composition.

### Example material states

```text
PET bottle: mixed → sorted → bale → post-debale → raw flake
  → cold-washed flake or hot-washed flake → rPET-PSF → yarn → fabric → garment
PP cap: mixed → float fraction → ground/recycled PP
HDPE cap: mixed → float fraction → ground/recycled HDPE
Reject or contamination → documented recovery, disposal or process loss
```

These are proposed labels, not a final catalogue. Each batch transformation
should reconcile integer grams:

```text
input grams - contamination grams - process-loss grams = accepted output grams
```

Record yield and byproducts as explicit outputs when they are measured. Do not
silently force measured quantities to balance.

### Handoff-by-handoff flow

The founder asked to define **all** hand-offs in the PET chain. The table records
the current example and the evidence each step may need. It does not approve a
contract, quality limit, legal role or payment rule.

| Hand-off or stage                           | Material movement                                                                                           | Record to consider                                                                                                                                    | Still to decide                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Household → kabadiwala                      | Segregated or mixed dry household scrap is weighed and accepted                                             | Booking/source, photos if used, material estimate, actual integer grams, price and paise paid, time and receipt                                       | Kabadiwala buys and pays; define who collects, sets the rate, issues the receipt and records custody.                         |
| Kabadiwala sorting                          | Mixed intake becomes sorted stock, PET lots, bales and recorded rejects                                     | Input/output grams by material, moisture or contamination when measured, process loss and stock location                                              | Whether sorting is one event or several; grade names and who verifies the record                                              |
| Kabadiwala → preprocessor                   | PET bottles or bales are offered, transported, received and weighed                                         | Offer/accepted terms, source lot, dispatch and transport proof, received grams, inspection, acceptance/rejection, receipt and any invoice reference   | Who starts the offer, who transports, weighing method, quality disagreement, price and settlement                             |
| Preprocessor processing                     | Received bales become separated cap/ring fractions, PET flakes, labels and rejects                          | Input/output grams, process loss, contamination, separation and wash process, flake grade, inspection evidence                                        | Process recipe, cold/hot wash definitions, test methods, yield tolerances and approved reject destinations                    |
| Preprocessor → recycler                     | Raw, cold-washed or hot-washed flakes are sold and received                                                 | Buyer specification, batch and sample, lab/inspection result, dispatch proof, received and accepted grams, purchase order, invoice and payment status | First grades, numeric limits, sampling, rejection/price adjustment, title transfer and who pays transport                     |
| Recycler processing                         | Accepted flakes become one or more recycled outputs, such as rPET fibre, pellets, sheet or strapping        | Input/output grams by product and byproduct, process loss, output grade, batch lineage and test evidence                                              | Which conversion products are in scope first; process yields, grade specifications and facility evidence                      |
| Recycler → fibre manufacturer               | Suitable rPET feedstock is purchased for polyester staple fibre (PSF) production                            | Contract/order, material and grade, source batch, dispatch/receipt, accepted quantity, quality result, invoice match and payment status               | Whether recycler sells flakes, pellets, fibre or PSF in the first flow; exact acceptance limits and party responsibilities    |
| Fibre manufacturer → textile manufacturer   | PSF becomes yarn and/or fabric through spinning and textile production                                      | Input/output batch links, mass balance, product grade, order/receipt and quality acceptance                                                           | Which products Luma tracks, what counts as a commercial hand-off, and who owns each procurement/payment step                  |
| Textile manufacturer → garment manufacturer | Yarn or fabric becomes garment inputs or finished products                                                  | Batch lineage, quantity/unit, specification, inspection and commercial receipt if traded on Luma                                                      | Whether this downstream sale is in platform scope or is traceability-only                                                     |
| Non-household generator → approved buyer    | Apartment communities, offices, hotels, resorts or manufacturers may offer generated material or byproducts | Generator/site, material declaration, measured quantity, source evidence, receiving inspection and custody record                                     | Any approved buyer handling that material may respond; define material permissions, collection, commercial and payment roles. |
| Side streams and rejects                    | PP/HDPE caps and rings, labels, contamination and process rejects move to recovery, sale or disposal        | Separate material lots, measured grams, receiver, destination and recovery/disposal evidence                                                          | Which fractions are saleable, approved destinations, applicable quality/legal rules and who records final receipt             |

Each physical hand-off should use one shared receipt pattern: identify both
parties and the batch; record dispatch and receipt weights; record an inspection
and acceptance decision; link the commercial documents; and keep corrections as
new audited records. The exact fields may differ by material and stage. Do not
assume a physical transformation is a sale, or that every downstream step runs
through Luma.

### Quality and custody gates

At each hand-off, record the sending and receiving parties, batch, measured
weight, material grade, inspection, decision, time and supporting evidence.
The example proposes photos and actual weight at household pickup; bale grade
and foreign-material share at yard receipt; and purity, colour, moisture,
contamination and wash-process details for flakes. The buyer's written
specification determines acceptance. “Hot-washed” alone does not prove a grade.

Keep accepted inspection results immutable. A correction should create a new
inspection with the reason, actor, approver and audit record. The exact test
methods, tolerance values, sample rules and evidence retention remain open.

### Commercial flows and price objects

**S2P supplier sourcing (example):** demand plan → source suppliers → request
quotations → compare quality, price, capacity, distance and compliance → approve
supplier and contract → purchase order → receipt and inspection → invoice match
and payment.

**P2P procurement execution (example):** purchase request → purchase order →
dispatch and transport proof → goods receipt → quality acceptance or rejection
→ supplier invoice → match order, received quantity and accepted invoice →
payment approval → payment status. The example proposes this for
preprocessor-to-recycler and recycler-to-manufacturer purchases.

Keep these values separate:

1. **Material price:** a dated amount in integer paise per kg, adjusted by
   material, grade, location, quantity and accepted quality.
2. **SaaS service price:** subscription, seats, sites, API or optional modules.
3. **Transaction service fee:** optional disclosed fixed fee or basis-point fee.

Do not infer that Luma buys, owns, resells or holds the material or payment.
Confirm the legal and commercial role for each transaction before implementation.

### Compliance boundary and evidence

The product may record organisation and facility identity, relevant GST and
pollution-control evidence, batch and custody records, invoices, transport
references and portal-issued certificate references. Registration duties and
eligibility depend on the party, activity, facility and current rules. A
kabadiwala is not a Plastic Waste Processor just because it collects or trades
plastic. Only an eligible, registered processor can issue the applicable
processing certificate through the authorized CPCB process; Luma must not mint
or describe a platform record as an EPR certificate. The current [CPCB Common
EPR Portal](https://epr.cpcb.gov.in/) is the official portal entry point. The
[CPCB PWP registration SOP](https://eprplastic.cpcb.gov.in/plastic/downloads/SOP%20PWP_0001.pdf)
is a reference for feasibility review; confirm that its process and linked
portal remain current before relying on operational details.

CBIC Rule 138 gives a general e-way-bill rule for registered persons who cause
movement of consignments above ₹50,000, with exceptions and role-specific
steps. The product may prepare information and store the resulting reference;
the legally responsible registered person or transporter must generate or
authorize the document as applicable. Validate each workflow with a GST
professional and the current rules before enabling compliance claims. See
[CBIC Rule 138](https://cbic-gst.gov.in/ewaybill-rules.html).

### Candidate first use cases

1. Household PET pickup; the kabadiwala buys and pays the household directly.
   Define who performs pickup, issues the receipt and records stock custody.
2. Kabadiwala-to-preprocessor bale offer, receipt, weighing and quality decision.
3. Preprocessor-to-recycler flake purchase with buyer specification and receipt.
4. Recycler-to-fibre manufacturer PSF contract, batch receipt and invoice match.
5. Compliance evidence workspace for eligible parties, with external portal
   certificate references.

These use cases need confirmation after the S2P/P2P segment boundary is clear.

## Interview entry — 6 October 2026: teammate PET workbook review

**Source and authority.** The team supplied
`Luma_Green_PET_bottle_to_shirt_workbook.xlsx` as a broad outline, not as an
approved specification. I read all ten sheets: README, Framework, Value Chain,
QC Specs, Pricing, Scenario, Compliance, Use Cases, Calculators and Sources.
Workbook directions such as “edit the yellow cells,” its rollout order, and its
suggested prices are instructions and proposals _inside source material_; they
do not override the founder's instructions. No workbook cell authorizes a code,
schema, data, payment or compliance change. Keep this interview and its Word
copy as the one current requirements record; retain the workbook as reference.

### What the workbook adds to the candidate platform outline

- **Collection and labour:** a multilingual household booking or WhatsApp
  request, visible grade rate and slot, collector identity, calibrated weight,
  photo where useful, payment proof, receipt and source batch. A proposed
  Saathi day close compares collected and handed-over grams and records the
  variance. WhatsApp, instant UPI payment, insurance, welfare-board identifiers
  and automated payouts need provider, legal and operating checks.
- **More source organisations:** dry-waste centres and waste-picker
  cooperatives may collect or consolidate material. Apartment communities,
  offices, hotels and similar sites need a site-level waste log and vendor
  evidence when applicable. They remain **non-household material generators**.
  Manufacturing byproducts use this source role too, but their waste category
  and permits must be checked separately from municipal solid waste.
- **Physical and digital chain:** source batch → sorted lot → bale → washed
  flake and separated PP/HDPE/reject lots → recycled fibre or another rPET
  output → yarn → fabric → garment order. At each hand-off, link the sending
  and receiving organisations, site, measured grams, quality decision,
  custody evidence, order and settlement reference when there is a trade.
  Preprocessing and fibre making may be done by the same organisation or by
  different ones; do not turn each physical step into a required sale.
- **B2B procurement:** the proposal adds buyer-specific specifications,
  weighbridge and goods-receipt records, quality deductions, invoice matching,
  payment status and disputed-quantity handling. Keep both S2P/P2P segment
  models open. No purchase order or GST invoice should be invented for an
  informal purchase where neither exists. A weighment slip, payment voucher
  and batch record can document such a purchase, subject to tax review.
- **Additional workspaces to interview:** beverage packaging brands with EPR
  duties, separate apparel brands seeking recycled-content evidence, city
  officials, CSR sponsors, lenders, independent auditors and waste-picker
  unions. The founder requested accounts for all these groups on 6 October;
  their permissions and onboarding evidence still need definition. The
  beverage brand's packaging obligation is distinct from an
  apparel brand's claim about a shirt.
- **Quality:** the workbook offers editable hot-washed-flake screening fields:
  intrinsic viscosity, moisture, PVC, polyolefins and metals. Its example
  thresholds and PASS/FAIL formulas are _not_ a product standard or a lab
  certificate. Record the buyer's specification version, sampling method,
  unit, result, lab/inspector, evidence and acceptance decision. Add a new
  inspection for a correction. Define bale gates for colour, PVC, non-PET,
  moisture, dirt and weight with actual buyers.
- **Commercial model:** free or paid tiers, site/plant subscriptions, optional
  trade fees and evidence-pack fees are hypotheses. The workbook's example
  monthly prices are household optional ₹49–99; kabadiwala ₹299–499;
  cooperative ₹1,500–3,000; preprocessor ₹2,999–9,999; recycler
  ₹25,000–100,000; manufacturer ₹50,000–200,000; and generator site
  ₹4,999–19,999. Its packaging-brand example is ₹5–25 lakh a year plus
  ₹100–250 per verified tonne. These are _unvalidated test prices_, not a
  rate card or agreed charging policy. The Scenario sheet uses placeholder
  customer counts and tonnage; its MRR/ARR is not a forecast.
- **Illustrative PET economics:** the workbook uses listing prices rather than
  firm bids, 65–73% bale-to-flake yield from non-Indian examples, assumed
  10–15% later loss, 180 g fibre per shirt and 20 g per bottle. It correctly
  separates a simple weight conversion from a yield-adjusted bottle count.
  Require measured local inputs and integer-gram mass balance before any
  product claim. Preserve separately measured cap, label, reject and other
  outputs; a material claim must not count the same grams twice.
- **Possible rollout:** workbook suggests generator/preprocessor paperwork,
  then recycler evidence, then brand/apparel workspaces. This is a team
  hypothesis. Pilot order depends on interviews, verified demand and the
  feasibility gate; household and Saathi support cannot be assumed free to
  operate merely because their software price is zero.

### Conflicts and feasibility checks raised by the workbook

1. **SaaS versus material margin.** Framework, Pricing, Use Cases and the
   floor-price calculator describe Luma as funding free users from a material
   spread or setting a doorstep buying price after a “platform margin.” That
   would require a defined buyer, stock owner, payer and tax role. The founder
   has confirmed SaaS and has _not_ confirmed Luma as a principal trader. Keep
   material revenue out of SaaS forecasts until this is resolved. The proposed
   “floor” calculation is a maximum affordable purchase price under its
   assumptions; it is not automatically a seller protection floor.
2. **Household payer resolved.** Workbook Use Case 1 assigns instant payment
   to a Saathi flow. The founder clarified on 6 October that the kabadiwala
   buys and pays the household, without Luma handling funds. The household
   team's work, stock custody and receipt issuer remain open.
3. **Names and role boundaries.** Replace workbook “yard (aggregator)” with
   **preprocessor** in product language; “yard” can mean the site. A dry-waste
   centre, cooperative or recycler may also preprocess, so facility activities
   and permissions matter more than a single label. Keep manufacturers,
   including byproduct suppliers, in scope.
4. **Certificates and documents.** Luma may track evidence and external
   references. It cannot issue a CPCB EPR certificate, a local-body Extended
   Bulk Waste Generator Responsibility (EBWGR) certificate, or a voluntary
   textile transaction certificate. A GST invoice, e-way bill or payment can
   be _prepared, linked or initiated_ only after the responsible party,
   authorization and provider route are established. The workbook phrase
   “system produces” must not be read as present capability.
5. **Different legal regimes for different material.** The official
   [Solid Waste Management Rules, 2026](https://moef.gov.in/uploads/pdf-uploads/pdf_69a16e3b04c107.91022257.pdf)
   began on 1 April 2026 and define a bulk generator by any one of 20,000 m²
   floor area, 40,000 litres of water daily, or 100 kg of solid waste daily.
   They exclude industrial and other separately regulated waste. A factory's
   municipal dry waste and its manufacturing byproduct need different
   classification checks. The Rules assign EBWGR certificate generation to
   the local body; Luma may store a reference and supporting records.
6. **Tax and regulatory data cannot be constants yet.** The
   [CBIC GST rate table](https://cbic-gst.gov.in/gst-goods-services-rates.html)
   lists heading 3915 plastic waste at 18%, which supports one workbook
   listing; the applicable date, exact product classification, other tax
   rates, reverse charge, TCS and invoicing still need a tax professional's
   sign-off. The workbook's EPR certificate rate, environmental-compensation
   amount, return dates, Karnataka fee category, pollution-consent category
   and payment duties also need primary-source and activity-specific review.
   Do not present any of its research numbers as live prices or legal advice.
7. **Evidence is not proof of origin by itself.** A photo, weight slip, QR/bag
   tag or imported certificate can be copied or entered incorrectly. Trace a
   physical lot through custody, sampling, transformations and claims, with
   correction and duplicate-claim controls. Photo GPS metadata is not needed
   and must not be a location source; decide metadata stripping for all image
   formats during file review as already agreed.
8. **Pricing and forecast logic need real costs.** The workbook's prices,
   trade listings, fee percentages and pilot counts are hypotheses. A per-hop
   fee can charge the same tonne more than once, while a trade fee may change
   GST treatment or payment responsibilities. Model fulfilment, support,
   provider, storage and compliance costs and test willingness to pay before
   approving tiers or claiming MRR. Use integer paise and grams in the
   product; workbook spreadsheet decimals are only planning arithmetic.

### Interview decisions requested next

1. Which team or Saathi performs household pickup for the kabadiwala, and who
   creates the receipt and custody record after the kabadiwala pays?
2. What onboarding checks and record permissions should each newly approved
   city, CSR, lender, auditor, union and apparel-brand account receive?
3. Which first customer has a current, paid need: a generator site, a
   preprocessor, a recycler or a brand? Ask for a named pilot, current manual
   process, record volume and budget before using workbook prices.
4. At which first hand-off will Luma record a real purchase rather than only
   traceability, and who issues its invoice, moves the material and settles a
   quality dispute?

**Feasibility gate status:** not passed. The workbook is strong coverage of
candidate functions, but its assumptions, role additions, legal claims, price
points and implementation actions need team decisions and primary evidence.

### 6 October 2026 implementation decisions

The founder requested implementation of the whole workbook scope, local tests,
and a production release through Vercel. Implement it in compatible slices
with the repository's required checks. A request for the full scope does not
verify the workbook's illustrative rates, quality limits, legal claims or
customer counts. Those values must remain configurable and unapproved until
the appropriate buyer, customer or adviser verifies them.

- The **kabadiwala** buys household material and pays the household. Luma does
  not collect, hold or send that payment. The household team's pickup work is
  still to define.
- City officials, CSR sponsors, lenders, auditors, waste-picker unions and
  apparel brands need platform accounts. Give each a separate least-privilege
  permission set; no group gains general access to another party's stock,
  prices, identity documents or certificates by joining.
- All B2B payment must go through a payment gateway once connected. Do not
  offer direct settlement, manual/off-platform payment approval or simulated
  escrow as a live transaction path. Orders, inspections and custody records
  may exist without a completed payment; payment-dependent actions must wait
  for verified gateway state. The gateway provider and live account remain
  open at this entry. [ADR 0019](../decisions/0019-gateway-only-business-payments.md)
  records this boundary.
- A manufacturer may offer a non-hazardous recyclable byproduct to **any
  approved buyer handling that material**. Buyer eligibility follows the
  material and current approval, rather than only the prototype's next
  organisation type. Hazardous or uncertain material needs a separate gate;
  a seller declaration alone does not approve a buyer or prove legal eligibility.
- Build evidence and references for GST, e-way bills, CPCB and textile claims
  without making Luma their issuer. The legally responsible party, official
  portal or certifier performs each external action.

### Implementation and release sequence

This is the working implementation map for the full workbook request. Each
slice must include permission and failure tests,
update the user guide for visible behavior and pass the repository release
checks. The production release is the final verified result, not a substitute
for deciding an open contract.

1. **Accounts and sites:** create new participant
   accounts, facility/site activity and material-origin facts. Separate trading
   rights from read-only, sponsor, lender, city and audit rights. Verify each
   role's onboarding and cross-organisation access.
2. **Material catalogue and custody:** define material forms and buyer-grade
   specifications. Record source, lot, transfer, transformation, byproducts,
   losses and accepted integer grams. Keep the inventory owner separate until
   a tested reconciliation explains how new lot records connect to it.
3. **Quality:** record sampling, lab or inspector, specification revision,
   measured result, acceptance, rejection and audited correction. Do not make
   workbook example limits the default for every buyer.
4. **Sourcing and trade:** allow approved buyers and sellers to discover and
   agree a material lot; record orders, dispatch, goods receipt and dispute.
   Replace the prototype's one-way role graph where manufacturers supply
   byproducts. Remove simulated escrow from live trade behavior. Keep payment
   dependent state blocked until the chosen gateway verifies it.
5. **Money and SaaS:** store material price, Luma service price and any
   disclosed transaction fee separately as integer paise. Make plan prices
   configurable; the workbook's numbers are research inputs. Connect B2B
   payment and subscriptions only through approved gateway flows, with
   webhook verification, idempotency, reconciliation, refund and failure
   handling before enabling live collection.
6. **Compliance evidence:** store external invoice, e-way bill, consent,
   EPR/EBWGR and voluntary textile certificate references with issuer,
   scope, expiry and source documents. Never generate a certificate in Luma.
   Gate any portal integration on official API access and legal review.
7. **Workspaces and reporting:** show each account only its authorized lots,
   procurement work, evidence, claims and reports. Build generator-site,
   preprocessor, recycler, manufacturer, brand and approved observer views;
   preserve language, accessibility, phone and desktop coverage.
8. **Local and release verification:** check all changed backend contracts,
   app flows, Word/user-guide outputs, `pnpm check`, build, required browser
   tests and an actual preview. Both prior Convex deployments were reset to
   zero rows on 6 October; validate the new schema before the backend release.
   Merge through protected `main`,
   confirm Vercel production deployment and walk each enabled flow. Provider
   acceptance, compliance portal execution and customer payment remain
   separate live checks.

### 6 October 2026 code checkpoint

The implementation branch now has additive, permission-checked records for
site type and material origin, stakeholder account requests, PET lot custody,
integer-gram transformations, inspections with audited correction, and
externally issued commercial-document references. These records describe what
a participant reports. They do not by themselves create inventory, approve a
material buyer, transfer title, prove an external certificate or settle money.
The combined focused backend tests and TypeScript check passed locally. The
complete user workflow, all language variants, provider checks, Word guide,
protected-branch checks and production deployment still need verification.

The current market only supports the prototype's next-step trading graph. The
manufacturer-byproduct buyer rule must be implemented and tested before it is
presented as available. The prototype's simulated escrow path must be closed
before any live B2B use. The account-request API needs the corresponding
customer and admin screens before teams can use those roles through the app.
Neither a gateway provider nor a production gateway account has been approved
in this interview.

### 6 October 2026 full Convex reset

The founder approved removing all prototype records from development and
production. The saved development and production export archives passed ZIP
integrity checks before deletion. After the empty schema unmounted Better Auth,
the remaining application tables, Better Auth component records and stored
files were deleted. Fresh checks of `glorious-rooster-470` and
`outstanding-buzzard-942` each returned **zero tables, rows, users, stored
files, functions and crons**. Both deployments remain paused until the reviewed
new backend is deployed. The exports are recovery archives, not active data.
This reset removes old-data migration as a release constraint; new data and
future schema changes still require ordinary migration care.

### 6 October 2026 approved account, workspace and local acceptance plan

**Approval status:** approved by the founder on 6 October 2026 with “Go ahead,
don’t wait on me.” Proceed with implementation and tests. This approval is not
a claim that screens, test users, credentials or provider delivery already work.

**Confirmed inputs.** Offer normal users both email-and-password and phone-OTP
signup after the corresponding provider verifies the address or number. Use a
development-only verification path for local browser tests without sending SMS
or email. Create disposable development accounts, and provide their generated
email addresses and passwords in a **restricted credentials annex** for the
founder and test team. The shared platform guide and its Google Docs copy show
the account roster, roles and test instructions but contain no passwords. Do
not put passwords, admin setup tokens or authenticator secrets in Git, screenshots,
logs or the shared guide. The annex is separate from the public or broadly shared
guide, with access limited to the named test team. All test identities are
clearly marked as synthetic, never customer or production accounts.

**Feasibility boundary.** Today the Better Auth integration supports phone OTP
for normal users and email/password for the sole admin. It blocks normal-user
email signup and has no team-invitation lifecycle. A new email path must change
server policy, forms and the Better Auth adapter together, while keeping admin
TOTP and recovery separate. Verified email linking to a phone identity must
require proof of both identifiers; matching typed values is not proof. Use the
existing organisation and membership records as workspace authority, and assess
the Better Auth organisation plugin in a short technical spike before choosing
an invite mechanism. Do not create two conflicting owners of role grants. True
local Convex deployment is available but is beta; prove Better Auth sessions,
component persistence and file storage work in that mode before using it as
the acceptance environment. Disposable identities and development verification
must remain strictly local. If that gate fails, fix or report the blocker; do
not switch to a cloud deployment without a new explicit decision.

**Approved account and workspace model.** A person has one
verified identity and may belong to more than one organisation. An organisation
has a business or observer type, approval state, sites and one or more workspaces.
Workspace roles begin with owner, admin, member and viewer; specific abilities
such as inviting people, approving a trade, entering quality evidence, seeing
prices or exporting reports are checked on the server, not inferred from a
screen label. A founder/admin account manages platform verification and cannot
silently join customer workspaces. Specialist observers receive purpose-limited
access only after the data owner grants it. A stakeholder's account approval
alone does not grant trade or private-data access. Every grant, invitation,
revocation and sensitive action writes an audit event. Decide precise permission
rows with the team before enabling each workflow.

**Invite and identity flow.** A workspace owner or authorised admin enters a
teammate's email, chooses a workspace role and sends a one-use, expiring invite.
The recipient opens the invite, verifies email, signs up or signs in, accepts
the named organisation and role, then sees only permitted screens. Existing
members can change roles or revoke access; an expired, reused, revoked or
wrong-email invite fails with a clear message. Recheck current membership on
every server operation, so a revoked member loses access even if a browser tab
is open. A phone-only person may use phone OTP normally, but email-based invite
acceptance requires them to add and verify the invited email first. Do not
merge accounts automatically. A later phone-number invite can be interviewed
separately. Development test mode must be server-gated to local environments only, never
enabled by a browser flag, cloud deployment or production URL.

**Disposable fixture roster.** Seed one person for each distinct journey, plus
two people in at least one workspace to exercise collaboration. Cover:

1. Household member and household-team coordinator; kabadiwala owner and
   invited staff member; Saathi.
2. Preprocessor, recycler and manufacturer buyer/seller; include a manufacturer
   offering a non-hazardous byproduct and another approved buyer handling it.
3. Apartment community, office, hotel and resort representatives as separate
   non-household material generators; at least one generator site and one
   rejected or unapproved buyer fixture.
4. Fibre, textile and garment manufacturer subtypes; apparel/packaging brand
   or PIBO where that journey differs.
5. City official, CSR sponsor, lender, auditor and waste-picker union as
   separate least-privilege observer accounts; platform administrator.

Use synthetic names, reserved test email addresses and non-routable phone
numbers. Create Better Auth identities through supported auth flows, not by
writing its component tables directly. Seed domain records through validated
application APIs or tightly scoped test-only setup functions. Give the seed a
repeatable manifest and cleanup command, so it cannot run against production
and rerunning it does not duplicate identities or material lots. Generate unique
strong passwords for email accounts at execution time. The restricted annex
will list environment, account name, email, password, workspace, role, expected
starting screen and expiry/rotation date; phone-only and TOTP accounts instead
list their test access procedure, without publishing codes or secrets. The
founder can then distribute that annex to the named team. The shared guide will
link to it only if the sharing boundary is verified.

**Real-browser acceptance matrix.** Run the app against the isolated seeded
backend and test as a person would: navigate, enter forms, receive local-only
verification, sign in, reload, switch workspaces, invite and accept, attempt
unauthorised screens, sign out and sign back in. Test both email and phone signup
and login, duplicate identifier, wrong password/code, expired challenge,
recovery, invite expiry/reuse/revocation and cross-organisation isolation.
Walk household booking and kabadiwala receipt, each supported material hand-off,
manufacturer byproduct offer to an approved buyer, inspection/correction,
compliance evidence and observer views. Test a payment-dependent action with no
gateway and require the explicit blocked state. Do not claim a completed B2B
purchase until a real gateway sandbox and webhook reconciliation pass. Inspect
browser console and failed network requests, keyboard focus, light/dark views,
phone/tablet/desktop widths and affected translations including Arabic/Urdu RTL.
Capture only synthetic data, and identify local screenshots as local evidence.

**Approved implementation order and proof gates.** (1) Freeze the account
matrix and permissions; spike local Convex and Better Auth feasibility.
(2) Implement identity methods and server-side dev verification guard with unit,
handler and adapter tests. (3) Add workspace roles and invite lifecycle with
permission, concurrency and revocation tests. (4) Add signup, login, workspace
and team screens using the current UI and translation contracts. (5) Create and
seed the disposable fixture roster and generate the restricted annex.
(6) Run real-browser paths, correct failures, and review visual captures.
(7) Update the source user guide, rebuild and inspect its Word copy, then update
the existing Google Doc with the same reviewed source and verify sharing.
(8) Run `pnpm check`, build, browser suite, protected-branch checks and the
actual deployment smoke tests before making a release claim. Production
credentials, provider secrets, delivery and payment remain separate gates.

**Decisions still needed during implementation.** The exact email sender and
domain, SMS provider availability, gateway activation, team invitation email
delivery, permission details for each observer, and whether a phone-only person
can later add a password need named owners. Missing providers must show an honest
unavailable state; no preview challenge can produce a production session.

### 6 October 2026 launch test and account setup plan

The founder approved proceeding without another plan wait and requested a
detailed testing document and every required account/API signup. The target
launch decision is **Saturday 10 October 2026, Asia/Kolkata**. The
[launch test plan](../testing/launch-2026-10-10.md) and its editable Word copy
`output/docx/luma-green-launch-test-plan.docx` record the 6–10 October sequence,
role roster, owner/admin/member/viewer checks, local-only verification, invite
failure cases, material/PET journeys, provider gates, visual/language tests,
result log, release criteria and rollback. No full role acceptance pass is
claimed by preparing that plan.

Use the [account checklist](../operations/launch-checklist.md) and
[service inventory](../operations/services.md). Reuse GitHub, Convex, Vercel and
domain access where available. Better Auth needs no separate hosted account.
The approved production email path needs a verified Resend sender and API key;
phone OTP needs MSG91/DLT approval. Cashfree is selected below; provider
approval, Easy Split activation and onboarding remain pending. Optional AI, telemetry, search, news, public data and native distribution
accounts are required only for their enabled features. No new account has been
created or verified by this entry.

Development test delivery and disposable credentials must stay strictly local.
The restricted annex stays outside Git and the shared guide. After real-browser
acceptance, update the existing Google user guide ID from the reviewed source
and preserve its sharing. Both cloud Convex deployments remain paused until the
validated release action. Saturday release is conditional on the exact tested
scope and provider readiness; blocked flows stay listed. The founder must
explicitly approve any smaller release scope rather than silently dropping work.

### 6 October 2026 payment provider selection and local acceptance

The founder delegated the provider choice to the engineer. Select **Cashfree
Payment Gateway with Easy Split** for B2B checkout and payments to sellers.
Its documented vendor, order-split, refund and settlement features fit this
marketplace flow. Cashfree must still approve the use case, business account,
seller verification and Easy Split activation. No provider account was created
by this decision. See [ADR 0019](../decisions/0019-gateway-only-business-payments.md)
and [Cashfree Easy Split](https://www.cashfree.com/docs/payments/split/overview).

Keep household payments unchanged: the kabadiwala pays the household directly.
All B2B payment-dependent actions must wait for verified gateway evidence.
Store material price, any disclosed Luma service fee, payment status and seller
settlement status separately. No fee amount or deduction is approved by the
provider selection. The initial adapter is sandbox-only until refund,
settlement, webhook reconciliation and trade/stock integration are verified.

The local runner has created 28 disposable email accounts through actual signup,
email verification and password sign-in handlers. Domain fixtures give each
account its test role; stakeholder approval does not grant private trade access.
The first manual browser sign-in opened the kabadiwala workspace. The full role,
household, PET, admin and payment acceptance matrix is still in progress.
Credentials remain in a restricted local file and must stay out of Git and the
broadly shared guide. A local inbox receives real verification tokens; it does
not replace the production Resend or MSG91 delivery gates.

### 6 October 2026 local implementation and browser checkpoint

The integration worktree now includes email signup/recovery, workspace roles
and invitations, and material-lot custody, transformation and quality screens.
The 28 disposable account access cases passed. Separate browser tests passed
email verification/reset/session revocation, the workspace invitation journey,
existing admin password/TOTP/logout, optional user TOTP setup and removal,
household pickup/receipt, and lot dispatch/receipt and inspection correction.
These focused results do not prove all business workflows or production access.
The current case-level status is in section 13 of the launch test plan.

Actual browser review found Arabic control direction defects and a temporary
authentication failure during rapid navigation. Both are being repaired and
retested. The full regression also found obsolete prototype test/document
expectations. Keep the current permissions and required checks; update stale
expectations and rebuild the guide from current browser evidence. Full checks,
reviewed Word guides, the same-ID Google document update, CI and deployment
remain release gates.

Cashfree remains sandbox-only and disabled without settings. No provider call
or payment was made. The founder has been asked who will bear gateway fees,
refund costs and chargebacks. The provider choice does not resolve these
commercial terms. Live collection, refunds, seller settlement and the matching
trade/inventory transitions must remain blocked until they are defined and
verified. No manual paid action is introduced.

## Documentation and implementation boundary

The existing prototype pages and technical plans describe the previous product
model. They are historical evidence of the prototype and are not approval to
preserve their transaction flows in the redesigned product. This record owns the
current direction. The architecture overview, data model, enhancement proposal
and execution plan were reviewed. They describe the existing prototype or
release controls; they do not validate the new PET business flow.

The existing execution plan has release gates, but the documentation search
found no dedicated business-feasibility gate for this refinement. Treat the PET
flow as not yet through that gate. Before enabling a **live commercial or
compliance workflow**, the team must verify:

1. Business segments, supplier/buyer roles, S2P and P2P boundaries, and who owns
   each step from order to payment.
2. Commercial ownership: material title, invoicing, tax, transport, payment and
   any transaction fee, with adviser review where required.
3. Material catalogue, first grades, buyer specifications, sample/testing
   methods, mass-balance records, rejects and correction controls.
4. Applicable organisation and facility registrations, compliance evidence,
   portal authority and the limits of any Luma integration.
5. Operating economics and SaaS pricing assumptions, named users, sites,
   service costs and evidence that the proposed workflow solves a real need.
6. Technical fit for traceability, quality evidence, audit history, access,
   document storage and external-system responsibilities.
7. A bounded pilot, acceptance measures, accountable owners and a decision to
   proceed, revise or stop.

Update product summaries as decisions are confirmed. The founder requested
implementation and production delivery on 6 October. Keep unresolved
commercial and legal behavior disabled or evidence-only until validated;
require local tests, review and release checks before production deployment.

## Interview history

Add each new entry below with its date. Keep confirmed decisions, open questions
and rejected options separate.

### 4 October 2026 Photo location metadata

The founder clarified that GPS metadata embedded in photos is not needed.
Location features must not depend on EXIF GPS data from a photo, including a
photo transferred from a phone to a desktop. A transfer does not guarantee that
metadata is removed: [Apple's sharing guidance](https://support.apple.com/guide/iphone/share-photos-and-videos-iphf28f17237/ios)
says location metadata may be shared unless the sender turns it off.

Current code check: the household estimate path re-encodes JPEG and PNG images,
and the onboarding upload path strips metadata from JPEG and PNG while retaining
the orientation needed to display them. The onboarding upload path currently
keeps WebP files byte-for-byte. Do not claim that all uploaded images are free of
GPS metadata. The founder asked to decide whether every accepted image format
must have GPS removed before storage during file review. A user-entered address
or site location is a separate product question; this decision only covers
metadata inside photos.

### 6 October 2026 — Industry, material, byproduct and CPCB workbook

The founder supplied `Luma.Green_Industry_Material_Byproduct_CPCB_Combined.xlsx`
and requested implementation of the additional architecture. This expands the
current refinement. It does not mark every workbook recommendation delivered.
The earlier PET example remains one material flow within this broader model.

#### Source layers and quality findings

The workbook contains 99 industry examples, 33 lifecycle rows, 30 byproduct
examples, 12 workflow stages, 419 rows labelled as the CPCB official master and
419 corresponding commercial-analysis rows. The strategy and Sources sheets
explicitly separate regulatory context from Luma's inferred material analysis.
The cited uploaded CPCB PDF, earlier platform DOCX and KSPCB reference are source
references, not new instructions or proof of facility permission.

The official CPCB January 2025 report confirms 419 sectors: 125 Red, 137 Orange,
94 Green, 54 White and 9 Blue. This count agreement does not validate every copied
workbook cell. See the [CPCB report hosted by MPCB](https://mpcb.gov.in/sites/default/files/Establishment%20of%20MPCB/Seniority%20list/2014/Categorization_of_Industries_CPCB_2025_.pdf),
pages 16 and 36. The implementation owner checked this primary report; each
facility's applicable approvals remain a separate review.

Preserve the supplied workbook as a reference and mark imported rows
`workbook_unverified`. Do not relabel the imported text as verified law. The
extract contains damaged threshold text in the final hydel/mining rows and a
submission-format footer in the final row. Those fields need comparison with the
source before they can support decisions. The dashboard formulas include header
rows: industry 100 instead of 99, lifecycle 34 instead of 33, byproduct 31 instead
of 30, and workflow 13 instead of 12. Its hard-coded group totals sum to 98;
Food/Agro/Dairy has 11 actual examples, not 10. Recalculate counts from validated
data rows; do not display the dashboard figures as platform facts.

Sector codes are not unique keys. The 419 official-labelled rows contain only
413 distinct annexure/code pairs: Annexure II repeats codes 1.1, 1.2, 1.3, 2.0,
3.1 and 3.2 for distinct sector entries. Retain workbook sheet and source-row
identity, category, description and source links. Never collapse repeated codes
or silently overwrite one sector with another. Preserve the original text
alongside any later reviewed correction and its audit evidence.

#### Requirements accepted for implementation

1. **Represent each processing function.** Include sorting, baling, washing,
   granulation, stripping, shredding, compounding and recovery. The architecture
   decision is to model these as explicit process capabilities on the existing
   organisation/workspace model. A washer or compounder remains a business with
   its own team roles; it is not a new login system or a grant of admin rights.
   A business can have several processes. Keep the mandatory user-facing term
   **preprocessor** where the workbook uses yard or aggregator. Existing internal
   route keys do not change merely because the display term changes.
2. **Separate sector from permission.** A facility can reference a workbook
   sector and record its activities. A CPCB colour, pollution index, capability
   choice or opportunity score does not approve handling, declare material
   non-hazardous, verify a consent or allow a sale. Keep source provenance and
   commercial interpretation separate. Only reviewed facility/material scope
   can grant the existing controlled commercial permissions.
3. **Track material state through processes.** Describe the input, process and
   output states for lots, including sorted material, bales, flakes, washed
   flakes, pellets, compounds and finished outputs. The workbook chain is a
   graph of examples, not a rule that all materials must pass every stage.
   Each authorised transformation preserves parentage and creates distinct
   output lots with exact integer grams and its process record.
4. **Classify each output stream.** Support Main product, Saleable byproduct,
   Recoverable waste and Residual waste as distinct stream classes. Class is
   separate from material family, grade, processing state and hazard status.
   A user selecting “Saleable byproduct” does not itself make a listing eligible.
   For the new classified-output/evidence-lot path, linked material must be
   explicitly non-hazardous and a main product, saleable byproduct or recoverable
   waste. Missing/unassessed/unspecified, controlled and residual lots cannot
   supply that link; recheck at listing, request and acceptance. This restricts
   evidence linkage and does not approve the material. Unlinked inventory offers
   retain their existing catalogue/family and actor rules. Retain the
   manufacturer's existing non-hazardous and approved-buyer checks.
5. **Preserve complete mass balance.** Input grams must account for every main
   output, byproduct, recoverable fraction, residual, contamination and recorded
   loss exactly once. Prevent negative, duplicate or unaccounted mass and prevent
   later edits from rewriting a completed transformation or accepted inspection.
   A correction is a new attributable record, not an overwritten result.
6. **Give controlled residuals a restricted route.** Record residual type,
   quantity and intended authorised destination/evidence where supported. Block
   ordinary marketplace offers for controlled residuals. Do not simulate a
   completed authorised disposal, manifest or portal action when that integration
   is absent. An evidence-only record must say what is unverified.
7. **Keep price and quality specific.** Material/grade, specification, location,
   amount and date remain relevant to price. Record actual quality observations
   and buyer acceptance; do not invent moisture, purity or PVC limits from the
   workbook. Exact money remains integer paise. Physical-material price, SaaS
   charge and any future transaction fee stay separate.
8. **Keep hand-offs auditable.** Preserve actor, weight, price where relevant,
   event time, source, destination and lot links. “Location” means the chosen
   site/address or other explicitly authorised location field, not GPS metadata
   extracted from uploaded photos. The founder's prior EXIF decision remains.

#### Contradictions resolved and gates retained

| Workbook statement                                                                          | Implementation interpretation and remaining limit                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create explicit user types for each processor                                               | Use explicit business process capabilities with existing accounts and owner/admin/member/viewer permissions. Do not create duplicate identities or grant access from a process label.                                                                           |
| “Saleable” byproducts and likely next buyers                                                | Treat these as inferred matching candidates. Material status, consent, hazard and buyer handling approval still require verification.                                                                                                                           |
| Red/Orange/Green/White/Blue category                                                        | Regulatory sector context only. It is not a product/waste classification or automatic marketplace allowlist.                                                                                                                                                    |
| Verified impact or EPR evidence from mass balance                                           | A balanced ledger is traceability evidence. It does not establish an emission factor, mint a carbon/EPR certificate or replace portal authority. Unknown factors keep CO₂e unavailable.                                                                         |
| Every transaction creates a commercial event                                                | Record only events that actually occur and are authorised. Accepted B2B trades remain at the gateway hold; neither a sector assignment nor a transformation bypasses it.                                                                                        |
| Location captured at collection                                                             | Preserve the agreed explicit site/address workflow. Embedded photo GPS is not required; metadata-removal handling remains its separate file-review decision.                                                                                                    |
| Demand board, standing orders, recurring demand, supplier qualification, route optimisation | Implemented in the 7 October completion slice: demand board, explicit recurring publication, qualification history, acknowledged standing plans/releases and capacity-checked geometric route planning. Final connected and visual acceptance remains separate. |

The workbook's phase labels are recommendations, not acceptance results. Supplier
samples and qualification, recurring demand, detailed QC attachments, route/load
optimisation, residual destinations/manifests and specialised manufacturer flows
must each be checked against implemented scope. Do not reduce them to a heading
and call the whole platform complete. S2P/P2P segmentation remains open as already
recorded. Household payment remains the kabadiwala's responsibility; B2B live
payment, refund/chargeback fee policy and seller settlement remain gated.

#### Acceptance before release

The new registry must retain every distinct source row without code collisions;
source-derived and inferred fields must remain identifiable. Capability and
output-stream mutations need server permission checks, audit entries, exact mass
accounting and negative tests for controlled/unknown material. Test unauthorised
users and viewers, cross-workspace references, correction history and denied
ordinary listings. Repeat the changed forms in English, Kannada and Arabic,
phone/tablet/desktop, light and dark, then update their real browser evidence.

The manual's WORKBOOK cases describe this acceptance. Their initial status is
**Not run** until a candidate implements the case and produces evidence; missing
features stay **Blocked — implementation required**. Hold final screenshots,
Word publication and the same Google Doc update until this new scope and its
explicit remaining gates are reflected in the reviewed source.

### 7 October 2026 stock intake, material review and multi-input processing

The source now separates three actions that must not be confused:

- **Manufacturer stock intake:** an approved manufacturer records its own weighed production byproduct with a unique intake reference, production date, batch and weighing references, and an explicit non-duplication confirmation. A successful guarded save creates an immutable intake and atomically adds exact grams to inventory. An identical retry returns the original; a changed payload using the same reference fails. Only approved active non-hazardous scrap in the business's material-family scope is eligible. This is the manufacturer's declaration, not independent ownership, weighing, quality or regulatory verification.
- **Admin material classification:** the platform admin reviews an active scrap material, explicitly records hazardous or non-hazardous status and a 3–160-character rationale/evidence reference. The action is audited. A workbook colour or facility process never grants this classification. Hazardous material is blocked from ordinary byproduct offers; non-hazardous status does not override business, material-family, buyer, stock or gateway checks.
- **Multi-input processing evidence:** a business may combine up to 20 distinct available ordinary-route lots it currently holds. Every input has exact consumed grams. Combined input equals all measured outputs plus contamination and process loss; separately recorded residual outputs are not counted as loss again. Immutable input edges retain source history and own output genealogy. This transformation does not add inventory or issue a credit. Recipients of transferred outputs or input remainders see their custody records, not the processing business's private recipe, parent or sibling history.

The multi-input slice passed 32 focused tests and one local connected industry journey. These bounded results are not the final combined regression, screenshot review, production deployment or provider acceptance. The current test manual includes INTAKE, CLASSIFY and MULTI cases. Final screenshots and guide copies must use the stable source. B2B live payment, fee policy, refund/settlement integration, provider approval and final acceptance of the additional workbook workflows below remain separate gates.

### 7 October financial lifecycle refinement

The key-free completion audit found the missing payment-to-trade bridge. The
current source now supports one full agreed quantity, one full INR collection
and one seller split. Verified live collection authorizes dispatch; the seller's
stock is deducted once at dispatch and the buyer's stock added once at receipt.
Sandbox records never grant that authority. No-live-order cancellation releases
an accepted commitment without changing on-hand stock. A live order requires
terminal unpaid provider proof; expiry and browser closure are not proof.

Live activation is default-off and requires an explicit server flag, selected
immutable approved policy, matching credentials and provider/vendor checks.
The agreement owner must supply fee payer, refund funder, settlement terms and
provider-acceptance reference. No business policy was invented. Existing funds
and dispatched receipts retain their frozen policy when new checkout is paused.

The configured administrator can request one full remaining refund with a stable
reference and provider identity. Confirmed refund remains a review hold: it does
not prove physical return, cancel the trade or restore stock. Automatic approval
review rejected automatic post-refund cancellation, so that behavior was not
applied. Partial refunds, partial delivery, arbitrary adjustments, replacement
orders and dispute decisions remain unsupported review paths. Seller settlement
needs order-specific allocation plus signed transfer evidence, with fees under
the frozen policy; a general payout event alone is insufficient.

Backend focused verification: 137 tests, backend types, scoped lint and independent
review passed. Financial UI focused verification: 50 tests passed. The earlier
49-case browser pass predates the bridge. The updated connected suite passed
all 50 cases against the local production build in 4.0 minutes on 7 October;
the log is `/private/tmp/luma-final-connected-production.log`. This includes
inactive local policy save and unpaid cancellation, with no provider execution.
Current screenshots, Word/Google Docs publication, final whole-project checks,
provider acceptance and production release remain pending. These source results
do not mean only keys remain. See the payment lifecycle completion record for
exact evidence.

### 7 October workbook completion implementation

The key-free workflow audit was resolved through the documented
[completion plan](../plans/2026-10-07-workbook-completion.md). Current source has:

- Demand board, supplier/sample qualification, explicit recurring-demand
  publication, rescheduling of overdue plans, standing agreements and individually
  acknowledged releases. These planning records do not place an order, reserve
  stock or collect payment. A late acknowledgement retains its original date.
- Private QC/COA attachments with server file validation, current-access checks,
  buyer decisions and withdrawal. Evidence owners can share bounded immutable
  reports with a named approved stakeholder and revoke or expire access.
- Manual route/load plans with exact integer capacity, entered sites/coordinates,
  versioned corrections and archive. Optional ordering uses straight-line
  geometry, not road routing, navigation, live GPS or a delivery-time promise.
- Admin-governed material-state/grade/specification definitions, business search,
  immutable recipe versions and production declarations linked to transformations
  and output inspections. Recycled-input fractions describe declared inputs;
  they do not certify the output or add inventory.
- Scoped facility/registration evidence review and controlled destination records.
  Facility revisions invalidate stale reviews. Linked dispositions recheck the
  current destination scope and retain exact measured grams and references.

Independent code review is complete for these slices. Production build, web/backend types and full lint pass (zero errors, 20 warnings).
The final combined local production-build browser run passed all 55 cases in
4.6 minutes; native tests passed 49 mobile and 22 desktop cases. Evidence is
`/private/tmp/luma-final-connected-scope-copy.log`. Final capture and document
review, 16 capture/Word freshness gates and the final full check remain pending. This is an implementation checkpoint, not a production or provider
acceptance claim. Native-language review of newly drafted translations remains
an owner/team check. The founder requested Vercel production release on 7 October;
use the protected PR and backend-before-frontend process after checks pass.

After that combined run, visual review found that stock without a market price
showed a zero value. The correction keeps unavailable or partially priced stock
values unavailable. All 20 focused stock tests and both connected byproduct
cases passed; the browser rerun took 9.6 seconds. The production build passed
again. The full visual matrix and final whole-project check are being refreshed
for this correction; these targeted results do not replace those gates.

The latest full unit preflight passed 2,306 of 2,322 tests in 79.58 seconds.
The 16 failures are capture or Word freshness gates; no functional unit test
failed. The final lint rerun and complete project check remain pending.
