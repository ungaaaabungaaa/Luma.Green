# Team end-to-end test manual

Status: ready for test planning, 2 October 2026. This is an execution manual,
not a completed test report. Record the exact build and results for each run.
It covers household, kabadiwala, yard, recycler, manufacturer, Saathi and admin,
plus public visitors and applicants. Read the [user guide](../user-guide/guide.md)
for screen instructions and the [launch checklist](../operations/launch-checklist.md)
for account gates. This manual does not authorise deployment, import or real sends.

## 1. Choose the evidence lane

| Lane | Environment                                                                 | What a pass proves                                                    |
| ---- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| L    | Disconnected local production build; optional services off                  | Public rendering, navigation, validation and inert previews           |
| F    | Labelled isolated component fixtures; writes reject                         | Appearance and displayed states only; no authenticated workflow proof |
| S    | Approved disposable staging deployment with controlled accounts and records | Backend permissions, mutations, audit records and complete workflows  |
| P    | Approved staging provider test with controlled recipients and budgets       | Named provider acceptance; record handset delivery separately         |
| N    | Approved native test build on a named device/OS                             | That build's navigation, permissions and update behavior              |

**Never use production for these mutation, quota, failure or race tests.** Do not
send real SMS, place calls, transfer money, publish updates or upload identity
files without an approved test environment and controlled destination. Real
escrow is not implemented. Do not enable `AUTH_DEV_MODE` in production, use old
demo phone numbers as live recipients, or run the legacy whole-table reset.

The [offline manifest](../product/demo-seed-manifest.md) is a review plan, not
installed test data. Its 48 businesses include explicit onboarding/output gaps.
The test lead must approve isolation and account mapping before S/P tests exist.
Until then mark those cases **Blocked**, not passed using F screenshots.

## 2. Prepare a run

The test lead records the frontend build/commit, backend deployment, schema
revision, India date/time, service flags, dataset version/hash, browser/device,
locale, theme and tester. A second reviewer owns the final sign-off. Engineering
supplies approved accounts through secure channels; never put credentials,
phone numbers, tokens or personal documents in this file or an issue.

Use separate browser profiles for each actor. Give controlled records aliases:
`HH-A`, `HH-B`, `SHOP-A`, `SHOP-B`, `YARD-A`, `RECYCLER-A`, `MAKER-A`, `WORKER-A`,
`WORKER-B`, `ADMIN-A` and five separate applicant accounts. Include sufficient
unreserved stock, a competing listing, today/future/past jobs, safe watermarked
uploads, and application states. Record starting balances. Do not invent an admin
identity or edit a real user's record to get a test state.

Evidence codes below: **UI** = current screenshot or short recording;
**NET** = sanitised request/result and status, without cookies, tokens or payload
identities; **DB** = authorised before/after counts, integer values and audit
references; **FILE** = safe exported sample plus contents/hash; **DEVICE** = build,
OS and device result; **PROVIDER** = redacted provider event and controlled handset
observation. Evidence stays in restricted test storage. Save record aliases in
the report and keep their real-ID mapping separately.

Run public and access cases first, then onboarding, household/shop, chain trades,
Saathi, admin/reporting, and cross-platform checks. Retry a failed case on the
same build only after recording the original failure. After an ambiguous network
result, inspect the current record before retrying; booking creation does not
promise a universal replay/idempotency key.

## 3. Access and signup

