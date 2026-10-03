# Agent handoff — 2 October 2026

## Approved recycling UI release — 3 October 2026

The founder approved the design and authorized commit, checked PR, Vercel release
and the existing Google Doc update. Active work is in
`/Users/syedabdulmuqeeth/.codex/worktrees/recycling-ui/luma.green`, branch
`codex/recycling-ui-release`. It starts at current main `c087a68` and applies only
the approved UI delta from local snapshot `7f1e135`. The prototype backend commits
are excluded. The original dirty checkout remains intact.

The accepted direction uses Mobbin recycling and inventory references, a household
collection entry, clearer material wording and compact business workspaces.
See the current design contract for sources and scope. Authentication, Convex,
integer money/mass, material identifiers and audit ownership are unchanged.

Guide impact: public entry pages, translated actions, collection progress and
shared household, applicant, business and admin layouts changed. The maintained
platform Word guide has 103 reviewed pages with 99 screenshot placements; the
team pack has 47 reviewed pages. Both source/build checks pass. Final review
corrected the remaining Market instruction to Buy in source and Google Docs.

The same Google Doc is now published from reviewed guide commit `364ecd6`.
Its link, folder and sharing are unchanged. All 40 chapters, six tables, 99 images
and four native date fields were verified. The 105-page native export passed
full-page review with exact unchanged-page comparisons after two final repairs.
All 99 native image descriptions remain absent; visible captions remain editable.
See `docs/user-guide/cloud.json` for exact hashes, revision and accessibility limits.

Verification: the disconnected Webpack production build passes with 2,622 pages.
The final home/navigation/motion run passes 34 cases; the separate 86-case public
responsive suite passed all 33 locales and required header widths. Five isolated
analytics tests pass with fake keys and intercepted provider requests. The
976-case protected-fixture audit found one Malayalam metric-label overflow;
the shared fix passed its 320/768 px retest. Tamil/Malayalam collection labels
were repaired and visually rechecked. Current public, protected, failure,
industry API, sample-price and analytics screenshots passed visual inspection.
All 33 catalogues retain their keys; 2,301 values changed, including 91 English
values. No English value contains “scrap”. Native copy was regenerated.
The final full `VITEST_MAX_WORKERS=2 pnpm check` passes: lint, TypeScript,
1,706 web/backend tests, 49 mobile tests and 22 desktop tests. Formatting passes.
The existing native-language review TODO remains a lint warning.
The local preview is `http://localhost:3107`; fixture screens use `http://127.0.0.1:3217`.
Protected previews use synthetic data and do not prove authentication or provider
execution. Native-speaker copy review, authenticated acceptance, hosted CI,
production Vercel deployment remain separate gates. The release branch passes a fresh production build (2,622 pages), formatting,
lint, TypeScript and the full test suite: 1,695 web/backend, 49 mobile and
22 desktop tests. The lower backend count excludes the unrelated prototype tests.
The approved source is `732283d`; its release guide has 103 reviewed pages. Changes reuse existing components, semantic tokens and
data owners. No backend, auth or calculation code changed. Main remains protected
and receives the change only through a checked PR. PR34 is open. Its first head `dec0413` passed all five required checks, native
checks and the Vercel preview build. The protected preview returned HTTP200 for
home and collection routes with the new copy; robots.txt disallows indexing.
Browser checks and final-head publication checks must pass before squash merge.
The independent final code review found no blocking issues. Production must be
verified against the exact merged SHA; preview success alone is not production proof.

## Current work: final account and notification integration

Continue on `feat/account-notifications-detail`. Pushed checkpoint `a3c890e`
contains account security, inbox/push, native controls, account navigation,
public page content and the industry API in all 33 locales. Its five required
hosted checks, 734 browser cases and five analytics cases passed. Main then
advanced to security repair `2ba8246`; the current working merge preserves
those fixes alongside this pass. Read [the pass record](account-notifications-and-content.md).
Do not stage the unrelated root `luma-green-user-guide.pdf`.

PR 29 is the existing delivery PR, with remote branch
`feat/responsive-locales-review`. Push the final checked HEAD to that branch and
rewrite the PR around the combined scope. Main is protected: require all checks
for the actual final head before merge. Do not create a duplicate PR or override
red checks. No frontend deployment monitoring is requested.

The earlier PR unit timeout was scoped to the five full-catalogue seed cases;
all assertions remain. Its browser run passed 713 cases but reached the old
20-minute job cap during the separate analytics build. The job now allows
30 minutes, with every case retained. That run passed on `a3c890e`; the new
security integration needs its own final hosted checks.

Evidence for `a3c890e`: the complete `pnpm check` passed with lint, TypeScript,
1,496 web/backend tests, 40 mobile tests and 21 desktop tests. Formatting,
110 catalogue checks, 36 focused browser cases and five isolated
analytics cases pass. All 144 public visual captures were inspected. The team
Word document has 47 reviewed pages and a 92-case manual. The platform guide
has 99 reviewed pages, 40 chapters and 93 image placements; all 13 document
tests and both builder freshness checks pass. The final disconnected production
build passes with 2,622 generated pages. Hosted CI must pass on the final PR
head before merge. Exact evidence belongs in the pass record; do not present old checkpoint counts
as current totals. The new `2ba8246` integration has a passing production build,
1,567 non-document tests, 62 focused browser cases, 43 mobile tests, 22 desktop
tests and lint. Its current guide has 103 reviewed pages, 40 chapters and 99
image placements. The team pack has 47 reviewed pages and a 92-case manual.
The complete `pnpm check` passes: lint, TypeScript, 1,582 web/backend tests,
43 mobile tests and 22 desktop tests. Formatting and all 15 document freshness
tests pass. The final commit still requires hosted checks before merge.

