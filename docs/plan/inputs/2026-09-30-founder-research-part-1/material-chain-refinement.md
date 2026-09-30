<!-- The new chapter of the founder's Word file, 30 Sep 2026, extracted verbatim. The first part of that file is the plan as it stood on 29 Sep. -->

# Material-Chain Refinement: From Scrap to Secondary Raw Material

The existing plan is strong at the collection and trade layer. This refinement adds the missing industrial middle of the chain: the users who sort, bale, shred, wash, dry, densify, strip, granulate, pelletize, recover, compound and convert material into manufacturer-ready feedstock.

The platform should therefore treat each hand-off as a change in both ownership and material state. A PET bottle is not the same marketplace item after it becomes a bale, raw flake, cold-washed flake, hot-washed flake, dried flake, rPET pellet or polyester fibre.

## 1. Expanded user architecture

| User role                                      | What the user does          | Typical material                                   | Core platform function                                                                   |
| ---------------------------------------------- | --------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Household / end consumer                       | Generates and sells         | Loose or source-segregated post-consumer material  | Selects a verified buyer and creates the first receipt                                   |
| Saathi / waste picker                          | Collects and sells          | Small sorted recyclable lots                       | Collection, primary sorting and delivery                                                 |
| Kabadiwala / first-mile aggregator             | Buys, sorts and sells       | Mixed recyclable streams                           | Sorting, weighing, basic dismantling, occasional baling                                  |
| Dry-waste centre / MRF / cooperative           | Sorts, grades and sells     | Mixed dry waste                                    | Material separation, baling and lot creation                                             |
| Yard / aggregator                              | Buys and consolidates       | Sorted/baled trade material                        | Aggregation, stock, grading and pooled dispatch                                          |
| Pre-processor                                  | Buys, processes and sells   | Bales, raw scrap, mixed material                   | Baling, shredding, washing, drying, densification, granulation, stripping or depollution |
| Recycler / reprocessor                         | Buys, converts and sells    | Pre-processed feedstock                            | Remelting, pulp recovery, polymer recovery, chemical/metallurgical recovery, re-refining |
| Compounder / intermediate processor            | Buys, blends and sells      | Recovered resin, fibre, metal or mineral feedstock | Compounding, masterbatch, alloying, formulation and blending                             |
| Manufacturer / industrial end user             | Buys and consumes           | Manufacturer-grade recycled/intermediate input     | Melt processing, polymerization, fibre spinning, casting, rolling, molding, fabrication  |
| Brand / EPR producer                           | Buys material and evidence  | Recycled material and traceability evidence        | Uses recycled input and/or compliant chain-of-custody evidence                           |
| Authorised waste handler / co-processor / TSDF | Receives regulated residues | Hazardous/special waste and treatment residues     | Treatment, recovery, co-processing or disposal under authorisation                       |
| Platform admin / verifier                      | Verifies and governs        | Business, material and compliance records          | Verification, material codes, routing rules, audit trail                                 |

## 2. Material-state model

| State | Label                                     | Meaning                                                                   | Typical user                        |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| S0    | Discard / mixed waste                     | Material has entered a waste stream; value and composition are uncertain. | Generator / collection              |
| S1    | Collected                                 | Material is gathered but not fully sorted.                                | Saathi / kabadiwala                 |
| S2    | Sorted                                    | Material family, polymer, alloy, colour or paper grade identified.        | Kabadiwala / MRF / yard             |
| S3    | Baled / compacted                         | Standardized transport lot, mainly for paper, plastics, cans, textiles.   | Yard / pre-processor                |
| S4    | Shredded / ground / stripped              | Material physically reduced or separated into fractions.                  | Pre-processor                       |
| S5    | Washed / cleaned                          | Surface contamination reduced; wash grade recorded.                       | Pre-processor                       |
| S6    | Dried / prepared                          | Moisture controlled and feedstock prepared for the next process.          | Pre-processor / recycler            |
| S7    | Granule / pellet / pulp / ingot / crumb   | Recovered intermediate material suitable for industrial use.              | Recycler / reprocessor              |
| S8    | Compound / alloy / intermediate feedstock | Material adjusted to a manufacturer specification.                        | Compounder / intermediate processor |
| S9    | Final recycled product / feedstock        | Manufacturer-ready material or finished recycled product.                 | Manufacturer / end user             |

## 3. PET example - the exact chain the platform should represent

The PET chain is the clearest demonstration of why the platform needs pre-processors. The same physical material changes commercial value several times before it reaches the manufacturer.