| ID      | Role / lane                                              | Setup                                       | Steps                                                                                                          | Expected result                                                                                                              | Evidence          |
| ------- | -------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| ACC-01  | Visitor / L                                              | SMS and backend off                         | Open login; choose language; enter valid-format input; continue; edit number                                   | Labelled OTP preview opens; Verify/Resend cannot send or authenticate; private app remains guarded                           | UI, NET           |
| ACC-02  | Household/business/Saathi / S+P                          | Controlled number and approved OTP template | Request code; enter correct code; open permitted tracking/workspace; sign out                                  | Intended account/session only; correct destination; private reads stop after sign-out                                        | UI, NET           |
| ACC-03  | Applicant / S+P                                          | Separate test attempts                      | Try malformed phone/code, wrong code five times, expired five-minute code, and used code                       | Clear errors; no session from invalid attempts; new request follows limits                                                   | UI, NET, PROVIDER |
| ACC-04  | Applicant / S+P                                          | Reserved quota test window                  | Check 30-second resend delay, three sends/15 minutes, ten/day; check address limits with engineering           | Server enforces limits across sessions; failed/ambiguous sends consume quota; no automatic resend storm                      | NET, PROVIDER     |
| ACC-05  | All roles / S                                            | One session per role                        | Open another role's routes, signed-out app URL and admin URL; expire session with approved test controls       | Server/query guards deny private data; redirect or error is useful; URL editing grants no role                               | UI, NET           |
| ACC-06  | HH-B and unrelated org / S                               | HH-A booking and another org's trade/file   | Attempt read/action using the other controlled record's alias mapping                                          | Mutations and private reads denied. Tracking token may show its designed public view but never authorises cancellation       | NET, DB           |
| JOIN-01 | Five applicant kinds / S                                 | Fresh account for each kind                 | Choose role; consent; fill valid form; save; reload; resume                                                    | One owned draft per person; fields persist; correct role sections; no operational access before approval                     | UI, DB            |
| JOIN-02 | All applicants / S                                       | Editable drafts                             | Omit required fields; enter invalid dates/contact/GST/consent values; try another role's section; submit twice | Field/server validation agree; no invalid submission or duplicate version; entered valid values remain recoverable           | UI, NET, DB       |
| JOIN-03 | Business and Saathi / S                                  | Watermarked test PDF, image, video          | Upload valid files; try spoofed extension/MIME, oversize file, excess machine files and another owner's file   | Real type/ownership checks reject unsafe files. Limits: 10 MiB documents/images, 20 MiB machine video, ten machine files     | UI, NET, DB       |
| JOIN-04 | Applicant + admin / S                                    | Submitted version 1                         | Request changes with note; edit; resubmit; approve version 2                                                   | `draft→submitted→changes_requested→submitted→approved`; previous snapshot preserved; final role created once                 | UI, DB            |
| JOIN-05 | Applicant + admin / S                                    | Separate draft and submitted records        | Discard unsent draft; reject submitted application with reason; try editing either decision                    | Only unsubmitted version-zero draft is discardable; rejected record keeps reason; no self-service reopen                     | UI, DB            |
| JOIN-06 | Suspended applicant / F; approved guarded test state / S | Pre-approved test-state setup               | Inspect status and attempt workspace access                                                                    | Suspension view gives next step; operational access denied. No console suspend/reinstate button exists; do not fabricate one | UI, NET           |

## 4. Household recovery and shop operations

For calculation cases use synthetic rates of 1,200 paise/kg and 1,000 paise/kg.
Weigh 2,125 g and 3,500 g: total **6,050 paise**, **six points**. These are test
values, not market quotes. No real household payment is made during this test.

