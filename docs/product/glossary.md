# Glossary

Words used across the docs and the code. Code names are in `backticks`.

| Term                                     | Meaning                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Household** (`household`)              | Anyone selling scrap from home. Never registers; confirms a phone number by SMS code when booking.                                                      |
| **Kabadiwala** (`kabadiwala`)            | Owner of a small local scrap shop ("kabadi"). Buys from households, sorts, sells to yards.                                                              |
| **Dry-waste centre** (`dwcc`)            | A ward dry-waste collection centre, MRF or picker cooperative; runs on the platform as a yard account.                                                  |
| **Yard** (`yard`)                        | A large yard that buys from kabadiwalas, grades and bales. Was `preprocessor` in the code until 30 Sep 2026.                                            |
| **Pre-processor** (`preprocessor`)       | Turns bales and lots into factory feedstock: PET flakes, granules, copper granules, shredded steel, crumb rubber, aggregates.                           |
| **Compounder** (`compounder`)            | Blends recovered material to a manufacturer's specification: compounds, masterbatch, alloys.                                                            |
| **Brand** (`brand`)                      | A producer or importer with EPR duties that buys recycled material and chain-of-custody evidence.                                                       |
| **Authorised handler** (`handler`)       | A licensed recycler for hazardous streams, a co-processor or a TSDF. The only buyer residual waste may go to.                                           |
| **Material state** (`S0`–`S9`)           | Where a material is on its way from discard to product: discarded, collected, sorted, baled, shredded, washed, dried, pellet or ingot, compound, final. |
| **Lot** (`lots`)                         | A quantity of one material code at one state, owned by one org, with its parent lots. The unit of listing, trade and processing.                        |
| **Processing record** (`processingRuns`) | One process on input lots that creates a main output lot, by-product lots and residual waste lots, with the yield.                                      |
| **By-product**                           | A saleable secondary output of a process (caps and labels, dross, tyre steel, bagasse). Listed as its own lot.                                          |
| **Residual waste**                       | What a process leaves that no ordinary buyer may take (sludge, slag, fines). Routes only to an authorised handler with a manifest.                      |
| **Price level** (`L1`–`L5`)              | Who pays whom: kabadiwala → household, yard → kabadiwala, pre-processor → yard, recycler → manufacturer, manufacturer → buyer.                          |
| **CPCB category**                        | Red, Orange, Green, White or Blue: pollution potential of an industry sector, not a hazard label for its material.                                      |
| **Recycler** (`recycler`)                | Turns sorted scrap into raw material manufacturers can use.                                                                                             |
| **Manufacturer** (`manufacturer`)        | Makes products from recycled raw material.                                                                                                              |
| **Saathi** (`saathi`)                    | A person who takes short jobs: home pickups, help at a shop, shifts at a yard, recycler or factory. Formerly "foot soldier".                            |
| **Admin** (`admin`)                      | The one Luma.Green operator who verifies applications and can see everything.                                                                           |
| **Org** (`orgs`)                         | A business on the platform: a kabadiwala shop, yard, recycler or manufacturer. Has a `kind`.                                                            |
| **Application** (`applications`)         | A request to join, reviewed by the admin. States: draft, submitted, changes requested, approved, rejected, suspended.                                   |
| **Booking** (`bookings`)                 | A household's pickup or drop-off, from request to paid.                                                                                                 |
| **Rate card** (`rateCards`)              | A kabadiwala's own buying prices, ₹ per kg per material.                                                                                                |
| **Minimum price table** (`priceFloors`)  | The admin-set floor no rate card may go below.                                                                                                          |
| **Fallback table** (`fallbackRates`)     | The admin-set prices used where a kabadiwala has set none.                                                                                              |
| **Recycle points**                       | Points a household earns per kilogram weighed. Value not yet decided.                                                                                   |
| **Sorting entry**                        | A stock record that moves kilograms between materials after sorting (mixed → graded + reject).                                                          |
| **Paise / grams**                        | How money and weight are stored: always integers. ₹1 = 100 paise; 1 kg = 1,000 g.                                                                       |
| **GSTIN**                                | 15-character GST registration number. Starts with the state code (29 = Karnataka). Checked on the public GST portal.                                    |
| **KSPCB**                                | Karnataka State Pollution Control Board. Issues consents and registrations to yards, recyclers and factories in Karnataka.                              |
| **SPCB**                                 | A State Pollution Control Board in general — the equivalent body in other states.                                                                       |
| **CFE / CFO**                            | Consent for Establishment / Consent for Operation — the pollution-board consents a unit holds.                                                          |
| **DLT**                                  | TRAI's registry for commercial SMS in India. Our sender ID and every SMS template must be registered before MSG91 can send them.                        |
| **MSG91**                                | The SMS provider we use for one-time codes and notifications.                                                                                           |
| **OTP**                                  | One-time password — the 6-digit SMS code.                                                                                                               |
| **TOTP / authenticator code**            | A 6-digit code from an app such as Google Authenticator. The admin's second factor.                                                                     |
| **Masked Aadhaar**                       | An Aadhaar copy showing only the last four digits. The only form of Aadhaar we accept.                                                                  |
| **UPI**                                  | India's instant payment system. Households are often paid by UPI at the door.                                                                           |
| **Convex**                               | Our database and backend. One project with a **dev** deployment and a **prod** deployment.                                                              |
| **Deployment**                           | One running copy of the Convex backend with its own data. Dev data never mixes with prod data.                                                          |
| **Canonical URL**                        | The one URL search engines should treat as the page's address. See [architecture/urls.md](../architecture/urls.md).                                     |
| **ADR**                                  | Architecture Decision Record — a short note on one decision, in [decisions/](../decisions/README.md).                                                   |
