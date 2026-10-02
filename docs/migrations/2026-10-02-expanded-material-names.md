# Expanded material names: 33 languages

Status: source catalogue expansion; not applied to any deployment.

This follows the [original name repair](2026-10-01-material-names.md). The
catalogue now contains all 26 material names for the 33 registered languages.
The same `catalogue.fillMissingNames` mutation can fill the new language keys
in existing records. It requires an authenticated administrator with 2FA.

Follow the earlier repair procedure after deploying this revision. Confirm the
exact deployment and backup first. Read all known material codes after the
mutation, compare their language keys with `src/i18n/locales.ts`, and inspect
`material.namesFilled` audit entries. Repeating the repair must update zero rows.
Existing names, admin corrections, quantities, prices and factors stay intact.
Unknown codes need separate review. Do not run `demo:reset`.

All new names are translation drafts pending native-speaker review. Mechanical
coverage is reported in `docs/i18n/coverage.json`; it does not establish that a
deployed database has been repaired. Record each environment's completion and
observed counts here when the repair is actually run.

| Environment | Deployment confirmed | Repair performed | Verification |
| ----------- | -------------------- | ---------------- | ------------ |
| Development | Pending              | No               | Pending      |
| Production  | Pending              | No               | Pending      |
