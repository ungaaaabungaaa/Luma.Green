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

## Open dependency risk

The approved registry audit found three advisories. After the two published fixes, it reports one high-severity issue: `node-forge` 1.4.0 through Expo CLI and `@expo/code-signing-certificates`. [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) has no published patched version as checked on 2 October 2026. It concerns RSA PKCS#1 v1.5 signature validation. The affected package is in native build/signing tooling; the Next.js application does not import it. This distinction does not clear the advisory. Do not accept untrusted certificates or signatures through this toolchain. Signed mobile release acceptance remains open until an upstream fix or reviewed replacement is verified. No unreviewed cryptography patch or blanket audit suppression is used.

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

The source, screenshots, capture manifests, Word guide and build record are committed together. The Google Docs copy retains its existing ID and sharing, with the new local revision recorded as pending. Hosted CI, preview status and protected squash merge must be read from the associated PR; local results alone do not establish them. Main is never pushed directly.

Live SMS receipt, authenticated staging acceptance, production deployment, native signing and real-device tests are separate gates. The existing Google Docs guide keeps its document ID and sharing. Its in-place update remains a recorded connection gate; this work must not create a replacement document.
