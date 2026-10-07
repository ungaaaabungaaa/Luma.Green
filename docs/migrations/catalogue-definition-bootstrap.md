# Catalogue definition setup

Date: 6 October 2026. This change supports the approved empty-backend release.

The material `co2eFactor` field is now optional. Existing numeric values remain
unchanged. An absent factor means unknown; the public catalogue returns `null`.
Impact keeps measured mass and returns `null` for an estimate whose selected
material flow has an unknown factor. Its overall estimate is also unavailable
when a contributing family estimate is unknown. The UI does not substitute zero.

No row migration, table reset or factor backfill is required. Deploy the schema
and backend before the frontend that consumes the nullable estimate. Current
code has no carbon-credit issuance mutation or credit table. This setup cannot
issue a credit and does not add a new issuance path.

The configured admin, after completing TOTP, can open `/admin/prices` and use
**Add catalogue definitions**. `catalogue.initializeDefinitions` inserts only
missing canonical code, family, stage, translated names, sort order and active
status. Every insert writes its definition and admin identity into `auditLog`
in the same transaction. A repeat creates no rows or audit entries. Existing
material values, activity, factors, classifications and rates remain unchanged.

The source catalogue also contains prototype prices and indicative factors.
The mutation selects definition fields explicitly and never copies those
values. It creates no reference or market prices, price history, inventory,
listings, trades, lots, evidence, consent, handling approval or certificates.
The admin must separately enter approved rates through the existing price form.
Material presence alone never approves manufacturer byproduct trading.

For a populated deployment, preserve the normal backup and rollback process.
Rolling back the schema to require a factor would reject newly initialized
definitions without one. Do not fill them with invented values to make rollback
succeed. Keep the compatible optional field until an approved data plan exists.
Do not use `demo:reset`, `demo:seed` or `demoPrices:seed` for production setup.