| Step | User                | Input material                                    | Process                                           | Output / marketplace material   |
| ---- | ------------------- | ------------------------------------------------- | ------------------------------------------------- | ------------------------------- |
| 1    | Consumer            | PET bottle in household / office garbage stream   | Sell / pickup                                     | Receipt at S0/S1                |
| 2    | Kabadiwala / Saathi | Collected PET bottles                             | Sort by polymer, colour, contamination            | Sorted PET                      |
| 3    | Yard                | Sorted PET                                        | Bale and consolidate                              | PET bottle bale                 |
| 4    | PET pre-processor   | PET bale                                          | Shred / grind                                     | Raw PET flakes                  |
| 5A   | PET washer          | Raw flakes                                        | Cold wash                                         | Cold-washed flakes              |
| 5B   | PET washer          | Raw flakes                                        | Hot wash                                          | Hot-washed flakes               |
| 6    | Dryer / processor   | Washed flakes                                     | Dry and quality-sort                              | Dried clean PET flakes          |
| 7    | rPET recycler       | Clean flakes                                      | Extrusion, filtration and pelletizing             | rPET granules/pellets           |
| 8    | Polyester processor | rPET pellets + required virgin/process feedstocks | Melt processing / polymer processing              | Fibre-grade polyester feedstock |
| 9    | PSF producer        | Polyester feedstock                               | Melt spinning / drawing / cutting                 | PSF                             |
| 10   | Manufacturer        | PSF                                               | Nonwoven, filling, yarn blend or other conversion | Finished product                |

Technical note: DMT/PTA and MEG are polymerization feedstocks used in polyester production routes; they should be represented in the platform as separate virgin/intermediate raw-material records, not simply as a generic additive mixed into finished rPET granules. The exact formulation depends on the polyester process and target grade.

The same structure can be repeated for HDPE/PP, LDPE film, PVC, paper, cardboard, glass, ferrous metals, aluminium, copper, e-waste, batteries, tyres, used oil, textiles, wood, C&D materials and organic waste.

## 4. What one user can generate or sell vs. what the next user can process and make

| User / stage              | Can receive / generate           | Saleable state                          | Next buyer / processor                        |
| ------------------------- | -------------------------------- | --------------------------------------- | --------------------------------------------- |
| PET household / collector | PET bottles                      | Collected / sorted                      | Kabadiwala -> PET bale                        |
| PET yard                  | PET bottles                      | Baled PET                               | Pre-processor -> raw flakes                   |
| PET pre-processor         | Raw flakes                       | Cold-washed / hot-washed / dried flakes | Recycler -> rPET pellets                      |
| PET recycler              | Clean flakes                     | rPET granules/pellets                   | Fibre / sheet / strap / other industrial user |
| Polyester processor       | rPET + virgin/process feedstocks | Polyester feedstock                     | PSF / PFY producer                            |
| Paper yard                | Mixed paper                      | Grade-sorted bales                      | Pulp mill -> recovered pulp                   |
| Paper mill                | Recovered pulp                   | Recycled paper / board                  | Converter / manufacturer                      |
| Aluminium pre-processor   | UBC / aluminium scrap            | Prepared scrap                          | Smelter -> secondary aluminium                |
| Copper pre-processor      | Copper wire                      | Stripped / granulated copper            | Refiner -> copper rod/cathode                 |
| Tyre pre-processor        | ELT                              | Tyre chips + separated steel/fibre      | Crumb / pyrolysis plant                       |
| Textile pre-processor     | Garment/textile scrap            | Sorted textile scrap / fibre            | Yarn / nonwoven maker                         |
| Wood processor            | Wood offcuts / sawdust           | Chips / sawdust / briquettes            | Board / fuel user                             |
| C&D processor             | Concrete rubble                  | Recycled aggregate / sand fraction      | Construction user                             |

## 5. By-product / waste should be a second output, not a dead end

Every process record should support at least two outputs: (A) the intended saleable/recoverable output and (B) the by-product/residue. That makes value recovery visible and prevents all secondary materials from being classified as “waste” in the marketplace.

