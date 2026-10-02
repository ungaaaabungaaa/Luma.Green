# Security and failure review — 2 October 2026

Status: local review and repair complete. Hosted checks and protected merge are recorded by the PR associated with this change. This is a source review with local tests, not a penetration-test certificate or proof of provider or device acceptance.

## Scope and starting point

The founder requested a codebase-wide review of broken UI, security gaps and failure handling, with fixes committed and integrated into main. Work started at `c1ed004745af737694fcd6b3ae4df631adc83c27` in `fix/security-failure-review`. The isolated worktree is `/Users/syedabdulmuqeeth/.codex/worktrees/security-failure-review/luma.green`. The original `feat/responsive-locales-review` checkout has concurrent changes and PR #29; this review does not own them.

The coordinator owns integration and worktree cleanup after a verified merge. Review tasks cover Convex authorization and record integrity, web UI and request failures, native shell policy, shared browser helpers, dependencies, API routes and deployment configuration. Repairs preserve the current brand and data contracts. No live provider calls, account creation, production record changes or native release are part of local tests.

## Confirmed findings and fixes

| Finding                                                                          | Severity       | Fix and regression evidence                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin phone verification can skip TOTP                                           | High           | Reject admin phone verification before session issuance. HTTP tests cover admin rejection and ordinary member success.                                                                      |
| First-admin signup needs only a known ADMIN_EMAIL                                | High           | Require the operator-held ADMIN_SETUP_TOKEN before account creation; reject missing/wrong tokens without creating a user/session.                                                           |
| Failed concurrent attachment cleanup can delete an attached file                 | High           | Check storage and attachment state in internal mutations; cleanup deletes only unattached storage. Tests cover both operation orders.                                                       |
| History caps hide older open stock reservations                                  | High           | Filter active reservations before limits and fail closed when the bounded result cannot prove availability.                                                                                 |
| Floating-point multiplication can change money by a paisa or store unsafe totals | High           | Exact BigInt pricing with safe-integer results; reject unsafe listing/trade writes. UI parses and formats exact digits, preserves boundary field values, and keeps invalid totals editable. |
| Closed trade history hides waiting requests during listing closure               | Medium         | Filter waiting requests before the cap; fail the whole transaction when safe completion cannot fit its bound.                                                                               |
| History caps hide active household bookings and assigned Saathi work             | Medium         | Apply active state/person/date/window predicates before the limit; regressions include older active records.                                                                                |
| Public support submissions have no quota or audit events                         | Medium         | Atomic three-per-phone rolling-hour limit, safe translated feedback, and content-free creation/answered audit events.                                                                       |
| Rejected admin password, signup, TOTP or backup-code calls leave stuck controls  | Medium         | Catch failures, show safe errors and restore pending controls; regression tests cover rejection.                                                                                            |
| File removal, draft discard and sign-out can fail without safe feedback          | Medium         | Keep the current file, draft or page, show a safe error and allow retry; shared sign-out logic also handles returned errors.                                                                |
| Global recovery resets the boundary without refreshing server data               | Medium         | Use the installed Next.js 16.3 retry contract; contain optional monitoring failures.                                                                                                        |
| Optional Sentry failure can break startup or error handling                      | Medium         | Contain initialization/reporting failures and log fixed nonprivate diagnostics; disabled-service and rejection tests.                                                                       |
| Phone menu accepts clicks before its handler is ready                            | Medium         | Keep the trigger disabled during hydration; slow-script regression checks that the first enabled click opens the menu.                                                                      |
| Failed PostHog initialization stays cached                                       | Low            | Clear the rejected initialization promise so a later valid page view can recover.                                                                                                           |
| Cancelled Electron navigation can replace the new page with offline UI           | Medium         | Ignore cancellation failures; test with the real Home menu during a slow navigation.                                                                                                        |
| Mobile rejected navigation can leave an untrusted page displayed                 | Medium         | Restore the trusted page for all rejected routes; ignore native blank/error callbacks without weakening request policy.                                                                     |
| Two transitive dependency advisories have published patches                      | Moderate / low | Scoped xcode > uuid 11.1.1 and posthog-js > DOMPurify 3.4.16 overrides. Audit clears both; xcode CommonJS v4 compatibility smoke passes.                                                    |