Apple, Google Play and Expo/EAS accounts are not set up. Code and local app
checks are complete; signing, physical-device tests, push credentials and store
review remain external gates. Auth/inbox backend release must preserve the
parallel recycling schema additions. Do not deploy this checkout over them.
The existing Google Doc is verified through main `2ba8246`; its ID and sharing
remain unchanged. The newer reviewed Word revision will be synced in place by
the coordinated security followup after PR 29 merges. That followup also owns
the combined backend rollout. Before merging the final green PR head into main,
hold for that owner's verified additive backend release from the same head.
Vercel does not deploy Convex as part of its frontend build. Preserve the
already-deployed recycling schema in the combined release. The cloud document
update follows the main merge. Local Word artifacts are current for this pass.

Final CI repair: `6a20089` passed all five required checks and native checks.
Its browser run passed 727 cases but failed nine menu cases; one other menu
case passed on retry. All ten retry traces show the keyboard test focusing a
disabled, pre-hydration trigger. The tests now wait for an enabled control and
assert focus before Enter. The held-script tests also check keyboard reopening
after hydration. Runtime behavior and all existing assertions remain unchanged.
The production-build regression passed 30 repeated menu cases with zero retries
and three delayed-script pointer/keyboard cases.
The guide's final route table restores the API connections entry; the Word file
and review record are rebuilt together. No screen changed in this repair, so
the current browser captures remain valid. Recheck CI on the repair commit.

The final security repair checks forbidden auth flags independently and holds
push registration blocked through the entire sign-out transaction. The real
HTTP/control regressions pass, along with 127 focused auth tests, 69 focused
notification/sign-out tests, scoped lint, TypeScript and the production build.
The auth patch also passed an independent 23-test handler rerun. Refresh affected
guide captures, rebuild/review Word, run the full checks and require green
actual-head CI before completing the release order above.

The server repair also binds push devices to validated Better Auth sessions and
rejects new delivery claims after that session ends. It covers a second-client
registration during sign-out, beyond the frontend's same-runtime lock. Legacy
unbound records require authenticated renewal. Preserve the additive session
field and its migration notes in the combined backend release. No live provider
delivery is claimed by the local HTTP regression.

Final local check passes with 1,603 web/backend tests, 43 mobile tests and 22
desktop tests, plus lint and TypeScript. All 33 final production-browser cases
pass with zero retries. Independent server review passed 62 auth/push cases and
the original cross-client regression unchanged. The 240 affected captures and
103-page guide / 47-page team pack passed visual review; 15 document tests pass.
Require formatting and hosted checks on the final committed head, then follow
the backend-before-main release order above.

## Integrated industry API checkpoint

The account checkpoint bc986f4 is combined with origin/main af2e295. The following industry API evidence describes its earlier branch, not the combined build. Combined captures, guide rebuild, visual review and local checks are complete; hosted CI remains pending on the final PR head. Preserve all 33 locale catalogues and both account and API workflows.

**Industry API work:** `feat/industry-api` adds REST v1 for an approved business's
organization, material catalogue, stock, buying/selling trades and optional
material-family news. Owners can create scoped, expiring keys and revoke them
from Compliance → API access. Convex owns current membership checks, key
hashes, business isolation, accepted-read limits and audit writes. The API exports
integer grams/paise; trade payments remain simulated. There are no ledger writes,
GraphQL or MCP endpoints in this release. The industry plan records those later
contracts and their release gates.

Local proof: the full check passed with two Vitest workers: lint, types, 1,267 web
unit tests, 27 mobile tests and 20 desktop tests. Formatting, production builds,
155 Chromium checks with zero retries and five isolated analytics checks passed.
The maintained Word guide has 71 visually reviewed pages and eight passing
freshness tests. See the PR for hosted checks and merge state.

See [industry API delivery](industry-api.md) for current verification and
[the API contract](../architecture/industry-api.md) for setup and examples.
The schema change is additive; deploy its tables, indexes and functions before
the web release. News remains off until an operator configures an appropriate
provider plan and explicitly enables it in Convex. Local tests do not prove
provider execution or a deployed integration.

Guide impact: a new API setup and key-management section, current Compliance
capture and API screen captures in every registered language, light/dark themes,
phone/tablet/desktop sizes and RTL. Protected examples have synthetic data and
writes disabled. The maintained Word document, visual review record and source
hashes travel with this change. The existing Google Docs copy retains its stable
ID and sharing; its in-place update remains a separate connection gate.

## Selection and production demo-price checkpoint

The follow-up on `feat/responsive-locales-review` replaces large selection
blocks with a searchable first-login language picker and compact form controls.
It fixes the remaining narrow Tamil labels, basket alignment and explicit RTL
direction. All 36 targeted phone/tablet/desktop selection scenes passed, with
each browser capture visually inspected. All 15 auth browser cases passed.
The normal disconnected build and a separate connected development build passed.
Final `pnpm check` passed with 1,296 web tests, 27 mobile tests and 20 desktop
tests, plus lint and TypeScript. Formatting passed. Hosted checks must be read
again for the new commit before merge.

