# Industry API access

Status: implementation authorised by the founder on 2 October 2026, including a separate worktree, PR and protected merge.

## Intent and baseline

Let approved businesses connect ERP, stock and reporting systems to Luma.Green.
Support each current business kind and material family through one contract.
Start from `origin/main` at `c1ed004`; worktree `industry-api`, branch
`feat/industry-api`. Preserve the dirty primary checkout and other worktrees.
The current platform has real stock and trade records but simulated escrow.
API access must not imply payment processing, certified carbon credits or
industry-specific regulatory approval.

Change necessity: browser-only records require manual copying into factory systems.
Architecture review required: yes, this adds machine credentials and a public contract.
Owner: Convex remains the data and permission authority; Next.js is an HTTP proxy.

## Decision and alternatives

Implement REST v1 with OpenAPI first. It is directly usable by ERP software,
spreadsheets, BI services and custom scripts. GraphQL would add query-cost and
field-permission controls before there is evidence of a query need. Remote MCP
would add OAuth/client-consent work before there is evidence of an agent client.
Keep both as explicit future adapters over the same permission rules.

Deliver in this release:

- A translated business API-access screen, linked from the existing account area.
- Only an active business owner can create, list and revoke that business's keys.
- Random 256-bit tokens, SHA-256 digests at rest, token displayed once, scoped
  access, expiry in 1–90 days, at most five live keys per business.
- Check key, expiry, org status and issuer's current owner membership on every read.
- GET organization, materials, inventory and paginated buying/selling trades.
- Optional industry news, filtered by registered material families, with publisher
  attribution, source URLs and dates. Explicit provider enablement and global
  24-hour request quota; no article-content storage or automatic paid fallback.
- Strict query validation, no caller-selected org, 60 accepted reads/minute per key and 180 per business,
  bounded queries, no personal contact details, no secret in audit metadata.
- Audit credential changes and accepted data reads; all private responses no-store.
- Public OpenAPI contract and practical curl/Python examples.
- Integration tests through Convex HTTP, permission/revocation/rate-limit tests,
  UI tests, route tests, browser checks and a maintained Word guide.

No stock/trade writes or payment operations in v1. Data reads provide inventory
reconciliation, procurement tracking and recorded material reporting. The industry
plan must distinguish current families from unsupported specialised waste streams.

## Work and proof

1. Stabilise DTOs, credential contract and release plan.
2. Implement credential lifecycle and tenant-scoped reads in Convex.
3. Implement REST HTTP adapter, Next proxy and OpenAPI contract.
4. Implement translated owner controls and browser evidence.
5. Document industry uses, setup, staged write/webhook/MCP/GraphQL gates, migration
   and operations. Update guide, render every page, retain cloud publication gate.
6. Independent security review; fix actionable findings. Run pnpm check, format,
   build and affected browser checks. Record exact local evidence.
7. Open PR, inspect hosted checks and review, merge only when required checks are
   green without override. Verify merge and report deployment separately.

## Continuation checkpoint

Current: implementation, independent reviews and local verification are complete.
See `docs/delivery/industry-api.md` for the exact tests and guide evidence. Check
the live PR for hosted checks and protected merge before continuing. Main has 12
registered locales at this baseline; the separate 33-locale PR was still open at
the final base check. Reconcile upstream additions if they land first. The primary
checkout and other worktrees were not changed.