## Follow-up check of the confirmed repairs

An independent second pass checked each row above against the actual source and
regression tests. The focused backend pass ran 105 tests across eight suites;
the focused UI pass ran 36 tests across eight suites plus 21 native policy tests.
No new blocking defect was found in those reported repairs. The full baseline
check also passed 1,345 web/backend, 36 mobile and 21 desktop tests, lint, types,
formatting and the production build. These are local checks; deployment proof is
recorded separately.

- `convex/auth-admin.test.ts` exercises the real Better Auth handlers for setup
  tokens, admin phone rejection and ordinary member phone sign-in.
- `convex/files.test.ts` covers attachment ownership and both cleanup orders.
- `convex/market.test.ts`, `convex/lib/chain.test.ts`, household and Saathi tests
  cover reservation bounds, exact per-trade prices, waiting requests and active
  work hidden behind historical records.
- `convex/support.test.ts` covers the rolling quota, permission checks and audit
  events without storing submitted content in audit metadata.
- Admin auth, file-slot, status-view and sign-out tests cover rejected promises,
  safe feedback and controls that can be retried.
- Global error, instrumentation and analytics-runtime tests cover Next's retry
  contract, optional Sentry failures and PostHog initialization retry.
- Menu hydration tests include delayed scripts in English, Arabic and Urdu.
  Native tests cover cancelled navigation and rejected destinations; real device
  behavior remains a separate acceptance gate.

The second pass found an additional stock-balance boundary issue: receiving grams
could overflow an otherwise valid integer inventory balance. Trade and pickup
writers now share a checked addition function, reject invalid legacy quantities,
and leave the whole transaction unchanged on failure. Eight original regression
cases failed before the repair. The expanded 32 regressions cover invalid values,
exact-boundary success, existing insufficient-stock errors, and rollback of
inventory, receipts, points, workflow state and audit writes. A multi-line pickup
fails after its first material write, proving that earlier writes also roll back.
This enforces the existing exact-grams contract and changes no user-facing copy
or screen.

## Parallel account and notification review

The final feature source at `593dfa2` retains the original confirmed repairs.
Independent checks of its earlier immutable source passed 217 backend tests,
101 web tests and 33 native policy tests. That review found and repaired two
additional boundaries before merge:

- Joint parsing of `updatePhoneNumber` and `trustDevice` let a malformed unrelated
  flag disable the other guard. Real HTTP tests returned 200 for forbidden phone
  changes and trusted-device login. The repair checks each flag independently;
  both requests now return typed 403 errors without changing the phone number or
  issuing a session. An independent run passed all 23 real-handler tests.
- Device cleanup finished before auth sign-out, allowing notifications to be
  enabled again during the remaining wait. One shared session lock now covers
  member, admin and security reauthentication flows. It blocks controls, direct
  registration, restoration and late results through successful sign-out and
  remounts, and releases for retry after failure.

A second client sharing the session could still register during that wait. A
real HTTP sign-out deleted the session and denied private requests, yet a new
notification still obtained a delivery target. The server now derives device
bindings from validated sessions and checks ownership and expiry again at
claim. Unbound legacy records stay inactive until authenticated renewal; a new
session refreshes an unchanged token. Inactive-owner cleanup writes audit events
and preserves tokens reassigned to another account. The final frozen server
patch passed 62 independent tests and the original second-client reproduction
without changing its assertion. No provider request was made by these tests.

The claim is the server authorization boundary. An already-claimed delivery or
provider request in transit cannot be recalled. Its payload remains generic and
contains no private record data. The reviewed guide and migration explain this
limit and the additive optional session field.

## Review coverage and rollout

The review covered the web route/component tree, shared validation and environment
code, Convex functions and access rules, native navigation/update boundaries,
telemetry and dependency configuration. Regression suites cover application
permissions, booking ownership, stock/trade transitions, direct authentication
HTTP endpoints, private-file access and provider mocks. A limited signature scan
of 978 tracked files found no matching common private-key, GitHub-token or AWS-key
patterns. This is not an exhaustive secret scan or proof that all defects are gone.

