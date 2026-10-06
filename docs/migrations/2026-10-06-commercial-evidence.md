# Commercial evidence table

The `commercialEvidence` table is additive. It does not change existing trade,
invoice, organisation, or audit rows. Deploy the Convex schema and functions
before a client calls `commercialEvidence.recordExternal`, `forTrade`, or `mine`.
No backfill is required. In particular, do not copy a trade's old `invoiceNo`
into this table without a known external issuer and source record.

Each row is a user-reported external reference. `verificationStatus` is always
`reported_unverified` in the API. A correction creates a new row with
`supersedesId`; the earlier row and its audit entry remain. Only a trade party
can record or read references linked to its trade. An organisation can read its
own unlinked references. No city, auditor, lender, CSR, union, or brand account
has a general evidence read grant in this change.

The table does not hold SaaS charges, transaction fees, payment receipts, or
settlement states. Physical material price remains in the trade. The pure
`separatePrices` contract keeps optional Luma prices apart from that amount;
it performs no billing. B2B payment execution must wait for the selected
gateway and a separate approved integration.

No user-facing route or screen changes in this slice, so the maintained user
guide has no changed screen to capture. Update the guide when a UI exposes
these records. Regenerate `convex/_generated` from the integrated schema before
release; local codegen could not reach the configured Convex deployment here.