| ID      | Role / lane                | Setup                                 | Steps                                                                                                                                | Expected result                                                                                                                                | Evidence    |
| ------- | -------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| HH-01   | Household / S              | Empty sell draft                      | Add/remove mixed materials; use Back; reload same tab; reject empty, duplicate, zero and >500 kg items                               | Draft steps remain coherent; maximum 20 materials; units clear; invalid basket cannot book                                                     | UI          |
| HH-02   | Household / S              | Two active shops with known prices    | Compare offers with precise location; deny location; choose pickup/drop-off; change basket                                           | Eligible offers recalculate from rate/fallback tables; nearest with location, best quote without; AI sets no price                             | UI, DB      |
| HH-03   | Household / S+P            | Valid basket/shop/slot                | Verify phone then confirm; also test signed-in confirmation and rapid double-click                                                   | One UI submission produces one booking and private tracking link; pending action prevents repeated taps; draft is not labelled confirmed early | UI, NET, DB |
| HH-04   | Household / S              | Boundary dates and five open bookings | Try yesterday, beyond seven days, passed India-time slot, missing pickup address and sixth open booking                              | Invalid requests rejected; no extra record. Valid current/future slot works                                                                    | UI, DB      |
| HH-05   | Household + two shops / S  | Precise location; manual offers       | Decline first offer; separately let 15-minute offer expire; inspect next shop and stale first screen                                 | Eligible untried shop receives equal/higher quote; tracking shows reassignment; stale acceptance fails; no match/closed slot ends declined     | UI, DB      |
| HH-06   | Shop owner + household / S | Known radius and location             | Enable auto-accept; book in/out of radius; repeat with approximate location                                                          | Only eligible precise-location offer auto-accepts; others remain manual/ineligible; settings affect future offers                              | UI, DB      |
| HH-07   | Household + shop / S       | Requested, accepted, on-way examples  | Cancel own first two; try with HH-B and after Start trip                                                                             | Only owner cancels requested/accepted bookings; denied cases keep records unchanged; status history is consistent                              | UI, NET, DB |
| HH-08   | Household + shop / S       | Drop-off booking                      | Accept; inspect actions; complete measured receipt                                                                                   | Drop-off has no valid Start trip operation; accepted may complete directly; mode/date/address instructions remain correct                      | UI, DB      |
| HH-09   | Household / L+S            | Invalid token and completed booking   | Open bad token; inspect completed receipt; change shop price; revisit receipt                                                        | Safe not-found view; completed weights/rates/payment method/points stay frozen; no contact data leaks from invalid link                        | UI, DB      |
| SHOP-01 | Kabadiwala / S             | Assigned pending and accepted work    | Open New/Today/Done; inspect before/after acceptance; try unrelated shop                                                             | Phone/address withheld until acceptance; only assigned shop acts; counts and tabs update                                                       | UI, NET     |
| SHOP-02 | Kabadiwala / S             | Accepted pickup; calculation basket   | Start trip; weigh actual amounts; select cash/UPI record; complete; retry completion                                                 | One receipt, exact total/points and stock increase once; retry cannot duplicate effects; payment label is a record, not bank confirmation      | UI, DB      |
| SHOP-03 | Kabadiwala / S             | Editable weigh form                   | Try empty/negative/fractional-gram, excessive, inactive/recycled and no-price lines; test duplicate material input via engineer test | Invalid lines fail without stock change; valid duplicate lines aggregate once; cap is 30 inputs and 5,000,000 g per material                   | NET, DB     |
| SHOP-04 | Kabadiwala + admin / S     | Existing rate and receipt             | Save below-floor rate; save valid rate; raise floor above it; reread receipt                                                         | Below-floor fails; current rate lifts to floor when required; historical receipt unchanged; audit records change                               | UI, DB      |
| SHOP-05 | Kabadiwala / S             | Stock with open reservations          | Compare stock, sellable amount and value; lose network during action; reconnect                                                      | Only free stock can be listed; loading is not false zero; inspect committed state before retry; no offline write queue is claimed              | UI, DB      |

## 5. Chain trades and Saathi work

Run TRADE-01–03 using permitted active stock. Recycled outputs exist only for
PET flakes, HDPE granules, kraft and aluminium ingots. Textile onboarding and
normal glass/e-waste shop approval remain planning gaps. There is no processing
batch/conversion screen. Do not create fictional output to complete a test.