Deploy the additive `supportRequests.by_phone_createdAt` index and backend
functions before the dependent frontend. No data rewrite is needed. Configure a
private random ADMIN_SETUP_TOKEN of 32–512 characters only for initial admin setup,
then remove it after successful password/TOTP enrollment. Existing admin login
does not need the token. The patch does not revoke sessions issued before this
release: if the vulnerable endpoints were exposed, review and revoke existing
admin sessions during rollout. Do not infer session revocation from these tests.

The support limit is per normalized, caller-supplied phone. It does not stop an
attacker rotating numbers; ingress anti-abuse and operator review remain launch
gates. Historical reservation scans fail closed on resource limits rather than
promise stock from truncated history; high-volume latency remains unmeasured.

## Dependency mitigation

The approved registry audit originally found three advisories. The two published
fixes remain installed. On 2 October 2026, the follow-up applied the exact
`lib/rsa.js` validation change from [upstream PR 1152](https://github.com/digitalbazaar/forge/pull/1152),
commit `ceba34402e329f0365134f23fe19898756527d65`, to all workspace copies of
`node-forge` 1.4.0 through pnpm's locked patch mechanism.

The malformed nested DigestAlgorithm signature was accepted before the patch
and rejected after it through all three Expo consumer paths. Valid signing and
certificate controls pass. Independent review confirmed that the patched file
matches the upstream commit byte for byte. Six new regressions, all 36 mobile
tests and types, both mobile exports, and the upstream Node suite (829 passed,
four existing conditional skips) pass. See [patch provenance and removal rules](../../patches/README.md).

[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) still has
no published patched version. The package keeps its real version, so `pnpm audit`
still reports one high advisory. This is a tested local backport, not a clean
registry audit or an upstream release. No advisory is suppressed. Separate
`pnpm dlx eas-cli` or global installations do not inherit this patch and remain
blocked for release signing until their own verifier is fixed and tested. Signed
native delivery and real-device acceptance remain separate release gates.

The other source advisories are [uuid buffer bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq) and [DOMPurify detached event handlers](https://github.com/advisories/GHSA-p98j-92pf-mc4p). The xcode consumer uses the retained CommonJS v4 API; compatibility is checked separately.

## Error and failure rules

- Treat expected validation, permission and availability failures as explicit states. Show safe translated copy and preserve entered data when safe.
- Catch promise rejection at the user action boundary. Restore pending controls in `finally`. Do not report success or navigate away when the request failed.
- Use route boundaries for unexpected render/query errors. Use Next.js 16.3 `retry` to refresh server data as well as reset the boundary. Error boundaries do not catch ordinary async event-handler failures.
- Keep private payloads, passwords, tokens, uploaded records and raw provider errors out of user messages and telemetry. Keep the existing Sentry allowlist and analytics opt-in controls.
- Retry reads and failed initialization only when safe. After an uncertain write, inspect the record before trying again. Do not automatically repeat a paid notification with an ambiguous provider outcome.
- Enforce access, validation, record ownership and cleanup rules at the server transaction boundary. Browser restrictions are not authorization.
- Optional services stay disabled when configuration is missing. An error reporter must not prevent the application from showing its recovery screen.

References checked for this review: [Next.js error handling](https://nextjs.org/docs/app/getting-started/error-handling), the installed Next.js 16.3.6 `error.md` and runtime, [Convex error handling](https://docs.convex.dev/functions/error-handling/), [OWASP error handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html), and [OWASP logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html). The installed framework documents and types own version-specific APIs.

## Verification and delivery

The final combined source preserves PR #30 (`af2e295`) and has these results:

- `VITEST_MAX_WORKERS=2 pnpm check` passed: lint, types, 1,345 web/backend tests, 30 mobile tests and 21 desktop tests. Whole-project formatting and `git diff --check` passed.
- Normal Turbopack and webpack production builds passed with 937 routes. A separate fake-key analytics build and five browser tests passed with external provider requests intercepted.
- All 158 production browser tests passed with retries disabled. A preceding run exposed a lost first click before mobile-menu hydration. A controlled script delay reproduced it; the repair now has a server-render/hydration unit test and three slow-script browser tests. Twelve focused menu checks also passed without retries.
- Real Electron navigation and PDF smoke passed. Native package types and policy tests passed. Signed installers and real devices remain separate gates.
- Browser evidence includes 27 public, four showcase, 40 normal fixture, 78 failure and 48 API captures, plus two configured analytics captures. New or changed captures were visually inspected; byte-identical previously reviewed captures retain that evidence. All 76 rendered guide pages are reviewed (37 changed pages re-inspected, 39 byte-identical to the prior reviewed render). The Word guide has 72 screenshot placements. All source/image freshness tests passed.
- Independent code reviews found no remaining blocking regression in the repair set or newly merged industry API access boundaries. A final limited common-secret-signature scan of 115 changed text files found no matches. This is not a full secret-scan certificate.
- The approved registry audit retains the one unpatched native tooling advisory described above. No advisory is suppressed.

The original repair source, screenshots, capture manifests, Word guide and build record were committed together and merged through PR #31 at `2ba8246`. The follow-up verified an in-place Google Docs update for that reviewed guide; see `docs/user-guide/cloud.json`. Its existing ID, folder and sharing remain unchanged. Hosted CI, preview status and protected squash merge are separate from local results. Main is never pushed directly.

Live SMS receipt, authenticated staging acceptance, native signing and real-device tests are separate gates. The current Google Docs API cannot set native image alt-text attributes. One native description was restored and verified; the other 71 published images retain visible editable captions. The publication record states this limit and does not claim identical accessibility semantics. The newer guide from parallel PR #29 requires its own verified synchronization after that revision merges.

## Combined backend rollout checks

Production `outstanding-buzzard-942` and development `glorious-rooster-470` were
inspected through read-only Convex queries that returned counts and flags only.
Both had zero active admin sessions. Development had one unique configured admin,
one password credential, an enabled authenticator with one factor record, and
consistent root profile records. Production had no auth users or admin profiles,
and no `ADMIN_EMAIL`, `BETTER_AUTH_SECRET` or `SITE_URL` configuration. Production
`AUTH_DEV_MODE` and both bootstrap-token settings were absent. No session or
account records were changed; no global secret rotation was needed. Production
admin provisioning and a real password/TOTP sign-in are not proved by this count
check.

The first production dry run from main would have removed 15 indexes belonging
to the ecosystem backend deployed separately from `dc41665`. It was not applied.
The follow-up retains that backend's source, schema, generated API and operations
runbook alongside PR #30, PR #31 and the new exact-stock repair. Independent merge
review confirmed that existing security guards and both membership index orders
remain. Nine focused suites passed 154 tests, full types passed, and guide
freshness passed nine tests.

The combined production dry run passed schema validation and explicitly reported
no index deletions. Its seven additions are the industry API indexes, the second
membership index order and `supportRequests.by_phone_createdAt`. The final
account/inbox/push schema from PR #29 must also be present before deployment.
Read-only job inspection found no city-backfill work: production had zero jobs;
development had seven, all with city data and no missing business owners. No
migration, restore, seed, provider send or deployment was performed by these
checks.

The combined source also passed the full local `pnpm check`: 1,437 web/backend,
36 mobile and 21 desktop tests, lint and types. The production build and complete
format check passed. These results cover the existing security repairs, the
exact-stock follow-up and the retained ecosystem backend; the final account/UI
merge will be checked again at its final commit.

## Final combined source check — 3 October 2026

The integrated source includes the final account/notification repair commit
`593dfa2`, all existing ecosystem backend definitions and the stock overflow
repair. `pnpm check` passed 1,695 web/backend, 49 mobile and 22 desktop tests,
lint and types. The production build passed with 2,622 static pages, and the
whole-project format check passed. Regenerating the Better Auth schema produced
no drift. The frozen lockfile install preserves all three patched Expo consumers;
their rejected-signature and valid-signing tests passed in this combined run.

The final production dry run passed schema validation with zero index deletions
and 16 additive indexes, including all nine account/inbox/push indexes. The
registry audit still reports only the known high node-forge advisory. GitHub's
advisory still lists no published patched version; the exact upstream backport
remains installed and tested. Backend deployment, post-deployment session/index
checks, the final protected merges and the newer cloud guide publication are
recorded separately after they occur.
