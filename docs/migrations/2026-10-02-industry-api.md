# Industry API credential storage

> **Status:** additive schema change prepared on 2 October 2026. No production
> deployment or migration execution is claimed by this note.

## Change and purpose

Add credential storage for the scoped industry REST API, with indexes for token
lookup and owner management. Add the bounded rate-limit state required for API
reads and optional news-provider quota reservations. Add the organization/profile
membership index used for current-owner checks. New tables are `integrationKeys`, `integrationUsage` and `integrationNewsQuota`.
The membership index is `by_org_profile`. Existing organization, membership,
inventory and trade documents retain
their shapes. API audit entries use the existing audit log.

The server stores a secret digest and safe display prefix, never the raw token.
Credential expiry and revocation are checked on every read. This is a new access
path to existing records, not a migration that changes stock or trade balances.

## Deployment order

1. Take the normal pre-release backup and validate the schema on the intended
   development or preview deployment with approved test records.
2. Deploy the additive Convex schema and functions. New tables start empty;
   existing records need no backfill or field narrowing.
3. Deploy the frontend and HTTP proxy. Confirm that its configured Convex URL
   points to the same deployment as the credential-management screen.
4. Issue a test key as a business owner. Verify allowed reads, denied scopes,
   pagination, expiry, revocation, issuer membership removal and suspension.
5. Record deployment identifiers, execution time and live verification in the
   delivery handoff. Keep local and hosted checks separate.

## Rollback

Disable the frontend entry and API routes if a release must be stopped. Revoke
issued keys if their confidentiality or scope is uncertain. Keep credential and
audit records for investigation. Do not remove non-empty tables or rewrite stock
as part of an application rollback. Plan any later data deletion separately.

## Execution record

| Stage                             | State                           |
| --------------------------------- | ------------------------------- |
| Additive schema prepared          | Source change only              |
| Development or preview deployment | Pending deployment verification |
| Production deployment             | Pending                         |
| Existing-row backfill             | Not required                    |
| Field narrowing                   | Not required                    |