| ID       | Role / lane                              | Setup                                | Steps                                                                                                 | Expected result                                                                                                                                                | Evidence     |
| -------- | ---------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| TRADE-01 | Shop seller + yard buyer / S             | Free scrap and same-city businesses  | List; request partial quantity; accept; demo-pay; dispatch; confirm delivery                          | `requested→accepted→paid_to_escrow→dispatched→completed`; available listing falls on accept; seller stock falls on dispatch; buyer stock rises on confirmation | UI, DB       |
| TRADE-02 | Yard seller + recycler buyer / S         | Scrap stock                          | Repeat full sequence; compare both trade lists and stock                                              | Correct next-chain supplier visibility; exact grams/paise; both parties agree; sorting outside app adds no invented production record                          | UI, DB       |
| TRADE-03 | Recycler seller + manufacturer buyer / S | Approved recycled-output stock       | Repeat sequence; filter scrap/output; inspect manufacturer navigation                                 | Manufacturer buys recycled output from recycler; wrong stage/role rejected; manufacturer has no onward seller role                                             | UI, DB       |
| TRADE-04 | Seller + two buyers / S                  | Same listing in two profiles         | Compete for more than remaining quantity; seller accepts; repeat a stale action                       | No over-allocation or negative stock; sold listing closes; pending competing requests decline when fully sold; stale step fails                                | NET, DB      |
| TRADE-05 | Seller/buyer/outsider / S                | New listing and requested trade      | Withdraw listing; decline request; try own-listing purchase, wrong-city/role access and skipped steps | Correct terminal state; reservations released as applicable; participant/role checks deny invalid action; no fake escrow transfer                              | UI, DB       |
| TRADE-06 | Both parties / S                         | Paid trade                           | Open invoice route; print; compare line, parties, number and total; repeat pay                        | Stable numbered printable trade receipt; one number; not a GST tax invoice; outsider cannot read it                                                            | UI, FILE, DB |
| TRADE-07 | Buyer/seller / S                         | Synthetic totals at/above ₹50,000    | Inspect transport note and simulate connection loss after dispatch                                    | App threshold hint appears above threshold; it is not legal clearance. Reconnect shows one dispatch; no second stock decrement                                 | UI, DB       |
| WORK-01  | Saathi / S                               | Four job types, date/city variants   | Browse open/today/upcoming; vary date, city, area and poster status                                   | Current/future open jobs from active same-city businesses, or team jobs, appear; own area first. No work-type/availability matching is claimed                 | UI, NET      |
| WORK-02  | Two Saathis / S                          | One open job                         | Take simultaneously; attempt second job in same assigned time window                                  | One assignee; loser sees taken state; conflicting slot rejected; no duplicate assignment                                                                       | UI, DB       |
| WORK-03  | Saathi / S                               | Own today/future job and other's job | Finish today's job; repeat; try future/other job                                                      | Own job completes on/after its date once; future and other's work rejected; no payment transfer implied                                                        | UI, DB       |
| WORK-04  | Saathi / F+S                             | Known completed jobs, empty worker   | Compare weekly/total/by-kind earnings and recent list; check empty state                              | Totals derive from completed jobs; pending work excluded; period boundaries use India time; no invented wages or withdrawal control                            | UI, DB for S |

## 6. Admin, reporting and exports

Reads are bounded: support shows 200 records; verification lists 200; job reads
use 500 and show 20 recent completions; impact reads use 2,000 and compliance
shows 50 receipts. Reconcile the same scope, not an assumed unlimited history.

| ID     | Role / lane                  | Setup                                               | Steps                                                                                                           | Expected result                                                                                                                                      | Evidence                |
| ------ | ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| ADM-01 | Authorised admin / S         | Disposable backend with setup permission            | Complete setup; interrupt/resume; enable TOTP; store backup codes securely; retry setup                         | Single authorised admin; setup resumes safely; console requires completed 2FA; no secrets in screenshots                                             | UI without secrets, NET |
| ADM-02 | Admin / S                    | TOTP and controlled recovery code                   | Test password/TOTP failure, three/10-second limit, one recovery code twice, logout and 12-hour expiry           | Correct challenge/limits; recovery code single-use; expired/logged-out console cannot read or mutate                                                 | NET                     |
| ADM-03 | Admin / S                    | Submitted applications aged 17/18/24 hours          | Review queue; tick role checklist; approve, request changes, reject; test short/long notes and competing review | Due-soon at 18h, overdue at 24h; only submitted applications decide; required trimmed note 5–1,000 characters; role creation/audit once              | UI, DB                  |
| ADM-04 | Applicant/admin/outsider / S | Safe owned files                                    | Preview image/PDF; load video explicitly; open/download; sign out; repeat as outsider; induce network error     | Authorised requests succeed; unauthenticated 401, unauthorised 403, missing 404; `private, no-store`; retry useful; no raw public storage link       | UI, NET, FILE           |
| ADM-05 | Admin / S                    | Approved sample price rows                          | Save positive minimum/fallback; try minimum above fallback, >₹10,000 and >2 decimals; Undo; add missing names   | Row validation works; Undo discards unsaved edit only; name repair preserves existing names/prices; no bulk destructive change                       | UI, DB                  |
| ADM-06 | Visitor + admin / S          | Controlled help/solar enquiry                       | Submit valid/invalid forms; inspect Open/All; cancel telephone handler; mark answered                           | Valid enquiry saved once per submission; invalid fields rejected; Answered updates status only, sends nothing; no reply/reopen/delete tool promised  | UI, DB                  |
| REP-01 | Admin / F+S                  | Known period records; bounded large fixture         | Compare Today/7/30/pilot ranges, empty data and >1,000 rows                                                     | India-time range shown; max 31 days; current outcomes selected by booking/latest-submission date; partial warning; charts agree with tables          | UI, DB for S            |
| REP-02 | Each business / S            | Completed and incomplete trades; consent boundaries | Check impact, financial-year EPR and consent at expired/89/90 days                                              | Totals use intended completed records; 90-day warning behavior matches code; no issued credits/certificates implied; renewal date copy is consistent | UI, DB                  |
| REP-03 | Visitor / S                  | Current catalogue                                   | Download Standards CSV; open it; compare codes/names and quoting                                                | 26 current codes, correct fields/escaping and safe filename; no private records in public export                                                     | FILE                    |
| REP-04 | Admin/business / F+S         | Reports and receipt views                           | Inspect export affordances and zero/partial states                                                              | Receipt printing and public codes CSV exist; admin pilot CSV/PDF export does not. Demo rows in reports are identified as non-production evidence     | UI                      |