At the founder's request, `demoPrices:seed` was deployed and run on both Convex
environments. Production now has 26 materials, 26 reference prices and 780
sample daily prices. Development and production price-board values match for
all 26 materials and 30 dates. Existing records were preserved. This is a
price-only import, not the full platform demo seed. Read
[the import and cleanup record](selection-prices-and-account-ux.md).

Guide impact: the editable platform guide now has 75 reviewed pages and 73
image placements. Fresh public and protected captures include the new picker,
selection controls and two read-only connected development price views.
The team document has 38 reviewed pages and 12 image placements. Their exact
hashes and capture provenance are in the respective build records. The stable
Google Docs copy remains pending an in-place update; its ID and sharing remain
unchanged. The connected development captures do not prove a production page
load, authentication or provider delivery.

The next authorised slice is more page-specific imagery and descriptions,
optional authenticator protection after phone sign-in, in-app/browser push,
and Expo/Electron integration. Apple, Google Play and Expo/EAS accounts are not
set up: finish code and local checks, then document account, credential,
signing, store and real-device gates. Do not claim those gates are complete.
The founder excluded frontend deployment monitoring. Use the protected PR path
for integration into main, and keep the unrelated root PDF untracked.

## Release snapshot

This snapshot records the local release evidence for
`feat/responsive-locales-review`, based on `c1ed004`. The founder requested
commit, push and integration into `main`. Use the protected PR path, with all
required checks green. Read the live Git/PR state before resuming; this document
is not a substitute for hosted CI or deployment status.

The founder merged the earlier PR #28 at 03:27 UTC. Its `dfb7de2` head passed
all five required checks, Chromium and native policy checks. Vercel reported
production `c1ed004` successful, and its How it works page returned HTTP 200.
That checkpoint contains the initial UI pass, banners, logo motion and offline
seed manifest. This follow-up contains the final responsive and language work.

`9930381` records durable UI rules, the 62-case team manual, the proposed
October–March plan, India-first legal preparation and the corrected offline
seed gap. The founder confirmed that the entity is not registered. The UI
contract in `docs/design/designer-system.md` supersedes historical visual rules.

### What changed

- Compact public and operational phone/tablet menus, one-row desktop navigation,
  tight section spacing and complete single-line action text. The final narrow
  pass also stacks pickup contact actions and lets long form labels wrap.
- 21 additional complete catalogues: 33 locales, script-font priority repair,
  localized numeric input, root-error and native-shell copy generation.
- Real-price loading placeholders and restrained public text/button/mesh effects.
  Public static rendering and private/live data boundaries are preserved.
- Maintained Word guide and illustrated team pack with light/dark pairs,
  translated examples, role/edge-case testing, roadmap and API/legal gates.

### Local verification

`pnpm check` passed: 1,272 web tests, 27 mobile tests and 20 desktop tests,
plus lint and TypeScript. Formatting passed. The normal webpack production build
emits 2,521 static routes. All 706 Chromium cases passed with one worker; all five
configured-analytics checks passed in an isolated build with intercepted provider
requests. The last German selector-label correction received a fresh 101-test
message check and all 33 narrow control-bound checks before the final rebuild.

The protected fixture matrix initially passed 777 of 784 cases. Seven genuine
layout defects were fixed; all 160 affected cases then passed. All 99 operational
navigation states and the 33-locale descendant-text bounds checks passed. This
catches text hidden inside a control as well as page overflow. Original browser
PNGs were visually reviewed. Fixtures have synthetic records, reject writes and
do not prove authenticated access or backend/provider execution.

The language audit covers 33 × 2,260 message values and 26 material names per
locale, with no mechanical coverage issues. Native-speaker review remains
required. The 35 separate offline seed tests pass; no seed import or reset ran.
See the [responsive record](responsive-performance-locales.md) and
[cache audit](rendering-cache-audit.md) for scope and repeatable checks.

### Guide impact and external gates

The platform guide has 69 reviewed pages and 65 image placements. Its current
public, analytics and protected captures and exact DOCX hash are recorded in
`docs/user-guide/build.json`. The team pack has 38 reviewed pages and 12 image
placements, with its own freshness record. The 62-case manual is a test plan;
its staging/provider/device cases have not been claimed as executed.

The existing Google Docs ID and sharing are unchanged. Its in-place update is
explicitly pending in `docs/user-guide/cloud.json`; use the current local Word
file for this revision. Demo isolation still needs the founder's choice before
import work. Stored material names require the separate authenticated, audited
repair after backend deployment. Live SMS/provider acceptance, native signing,
real-device tests and legal review remain release gates. No live provider send,
payment, credit issuance or legal filing ran in this pass.

Preserve the unrelated root PDF and pre-existing previews on ports 3004/3202.
The task preview uses port 3009; the isolated fixture preview uses port 3203.

## Earlier checkpoints

**Logo motion follow-up:** after `8975575`, the founder requested an eased logo
spin on hover. The shared SVG mark makes one 900ms turn on fine-pointer hover
and home-link keyboard focus. The wordmark stays still. Reduced motion disables
the effect, including a turn already in progress. This is CSS only; no client
boundary or dependency was added. The brand playbook records this approved
exception to the previous rotation rule.

Production build, scoped lint, three logo unit tests and all eight motion browser
checks passed. The browser tests cover hover, keyboard focus, the still wordmark,
return to rest and preference changes. Refreshed public captures match the previous
PNG files exactly. The guide remains 66 pages: 64 rendered pages match the reviewed
banner edition pixel for pixel; the changed cover and appearance page passed a
new visual review. The local Word guide and build record are current. Its existing
Google Docs copy remains pending an in-place update under the recorded connection
gate. The local preview on port 3009 serves this revision.