| Process                     | Main output                      | Saleable / recoverable by-product                          | Residual waste / treatment stream                                   |
| --------------------------- | -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| PET washing                 | Clean PET flakes                 | Caps/closures, labels, fines                               | Wash sludge, wastewater                                             |
| Paper pulping               | Recovered fibre pulp             | Bark/fibre rejects where applicable                        | Screen rejects, de-inking sludge                                    |
| Aluminium remelting         | Secondary aluminium              | Metal skimmings/dross where recoverable                    | Salt slag / furnace residues                                        |
| Steel melting               | Billet / ingot                   | Recoverable metallic fractions                             | Slag, dust, refractory residue                                      |
| Copper processing           | Copper rod/cathode/ingot         | Recovered secondary metal fractions                        | Slag/dust/metal-bearing sludge, spent acids where applicable        |
| Tyre recycling              | Crumb rubber                     | Steel and fibre                                            | Process residues / dust                                             |
| Used-oil re-refining        | Recovered base oil               | Light hydrocarbon fractions where applicable               | Oil sludge, spent filter/media residues                             |
| Textile recycling           | Recovered fibre                  | Short fibre / non-target fibre fraction                    | Dust/fines; wet-process sludge where applicable                     |
| Rice milling                | Milled rice                      | Bran, husk, broken rice                                    | Dust / rejects                                                      |
| Sugar milling               | Sugar                            | Bagasse, molasses, press mud                               | Ash / process sludge; spent wash if integrated distillery           |
| Cashew processing           | Kernels                          | Broken kernels, shell, CNSL-containing shell fraction      | Testa, dust, organic/wastewater residues                            |
| Distillery / fermentation   | Alcohol                          | DDGS, CO2, fusel oil, yeast                                | Spent wash, spent lees, sludge                                      |
| Fish processing             | Fish products                    | Offal-derived meal/oil where authorised                    | Bones, scales, offal, wastewater sludge                             |
| E-waste dismantling         | Separated material fractions     | Ferrous, non-ferrous, plastics, glass, reusable components | PCB/hazardous fractions, dust and mixed residues                    |
| Lead battery recycling      | Recovered lead                   | Polypropylene, recovered fractions                         | Lead paste/dross/slag, electrolyte residues, dust                   |
| Solar module processing     | Recovered glass/aluminium/cables | Other separated components                                 | Broken glass, polymers/backsheet, damaged cells/electronic residues |
| Semiconductor manufacturing | Devices / process products       | Clean silicon or metal scrap where recoverable             | Spent acids/alkalis/solvents, CMP slurry, filters, contaminated PPE |

## 6. Industry by-product map - how the CPCB 2025 list is incorporated

The attached CPCB January 2025 report is used as the industry master. Annexure-I covers 359 Industrial Sectors: 107 Red, 120 Orange, 81 Green and 51 White. The colour is the CPCB pollution-potential category; it is not a material hazard label. A separate material-routing flag is therefore required in Luma.Green.

For each industry/sub-sector, the master dataset now contains: CPCB code, category, industry name, Luma material family, typical inputs, saleable/recoverable outputs, typical by-products/residues, and a suggested routing note. The detailed 359-row matrix is supplied in the companion workbook.

| Family                            | Examples of saleable / recoverable material                                                  | Examples of residual waste / by-products                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Metals / fabrication              | Ferrous scrap, aluminium, copper, brass, zinc, mill scale, dross, machining chips            | Slag, dust, spent oils/coolants, pickling/finishing residues, metal-bearing sludge          |
| Plastics / polymers               | PET/HDPE/PP/LDPE/PVC flakes, granules, pellets, film, fibre                                  | Off-spec plastic, fines, labels, filter residue, wash sludge, wastewater                    |
| Paper / printing                  | Sorted paper bales, recovered pulp, recycled board                                           | Screening rejects, paper sludge, ink/solvent residues, contaminated paper                   |
| Glass / ceramics / minerals       | Glass cullet, ceramic rejects, stone fractions, aggregates                                   | Dust, fines, slurry, refractory debris, rejected products                                   |
| Textile / fibre                   | Textile scrap, recovered fibre, yarn/fabric fractions                                        | Fluff/dust, short fibre, dyeing residues and ETP sludge where applicable                    |
| Wood / coir / agro-fibre          | Sawdust, chips, coir fibre, coir pith, bamboo residues                                       | Dust, fines, bark, trim waste and wet-process residues where applicable                     |
| Food / agriculture                | Bran, husk, bagasse, molasses, press mud, food/fish by-products                              | Rejected food, peels, seeds, offal, wastewater sludge                                       |
| Oil / petrochemical               | Recovered oil fractions, waxes, hydrocarbon intermediates                                    | Oil sludge, spent catalysts, oily filters, tank bottoms, spent solvents                     |
| Chemical / pharma                 | Recovered solvent/material fractions, salts, process intermediates                           | Spent chemicals, filter cake, reaction residues, off-spec product, ETP sludge               |
| E-waste / batteries / tyres / ELV | Recovered metals, plastics, glass, rubber, fibre, components                                 | Hazardous fractions, electrolyte, PCB residues, shredder residue, used fluids               |
| C&D / cement / minerals           | Recycled aggregates, brick/block rejects, fly ash and other mineral fractions                | Kiln/cement dust, washout sludge, brick rejects, ash, stone slurry                          |
| Special / regulated               | Asbestos, mercury-containing material, biomedical/explosive streams, semiconductor chemicals | Controlled treatment, authorised recovery/disposal residues and specialist recovery outputs |