## 7. Presentation, privacy, providers and native apps

Apply UX cases to every changed route template, including all role-help pages
and articles. Follow the [UI contract](../design/designer-system.md#current-ui-contract).
Use actual loaded fonts; a CSS family string or passing scroll-width assertion
is insufficient visual evidence.

| ID     | Role / lane                       | Setup                                          | Steps                                                                                                                         | Expected result                                                                                                                                                   | Evidence                    |
| ------ | --------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| UX-01  | All roles / L+F                   | 33 registry locales                            | Visit public route templates and each role fixture; switch language; inspect headings/materials/settings                      | Complete localised copy/endonyms, preserved route, correct glyphs; admin remains English; native-language review recorded separately                              | UI, locale checklist        |
| UX-02  | Visitor/all roles / L+F           | 320/390/640/768/1024/1280/1440px; short height | Inspect header, menus, forms, tables, sticky controls and page bottom                                                         | Header one row; below1280 controls in menu; phone mark only; settings reachable; single-line actions fit; no overlap/clipping/page overflow                       | UI, bounds report           |
| UX-03  | All roles / L+F                   | Light/dark/system, Arabic/Urdu                 | Toggle theme; reload; inspect focus, chart labels, files and RTL drawers/arrows                                               | Stable first paint, readable contrast, logical alignment and direction; chosen theme persists; no green-wash/card regression                                      | UI                          |
| UX-04  | Household/operators / L+S         | Native digits; comma/dot locales               | Enter 2.125 kg and 12.50 rupees using supported digit/separator forms; try grouping and excess precision                      | Operator fields: exact 2,125 g/1,250 paise; household estimate: 2.1 kg after 0.1-kg rounding. Invalid formats fail; exact operator fields reject excess precision | UI, DB for S                |
| UX-05  | Keyboard/screen-reader user / L+F | Zoom/large text, keyboard only                 | Complete menus/forms/dialogs; Escape; return focus; inspect labels/errors and table/chart equivalents                         | Named controls, visible focus, reachable content, sensible order, no traps; meaningful error announcements and usable targets                                     | UI, reader notes            |
| UX-06  | Motion-sensitive user / L+F       | Fine pointer, touch, reduced motion            | Hover/focus logo; pause marquee; change motion preference mid-animation; inspect banner crops                                 | Mark turns once; wordmark still; decorative motion stops; static reduced-motion content; images loaded and text readable                                          | UI                          |
| SVC-01 | Household / L+S                   | Offline/slow network/provider unavailable      | Disconnect during browsing and a controlled write; reconnect; inspect saved state before retry                                | Useful retry/error; no false completion or offline queue; manual entry remains available; no sample live-price fallback                                           | UI, NET, DB                 |
| SVC-02 | Household / S+P                   | Approved AI endpoint and cost limit            | Test clear/dark/distant/non-scrap image; edit suggestions; hit device/deployment quota; simulate malformed response/timeout   | Safe result or retake/error; no invented material/price; manual flow works; no stored photo/output; quota applies                                                 | NET, PROVIDER               |
| SVC-03 | Household/applicant/shop / S+P    | Approved templates; controlled recipients      | Trigger each of eight supported events once; repeat same event; test missing locale/config, stale event, failure/timeout      | Deduped outbox; disabled events not replayed; rate cap20/day; no automatic retry; accepted vs handset-delivered recorded separately                               | DB, PROVIDER                |
| SVC-04 | Visitor / L; provider receipt P   | Analytics test configuration                   | Decline/allow/withdraw; visit public then private routes; test blocked storage and another tab                                | Consent governs analytics; only allowlisted public paths; no query/token/form leakage; one page view; flag-off disables transport                                 | NET, PROVIDER when approved |
| SVC-05 | Admin/test engineer / S+P         | Controlled error and private-file sample       | Trigger safe browser/server error; inspect redacted payload; compare public HTML/cache to private responses                   | Sentry independent of analytics consent; no identifying details; private data never shared-cached; static public shell works without JS                           | NET, PROVIDER               |
| SVC-06 | Engineer + test lead / S          | Disposable workload and backup                 | Run one, three, then five read sessions at one request/s/session, maximum two minutes/step; restore backup to separate target | Record latency/errors, stop on limits/errors or >2× baseline; restore reconciles counts; no production write load or reset                                        | NET, DB                     |
| NAT-01 | All mobile roles / N+S            | Android/iOS test builds                        | Login/logout; camera/upload/location deny/allow; Android Back; external links; offline recovery                               | Correct trusted origin/role; no unsafe navigation; permission denial recoverable; private-file browser handoff honest                                             | DEVICE, UI                  |
| NAT-02 | Mobile tester / N                 | Signed preview channel, prior install          | Check none/available/failed update; download; choose Later; then Restart; test invalid signature/runtime                      | Current/ready/failed accurate; Later preserves form; restart requires choice; invalid update not applied; rollback path tested                                    | DEVICE                      |
| NAT-03 | Desktop tester / N+S              | Signed macOS/Windows prior install/feed        | Repeat check/later/restart; invalid feed/signature; private file; native menu locale/RTL                                      | Shell remains usable; trusted update only; session survives supported upgrade; unconfigured/unsigned state not called current production                          | DEVICE, NET                 |

## 8. Run sheet, defects and sign-off

Copy one row per case and per distinct locale/device variant. Status values are
**Not run / Pass / Fail / Blocked / Not applicable**. “Not applicable” needs a
reason and reviewer. A blocked API is not a failed UI, but it prevents live-flow
acceptance. F passes never fill S/P result cells.

| Run/build       | Case + variant            | Lane/role/data alias | Tester/time    | Result/actual behavior | Evidence/defect | Retest/reviewer |
| --------------- | ------------------------- | -------------------- | -------------- | ---------------------- | --------------- | --------------- |
| Fill before run | e.g. HH-05 / kn / Android | S / SHOP-A           | Name + IST/UTC | Not run                | Restricted link | Pending         |

Use **P0** for data exposure, auth bypass, destructive loss or real unintended
sends; stop the run and contain the environment. **P1** blocks a core task or
breaks ledger correctness. **P2** has a safe workaround or material usability
failure. **P3** is minor polish. Record expected/actual, minimal reproduction,
first affected build, evidence, owner, severity and a retest result. Never put
secrets in the bug title or attachment. Severity is separate from scheduling.

Sign-off requires: named test lead; all applicable core S cases passed; no open
P0/P1; reconciled stock/receipt/audit evidence; required P/N gates completed or
explicitly excluded from launch scope; native-language review for launch locales;
and current guide screenshots/DOCX visual review. Product, engineering and
operations each record a decision, date, exceptions and rollback owner. Hosted
CI, deployment, live provider acceptance and store approval remain separate
proof fields. Do not replace them with a local test count.

Until configured, block live OTP, status SMS, optional AI, provider telemetry
receipt, private backend workflows and signed-update delivery as applicable.
Real escrow, credit issuance, textile completion, processing batches, admin
suspension/staff tools and report exports are unimplemented scope, not tests to
“pass” by adding keys. See the launch and native release checklists before
unblocking. Do not borrow production secrets for convenience.

Source checks: `convex/lib/{chain,lifecycle,households,review}.ts`,
`convex/{households,shop,dispatch,market,saathi,review,applicationFiles,files,adminPrices,support,pilot,insights}.ts`,
`src/lib/number-input.ts`, the locale registry, provider runbooks and native update
modules. If code changes a status or limit, update the affected case and user guide
together; do not silently follow older prototype reset/login instructions.