**Banner follow-up:** on `feat/ui-detail-pass`, after `ff7bb64`, the founder
requested banner images on How it works and every main public page. Public
headers now require a scene and display a full-width image below the title.
Join and Help Contact gained images; the main Help and role-help pages use the
same banner treatment. Mobile crops are taller. Existing compressed artwork is
reused; there are no new image downloads, dependencies or card containers. The
home hero, article layouts, sign-in forms and operational workspaces are unchanged.

The production build, scoped lint, 143 affected component tests and six guide
freshness tests passed. All 113 affected public browser
checks passed, including 32 new banner cases at 390px and 1440px with Arabic
coverage. Public and role-image screenshots were refreshed. The guide remains
66 pages with 62 image placements; 54 rendered pages have identical pixels to the
previously reviewed edition, and the 12 changed pages received a new visual review.
Use `docs/user-guide/build.json` for the exact reviewed document hash. The same
Google Docs update gate remains; no cloud document or sharing setting was changed.

**Active refinement:** `feat/ui-detail-pass`, based on merged main `3b29ea7`
(PR #27). The founder requested detail across all screens while keeping the
current identity, with no content-card grids. Source work covers all 41 route
wrappers through public, auth/join, household, operator and admin components.
The mobile wordmark is hidden; language uses its native name. Public material
marquee and clearly labelled demo testimonials are included. The founder approved
sample quotes explicitly; these are not customer reviews.

Phone and code screens remain visible before SMS setup. The code screen is an
explicit preview: no send, verification, session or private access is simulated.
This changes presentation and navigation only; backend authentication and ledger
contracts remain intact. New translations remain machine drafts for native review.

Local verification passed: normal webpack production build, lint, types, 1,181
web component/logic tests plus six guide freshness tests, 27 mobile tests and 20
desktop tests. All 115 Chromium checks and five isolated configured analytics
checks passed. The browser checks include 320px Tamil/Malayalam button text,
mobile endonym controls, RTL, reduced motion and the inert phone/code preview.
Independent review found and fixed a preview hint that promised an SMS and a
long translated action label that exceeded its button.

Guide impact: refreshed 27 public captures, four role-image captures, two
analytics captures and 40 protected-component fixtures. Added phone and OTP
preview, demo testimonials, onboarding forms/status, stock, sale, invoice and
impact figures. The Word guide has 62 image placements and 66 rendered pages;
all pages passed visual review. The exact DOCX and input hashes are recorded in
`docs/user-guide/build.json`.
Public captures use the actual disconnected build. Protected captures show
synthetic records with a visible banner; all writes reject.

The existing native Google Docs copy is explicitly pending this revision. The
connector can create a new import but cannot replace the same native document
from this DOCX. Its ID, URL, sharing and last verified revision are preserved in
`docs/user-guide/cloud.json`. Local checks do not prove hosted CI, deployment,
live authentication, provider execution, native signing or real-device acceptance.

Preserve the unrelated root PDF and pre-existing previews on ports 3004 and 3202. The task's final production preview uses port 3009. Work is on the local
feature branch; no production deployment was made by this pass.

The earlier checkpoint below is history for the integrated PR #27, not the active
branch. Use the verification record above for this refinement.

**Current slice:** designer system polish and an expanded homepage on
`feat/design-system-polish`, based on main `e403503`. The founder rejected the
previous theme and approved a full public, role and admin redesign. Read
[the design plan](../design/designer-system.md) and the
[route review](designer-review.md). The source pass uses neutral light/dark
surfaces, Geist display with Noto scripts, shared Lucide icons and consistent
controls. Six new home sections explain the existing product. Admin pilot charts
use actual query values through Recharts; text/table equivalents remain visible.

PR #26 was merged into main as `e403503` before this slice. Do not resume the old
`feat/pilot-readiness-cleanup` branch. The root `luma-green-user-guide.pdf` is an
unrelated user file and must remain untouched and unstaged.

Local verification passed: `pnpm check` (1,171 web, 27 mobile, 20 desktop
unit tests), formatting, clean production build, all 107 Chromium checks with the
CI worker setting and five configured analytics checks. Independent review found
and closed translated-layout and dark chart-label defects. The maintained Word
guide has 56 reviewed pages and 51 screenshot placements; all six guide freshness
tests pass. Public screenshots are actual disconnected pages. Protected screens
remain explicitly labelled synthetic fixtures, not live account acceptance.

The reviewed guide was imported into native Google Docs. Read
[`cloud.json`](../user-guide/cloud.json) for its verification state and stable
document URL. Preserve that document ID on future updates. Git integration and
hosted checks must be verified separately; do not infer production or provider
readiness from local results.

[Future enhancements](../product/enhancement-proposal.md) remain an unapproved
research proposal. Native signing, real device testing, store approval and live
provider acceptance remain separate release gates. This work changes presentation,
not ledger, authentication or provider contracts.

## Resume procedure

1. Read `AGENTS.md`, this page, and the task-specific `.claude/skills` playbooks.
2. Check `git status -sb`, `git log -15 --oneline`, `git remote -v` and
   `git worktree list`. Preserve new user changes. Fetch `origin` and compare the
   branch with its upstream before editing or pushing.
3. Read the implementation records below, especially the latest
   [UI redesign](ui-redesign.md). The earlier visual and guide
   checkpoints are integrated; do not repeat them.
4. Pick a task from the ordered queue. Distinguish code implementation, local
   tests, hosted CI, deployment, provider execution and store approval in reports.
5. Update this page as work progresses. Commit meaningful verified slices.
   Keep secrets, local environments and temporary output out of Git. The
   maintained Word user guide and browser captures are required tracked artifacts.

Repository: `https://github.com/ungaaaabungaaa/Luma.Green.git`.
Branch: `feat/design-system-polish`.
Starting base for this slice: `e403503`, merged main at task start.
Local checkout: `/Users/syedabdulmuqeeth/Developer/SandBox/luma.green`.

For a new machine only:

```sh
git clone https://github.com/ungaaaabungaaa/Luma.Green.git
cd Luma.Green
pnpm install --frozen-lockfile
pnpm check
```

Use Node 24 and the pnpm version pinned in `package.json`. Do not clone over an
existing checkout. No app secret is needed for local build/tests.

## Commit checkpoints

These commits are reachable from the continuation branch. Do not cherry-pick
them again into that branch or restart from the old base.

| Commit    | Completed work                                                                 |
| --------- | ------------------------------------------------------------------------------ |
| `bb3eb1b` | Deferred analytics and removed unused service packages                         |
| `cfcad80` | Twelve-locale material names and message-contract validation                   |
| `e949586` | Pickup dispatch, expiry/reassignment and pilot safeguards                      |
| `af9a027` | Accessible UI cleanup and admin pilot reports                                  |
| `c6b51a0` | Auth recovery after failed sends and delayed sessions                          |
| `caf87bf` | Optional bounded photo estimates; manual entry preserved                       |
| `85b9d73` | Booking/application status-message outbox and adapter                          |
| `acd549e` | Pilot setup and implementation evidence                                        |
| `9ec96ce` | Expo and Electron shells, guarded updates, GSAP and imagery                    |
| `e6d0e3a` | Expo-compatible isolated mobile TypeScript version                             |
| `e218556` | Native architecture, account setup and release evidence                        |
| `2183515` | Image compression, compact queries, caches and self-hosted inference adapter   |
| `f94fa6b` | Agent handoff and continuation checkpoints                                     |
| `db62fb7` | Premium public/app design, compressed art, parallax and motion checks          |
| `0f0ce43` | Illustrated platform guide and mandatory guide maintenance rules               |
| `6ca9391` | Optional PostHog/GA4, error-only Sentry, search setup and updated guide        |
| `9fb82cd` | Role images and earlier app previews; previews removed in the current redesign |

Detailed records: [UI and pilot](cleanup-progress.md),
[apps and motion](apps-and-motion.md), [cost optimization](cost-optimization.md),
[visual refinement](premium-ui.md), [platform user guide](user-guide.md),
[analytics and SEO](observability.md), [role app showcases](app-showcases.md).

No unfinished agent edits, stashes or active secondary worktrees were present at
handoff inspection. The five earlier managed worktrees are archived: UI,
translations, pilot readiness, photo estimates and SMS. Their work is integrated.
They are recovery snapshots, not continuation checkouts.

## Architecture to preserve

- Next.js and Convex own operational UI and data. Money is integer paise; mass
  is integer grams. Permission checks and transaction records stay authoritative.
- `apps/mobile` uses Expo/React Native for Android/iOS. `apps/desktop` uses
  Electron for macOS/Windows. Both reuse the hosted web UI and backend.
- Hosted UI, compatible signed JavaScript updates and native binaries have
  separate release paths. New native capabilities can still require a binary
  or store update. Do not promise permanent freedom from app updates.
- Root message catalogues are the editable translation source. Regenerate
  mobile copy with `pnpm --filter @luma/mobile messages:generate` after shared
  native/common/brand copy changes.
- Photo inference uses one configured OpenRouter or authenticated HTTPS endpoint.
  No paid fallback; models never set prices. Router/model suitability is unverified.
- Image preparation is local and never increases upload bytes. JPEG/PNG private
  metadata is removed while orientation stays correct. PDF/video/WebP bytes and
  embedded metadata stay unchanged. Server validation remains in place.
- Photo-result memory cache: three replies, five minutes, cleared on account
  change/unmount. No persistent image/result cache. Current prices stay reactive.
- Convex remains the database. Its current backend and GSAP are not MIT/Apache-only;
  see the cost guide before making license claims.

Read [ADR 0014](../decisions/0014-shared-web-ui-in-native-shells.md),
[ADR 0015](../decisions/0015-bounded-photo-cache-and-selectable-inference.md),
[native architecture](../architecture/native-apps.md) and
[AI architecture](../architecture/ai-estimation.md) before changing these contracts.

## Verification checkpoint

Current role-preview checks are recorded in [app-showcases.md](app-showcases.md).
Analytics/SEO checks are recorded in [observability.md](observability.md).
That record includes configured and default builds, consent browser checks,
regressions and the updated guide. Provider receipt, hosted CI and deployment
remain separate gates.

Historical implementation checks at `db62fb7`:

| Check                            | Evidence                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm check`                     | Lint/types; 1,065 web tests in 136 files; 23 mobile and 19 desktop unit tests |
| `pnpm format:check`              | Passed                                                                        |
| `pnpm exec next build --webpack` | Passed; 925 generated pages                                                   |
| `CI=1 PORT=3100 pnpm e2e`        | 48 Chromium tests passed against production build                             |
| Public image cache               | Content-hashed source, immutable headers, optimizer `MISS` then `HIT`         |
| Upload fixture                   | 4,980,609 → 490,212 bytes; inspected synthetic scan remains legible           |
| Compact prices                   | 832 → at most 52 documents; 50,832 → 1,113 response bytes in fixture          |

Earlier checks include both Hermes exports, Android configuration prebuild, real
macOS Electron isolation/PDF/recovery smoke and unsigned macOS ARM64 packaging.
These do not prove mobile native compilation, Windows execution or signed updates.
The default Turbopack build hit a host worker-port restriction; Webpack passed.
Clean production builds need network access for configured Google fonts.

The historical checks above cover the visual refinement. Its last heading offset and
browser-test selector fixes also passed focused ESLint and the production suite.
The first incremental build emitted stale CSS; moving the compile cache aside and
building again produced the correct styles. A computed hero-size smoke check now
catches that failure. The production homepage was inspected and the two repository
homepage screenshots were refreshed. The image-cache/upload/price fixture rows
above are historical evidence from `2183515`; those paths were not changed by this
visual pass. No application source changed after the final build/browser checks.

The local preview was refreshed at `http://localhost:3004/`. Check its process on
resume; it is not a deployed service. Use `PORT=3004 pnpm start` after a successful
build if needed. Generated artifacts are ignored: `apps/mobile/dist`, generated
mobile Android/iOS projects and `apps/desktop/release/mac-arm64/Luma.Green.app`.
Rebuild on a new machine. `/tmp` screenshots/logs are not required resume inputs.

## Maintained user guide

The guide now covers every role, access, the admin console, household pickups,
business trades, native updates and owner setup. Read
[the editable guide](../user-guide/guide.md) and
[its update workflow](../user-guide/README.md). `AGENTS.md` requires a guide-impact
assessment for each user-facing change and updated source/captures/DOCX in the
same commit when affected. The Word guide uses current browser captures; protected
screens use clearly labelled synthetic records in actual application components.
No connected authentication or live provider result is established by those figures.

Historical documentation checks at `0f0ce43`: `pnpm check` passed lint/types, 1,068 web tests in
137 files, 23 mobile tests and 19 desktop tests. Three new tests enforce guide
input, screenshot/component and PDF hashes. The PDF was rendered and every page
inspected. No production source, dependencies or native runtime changed.
The analytics edition added English and Arabic consent captures and owner setup.
The earlier PDF visual edition had 50 pages. The current Word edition uses 18 public captures,
four public role photograph captures and 28 synthetic protected-screen
fixtures (including six phone layouts and two dark views). Generated scenes are illustrations, not
evidence of operations. Only the analytics captures use test keys; their external
requests are intercepted. Shared image/adapter hashes now enforce recapture.
Guide impact was assessed and its source, captures, build record and DOCX updated
in the same delivery. The guide tooling uses a separate local preview and Python
build dependencies.
See the [delivery record](user-guide.md) for capture coverage and remaining limits.

## Ordered next-work queue

| Priority | Task                                                       | Completion evidence / dependency                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Open/review a PR for the branch; run hosted checks         | Review the full diff and obtain green required CI plus relevant browser/native jobs. A branch push alone does not run the current PR-only checks. No direct main push or red-check merge.                                                                                                                               |
| 2        | Stage the connected pilot flows                            | Configure intended Convex/site environments. Deploy schema/functions before dependent frontend. Test real sign-in, private upload, dispatch, expiry, receipt and admin report with staging users. Accounts/keys are external prerequisites.                                                                             |
| 3        | Complete signed native previews                            | Configure the dedicated trusted origin and signing/update credentials. Build Android/iOS and macOS/Windows artifacts. Test login, camera/gallery/location, private files, recovery and updates on each platform. Full Xcode, Android SDK/JDK or EAS builds are required; this host lacked mobile native toolchains.     |
| 4        | Activate and verify SMS                                    | Obtain MSG91/DLT/template approval. Check OTP and status events. Record API acceptance and handset delivery separately. No real send was made during implementation.                                                                                                                                                    |
| 5        | Validate optional self-hosted AI                           | Configure an authenticated HTTPS gateway, pin an evaluated vision model, and test cold/warm latency within eight seconds, accuracy and cost. Manual entry works without AI.                                                                                                                                             |
| 6        | Run launch UX and cost acceptance                          | Review populated app/admin screens with staging accounts; native-speaker review of launch languages; low-end device/RTL checks; real scan legibility; staging usage measurements and restore drill. Replace placeholder support contact details before launch. Local savings are fixture measurements, not a live bill. |
| 7        | Implement remaining operational gaps if required for pilot | SMS delivery webhook/status handling and explicit resend policy; bounded SMS outbox retention; identify/exclude demo rows in pilot metrics. Define retention and idempotency first. Current adapters/reports do not implement these.                                                                                    |
| 8        | Activate analytics and search only when ready              | Create selected PostHog/GA4/Sentry projects, set explicit deployment flag and keys, disable GA4 Enhanced Measurement, set quotas and verify received events/errors. Verify Search Console/Bing ownership and submit the deployed sitemap. No accounts or production services were activated in this pass.               |
| 9        | Continue later product work from its requirements          | Large-city spatial dispatch; consented photo conversion/accuracy instrumentation; real escrow/payments and regulated carbon work. Existing prototypes and sample figures are not live services.                                                                                                                         |

Setup checklists:

- [Launch](../operations/launch-checklist.md): Convex, hosting, SMS and core environment.
- [App releases](../operations/app-releases.md): Expo/EAS, Apple, Google, macOS/Windows signing and updates.
- [Low-cost operation](../operations/low-cost-operation.md): exact self-hosted AI variables, gateway, licenses and measurements.
- [SMS](../operations/sms-notifications.md): template/event contracts.
- [Backups](../operations/backups.md): exports and restore checks.
- [Observability](../operations/observability.md): PostHog, GA4, Sentry, consent and quotas.
- [Search](../operations/seo.md): canonical host, ownership tags, sitemap and indexing.

## Publication and next-agent instruction

This checkpoint is integrated through PR #26. Verify equality after fetching with
`git rev-list --left-right --count HEAD...@{upstream}`; expect `0 0` before claiming
synchronization. Check clean status separately. Find the latest delivery with
`git log -1 --grep='redesign themes'`. Preserve the pre-existing untracked
root `luma-green-user-guide.pdf`; the maintained artifact is now under `output/docx`.
Do not stage or delete it. No main merge, hosted CI result or deployment is
claimed by this handoff.

PR #26 runs the required hosted checks before squash merge. Read its current
head, checks and merge metadata for the exact integration result. Deployment,
provider execution and store release require separate evidence. No background
agent or scheduled monitor is left running. Resume with the ordered queue and
update this record.

## Current guide and demo boundary

The Word guide replaces the former PDF maintenance requirement. The current
source remains `docs/user-guide/guide.md`; output is
`output/docx/luma-green-user-guide.docx`. Retain actual browser captures and
provenance, rebuild, render and inspect every page after screen changes. The old
PDF is archived. Preserve the unrelated root `luma-green-user-guide.pdf`.
The Google Docs link and synchronization evidence belong in the guide directory
after verified import. Update that same document for future changes; creating a
new document on every run breaks the shared link. UI commits alone do not sync a
cloud document. AGENTS.md requires the cloud update or an explicit pending gate.

Local desktop demo artifacts are ignored build outputs under
`apps/desktop/release/demo`. Mac ARM64 runs locally; Windows x64 was cross-built
but still needs execution on Windows. Both load a local website on port 3004.
The demo origin is immutable and loopback-only, with separate cookies and no
update feed. Production HTTPS/signing guards remain.

Mobile launchers and Android/iOS JavaScript bundles are verified locally. This
host has no full Xcode, simulator, JDK or Android SDK; no mobile installer or
real-device acceptance is claimed. Follow the mobile demo record rather than
assuming Expo Go is compatible. Signed releases and provider execution remain
separate launch gates.

## Merge review follow-up

Independent review of the full branch found and fixed two edge cases. Pickup
acceptance now rejects an offer at or after its deadline, even when the scheduled
expiry job runs late. Tests cover that boundary, unchanged records on rejection,
later audited reassignment and legacy bookings without deadlines. The desktop
app now recreates its main window on activation when a document window is still
present; the Electron lifecycle regression failed before the fix and passed after.

Guide impact: the fixes enforce behavior already described in the guide. No
screen, copy, access rule or setup instruction changes; current screenshots and
the reviewed Word artifact remain valid. Google Docs publication is still pending.
The Vercel preview reports deployment success but is sign-in protected; public
HTTP inspection confirms the login boundary and `noindex`, not the hosted app UI.

## Offline demo checkpoint — 2 October 2026

The versioned [demo manifest](../product/demo-seed-manifest.md) and
[import plan](../product/demo-seed-plan.md) are ready for review. They describe
48 business plans, 82 synthetic identities and all 26 material codes. The
manifest records six explicit coverage/import gaps. Its 35 offline regression
checks, strict script types, lint and formatting pass. No database, provider,
authentication or production change was made. Import isolation is still pending.

Guide impact: these offline files change no route, screen, role, permission or
workflow. They need no new guide screenshot. The parallel responsive/language
and visual-polish pass remains uncommitted while its matching guide is refreshed.

## Security and failure review — 2 October 2026

Work is isolated on `fix/security-failure-review`, based on `c1ed004`, in the
managed `security-failure-review` worktree. The concurrent responsive/locales
checkout is preserved. See [the review record](security-failure-review.md) for
findings, fixes, remaining risks, current checks and delivery evidence.

Guide impact: account setup now requires a private operator token; failed admin
login, file removal, draft discard, sign-out, invalid money totals and support
quota feedback have explicit recovery behavior. The guide source, labelled
browser fixtures, capture manifests, reviewed Word artifact and build record are
updated together. Native navigation fixes change no screen or control. Google
Docs publication remains pending at the existing document ID; sharing is unchanged.

Deployment must apply the support phone/time index and server functions before
the frontend. Remove the bootstrap token after setup. Review/revoke existing admin
sessions if the vulnerable phone/setup endpoints were exposed. The open node-forge
advisory, real-device acceptance, live authentication/provider tests and production
deployment remain separate gates. This report does not claim launch readiness.

The security repair branch preserves the industry API feature merged through PR #30 at `af2e295`. Its additive schema and API guide chapter are retained. The combined source was reviewed for access boundaries and checked again. A slow-loading phone menu also keeps its trigger disabled until interactive, preventing lost first clicks. The current guide includes both revisions.

Final local evidence: `pnpm check` passed (1,345 web/backend, 30 mobile and 21 desktop tests), formatting passed, both production build formats passed, and all 158 browser tests passed without retries. The reviewed Word guide has 76 pages and 72 screenshot placements. Capture hashes match the combined source. Hosted checks and protected squash-merge evidence belong to the associated security repair PR; production backend deployment and the cloud guide update are not implied.

## Security rollout follow-up — 2 October 2026

The follow-up branch `fix/security-rollout-followup` starts at merged PR #31
(`2ba8246`) and keeps the concurrent PR #29 checkout separate. The node-forge
advisory now has a reviewed local backport of upstream commit
`ceba34402e329f0365134f23fe19898756527d65`. All three Expo consumer paths reject
the upstream forgery vector; valid signing controls pass. The registry still
reports one high advisory because no patched version has been published. See
[patch provenance](../../patches/README.md); separate EAS installations remain
gated for signing.

Local verification passed: `pnpm check` (1,345 web/backend, 36 mobile and 21
desktop tests), production build, complete formatting, and an independent patch
review. Guide impact: the dependency patch changes no user-facing route, screen,
copy, role or native update behavior. The reviewed source/DOCX/screenshots remain
valid. Operator release instructions now identify the separate EAS dependency
boundary. Cloud synchronization and backend rollout are being verified separately.

Read-only session inspection found no active admin sessions in development or
production. Development has one configured password/TOTP admin with consistent
profile records; production has no auth users and no configured admin. No session
or account records were changed. A production dry run found 15 indexes belonging
to the separately deployed ecosystem backend that current main would delete.
That deployment was not applied. Complete the combined schema integration with
PR #29 and ecosystem backend commit `dc41665` before either environment is pushed.

The isolated follow-up now includes the already-deployed ecosystem backend from
`dc41665`, without its unmerged frontend. This preserves the live messaging,
workforce, material-demand, public-data and isolated-demo owners during the
security rollout. Both membership index orders, the industry API schema and all
PR #31 guards remain. Independent merge review passed; 154 tests in nine focused
suites and TypeScript pass. Live job inspection found zero business jobs needing
the optional city backfill (production has zero jobs; development has seven and
all have cities), so no migration was run. The public-data runbook is retained.

The stock overflow follow-up has 32 new regressions and one shared stock-balance
check. Trade receipts and multi-line pickup completion now reject unsafe or
invalid legacy quantities atomically. Existing valid boundaries and error codes
are preserved. Guide impact: these are backend invariant and compatibility
repairs; no new user-facing screen or copy is introduced. The ecosystem frontend
remains separate. Guide freshness tests remain required after the final PR #29
integration.

### Final combined security source — 3 October 2026

The isolated follow-up integrates final PR #29 head `593dfa2` with the retained
ecosystem backend and all security repairs. Independent review found and fixed
malformed auth-flag bypasses and notification registration during sign-out,
including a real second-client HTTP logout case. The authoritative push session
binding is additive; legacy unbound devices stay inactive until authenticated
renewal. The reviewed guide includes these rules and the in-flight delivery limit.

The combined full check passed 1,695 web/backend, 49 mobile and 22 desktop tests,
lint and types. Build passed 2,622 static pages; formatting passed. The final
production dry run validates existing data, adds 16 indexes and deletes none.
Deployment will run before PR #29's frontend merge, because Vercel currently
builds the frontend without deploying Convex. Actual rollout proof follows.
The 103-page Word guide has 99 images and SHA-256
`a4cbbe1f589e0e84bc95aa2aa1723e17e9c637e48a752eefb71330478f660fd3`.
Its existing Google Doc awaits the verified in-place update after the source
merges; the latest published record and native description are preserved.

### Verified rollout and protected account merge

Source `e1fc138` deployed to development `glorious-rooster-470` and production
`outstanding-buzzard-942` before the frontend merge. Both post-deployment checks
prove 75 indexes, 137 functions, null anonymous identity and `NOT_SIGNED_IN`
for private review, integration-key and inbox queries. Production added 16
indexes and deleted none. Both environments have zero active admin sessions;
production has no auth users or configured admin. No account/session changes,
secret rotation, provider enablement or inferred data backfill was needed.

PR #29 then merged at `53dae4db62432119505bd06d7d9ac85284c0c386` with all required
checks, 737 browser tests, five analytics checks and native validation/export
green. Reconciliation commit `b0db178` preserves all tested runtime source bytes.
The reviewed 103-page platform guide can now be synchronized in place. The
separate team Word artifact is preserved. Production admin provisioning, live
password/TOTP acceptance, SMS and signed device delivery remain separate gates.

### Final security delivery and Google publication

PR #32 merged at `7f584854896b991ea3970d91e0a20d43ed1cca2f` with all five
required checks, 737 browser tests, five analytics tests, native validation/export
and Vercel green. Remote main runtime matches tested/deployed `e1fc138`.
The existing Google Doc now matches the reviewed 103-page Word source: 40
chapters, 659 body paragraphs, six tables, 99 images and three original native
dates. All 104 final native export pages are verified after a spacing repair.
Document identity, folder and sharing remain unchanged. `cloud.json` records
the exact source hash, readback revision, export hash and visual coverage.

Google's image replacement removed the previous sole native description and
has no description setter. All 99 images retain captions but lack native alt
semantics; the original description text is saved for a supported editor repair.
Native UI work stayed stopped to preserve user focus. This limitation,
production admin/provider setup and separately installed release-signing tools
remain explicit; they do not invalidate the tested source repairs.

Guide impact: no source, screenshot or DOCX content changed after PR #29's
reviewed build. This final documentation-only delivery records cloud publication
and rollout evidence. The separate team-review Word artifact is preserved.
