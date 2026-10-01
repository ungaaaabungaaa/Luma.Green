# Analytics, error monitoring and search setup — 1 October 2026

## Change and ownership

The founder requested PostHog, Sentry, Google Analytics and search setup. This
supersedes the earlier pilot deferral; [ADR 0016](../decisions/0016-optional-analytics-and-error-monitoring.md)
records the new boundary.

PostHog and GA4 now use explicit public-page events after a saved visitor choice.
The old PostHog history/autocapture path has been replaced. The configured SDKs
load independently of page content, so a slow analytics chunk cannot hide the app.
A deployment switch and individual keys gate each service. There are no new
application dependencies or database writes. One runtime owns analytics capture;
one shared scrubber owns Sentry event filtering. This replaces the old automatic
capture path without a duplicate fallback.

The allowed pages are the home, how-it-works, participants, prices, standards,
solar and help landing pages. Query strings, referrers, arbitrary DOM text,
customer records and private routes do not enter our event properties. PostHog
uses memory persistence and no person profiles. Autocapture, replay, performance
capture and additional SDK features stay off. GA4 uses manual page views with
advertising signals disabled. Operators must disable Enhanced Measurement in GA4
and avoid adding a second tag; application code alone does not control the GA4
property's remote settings.

Sentry now initializes in browser and Next.js Node/edge runtimes when enabled.
A root error boundary offers translated error/retry controls in all 12 locales.
Error reports keep standard error classes and scrubbed code locations; messages,
identity, requests and contextual payloads are removed. Tracing, replay, profiling,
SDK logs and session reports stay off. There is no hosting tunnel. Source-map
uploads require build credentials. Convex and native-shell crash reporting are
outside this SDK's coverage.

Search Console/Bing ownership tags are optional. SEO repairs remove inherited
home canonicals, add sitemap x-default, remove false modification timestamps,
and allow crawlers to read admin noindex. Applicant forms have a private metadata
fallback. The existing production-only robots gate remains unchanged.

## Verification record

The local verification below covers the final application sources. Tests cover
operator/consent gates, private routes, payload filtering, storage failure,
withdrawal, late SDK imports, React Strict Mode, runtime Sentry hooks, the root
error boundary, metadata and sitemap rules. The configured browser suite uses
fake keys and intercepts external browser requests. No provider receipt is claimed.

| Check                          | Result                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| Required `pnpm check`          | Passed: lint/types, 1,140 web tests in 145 files, 23 mobile tests, 19 desktop tests              |
| Formatting and diff whitespace | Passed                                                                                           |
| Configured production build    | Passed; 925 pages; fake PostHog/GA4/Sentry settings                                              |
| Configured Chromium suite      | 5 passed: refusal, accepted public events/private routes, withdrawal, failed storage, Arabic RTL |
| Default production build       | Passed; 925 pages; optional services disabled                                                    |
| Default Chromium regressions   | 48 passed                                                                                        |
| Guide build and freshness      | 47 pages, 36 chapters, 34 image uses; source/input/PDF hashes match                              |
| Guide visual review            | All 47 pages rendered and inspected; updated screenshots and setup pages checked at full size    |

Browser testing moved from Next development mode to a production build after a
local development redirect loop prevented readiness. Tests do not bypass real
page routes. The first configured run exposed automatic Sentry session envelopes;
the fix removes BrowserSession and ProcessSession integrations. The final run
confirmed those requests were absent.

The accepted-consent fixture models a human Chrome browser's automation flag
and client hints because PostHog rejects automated browsers by design. Production
bot filtering remains intact. Google tests inspect the standard command queue;
the remote Google script is replaced with an inert response. PostHog tests inspect
the real SDK's intercepted and decoded payload. These prove local behavior, not
provider acceptance or all remotely configured Google features. Disable GA4
Enhanced Measurement and verify actual receipt before activation.

Intermediate checks correctly caught stale guide inputs, a strict lint rule in
the new guide test and browser selector/automation-fixture issues. Those were
repaired without weakening application gates. No dependency versions changed.

## Guide and continuation

The guide adds English and Arabic browser screenshots of the actual analytics
controls, visitor instructions, error-report limits and owner setup. Existing
protected-screen figures remain labelled synthetic. PDF/source/capture manifests
are committed together. A new guide test checks both analytics screenshot hashes
and the captured component/runtime/message hashes. The source baseline is `0f0ce43`; this delivery commit
contains the subsequent analytics update. Follow
[the capture/build workflow](../user-guide/README.md) on future changes.

Task-start branch: `feat/pilot-readiness-cleanup`, commit
`0f0ce43241e6afb3a3e1772c8b3ba023f6771949`. The existing untracked root file
`luma-green-user-guide.pdf` is user-owned and is preserved; the maintained artifact
is under `output/pdf`. No worktree was created for this pass. Find the delivery
commit with `git log -1 --grep='optional analytics'`.

Remaining operator work: create/configure the intended projects, set keys and
provider quotas, deploy, verify received events/errors, complete native-speaker
review of the new copy, and verify search ownership/indexing. All account and
environment steps are in [observability](../operations/observability.md) and
[SEO](../operations/seo.md). Existing signed-app, connected pilot, SMS, payment
and carbon gates in the main handoff remain unchanged. The default local preview was restored at `http://localhost:3004/` and returned
HTTP 200. No production activation, PR result, main merge or store release is
claimed. Confidence is bounded to implementation and local verification; the
next external proof is provider receipt in the intended deployment.
