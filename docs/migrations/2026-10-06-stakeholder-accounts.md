# Default-deny stakeholder accounts

`stakeholderAccounts` is additive and separate from `orgs`. It stores a
requesting member, a self-declared organisation name, a category, a review
status and an admin decision. The categories are non-household material
generator, city official, CSR sponsor,
lender, independent auditor, waste-picker union, apparel brand and packaging
brand. No old rows need migration.

A material generator request includes one primary site type: apartment
community, office, hotel, resort or other. A manufacturer remains a separate
existing business kind; a manufacturing facility cannot be requested as a
generic material generator here. Site category and account ownership give a
future verified organisation/site migration a stable starting point. This
record does not itself create an `orgs` row or a material listing.

A signed-in member can submit one request and read only their own status with
`stakeholderAccounts.mine`. Repeating the same request is idempotent. The
configured admin, after two-factor authentication, can read a bounded pending
queue and approve or reject a request with a review note. Every creation and
decision writes an audit event. A decision cannot be applied twice.

**Approval grants no trading organisation membership, operational data access,
API key, evidence access, or compliance claim.** No existing `requireOrg`
permission path uses this table. Category and organisation name are claims
until independently checked by the admin. Access to a city, CSR, lender, union,
auditor or brand workspace requires a separate purpose-specific grant and
redacted or consented data contract. Default to deny.

The public `/join/stakeholder` page now accepts requests and shows the owner's
status. `/admin/verification` now includes the separate stakeholder queue.
Requesting requires explicit age and privacy confirmations, recorded as
timestamps. The UI has copy in all 33 locale catalogues. No category-specific
workspace or data-sharing grant is present. The maintained guide source now
describes the routes; browser captures and the Word rebuild remain an
integration gate.
