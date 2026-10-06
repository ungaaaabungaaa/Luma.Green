# Default-deny stakeholder accounts

`stakeholderAccounts` is additive and separate from `orgs`. It stores a
requesting member, a self-declared organisation name, a category, a review
status and an admin decision. The categories are city official, CSR sponsor,
lender, independent auditor, waste-picker union, apparel brand and packaging
brand. No old rows need migration.

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

This backend slice does not add a public request form, an admin review screen
or an account status screen. Those interfaces need translated copy in all 33
locales, role-specific verification evidence, and browser/user-guide capture.
Keep the functions disabled in product navigation until those screens and
their checks ship. The maintained user guide has no new route to describe in
this slice; its earlier admin source-declaration change still needs capture
and Word rebuild at integration.
