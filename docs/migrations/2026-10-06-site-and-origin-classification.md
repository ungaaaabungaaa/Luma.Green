# Additive site and material-origin classification

The existing `orgs.kind` remains kabadiwala, yard, recycler or manufacturer.
`yard` is the stored compatibility value; product copy calls that participant
**preprocessor**. Do not rename stored values in this release.

The business application draft and approved organisation each add two optional
fields:

- `siteType`: `preprocessor_yard`, `recycling_facility`,
  `manufacturing_facility`, `apartment_community`, `office`, `hotel`, `resort`
  or `other`.
- `materialOrigins`: an array of `industrial_byproduct` and/or
  `post_consumer`.

Old rows need no backfill. `primarySiteType()` supplies a display fallback for
old yard, recycler and manufacturer rows; it does not write inferred data.
New declarations pass from an application to its snapshot and to the approved
organisation. The admin review displays them. The values are source
declarations, not proof of a permit, quality result or authority to trade.

This slice does **not** add an apartment, office, hotel or resort account kind.
It also does not give manufacturers a byproduct listing route. A manufacturer
may already buy in the old chain, while the old trade graph has no outgoing
edge from a manufacturer. The release must keep those routes disabled until
the trade graph, supply evidence and acceptance rules are implemented.

The following account groups are confirmed for later platform access but
cannot be represented safely by assigning them a trading `orgs.kind`:
non-household generators, city officials, CSR sponsors, lenders, independent
auditors, waste-picker unions, apparel brands and packaging brands. Before
enabling them, add an organisation category independent of its activities,
role-specific application and verification rules, and explicit permissions.
Default to no operational data access. City, CSR, lender and auditor views need
redacted or consented data contracts; a union should not inherit all member
data. Apparel and packaging brands have different evidence needs. The current
business application requires machine media and pollution-consent review, so
it cannot be reused unchanged for these groups.

The admin review text changed for present declarations. Update its browser
capture, rebuild and inspect the maintained Word user guide, then update its
freshness record before a release. The current guide source is updated; the
Word/capture work remains a release gate for integration.