## 7. Platform data fields for every processing transaction

| Field                | Purpose                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| input_lot_id         | One or more upstream lots consumed                                                             |
| input_weight_kg      | Gross/accepted input mass                                                                      |
| material_code        | Stable material code                                                                           |
| input_state          | Loose / sorted / bale / flakes / etc.                                                          |
| process_type         | Sorting / baling / shredding / washing / drying / granulation / remelting / compounding / etc. |
| output_lot_id        | New lot created after processing                                                               |
| output_material_code | New material created                                                                           |
| output_weight_kg     | Saleable/recoverable output mass                                                               |
| byproduct_code       | Secondary material generated                                                                   |
| byproduct_weight_kg  | Secondary material quantity                                                                    |
| waste_code           | Residual requiring treatment/disposal                                                          |
| waste_weight_kg      | Residual quantity                                                                              |
| yield_percent        | Output + recognized secondary materials relative to input                                      |
| buyer_role           | Next user class                                                                                |
| destination          | Next business/site                                                                             |
| authorisation_status | Consent / registration / EPR / special authorization where relevant                            |
| traceability         | Parent lot lineage and mass balance                                                            |

## 8. Marketplace listing logic

A listing should always answer four questions before it is shown to a buyer: what material is it, what physical state is it in, what grade/specification is it, and which type of buyer is allowed or suited to receive it.

| Listing dimension | Example                                                                 | Platform representation                                    |
| ----------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| Material          | PET, HDPE, copper, OCC, textile, tyre, etc.                             | Stable material code + family                              |
| State             | Loose / sorted / bale / flake / washed / dried / pellet / ingot / fibre | State code                                                 |
| Grade             | Colour, polymer, alloy, moisture, contamination, size, purity           | Grade attributes                                           |
| Quantity          | Available kg/MT                                                         | Lot stock                                                  |
| Origin            | Household / yard / industrial generator                                 | Source role                                                |
| Process history   | What happened to it before this listing                                 | Mass-balance lineage                                       |
| By-products       | Secondary materials created during processing                           | Linked output lots                                         |
| Waste             | Residual streams created during processing                              | Controlled routing; never mixed into normal saleable stock |
| Buyer gate        | Open / verified / authorised only                                       | Role + compliance rule                                     |

## 9. Implementation change to the original roadmap

The original prototype can remain first-mile focused, but business trades should be expanded from four price levels to a material-state chain. The existing L1-L4 price concept can remain for price visibility while each trade also stores the processing stage.

| Level | Who pays whom                                | Typical material state             | Price meaning                                                 |
| ----- | -------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| L1    | Kabadiwala -> household                      | Post-consumer material             | Door / collection price                                       |
| L2    | Yard -> kabadiwala                           | Sorted / baled material            | Trade-grade price                                             |
| L3    | Pre-processor / recycler -> yard or supplier | Processed feedstock                | Flake / washed flake / granule / recovered fraction price     |
| L4    | Recycler / compounder -> manufacturer        | Industrial intermediate            | Manufacturer-specification price                              |
| L5    | Manufacturer -> industrial buyer             | Recycled product / final feedstock | Product price where Luma is used for B2B material procurement |

This refinement creates a second marketplace dimension: the platform does not only ask “What is scrap worth?” It asks “What can this material become, who can make that transformation, what by-product will be created, and who will buy the next state?”

## 10. Source and scope note

Source hierarchy for this refinement: (1) the attached CPCB January 2025 classification report for the industrial-sector universe and category terminology; (2) the existing Luma.Green Platform Plan for roles, traceability, pricing and compliance architecture; and (3) process-based taxonomy mapping for typical outputs/by-products. The by-product mapping is not part of the CPCB classification itself and should be validated against each unit’s actual process, consent conditions, EPR registration, hazardous-waste status and waste manifest before being used for compliance decisions.

The attached pasted KSPCB list is a 2016-era legacy category list. It is retained for cross-reference only in the companion workbook; the new 2025 CPCB list is the industry master used in this refinement.
