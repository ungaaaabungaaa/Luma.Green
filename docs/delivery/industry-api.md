# Industry API delivery

Status: implementation and local verification complete, 2 October 2026.
Use the GitHub PR for hosted-check and merge evidence.

## Scope and ownership

The founder requested a factory integration system, a plan for the recycling
industries, optional industry news, and implementation through a separate worktree
and protected merge. See the [implementation plan](../plans/2026-10-02-industry-api.md)
and [API contract and industry roadmap](../architecture/industry-api.md).

Base: `origin/main` at `c1ed004`. Branch: `feat/industry-api` in the managed
`industry-api` worktree. The primary checkout and other worktrees are unrelated.
Main currently has 12 locales; PR #29 contains a separate 33-locale UI change.
Re-read main before merge and reconcile it if that PR lands first.

Convex owns credentials, current owner checks, org isolation, metering and audit.
Next.js forwards the fixed read contract. Browser sessions cannot act as machine
credentials. The API has no write operations, payments or carbon certification.
The optional news adapter sends fixed material search terms to NewsAPI. It sends
no org identity, personal records or Luma API key. It is disabled until explicitly
configured and subject to a global provider request cap.

## Work and evidence

- REST, owner controls, all 12 baseline translations, optional news, OpenAPI,
  industry roadmap and migration note are implemented.
- Independent cross-review covered backend permissions and HTTP/provider
  boundaries. Fixed upstream error-body sanitization, keyboard focus return,
  precise expiry display and scope-aware setup instructions.
- Targeted checks: 33 backend tests; 30 HTTP/proxy/news tests; 59 UI, compliance
  and locale-contract tests. Foreign and cross-resource cursor replay preserves
  organization and table boundaries. These are local tests, not live access.
- Local TypeScript check and webpack production build passed. Code generation
  ran locally; no schema deployment was performed by codegen.
- All 155 Chromium checks passed with one worker and zero retries. An earlier
  run had one existing navigation timing retry while capture browsers ran;
  the isolated complete rerun passed without retries.
- Public and protected screenshots have current source hashes. Protected API
  evidence covers every registered language, both themes, five widths for
  English/Arabic, scrolled phone controls and revoke-dialog keyboard behavior.
- Five configured analytics browser checks passed with fake keys and intercepted
  external requests. Both screenshots were reviewed. The ordinary build was
  restored and checked for absence of the test telemetry settings.
- The maintained Word guide has 71 pages and 66 image placements. All pages were
  visually inspected; exact DOCX and rendered-page hashes are in `build.json`.
  All eight guide freshness tests and the Python build check passed.
- `VITEST_MAX_WORKERS=2 pnpm check` passed: lint, TypeScript, 1,267 web tests,
  27 mobile tests and 20 desktop tests. All native package type checks passed.
  An earlier unbounded run timed out in an unchanged booking test; the isolated
  five-test file and complete two-worker rerun passed without changing its
  assertions or timeout.
- Whole-project formatting passed. Hosted checks and protected merge are
  recorded in the PR linked to this commit; local results do not imply them.

## Guide and external gates

API access is a new user workflow. The guide gains setup, least-permission
credentials, expiry/rotation, revocation, units, pagination, news availability and
failure handling. The Compliance entry point and API screen need current
browser captures. Protected captures remain labelled synthetic fixtures with
writes disabled. They do not prove real account approval or authenticated staging.

The Word guide was rebuilt and every page inspected. The existing Google Docs
ID and sharing are preserved. Its in-place update is explicitly pending because
the current import connection cannot perform a verified replacement of that
native document.

Deployment, approved business owner acceptance, provider licence/account setup and
live news receipt are separate from local tests and a successful merge. No news
provider account is purchased or enabled as part of this change.

## Hosting configuration check

On 2 October 2026, `vercel project inspect luma_green` reported the default
Next.js build command (`npm run build` or `next build`). No Convex deployment
wrapper is configured in that project setting. Merging the code therefore does
not prove deployment of the API tables and functions. Follow
[environment setup](../operations/environments.md) and deploy the additive backend
before enabling a connected web release. This pass does not change deploy keys,
provider accounts or hosting configuration.
