# Team end-to-end test manual

Use this manual to run the platform tests with your team. Automated local test
evidence is recorded separately in the [current release record](../delivery/handoff.md).
Read that record for the candidate, completed checks, known issues and deployment
status. Local tests do not prove provider delivery or live payment execution.

This is not a pass for every manual/provider case. Each teammate must record
their own result. The [Saturday plan](launch-2026-10-10.md) owns the schedule,
participant roster and release decision. Older demo-payment and next-role-only
expectations remain superseded.

Read the [user guide](../user-guide/guide.md) for screen instructions and the
[launch checklist](../operations/launch-checklist.md) for account gates. These
cases do not report a deployment, external send or successful provider test.

Source checks include the auth HTTP handler and Convex adapter, chain/lifecycle,
household, shop, market, application, workspace, private-file, inbox, push,
reporting and native modules. Check each limit against the candidate under test.
Update this source and the affected guide sections when behavior changes. Do
not follow the old prototype fixed-code login or whole-table reset instructions.

## First run for two new teammates

Keep the maintained platform Google Doc open beside the app. Chapter 01 explains
the first ten minutes and screen controls. Chapter 40 contains the complete
two-person walkthrough, a measured PET exercise and a result template. This
manual adds the detailed acceptance cases. Read the expected result before
clicking. Check the saved record after clicking. A success message alone does
not prove persistence or an external delivery.

The test lead supplies the candidate address, release identifier, dataset version,
account aliases and restricted credentials annex. The local address
`http://localhost:3100` works on the Mac running the test services. A teammate on
another machine needs the owner's deployed test address; that machine's
`localhost` is not this Mac. Do not open a public tunnel to the private inbox.
Passwords, codes and invitation links belong in the restricted handoff only.

Use two separate browser profiles. **Tester A** owns household, kabadiwala and
workspace-owner actions. **Tester B** owns preprocessor, recycler, manufacturer,
Saathi and viewer actions. Change an actor with **Sign out**, then sign in as the
next assigned alias. The owner or an explicitly authorised tester runs platform
admin cases. Do not share the platform-admin authenticator.

| Order | What to open and do                                                                                                                                                                       | Cases to record                                                     | Stop and check                                                                                        |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1     | Both: read Home, Prices, Participants, Standards and Help. Follow one help guide. Change language and theme.                                                                              | Presentation cases in section 7                                     | No private data. Sample prices are labelled. Controls remain usable.                                  |
| 2     | Both: open /login, choose Email and use an existing verified test account. Open Account security and Notifications; reload.                                                               | ACC-05, EMAIL-01 existing-account portion, inbox cases in section 8 | Full sign-in, correct identity, no unexpected login loop or unavailable inbox.                        |
| 3     | A: select the shop workspace. B: use its viewer account. Read the same permitted records and try a denied write through the UI.                                                           | TEAM-04, TEAM-05                                                    | Viewer actions stay read-only. Do not change a role to bypass a denial.                               |
| 4     | A: book as the assigned household phone user. Then sign in as the assigned shop. B: follow the private tracking link. Accept, start the pickup, weigh and complete the synthetic receipt. | HH-01–04, HH-09, SHOP-01–03                                         | One booking, exact receipt and one stock change; no real money sent.                                  |
| 5     | A: list available shop material. B: request it as the approved buyer. A: accept. Both: inspect Trades and the unavailable payment boundary.                                               | TRADE-01–03                                                         | Same grams/paise on both sides. No off-platform paid override or payment-dependent movement.          |
| 6     | A and B: run chapter 40's 1000 g PET lot, 900 g output and measured receipt exercise.                                                                                                     | PET cases in the launch plan                                        | Correct mass balance and custody; lot evidence does not change stock or create a certificate.         |
| 7     | A: invite the exact test email as Viewer. B: accept with that verified identity. A: remove the membership after the test.                                                                 | TEAM-01–05                                                          | One-use invitation, wrong-account denial, immediate permission enforcement and last-owner protection. |
| 8     | Both: sign in as every assigned participant in the roster. Open the role page or application status, security and inbox.                                                                  | JOIN-01–06 and observer cases in the launch plan                    | Missing specialised UI is recorded Blocked; stakeholder approval grants no blanket business data.     |
| 9     | Authorised admin tester: inspect an assigned application, sample price, period report and support item.                                                                                   | Admin cases in section 6                                            | Correct decision and reason, period and units; permission on private documents.                       |
| 10    | Both: repeat affected controls on a phone width, dark mode and an assigned translated language. Sign out and reopen a private route.                                                      | Presentation and ACC-05                                             | Readable labels, visible focus, correct tab/list change and no remaining private access.              |

Use a fresh named record for each case that creates or completes work. The test
lead supplies the exact starting balance, material and rate. Do not replace the
test values with live prices. For the chapter 40 training lot, enter whole grams:
1000 input = 900 output + 50 contamination + 50 process loss. That is a synthetic
balance exercise, not a certified PET yield or buyer specification.

For phone signup, verification, reset and invitations, the lead supplies the
guarded local inbox procedure. Do not guess a code. If the procedure is absent,
mark that delivery step **Blocked** and continue with the assigned verified email
accounts. Never make an account in production just to complete a local case.

### A daily test routine

1. Confirm the candidate, environment and known issues with the test lead.
2. Sign in to the assigned account and check its selected workspace. Record
   starting stock, open orders and the aliases of records to be used.
3. Run public navigation, sign-in, security and inbox first. If these fail,
   record the failure before attempting dependent workflows.
4. One tester changes a record; the other reads the result. Switch roles only
   after saving the result row. Keep separate sessions for the two actors.
5. For an uncertain network result, inspect the current record before retrying.
   Do not submit repeatedly or remove the record to hide a failed attempt.
6. At the end, save results and safe screenshots, list created record aliases,
   report blockers, and sign out of both browser profiles.
7. After a fix, record the fix identifier and retest the same case. Keep the
   original failure. Check the neighbouring step and permission boundary too.

The owner records when a fresh dataset or approved scoped reset is required.
Teammates must not delete tables, users, files or historical receipts. A browser
reload is not a data reset. Completed test records remain evidence until the
test lead archives or resets them through the approved procedure.

## 1. Choose the evidence lane

| Lane | Environment                                                                        | What a pass proves                                                                                 |
| ---- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| L    | Disconnected local build; optional services off (L0 in the launch plan)            | Public rendering, navigation, validation and unavailable states                                    |
| F    | Labelled isolated component fixtures; writes reject                                | Appearance and displayed states only; no authenticated workflow proof                              |
| S    | Isolated local connected acceptance (L1): Next.js 3100, anonymous Convex 3210/3211 | Actual handler/adapter, permissions, persistence and permitted workflows on the recorded candidate |
| P    | Later, separately approved external-provider environment (P1)                      | Named provider behavior; record email/handset receipt or settlement separately                     |
| N    | Approved native build on a named device/OS                                         | That build's navigation, permissions and update behavior                                           |

The legacy letter S now means local connected acceptance in this manual. It
does not authorize a cloud staging fallback. Both cloud Convex deployments were
verified empty and paused on 6 October. Preserve their recovery exports.

Local tests use synthetic identities and local-only email/phone verification.
Keep live Resend, MSG91 and gateway keys absent. Reject cloud origins and targets
for every development verification path, including `AUTH_DEV_MODE`. Never expose
the local inbox through a public tunnel or run the legacy whole-table reset.
A local component failure is BLOCKED until fixed; F captures cannot fill S cells.

Where a case says S+P, record separate local and provider results. Run the S
portion now; keep external delivery NOT RUN or BLOCKED until its separate gate
is ready. Resend requires a verified sender for normal email verification,
recovery and invites. MSG91 live OTP requires account and DLT/template proof.
Better Auth runs on Convex and needs no separate service account.

B2B payment-dependent dispatch, completion, settlement and paid receipt claims
stay blocked until the selected Cashfree Payment Gateway with Easy Split
supplies verified events. Sandbox and live checkout, webhook handling and the financial lifecycle are
implemented and passed local production-build acceptance; real provider acceptance and live activation remain pending. Request
account-manager enablement for recycling-material marketplace trades, complete
vendor KYC, and verify payments, splits, payouts and refunds. Selection does not
prove eligibility, approval or settlement. An uploaded reference, manual paid flag or simulated escrow cannot unlock them. The
kabadiwala pays household funds directly; Luma only records that household receipt.

The [offline manifest](../product/demo-seed-manifest.md) is a historical review
plan, not installed data. Use the current launch plan's complete roster and
scoped local fixture manifest. Missing participant screens stay BLOCKED; do
not reduce scope to the old five business/applicant kinds.

## 2. Prepare a run

The test lead records the frontend build/commit, backend deployment, schema
revision, India date/time, service flags, dataset version/hash, browser/device,
locale, theme and tester. A second reviewer owns the final sign-off. Engineering
supplies approved accounts through secure channels; never put credentials,
passwords, codes, tokens or personal documents in this file or an issue.
The restricted credentials annex stays outside Git and the shared guide. Use
reserved `.test` emails and synthetic phone fixtures; inspect local delivery
and network evidence to confirm no email or SMS leaves the machine.

Test the combined candidate in the isolated local backend. First prove auth
handler/adapter behavior, session reload, component persistence after restart
and private storage. Review all integrated changes before cloud reactivation.
The approved implementation can proceed; cloud deployment and provider results
remain separate evidence gates.

Use separate browser profiles for each actor. Give controlled records aliases:
`HH-A`, `HH-B`, `SHOP-A`, `SHOP-B`, `YARD-A`, `RECYCLER-A`, `MAKER-A`, `WORKER-A`,
`WORKER-B` and `ADMIN-A`, plus every current participant and subtype in the launch
plan. Add owner/admin/member/viewer, two organisations, revoked users and invited
users. Include sufficient unreserved stock, a competing listing, today/future/past jobs, safe watermarked
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

For the first sign-in screen, search by a language's native or English name,
select its row, check the current-choice label, then select Continue. Check light
and dark mode, keyboard selection, an empty search result and a narrow phone.
Selecting a row alone must not navigate or mark the language step complete.

| ID      | Role / lane                                              | Setup                                                              | Steps                                                                                                            | Expected result                                                                                                                                                       | Evidence                |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| ACC-01  | Visitor / L                                              | Email, SMS and backend off                                         | Open login/signup; select language and either method; enter valid-format input                                   | Honest unavailable state; any labelled preview cannot send, verify or grant private access                                                                            | UI, NET                 |
| ACC-02  | Household/business/Saathi / S; P later                   | Local synthetic phone; provider test needs approved MSG91 template | Request local code; verify; open permitted workspace/tracking; reload; sign out. Repeat delivery separately in P | Correct account/session and destination; private reads stop after sign-out; local delivery sends no SMS                                                               | UI, NET; PROVIDER for P |
| ACC-03  | Applicant / S; P later                                   | Separate local attempts; controlled provider case later            | Try malformed phone/code, five wrong attempts, expired five-minute code and used code                            | Errors without a session; server limits enforced. Confirm current configured limits against candidate                                                                 | UI, NET; PROVIDER for P |
| ACC-04  | Applicant / S; P later                                   | Isolated quota-test window                                         | Check 30-second resend delay, three sends/15 minutes, ten/day and address limits against candidate               | Limits hold across profiles; failed/ambiguous sends consume quota; no resend storm or local external send                                                             | NET; PROVIDER for P     |
| ACC-05  | All roles / S                                            | One session per role                                               | Open other-role and signed-out routes; fail then retry sign-out; expire session with approved test controls      | Server/query guards deny private data; failed sign-out stays on the page and allows retry; URL editing grants no role                                                 | UI, NET                 |
| ACC-06  | HH-B and unrelated org / S                               | HH-A booking and another org's trade/file                          | Attempt read/action using the other controlled record's alias mapping                                            | Mutations and private reads denied. Tracking token may show its designed public view but never authorises cancellation                                                | NET, DB                 |
| JOIN-01 | Every applicable applicant kind / S                      | Separate account for each approved kind/subtype                    | Choose role; consent; fill valid form; save; reload; resume                                                      | One owned draft; valid fields persist; correct sections; no operations before approval; missing role UI recorded BLOCKED                                              | UI, DB                  |
| JOIN-02 | All applicants / S                                       | Editable drafts                                                    | Omit required fields; enter invalid dates/contact/GST/consent values; try another role's section; submit twice   | Field/server validation agree; no invalid submission or duplicate version; entered valid values remain recoverable                                                    | UI, NET, DB             |
| JOIN-03 | Business and Saathi / S                                  | Watermarked test PDF, image, video                                 | Upload valid files; try spoofed extension/MIME, oversize file, excess machine files and another owner's file     | Failed removal keeps the file and shows an error. Type/ownership checks reject unsafe files. Limits: 10 MiB documents/images, 20 MiB machine video, ten machine files | UI, NET, DB             |
| JOIN-04 | Applicant + admin / S                                    | Submitted version 1                                                | Request changes with note; edit; resubmit; approve version 2                                                     | `draft→submitted→changes_requested→submitted→approved`; previous snapshot preserved; final role created once                                                          | UI, DB                  |
| JOIN-05 | Applicant + admin / S                                    | Separate draft and submitted records                               | Fail then retry draft discard; reject submitted application; try editing either decision                         | Failed discard keeps draft and dialog; only version-zero draft discards; rejection keeps reason; no self-service reopen                                               | UI, DB                  |
| JOIN-06 | Suspended applicant / F; approved guarded test state / S | Pre-approved test-state setup                                      | Inspect status and attempt workspace access                                                                      | Suspension view gives next step; operational access denied. No console suspend/reinstate button exists; do not fabricate one                                          | UI, NET                 |

### Email accounts, workspace roles and invitations

These cases supplement the launch plan's AUTH and TEAM cases. They require real
local HTTP-handler/Convex-adapter and browser evidence. They are not completed.

| ID         | Role / lane                         | Setup                                                       | Steps                                                                                                                             | Expected result                                                                                                                              | Evidence                    |
| ---------- | ----------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| EMAIL-01   | New normal user / S                 | Reserved test email; unique private password                | Sign up; attempt private read before verification; verify through local inbox; sign in; reload; sign out                          | No private access before verification; correct persistent account afterward; signed-out read denied; no external mail                        | UI without secrets, NET, DB |
| EMAIL-02   | Normal user / S                     | Wrong, expired, reused and duplicate inputs                 | Test verification/resend limits, duplicate signup, unknown email and wrong password                                               | Invalid proof grants nothing; no duplicate identity, silent merge or account enumeration; safe retry                                         | NET, DB                     |
| EMAIL-03   | Normal email user / S               | Local recovery messages                                     | Reset with valid link; retry used/expired/tampered link; test old password and sessions                                           | One-use verified reset; documented session revocation; no phone-only password creation or admin-factor bypass                                | UI without secrets, NET     |
| TEAM-01    | Owner/permitted admin + invitee / S | Each permitted workspace role                               | Invite verified email; view organisation and role; accept; reload                                                                 | One membership with allowed permissions and an audit event; no implicit platform-admin membership                                            | UI, NET, DB                 |
| TEAM-02    | Phone-only or existing user / S     | Matching and wrong-email invites                            | Try a mismatched identity; use Switch account and sign in with the separately verified invited email                              | Wrong identity denied; one grant to the invited verified email; no account merge, typed-email grant or movement of phone records             | NET, DB                     |
| TEAM-RETRY | Invited email user / S              | Valid invitation; test lead can fail one auth-token request | Open invitation; cause one token request failure; select Try again; verify role and email; accept once; repeat with wrong account | Recoverable error replaces indefinite loading; invitation rechecked after retry; wrong account denied; no token persisted in browser storage | UI without link, NET, DB    |
| TEAM-03    | Invitee / S                         | Expired, revoked, used and valid invite                     | Reject invalid cases; race two tabs on valid acceptance                                                                           | Exactly one membership grant; safe return URL; no duplicate grant from replay                                                                | NET, DB                     |
| TEAM-04    | Owner/admin/member/viewer / S       | Approved capability matrix; two organisations               | Try each allowed and denied read/write/export/file action; change route, ID and payload                                           | Server enforces every capability and organisation boundary; viewer writes and self-promotion denied                                          | UI, NET, DB                 |
| TEAM-05    | Active and revoked members / S      | Two browser profiles; last-owner fixture                    | Revoke/demote while open; switch workspace; race role changes; try removing last owner                                            | Current membership applies to subsequent operations/subscriptions; last-owner rule holds; each change audited                                | UI, NET, DB                 |
| LOCAL-01   | Test engineer / S                   | Local verification settings; cloud/production origin probes | Try missing guard, public origin, cloud target and browser-only flag; inspect sanitized network/logs                              | Every non-local verification request denied; no outbound email/SMS or leaked secret; no cloud fallback                                       | NET                         |

## 4. Household recovery and shop operations

On a connected deployment with the approved price-only seed, verify that public
prices and home price summaries show the stored values with a visible sample-price
notice. They must not claim to be verified market quotes. With no connection or
no stored prices, verify the unavailable or empty state; during a read, verify
the loading state. A failed read must not substitute sample prices in the browser.

For calculation cases use synthetic rates of 1,200 paise/kg and 1,000 paise/kg.
Weigh 2,125 g and 3,500 g: total **6,050 paise**, **six points**. These are test
values, not market quotes. No real household payment is made during this test.
In actual use the kabadiwala pays the household directly; Luma records the
receipt and does not collect or send household funds.

| ID      | Role / lane                | Setup                                       | Steps                                                                                                                                | Expected result                                                                                                                                        | Evidence    |
| ------- | -------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| HH-01   | Household / S              | Empty sell draft                            | Add/remove mixed materials; use Back; reload same tab; reject empty, duplicate, zero and >500 kg items                               | Draft steps remain coherent; maximum 20 materials; units clear; invalid basket cannot book                                                             | UI          |
| HH-02   | Household / S              | Two active shops with known prices          | Compare offers with precise location; deny location; choose pickup/drop-off; change basket                                           | Eligible offers recalculate from rate/fallback tables; nearest with location, best quote without; AI sets no price                                     | UI, DB      |
| HH-03   | Household / S; P later     | Valid basket/shop/slot and verified account | Sign in by either method; verify phone if required for booking; test local challenge and rapid double-click                          | Email ownership alone does not prove phone ownership; required phone proof and owner checks pass before one booking; pending action blocks repeat taps | UI, NET, DB |
| HH-04   | Household / S              | Boundary dates and five open bookings       | Try yesterday, beyond seven days, passed India-time slot, missing pickup address and sixth open booking                              | Invalid requests rejected; no extra record. Valid current/future slot works                                                                            | UI, DB      |
| HH-05   | Household + two shops / S  | Precise location; manual offers             | Decline first offer; separately let 15-minute offer expire; inspect next shop and stale first screen                                 | Eligible untried shop receives equal/higher quote; tracking shows reassignment; stale acceptance fails; no match/closed slot ends declined             | UI, DB      |
| HH-06   | Shop owner + household / S | Known radius and location                   | Enable auto-accept; book in/out of radius; repeat with approximate location                                                          | Only eligible precise-location offer auto-accepts; others remain manual/ineligible; settings affect future offers                                      | UI, DB      |
| HH-07   | Household + shop / S       | Requested, accepted, on-way examples        | Cancel own first two; try with HH-B and after Start trip                                                                             | Only owner cancels requested/accepted bookings; denied cases keep records unchanged; status history is consistent                                      | UI, NET, DB |
| HH-08   | Household + shop / S       | Drop-off booking                            | Accept; inspect actions; complete measured receipt                                                                                   | Drop-off has no valid Start trip operation; accepted may complete directly; mode/date/address instructions remain correct                              | UI, DB      |
| HH-09   | Household / L+S            | Invalid token and completed booking         | Open bad token; inspect completed receipt; change shop price; revisit receipt                                                        | Safe not-found view; completed weights/rates/payment method/points stay frozen; no contact data leaks from invalid link                                | UI, DB      |
| SHOP-01 | Kabadiwala / S             | Assigned pending and accepted work          | Open New/Today/Done; inspect before/after acceptance; try unrelated shop                                                             | Phone/address withheld until acceptance; only assigned shop acts; counts and tabs update                                                               | UI, NET     |
| SHOP-02 | Kabadiwala / S             | Accepted pickup; calculation basket         | Start trip; weigh actual amounts; select cash/UPI record; complete; retry completion                                                 | One receipt, exact total/points and stock increase once; retry cannot duplicate effects; payment label is a record, not bank confirmation              | UI, DB      |
| SHOP-03 | Kabadiwala / S             | Editable weigh form                         | Try empty/negative/fractional-gram, excessive, inactive/recycled and no-price lines; test duplicate material input via engineer test | Invalid lines fail without stock change; valid duplicate lines aggregate once; cap is 30 inputs and 5,000,000 g per material                           | NET, DB     |
| SHOP-04 | Kabadiwala + admin / S     | Existing rate and receipt                   | Save below-floor rate; save valid rate; raise floor above it; reread receipt                                                         | Below-floor fails; current rate lifts to floor when required; historical receipt unchanged; audit records change                                       | UI, DB      |
| SHOP-05 | Kabadiwala / S             | Stock with open reservations                | Compare stock, sellable amount and value; lose network during action; reconnect                                                      | Only free stock can be listed; loading is not false zero; inspect committed state before retry; no offline write queue is claimed                      | UI, DB      |

## 5. Chain trades and Saathi work

Run TRADE-01–03 using permitted active stock and the current material registry.
Check subtype, processing and output screens against the candidate. Missing
capabilities stay BLOCKED; do not create fictional stock or process yield. PET
custody/quality evidence does not itself create inventory, payment or certificates.
Cashfree is selected. The financial lifecycle is source-implemented and
focused-tested and included in the passing 50-case local production-build suite; real provider acceptance and live activation remain pending. Local tests
must prove that payment-dependent actions stay blocked.
Keep later gateway dispatch, receipt, settlement and replay cases in the run log.

### Manufacturer byproduct exercise

Assign Tester A the manufacturer seller and Tester B the approved kabadiwala
buyer, then repeat the read-only checks with the workspace viewer. Use the
audited local test materials only: **LOCAL-PAPER-BYPRODUCT**, displayed as
**Local test paper offcuts**, and **LOCAL-PAPER-UNCLASSIFIED**, displayed as
**Local test unclassified paper**. Their presence on the local public price
board does not make them production materials or verified market quotes.

1. Record the manufacturer's starting on-hand, reserved and available grams.
   Open /app/sell. The eligible offcuts must be selectable. The unclassified
   negative control must not be offered as a valid manufacturer byproduct.
2. Enter **1 kg** and **₹12.50/kg**, then select **Put on sale** once. Confirm
   the saved listing and material code. Do not change a production classifier.
3. The buyer opens /app/market through **Buy**. Select that listing, request
   **1 kg**, and verify **₹12.50** total, exactly **1250 paise**.
4. The manufacturer opens /app/trades, selects **Selling**, and accepts the
   assigned order. The kabadiwala selects **Buying** to read the same order.
5. Both sides must show the gateway-required state. On-hand inventory must
   not decrease. Confirm the expected reservation separately. No paid receipt,
   payment, dispatch or completion is allowed without verified gateway events.
6. The viewer repeats the route reads. **Buy**, **Put on sale**, **Withdraw**
   and **Accept** must not grant a write. The engineer also checks direct
   request denial; hiding a button alone does not pass authorization.

Record this as **BYPRODUCT-01** for the valid flow and **BYPRODUCT-02** for
unclassified/viewer denial. Repeat the eligibility check with each approved
buyer type that handles the material. Do not infer same-city matching, hazardous
waste approval, settlement or transport service from a visible listing.

| ID       | Role / lane                                       | Setup                                                                        | Steps                                                                                                                                               | Expected result                                                                                                                                                                                             | Evidence                |
| -------- | ------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| TRADE-01 | Shop seller + preprocessor buyer / S; P later     | Free permitted stock and eligible businesses                                 | List; request partial quantity; accept; attempt pay, dispatch and completion with gateway unavailable                                               | Pre-payment actions work within permissions; payment-dependent actions fail without changing stock/receipt/payment. After verified gateway integration, test full dispatch/receipt sequence separately in P | UI, NET, DB             |
| TRADE-02 | Preprocessor seller + recycler buyer / S; P later | Permitted stock and material-approved buyer                                  | Repeat quote/request/accept; compare both trade lists; try bypassing gateway with a reference or manual paid flag                                   | Eligibility follows approval/material; exact grams/paise; both lists agree; references cannot authorize payment-dependent transitions; later gateway journey stays BLOCKED                                  | UI, NET, DB             |
| TRADE-03 | Manufacturer seller + approved buyer / S; P later | Declared non-hazardous recyclable byproduct; eligible and ineligible buyers  | Offer byproduct; request as an approved buyer handling material; try wrong-material/unapproved buyer; also test manufacturer buying eligible output | Eligible buyers are not restricted to the next prototype role; ineligible buyers denied; manufacturer can offer byproduct; gateway-dependent actions remain blocked                                         | UI, NET, DB             |
| TRADE-04 | Seller + two buyers / S                           | Same listing in two profiles                                                 | Compete for more than free quantity; accept; repeat a stale action                                                                                  | No over-allocation or negative stock; reservations/counts agree with current state; stale action fails; fully allocated listing cannot be oversold                                                          | NET, DB                 |
| TRADE-05 | Seller/buyer/outsider / S                         | New listing, requested trade and isolated historical-state fixture           | Withdraw; decline; try self-purchase, ineligible buyer, outsider and skipped steps; try simulated payment on historical fixture                     | Correct terminal states and reservation release; current capability/material/location rules enforced; historical paid state remains unverified and cannot unlock payment actions                            | UI, NET, DB             |
| TRADE-06 | Both parties / S; P later                         | Unpaid/unverified trade locally; verified gateway event required later       | Try paid-receipt route and print; later test stable receipt number, exact parties/total, repeated event and outsider                                | Local unpaid/unverified trade cannot claim gateway payment or issue a paid receipt. Later gateway-backed receipt/replay test stays BLOCKED; printing alone is not a GST tax invoice                         | UI, NET; FILE, DB for P |
| TRADE-07 | Buyer/seller / S; P later                         | Synthetic totals around the candidate transport-note threshold; unsafe total | Inspect transport guidance; reject unsafe total; try dispatch without gateway. Later interrupt and reconnect after verified dispatch                | Guidance is not legal clearance; unsafe totals fail with form retained; blocked dispatch leaves stock unchanged. Later verify one dispatch and one stock decrement in P                                     | UI, NET, DB             |
| WORK-01  | Saathi / S                                        | Four job types, date/city variants                                           | Browse open/today/upcoming; vary date, city, area and poster status                                                                                 | Current/future open jobs from active same-city businesses, or team jobs, appear; own area first. No work-type/availability matching is claimed                                                              | UI, NET                 |
| WORK-02  | Two Saathis / S                                   | One open job                                                                 | Take simultaneously; attempt second job in same assigned time window                                                                                | One assignee; loser sees taken state; conflicting slot rejected; no duplicate assignment                                                                                                                    | UI, DB                  |
| WORK-03  | Saathi / S                                        | Own today/future job and other's job                                         | Finish today's job; repeat; try future/other job                                                                                                    | Own job completes on/after its date once; future and other's work rejected; no payment transfer implied                                                                                                     | UI, DB                  |
| WORK-04  | Saathi / F+S                                      | Known completed jobs, empty worker                                           | Compare weekly/total/by-kind earnings and recent list; check empty state                                                                            | Totals derive from completed jobs; pending work excluded; period boundaries use India time; no invented wages or withdrawal control                                                                         | UI, DB for S            |

## 6. Admin, reporting and exports

### Empty catalogue setup

**CATALOGUE-01:** On a separately prepared empty local test backend, complete
normal admin setup and TOTP. Open /admin/prices and select **Add catalogue
definitions** once. Expect 26 canonical definitions and a saved audit event per
new material. No price, price history, stock, order, lot or certificate is created.
Emission factors remain unknown. Run it again: expect zero inserted definitions
and no duplicate audit events. Preserve any pre-existing custom names, factors,
classification and prices. Do not clear the shared test backend for this case.

**CATALOGUE-02:** The engineer repeats the mutation signed out, as a normal user
and as an admin without completed TOTP. Every request must fail without writes.
Where material movements exist with an unknown factor, Impact must keep the
measured grams and mark the relevant CO₂e estimate unavailable. A missing factor
must not be shown as zero or produce a certificate. Existing known-factor
estimates remain unchanged. A current populated test dataset can safely exercise
the admin button's idempotent result without removing any materials.

Reads are bounded: support shows 200 records; verification lists 200; job reads
use 500 and show 20 recent completions; impact reads use 2,000 and compliance
shows 50 receipts. Reconcile the same scope, not an assumed unlimited history.

| ID     | Role / lane                  | Setup                                                          | Steps                                                                                                                    | Expected result                                                                                                                                      | Evidence                |
| ------ | ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| ADM-01 | Authorised admin / S         | Disposable backend; private 32–512-character ADMIN_SETUP_TOKEN | Try missing/wrong setup token; complete authorised setup; interrupt/resume; enable TOTP; remove setup token; retry setup | Only configured email plus valid private token creates the admin; one account; setup resumes; console requires 2FA; no secrets in evidence           | UI without secrets, NET |
| ADM-02 | Admin / S                    | TOTP and controlled recovery code                              | Test password/TOTP failure, three/10-second limit, one recovery code twice, logout and 12-hour expiry                    | Correct challenge/limits; recovery code single-use; expired/logged-out console cannot read or mutate                                                 | NET                     |
| ADM-03 | Admin / S                    | Submitted applications aged 17/18/24 hours                     | Review queue; tick role checklist; approve, request changes, reject; test short/long notes and competing review          | Due-soon at 18h, overdue at 24h; only submitted applications decide; required trimmed note 5–1,000 characters; role creation/audit once              | UI, DB                  |
| ADM-04 | Applicant/admin/outsider / S | Safe owned files                                               | Preview image/PDF; load video explicitly; open/download; sign out; repeat as outsider; induce network error              | Authorised requests succeed; unauthenticated 401, unauthorised 403, missing 404; `private, no-store`; retry useful; no raw public storage link       | UI, NET, FILE           |
| ADM-05 | Admin / S                    | Approved sample price rows                                     | Save positive minimum/fallback; try minimum above fallback, >₹10,000 and >2 decimals; Undo; add missing names            | Row validation works; Undo discards unsaved edit only; name repair preserves existing names/prices; no bulk destructive change                       | UI, DB                  |
| ADM-06 | Visitor + admin / S          | Controlled help/solar enquiry                                  | Submit valid/invalid forms; hit one-hour per-number limit; inspect Open/All; mark answered                               | Valid enquiry saved once; invalid and rate-limited requests fail with draft retained; Answered changes status only, sends nothing                    | UI, DB                  |
| REP-01 | Admin / F+S                  | Known period records; bounded large fixture                    | Compare Today/7/30/pilot ranges, empty data and >1,000 rows                                                              | India-time range shown; max 31 days; current outcomes selected by booking/latest-submission date; partial warning; charts agree with tables          | UI, DB for S            |
| REP-02 | Each business / S            | Completed and incomplete trades; consent boundaries            | Check impact, financial-year EPR and consent at expired/89/90 days                                                       | Totals use intended completed records; 90-day warning behavior matches code; no issued credits/certificates implied; renewal date copy is consistent | UI, DB                  |
| REP-03 | Visitor / S                  | Current catalogue                                              | Download Standards CSV; open it; compare codes/names and quoting                                                         | 26 current codes, correct fields/escaping and safe filename; no private records in public export                                                     | FILE                    |
| REP-04 | Admin/business / F+S         | Reports and receipt views                                      | Inspect export affordances and zero/partial states                                                                       | Receipt printing and public codes CSV exist; admin pilot CSV/PDF export does not. Demo rows in reports are identified as non-production evidence     | UI                      |

## 7. Presentation, privacy, providers and native apps

Apply UX cases to every changed route template, including all role-help pages
and articles. Follow the [UI contract](../design/designer-system.md#current-ui-contract).
Use actual loaded fonts; a CSS family string or passing scroll-width assertion
is insufficient visual evidence.

| ID     | Role / lane                       | Setup                                                  | Steps                                                                                                                         | Expected result                                                                                                                                                   | Evidence                    |
| ------ | --------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| UX-01  | All roles / L+F+S                 | Registry locales and authenticated local role sessions | Visit public templates, fixtures and each real role page; switch language; inspect headings/materials/settings                | Complete copy/endonyms, preserved route and correct glyphs; admin English; fixture results separate from real role browser and native-language review             | UI, locale checklist        |
| UX-02  | Visitor/all roles / L+F           | 320/390/640/768/1024/1280/1440px; short height         | Inspect header, menus, forms, tables, sticky controls and page bottom                                                         | Header one row; below 1280 controls in menu; phone mark only; settings reachable; single-line actions fit; no overlap/clipping/page overflow                      | UI, bounds report           |
| UX-03  | All roles / L+F                   | Light/dark/system, Arabic/Urdu                         | Toggle theme; reload; inspect focus, chart labels, files and RTL drawers/arrows                                               | Stable first paint, readable contrast, logical alignment and direction; chosen theme persists; no green-wash/card regression                                      | UI                          |
| UX-04  | Household/operators / L+S         | Native digits; comma/dot locales                       | Enter 2.125 kg and 12.50 rupees using supported digit/separator forms; try grouping and excess precision                      | Operator fields: exact 2,125 g/1,250 paise; household estimate: 2.1 kg after 0.1-kg rounding. Invalid formats fail; exact operator fields reject excess precision | UI, DB for S                |
| UX-05  | Keyboard/screen-reader user / L+F | Zoom/large text, keyboard only                         | Complete menus/forms/dialogs; Escape; return focus; inspect labels/errors and table/chart equivalents                         | Named controls, visible focus, reachable content, sensible order, no traps; meaningful error announcements and usable targets                                     | UI, reader notes            |
| UX-06  | Motion-sensitive user / L+F       | Fine pointer, touch, reduced motion                    | Hover/focus logo; pause marquee; change motion preference mid-animation; inspect banner crops                                 | Mark turns once; wordmark still; decorative motion stops; static reduced-motion content; images loaded and text readable                                          | UI                          |
| SVC-01 | Household / L+S                   | Offline/slow network/provider unavailable              | Disconnect during browsing and a controlled write; reconnect; inspect saved state before retry                                | Useful retry/error; no false completion or offline queue; manual entry remains available; no sample live-price fallback                                           | UI, NET, DB                 |
| SVC-02 | Household / S+P                   | Approved AI endpoint and cost limit                    | Test clear/dark/distant/non-scrap image; edit suggestions; hit device/deployment quota; simulate malformed response/timeout   | Safe result or retake/error; no invented material/price; manual flow works; no stored photo/output; quota applies                                                 | NET, PROVIDER               |
| SVC-03 | Household/applicant/shop / S+P    | Approved templates; controlled recipients              | Trigger each of eight supported events once; repeat same event; test missing locale/config, stale event, failure/timeout      | Deduped outbox; disabled events not replayed; rate cap 20/day; no automatic retry; accepted vs handset-delivered recorded separately                              | DB, PROVIDER                |
| SVC-04 | Visitor / L; provider receipt P   | Analytics test configuration                           | Decline/allow/withdraw; visit public then private routes; test blocked storage and another tab                                | Consent governs analytics; only allowlisted public paths; no query/token/form leakage; one page view; flag-off disables transport                                 | NET, PROVIDER when approved |
| SVC-05 | Admin/test engineer / S+P         | Controlled error and private-file sample               | Trigger safe browser/server error; inspect redacted payload; compare public HTML/cache to private responses                   | Sentry is separate from consent; no identifying details; failed reporting cannot block Retry; private data is never shared-cached                                 | NET, PROVIDER               |
| SVC-06 | Engineer + test lead / S          | Disposable workload and backup                         | Run one, three, then five read sessions at one request/s/session, maximum two minutes/step; restore backup to separate target | Record latency/errors, stop on limits/errors or >2× baseline; restore reconciles counts; no production write load or reset                                        | NET, DB                     |
| NAT-01 | All mobile roles / N+S            | Android/iOS test builds                                | Login/logout; camera/upload/location deny/allow; Android Back; external links; offline recovery                               | Correct trusted origin/role; no unsafe navigation; permission denial recoverable; private-file browser handoff honest                                             | DEVICE, UI                  |
| NAT-02 | Mobile tester / N                 | Signed preview channel, prior install                  | Check none/available/failed update; download; choose Later; then Restart; test invalid signature/runtime                      | Current/ready/failed accurate; Later preserves form; restart requires choice; invalid update not applied; rollback path tested                                    | DEVICE                      |
| NAT-03 | Desktop tester / N+S              | Signed macOS/Windows prior install/feed                | Repeat check/later/restart; invalid feed/signature; private file; native menu locale/RTL                                      | Shell remains usable; trusted update only; session survives supported upgrade; unconfigured/unsigned state not called current production                          | DEVICE, NET                 |

## 8. Account security, recovery and notifications

Use separate controlled accounts and installations. Keep setup keys, QR codes,
passwords, recovery codes, reset URLs, push tokens and browser subscription
endpoints out of screenshots and logs. F proves appearance only. Security changes
need S, provider delivery needs P and native permission/delivery needs N.

| ID            | Role / lane                   | Setup                                                                    | Steps                                                                                                                                              | Expected result                                                                                                                                                                                                                                              | Evidence                    |
| ------------- | ----------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| SEC-01        | Phone member / S              | Fresh phone sign-in, authenticator off                                   | Open Account security; enroll; confirm current code; store recovery codes privately; sign out/in                                                   | Setup remains unconfirmed until valid code; later phone sign-in requires the second factor; no password is added                                                                                                                                             | NET, UI without secrets     |
| SEC-02        | Phone member / S              | Protected member and a controlled recovery code                          | Enter invalid TOTP; use one recovery code; attempt reuse; expire challenge; repeat rapidly                                                         | Invalid/reused/expired attempts fail; rate limits apply; no session or booking is created before complete verification                                                                                                                                       | NET, DB                     |
| SEC-03        | Household / S                 | Valid basket and protected member                                        | Complete phone code during booking; cancel/reload/complete second-factor step                                                                      | Draft remains coherent; booking waits for full sign-in; one completion creates one booking                                                                                                                                                                   | UI, DB                      |
| SEC-04        | Member / S                    | Session before/after five-minute assurance window                        | Turn off or replace codes; retry from old session and from direct API; try trust-device flag                                                       | Recent full sign-in required; unsupported flags fail; SMS alone cannot weaken an enabled second factor                                                                                                                                                       | NET                         |
| SEC-05        | Member + admin / S            | Authenticator on                                                         | Replace recovery codes; test old set; turn off member protection; try admin disable endpoint                                                       | Old set invalidated; member confirmation required; admin's required protection cannot be disabled                                                                                                                                                            | NET                         |
| SEC-06        | Outsider / L+S                | Signed out and wrong-role profiles                                       | Open security and notifications routes directly; use AR/TA return paths                                                                            | Locale-preserving login return; no private query data before authorized session                                                                                                                                                                              | UI, NET                     |
| REC-01        | Configured admin / S; P later | Private local inbox; approved Resend sender only for P                   | Request reset; use valid link within configured lifetime; set valid matching password; sign in                                                     | Password changes once; old sessions revoked; admin TOTP retained; local record does not claim mailbox delivery                                                                                                                                               | NET; PROVIDER for P         |
| REC-02        | Admin/outsider / L+S          | Missing/invalid/expired/used token and wrong admin address               | Try each admin reset link; request admin recovery for normal-email, unknown and phone-only accounts                                                | Invalid link cannot save; normal-user email recovery uses its separate flow; phone-only user gains no password; admin identity boundary and enumeration protection hold                                                                                      | UI without tokens, NET      |
| REC-03        | Admin / L+S                   | Empty password controls and controlled values                            | Toggle visibility; compare strength hints, mismatch, length boundaries and disabled submit                                                         | Named toggle, consistent hints and validation; password values never appear in evidence                                                                                                                                                                      | UI without passwords        |
| REC-04        | Admin / L+S; P later          | Missing configuration, local delivery rejection, timeout and limit       | Request once per controlled case; inspect error and URL after token read; provider failure tested separately                                       | Honest configuration/delivery/rate/network state; token removed from address bar; no false external delivery claim                                                                                                                                           | NET; PROVIDER for P         |
| NTF-01        | Two members / F+S             | Empty and mixed-read inbox, more than 20 rows                            | Open, load more, mark one read, reload; try another user's row ID                                                                                  | Own rows only; stable order; saved read state; cross-user read mutation denied                                                                                                                                                                               | UI, NET, DB                 |
| NTF-02        | Member / S                    | More than 100 unread records                                             | Select Read all; inspect audit and count; repeat                                                                                                   | At most 100 rows change per action; remaining count allows another batch; one audit per changed batch                                                                                                                                                        | UI, DB                      |
| NTF-03        | Member / L+S                  | Browser denied/unavailable/offline states                                | Open page, enable/deny, retry, turn off; reload                                                                                                    | Inbox and device availability are distinct; clear errors; no silent enabling after turn-off                                                                                                                                                                  | UI, NET                     |
| NTF-04        | Two users, two devices / S+N  | Controlled registrations and two browser tabs                            | Fail cleanup; reload and retry sign-out; try Enable/window focus while pending; end the session in another tab; trigger a test update; switch user | Pending cleanup blocks restore/sign-out until retry succeeds; pending sign-out disables alerts and prevents re-registration; failure allows retry; ended session blocks new delivery starts; in-transit alerts may arrive; other installations stay isolated | NET, DB, DEVICE             |
| NTF-05        | Mobile user / N+S             | Signed build and configured EAS/APNs/FCM                                 | Start Enable; read prompts for more than 15 seconds; approve, deny or cancel                                                                       | Consent choice is respected; slow approval does not lose its result; denial creates no token registration                                                                                                                                                    | DEVICE, NET                 |
| NTF-06        | Mobile user / N+S             | Pending token request                                                    | Navigate, change session, close screen or reload before completion; rotate token                                                                   | Stale request cannot bind to new account/document; current installation can rebind; no token in browser storage or logs                                                                                                                                      | DEVICE, NET, DB             |
| NTF-07        | Mobile user / N+P             | Controlled alert events                                                  | Tap foreground/background/cold-start alert; visit another page; tap next alert                                                                     | Each explicit tap opens own protected inbox in active language; no stale page/crash overlay or arbitrary URL navigation                                                                                                                                      | DEVICE, PROVIDER            |
| NTF-08        | Member / N+P                  | Locked device and expired session                                        | Inspect generic notice; tap after sign-out                                                                                                         | No pickup address, phone or document detail in lock-screen copy; correct sign-in required                                                                                                                                                                    | DEVICE without private data |
| NTF-09        | Desktop user / N              | Signed macOS/Windows builds                                              | Request from trusted main frame, subframe and untrusted origin; deny/allow; quit/reopen                                                            | Only exact trusted main frame can request; grants are process-scoped; no after-quit delivery claim                                                                                                                                                           | DEVICE, NET                 |
| NTF-10        | Member / S+N+P                | Missing inbox/push backend, provider failure and controlled event replay | Keep a form unsaved; exercise missing backend, disabled config, dedupe, expired token, timeout and reconnect                                       | Ordinary pages and unsaved input stay mounted; unavailable settings are honest; no duplicate event or uncontrolled retry                                                                                                                                     | DB, PROVIDER, DEVICE        |
| NTF-11        | EN/AR/TA user / L+F           | Phone/tablet, both themes                                                | Open account and operator menus, inbox states, security status and empty challenges with keyboard                                                  | Reachable controls, correct direction/fonts, no clipping/overlap; no secret or token captured                                                                                                                                                                | UI                          |
| PUB-DETAIL-01 | Visitor / L                   | Six expanded public pages, 390/768/1440 widths, both themes              | Inspect top, new details and bottom after fonts/images load                                                                                        | Distinct square-edged artwork, useful text, no overflow or control overlap                                                                                                                                                                                   | UI                          |
| PUB-DETAIL-02 | Visitor / L                   | EN/AR/TA help links                                                      | Open preparation, weighing and business verification topics                                                                                        | Correct full guide, retained locale and translated copy                                                                                                                                                                                                      | UI                          |

Before native delivery tests, the release owner must finish account enrollment,
project ownership, credentials and signed builds in the app release runbook.
Those accounts are not yet set up. A local export or permission unit test cannot
fill the N or P result cell. Test internal inbox persistence separately from
browser, desktop and mobile alert delivery.

## 9. Business API access

Use a controlled approved owner and a separate business in the local S lane.
Never record the full API key in a screenshot, test report, URL or log. The guide
chapter on business connections explains scope, expiry and rotation. Check the
current REST contract and migration note before these cases; the combined
candidate backend must be loaded into the isolated local test environment first.

| ID     | Role / lane                                        | Setup                                                                      | Steps                                                                                                                   | Expected result                                                                                                                                                               | Evidence                    |
| ------ | -------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| API-01 | Owner/admin/member/viewer, Saathi and outsider / S | Separate current workspace roles and controlled identities                 | Open API access and call management directly as each role; repeat in another workspace                                  | Only approved business owner can create/revoke keys unless an explicitly approved capability changes this rule; no role name alone grants access; cross-workspace data denied | UI without secrets, NET     |
| API-02 | Business owner / S                                 | Fewer than five active keys                                                | Create a named key with selected scopes and each allowed expiry; try no scopes, invalid expiry and a sixth active key   | Valid key shown once; only safe prefix later; default 30 days, allowed 1/7/30/90; server validates limits                                                                     | NET, DB without credentials |
| API-03 | Two businesses / S                                 | Separate scoped keys                                                       | Request an ungranted scope; replay another business's cursor; expire/revoke key; remove issuing owner; suspend business | Denial preserves organization and resource boundaries; expired, revoked or no-longer-authorized credentials fail                                                              | NET, DB                     |
| API-04 | Integration tester / S                             | More than one page of materials, stock and trades                          | Import every page for each resource; compare integer units and buyer/seller lists; interrupt a scan                     | Default 50 and maximum 100 records/page; grams/paise remain exact; incomplete scan never implies deletion or a bank payment                                                   | NET, DB                     |
| API-05 | Integration tester / S                             | Isolated limit-test window                                                 | Exercise per-key and per-business accepted-read caps with the test harness; follow retry instruction                    | 60 accepted requests/minute/key and 180/business enforced; no retry storm; production receives no load                                                                        | NET, DB                     |
| API-06 | Operator / S+P                                     | Optional NewsAPI disabled, quota exhausted and controlled provider failure | Request news in each state; enable only with an approved plan; inspect a successful response separately                 | Unavailable states are honest; no invented headlines; publisher/date/link retained; no business identity or Luma key sent to news provider                                    | NET, PROVIDER               |
| API-07 | Owner in launch languages / F+S                    | Phone/tablet/desktop, both themes and RTL                                  | Tab through label, expiry, scopes and actions; open revoke dialog; Escape; retry a failed action                        | Focus order and return are correct; actions fit; text and technical identifiers use correct direction; fixture cannot issue or revoke a real key                              | UI without secrets          |

### Sandbox checkout boundary

| Case       | Role / lane                               | Preconditions                                                            | Steps                                                                                                                  | Expected result                                                                                                                         | Evidence                                            |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| SANDBOX-01 | Accepted trade buyer operator / S         | Local provider keys absent                                               | Trades; open Sandbox checkout; read test-only notice and unavailable state; close                                      | No provider SDK/network request, no paid state, no stock movement; Account security link does not claim provider readiness              | UI, NET, DB                                         |
| SANDBOX-02 | Buyer operator / P                        | Owner-approved configured sandbox, eligible trade and verified own phone | Open sandbox explicitly; complete controlled provider test; wait for server status; test cancellation/error separately | SDK only after authorized explicit click; server confirms evidence; trade remains paused; no live collection or seller settlement claim | Restricted sandbox result; BLOCKED until configured |
| SANDBOX-03 | Viewer, seller and unrelated business / S | Maintained role-negative harness                                         | Attempt buyer-only session creation/status access and replay against another trade                                     | Server rejects unauthorised access; no checkout session, stock or settlement change                                                     | NET, DB                                             |

### Business document references

| Case        | Role / lane                       | Preconditions                                 | Steps                                                                                                                          | Expected result                                                                                                   | Evidence |
| ----------- | --------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------- |
| EVIDENCE-01 | Business operator / S             | Approved local workspace; synthetic reference | More; Document references; Add reference; choose document type, optional own trade and issuer; enter LOCAL-REVIEW-REF-01; save | One own-workspace record; Reported · unverified; no payment, stock or certificate change                          | UI, DB   |
| EVIDENCE-02 | Same operator / S                 | Existing synthetic reference                  | Replace reference; enter LOCAL-REVIEW-REF-02; save; read both entries; Show more if needed                                     | Original remains; replacement links to original; document type/trade chain retained; no portal verification claim | UI, DB   |
| EVIDENCE-03 | Viewer and unrelated business / S | Separate test sessions                        | Read own history; try add/replace and another business's trade/reference via maintained negative harness                       | Viewer cannot write; cross-workspace read/write denied; hidden buttons alone do not prove permission              | NET, DB  |

### Verify a phone on an existing email account

| Case          | Role / lane                      | Preconditions                                            | Steps                                                                                                                               | Expected result                                                                                                               | Evidence                                               |
| ------------- | -------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| PHONE-LINK-01 | Verified email user / S; P later | Fresh full sign-in; assigned unused local phone          | Account security; Verify your mobile number; enter assigned number; Send code; follow private local inbox procedure; Verify; reload | Same user and session; verified status without phone digits; later email sign-in retained; no account merge or TOTP downgrade | UI without phone/code, NET, DB                         |
| PHONE-LINK-02 | Email user / S                   | Maintained negative-test identities                      | Test wrong/expired code, already owned number, attempted replacement and stale assurance                                            | No phone change on failure; stale assurance requires full email reauthentication; existing phone owner unchanged              | NET, DB                                                |
| PHONE-LINK-03 | Email user / P                   | MSG91 approved/configured; owner-controlled real handset | Receive actual OTP; verify; check later allowed collection step                                                                     | Real delivery and ownership separately proven; does not activate payments                                                     | Restricted provider evidence; BLOCKED until configured |

### Admin payment setup

| Case        | Role / lane                               | Preconditions                                                                  | Steps                                                                                                                             | Expected result                                                                                                                            | Evidence                                               |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| PAYSETUP-01 | Configured admin / S                      | Real local admin with TOTP; approved local business; no provider keys          | Sign in; Payment setup; read release boundary; switch Sandbox and Live references; open Add vendor reference; leave blank; Cancel | Correct business and environment; save remains disabled when blank; no mapping or provider request; no payment state changes               | UI without identifiers, NET                            |
| PAYSETUP-02 | Signed-out user and ordinary business / S | Separate browsers                                                              | Open /admin/payments and attempt guarded reads through maintained harness                                                         | No organisation/vendor data disclosed; configured admin and TOTP required                                                                  | NET, DB                                                |
| PAYSETUP-03 | Admin / S                                 | Maintained isolated local mapping test, never a production business            | Test repeat same mapping, different reference, duplicate vendor on another business and suspended organisation                    | Same mapping is idempotent; reassignment, duplicate ownership and suspension rejected; saved mapping starts unverified; audit recorded     | DB, unit result                                        |
| PAYSETUP-04 | Admin / P                                 | Owner-approved matching Cashfree account, merchant/vendor KYC and backend keys | Check with Cashfree; compare returned status and environment; repeat after suspension                                             | Lookup only for active approved business with matching mode; status is provider-reported; no checkout/payment/refund/settlement activation | Restricted provider evidence; BLOCKED until configured |

### Expanded industry/material workbook acceptance

The new workbook expands requirements; it does not provide test results. Use
**Not run** initially. The current candidate provides Facilities and processes
at /app/facility, the four-tab reference browser on that page, declared lot
classes, controlled disposition, registration references and offer grade/spec
fields. If any required operation is absent in the tested build, record
**Blocked — implementation required**, not Pass. Source review is separate
from facility/legal approval. Follow guide chapter 11 for the exact facility/lot controls and chapter 12
for the offer specification controls. Do not invent an extra specialist route.

| Case        | Role / lane                  | Preconditions                                                | Steps                                                                                                                                                                                         | Expected result                                                                                                                                                                                                                                                        | Evidence            |
| ----------- | ---------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| WORKBOOK-01 | Engineer / S                 | Approved imported reference registry                         | Compare data rows with the workbook; inspect repeated Annexure II codes and the final hydel/mining entries                                                                                    | 419 distinct source rows retained; no code-only collision; workbook_unverified provenance; damaged text not treated as verified law; 419 inferred mappings separate                                                                                                    | Import report, DB   |
| WORKBOOK-02 | Owner and viewer / S         | Implemented capability editor; two workspaces                | Record permitted washing/granulation or other process capability; reload; repeat as viewer and unrelated business                                                                             | Capability persists only in authorised workspace with audit; viewer/cross-workspace writes denied; no automatic material approval or extra account created                                                                                                             | UI, NET, DB         |
| WORKBOOK-03 | Operator / S                 | Implemented sector reference selection                       | Select a source sector; read category and provenance; try to use the reference as approval to handle an unapproved material                                                                   | Registry selection records context only; no hazard, compliance or trade eligibility grant                                                                                                                                                                              | UI, NET, DB         |
| WORKBOOK-04 | Processor / S                | Implemented classified outputs; input lot of exactly 1000 g  | Record 700 g main output, 150 g saleable byproduct, 100 g recoverable waste and 50 g residual; retry with 1 g extra, negative output or duplicate consumption                                 | Valid total accounts for 1000 g once; invalid total rejected atomically; output classes and lot ancestry visible; original transform immutable                                                                                                                         | UI, DB              |
| WORKBOOK-05 | Seller, buyer and viewer / S | Classified synthetic ordinary and controlled/unknown outputs | Attempt ordinary listing for residual, controlled and unknown material; test allowed non-hazardous byproduct with approved material-scoped buyer                                              | Controlled/residual/unknown or unspecified evidence lots cannot link to an ordinary offer; allowed linked lots require explicit non-hazardous handling and eligible stream class; existing unlinked inventory/material-family/actor rules remain; viewers cannot write | NET, DB             |
| WORKBOOK-06 | Operator and viewer / S      | Residual or controlled test lot with exactly 250 g remaining | Lots; open test lot; Record disposition; enter 100 g, synthetic destination, authorisation and manifest references; Save; reload; retry 151 g and viewer write                                | History records 100 g and remaining balance is 150 g; overdraw and viewer write denied; dispatch/transform unavailable; references stay unverified and create no payment or certificate                                                                                | UI, NET, DB         |
| WORKBOOK-07 | Testers A/B / S              | New process/output pages available                           | Repeat valid and denied cases at 390/768/1440 px, both themes, EN/KN/AR; keyboard through selectors; reload and switch workspace                                                              | Labels readable; RTL usable; scope survives navigation correctly; current authentic screenshots; no synthetic fixture used as access proof                                                                                                                             | UI, NET             |
| WORKBOOK-08 | Owner / L+S                  | Final scope review                                           | Check demand board, recurring orders, supplier qualification, samples/QC files, route optimisation and manifests against candidate                                                            | Each missing capability remains explicitly pending; no broad phase completion claim based on registry import, labels or mock screenshots                                                                                                                               | Release scope notes |
| WORKBOOK-09 | Operator and viewer / S      | Facility registration history                                | Consent and registration references; Add reference; enter type, synthetic reference and valid issue/expiry dates; Save; Add correction; repeat future/expired dates and viewer write          | Original retained; type fixed; date-only status uses India calendar; expiry day included; no trade unlock or provider claim; viewer denied                                                                                                                             | UI, NET, DB         |
| WORKBOOK-10 | Seller and buyer / S         | Eligible stock; matching held test lot                       | Sell; Add a grade and specification; enter grade and buyer requirement; optionally select matching lot; Put on sale; buyer reads and requests; retry unrelated/controlled lot through harness | Grade/spec copied to request; evidence link does not reserve lot or expose private history; stock and gateway rules remain enforced                                                                                                                                    | UI, NET, DB         |

### Multi-input processing evidence

| Case     | Role / lane                          | Preconditions                             | Steps                                                                                                                                                     | Expected result                                                                                                                                          | Evidence    |
| -------- | ------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| MULTI-01 | Processor operator / S               | Two available ordinary-route held lots    | Open primary lot; Record transformation; input 800 g; Add input lot; choose second lot and 200 g; four outputs of 250 g; zero contamination/loss; Save    | Both source balances decrease correctly; total 1000 g accounted once; each source history and own output genealogy show the process; inventory unchanged | UI, DB      |
| MULTI-02 | Processor and outsider / S           | Distinct held and foreign/controlled lots | Retry duplicate lot, 21 inputs, overdraw, fractional grams, wrong-workspace lot, controlled/residual lot and unbalanced output through UI or test harness | Whole operation rejected; no partial consumed input, output, history or inventory change                                                                 | NET, DB     |
| MULTI-03 | Processing business and receiver / S | Valid multi-input process and hand-off    | Transfer an output or input remainder; receiver opens permitted lot and custody history; attempt private process/parent/sibling access                    | Recipient sees authorised custody only; processing organisation's private recipe/history remains inaccessible                                            | UI, NET, DB |

### Admin material classification

| Case        | Role / lane                   | Preconditions                                                        | Steps                                                                                                                                                                         | Expected result                                                                                                                            | Evidence    |
| ----------- | ----------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| CLASSIFY-01 | Platform admin / S            | Password and TOTP complete; assigned synthetic active scrap material | Admin Prices; Material classification; Material to review; select material; choose Non-hazardous; enter synthetic review rationale/reference; Save classification; reload     | Current status/reference/date match; audit records action; no automatic facility approval, stock, price or credit                          | UI, DB      |
| CLASSIFY-02 | Admin and ordinary member / S | Isolated assigned material; original classification recorded         | Test missing choice and fewer than 3 or more than 160 reference characters; save Hazardous then attempt ordinary byproduct flow; member attempts admin action through harness | Invalid input and non-admin denied; hazardous material unavailable to ordinary byproduct flow; no workbook-colour inference or gate bypass | UI, NET, DB |

### Manufacturer stock intake

Use only the approved local synthetic manufacturer and material. This flow adds actual inventory; it is separate from evidence-only lots. Record before/after grams and the intake reference in the restricted run log.

| Case      | Role / lane                   | Preconditions                                                      | Steps                                                                                                                                                                       | Expected result                                                                                                                 | Evidence    |
| --------- | ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| INTAKE-01 | Manufacturer operator / S     | Approved active business; approved non-hazardous material in scope | Stock; Record stock intake; unique synthetic reference; select material; enter 1000 g, production date, batch and weighing references; confirm own production; Save; reload | One immutable intake and audit entry; stock increases by exactly 1000 g; displayed history matches references                   | UI, DB      |
| INTAKE-02 | Manufacturer operator / S     | INTAKE-01 reference and details                                    | Repeat same reference with identical details; then same reference with 1001 g                                                                                               | Identical retry adds no duplicate stock; different details show conflict and do not alter original or stock                     | UI, NET, DB |
| INTAKE-03 | Viewer and other business / S | Owner intake exists                                                | Read own permitted history as viewer; attempt write; attempt cross-workspace read/write; try unapproved, hazardous or out-of-scope material through harness                 | Viewer can read own workspace only; unauthorized writes and material choices denied with no stock or audit side effect          | NET, DB     |
| INTAKE-04 | Manufacturer and buyer / S    | Valid recorded intake                                              | Offer at most free stock through Sell; buyer requests; seller accepts; inspect reserved/free quantities and gateway hold                                                    | Normal stock reservation rules apply; no extra intake on listing/request; accepted order cannot bypass payment or dispatch gate | UI, DB      |

## 10. Run sheet, defects and sign-off

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

Until configured and verified, block live OTP, normal/admin recovery email,
email verification/invites, status SMS, browser/mobile alert delivery, optional
AI, telemetry receipt and signed updates as applicable. Local delivery evidence
does not close these external gates. B2B payment-dependent journeys stay BLOCKED
until Cashfree integration and activation pass the required provider tests.

The implemented scope includes production recipes and batch records, sourcing,
route and load plans, quality documents and controlled audit-report sharing.
Test each within its documented permissions and evidence limits. These records
do not issue carbon credits or regulatory certificates, and route plans do not
provide road navigation. Provider execution and native release acceptance need
separate evidence. Saturday 10 October is a target decision date, not automatic
launch approval. Only the founder can accept a smaller release scope and its
visible limits. Never borrow production secrets.

## 11. Maintain the editable test document

This Markdown file is the test-manual source. The maintained editable Word
delivery is the manual section inside
`output/docx/luma-green-team-review.docx`, built with
`scripts/build-team-review.py`. The builder keeps every case field and expands
wide tables into readable case sections. It derives its content from this file;
do not copy tests into a second handwritten Word source.

The platform guide's chapter 40 contains the beginner walkthrough for the same
test sequence. Update both sources when a click, role or expected result changes.
The team pack also contains product-review screenshots, roadmap and legal
preparation, each with its own evidence limits. The 10 October schedule is the
separate launch plan; it is not the detailed case manual.

After source or screenshot changes, rebuild the team pack with the bundled
Documents runtime, render it, inspect every page and record review through the
builder. The exact procedure is in `docs/team-review/README.md`. A successful
file build does not make the test cases pass. Keep the completed run sheet and
restricted evidence separate from the editable instructions.

## Payment-to-trade bridge acceptance additions — 7 October

These cases cover the reviewed financial source. The earlier financial checkpoint passed 50 connected cases; the final combined
run passed 55. Neither records a pass for each manual/provider case here.
The backend passed 137 focused tests and independent review. Test local server behavior
with controlled provider responses in lane S, then record separate provider
sandbox and live evidence in lane P. Local injected responses never prove that
Cashfree processed money. Keep activation off until the agreement owner supplies
approved terms and the provider acceptance reference.

| Case   | Role / lane                         | Steps                                                                                                                                                                               | Expected result                                                                                                                                                                                                                     |
| ------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIN-01 | Buyer, viewer and outsider / S      | Open an accepted order without live flags, keys or a selected approved policy; repeat as viewer and unrelated business                                                              | Honest unavailable state; no provider SDK/order call; no dispatch or paid claim; server denies unauthorized direct calls                                                                                                            |
| FIN-02 | Admin / S; agreement owner before P | Payment setup; Record approved policy; inspect blank fields; test required values and immutable version handling; select a version only in the isolated approved test configuration | No default fee payer or refund funder; terms and acceptance references required; saved version cannot be rewritten; form save alone cannot activate live checkout                                                                   |
| FIN-03 | Buyer and seller / S+P separately   | Reconcile confirmed full live collection using frozen buyer, seller, amount and split; repeat and reorder evidence; repeat with sandbox, partial amount and mismatched seller       | Only valid live evidence authorizes dispatch; collection itself does not move stock or reserve it twice; retries cannot duplicate authority; sandbox or mismatch cannot authorize the trade                                         |
| FIN-04 | Buyer/seller / S                    | Request cancellation with a reason, reload, and compare exact reserved grams; repeat during uncertain provider state and with late success                                          | Pending request is not final cancellation; stock releases only after server-safe final cancellation; uncertain or conflicting evidence holds the order for review                                                                   |
| FIN-05 | Seller then buyer / S               | Record dispatch with a reference, then Confirm receipt for the full agreed quantity; try wrong role, stale state and duplicate action                                               | Only the permitted party and current server state can act; exact stock movement occurs once; quantity or quality disagreement stops the flow for administrator review                                                               |
| FIN-06 | Admin / S+P separately              | Request full remaining refund through the approved admin control; retry timeout and duplicate request; reconcile provider result                                                    | Stable refund identity and amount; request is not proof of refund; pending or failed provider result cannot appear refunded; confirmed refund stays held and does not restore/release stock; no silent partial refund or fee policy |
| FIN-07 | Admin / S+P separately              | Reconcile the order-specific seller settlement and a reversal; provide an aggregate settlement event without an exact order allocation                                              | Exact order evidence required; aggregate notice alone cannot settle this trade; reversal remains visible and auditable                                                                                                              |
| FIN-08 | Buyer/member/viewer / S             | Change workspace, revoke role, close checkout and resolve a delayed client action; repeat failed update using its retained reference                                                | Lost permission cannot reopen checkout or save; client callback cannot confirm money; retry reads current state and preserves safe input without duplicate actions                                                                  |
| FIN-09 | Both testers / S                    | Read Buyer payment, Seller settlement and Refund on one order; compare with server evidence after reload                                                                            | Three distinct states; buyer collection never implies seller settlement or refund; payment/session secrets absent from screenshots and reports                                                                                      |

The earlier 50-case checkpoint covered real UI cancellation, reload and exact
accepted-commitment release with no payment SDK request. The final combined
55-case run passed these and the new workbook journeys.
The existing admin case also saves a clearly synthetic local policy through the
real form; it does not enable live checkout or choose production agreement terms.
Record separate actual results when the team repeats these cases. Partial delivery, quantity
changes and quality disputes require review in this release; do not manufacture
a successful receipt or use an off-platform paid override.

## Sourcing acceptance additions — 7 October

Use disposable approved buyer and supplier workspaces with a matching material,
and a viewer in the buyer workspace. These cases are instructions, not recorded
passes. Sourcing records must not create trades, reserve inventory or confirm payment.

| Case      | Action                                                                                                                                                                                          | Expected result                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SOURCE-01 | More → Sourcing → Demand board → Post demand. Enter whole grams, delivery area, exact specification and a current needed-by date. Save, reload, then Close.                                     | Own request persists and closes. A matching supplier can see eligible demand. Fractions and past dates are rejected.                                        |
| SOURCE-02 | Recurring demand → Create schedule. Choose 7 or 30 days. Publish next demand once, reload, then check the next date. Move an overdue next date to a later current date before publishing again. | No automatic publication. Each occurrence is published once. Date changes retain prior publications; stale concurrent edits fail safely.                    |
| SOURCE-03 | Supplier decisions → Record supplier decision. Save sample reference, exact specification, decision, expiry and reason. Append a rejected decision after an approved one.                       | History remains private to the buyer. Latest decision controls new proposals/releases. Supplier cannot read the private decision history.                   |
| SOURCE-04 | Buyer proposes a standing agreement with a current approved exact-specification decision. Supplier opens Supplying and acknowledges with a reference.                                           | Separate buyer proposal and supplier acknowledgement. Wrong supplier or viewer cannot acknowledge. No stock/order/payment change.                           |
| SOURCE-05 | Buyer requests two releases within the agreement quantity. Try one gram above the remaining allowance. Supplier acknowledges or declines each release.                                          | Whole-gram capacity enforced. Repeating the same reference/payload creates no duplicate. Conflicting reference reuse fails. Each response stays in history. |
| SOURCE-06 | Inspect a release acknowledged after its needed-by date while its agreement is current; close the agreement and try a new release.                                                              | Original due date remains visible; late acknowledgement is intent history, not delivery proof. Closed agreements reject new releases.                       |
| SOURCE-07 | Sign in as viewer, switch workspace, and open the same records. Check Arabic at phone width.                                                                                                    | Viewer has read-only controls. Foreign records are denied. Labels, tabs and action controls remain usable without horizontal page overflow.                 |
| SOURCE-08 | At phone width open Lots → Transform, add an input, scroll the form and use Tab through the final action; press Escape.                                                                         | The dialog body scrolls. Title and close control stay visible; keyboard focus remains inside the dialog and Escape closes it.                               |

Record actual account, date, candidate and result after the final connected-browser
run. Do not replace a failed test with a component fixture or a screenshot from an
older build.

## Workbook operations checks — manual acceptance cases

Use disposable local accounts and synthetic references only. Record the result,
URL, role, theme, language and screenshot for each case. No live disposal or
certification is involved.

| Case   | Action                                                                                            | Expected result                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| OPS-01 | Admin records a material draft; business searches for it.                                         | Draft stays private. After review activation the business can find its grade/specification. Retirement removes it from search. |
| OPS-02 | Business owner opens Production records and enters ingredient shares totalling 9,999.             | Save is rejected and the draft remains. Correct to 10,000 and save a new recipe version.                                       |
| OPS-03 | Create a measured transformation and output inspection; record every input in a production batch. | Recycled grams cannot exceed consumed grams. Exact input/output and declared input ratio are visible. Stock is unchanged.      |
| OPS-04 | Open the same workspace as a viewer.                                                              | Records can be read; recipe, batch and disposition write controls are absent.                                                  |
| OPS-05 | Admin reviews current facility evidence, then owner changes the facility.                         | Earlier review remains in history and no longer shows current.                                                                 |
| OPS-06 | Select a reviewed destination in a controlled disposition; admin withdraws it before save.        | Save fails with no grams consumed. Reload and reconcile the destination evidence.                                              |
| OPS-07 | Repeat the material search and production dialog in Arabic and Kannada on phone and desktop.      | Labels fit, keyboard focus remains visible, dialog scroll reaches every field, and RTL tabs follow direction.                  |

## Route and load planning — manual acceptance cases

Use a disposable approved owner, member and viewer in the same workspace. Use a synthetic vehicle and site reference; do not use a customer address. These are test instructions, not recorded browser passes.

| Case   | Action                                                                                                                                                              | Expected result                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LGP-01 | More → Route and load plans → Create plan. Enter two sites, an approved material and 1,000 g with a 999 g capacity.                                                 | Save fails without a record. Raise capacity to 1,000 g, save and reload. The plan and exact total persist. No stock, pickup, trade or payment changes.                                    |
| LGP-02 | Try fractional grams, zero mass, latitude 91, longitude 181 and a 21st stop. Then use sites at longitudes 179.9 and −179.9.                                         | Invalid quantities/coordinates/count fail. Dateline sites use the short straight-line arc. No road ETA or navigation is shown.                                                            |
| LGP-03 | Save Entered order, then save a new revision using Geometric order and a reason.                                                                                    | Both revisions remain. Sequence is deterministic nearest-next from the starting site; distance excludes a return leg. Material and mass remain exact.                                     |
| LGP-04 | Open a correction in two browser contexts. Save in the first, then submit the still-open second form. Repeat with an archive form opened before another correction. | The stale form fails; it cannot silently adopt the new revision. Close it, review history and reopen. Owners/admins can archive; members/viewers cannot. Archived history stays readable. |
| LGP-05 | Switch to viewer and then to an unrelated workspace. Try a saved deep link or stale action.                                                                         | Viewer can read its workspace history but cannot create/correct/archive. Foreign plan access is denied. Removed/inactive materials cannot be saved through an old form.                   |
| LGP-06 | Open the full form in English, Arabic and Kannada, light/dark at phone/tablet/desktop widths; use Tab and Escape.                                                   | Labels fit, keyboard focus is visible, RTL selectors follow direction and every field/action can be reached. No horizontal page overflow.                                                 |

Record the account role, candidate, actual result and screenshot after the final browser run. The component and backend regressions do not replace connected or visual acceptance.

## Quality documents and audit sharing — manual acceptance cases

Use disposable approved owner, buyer, viewer, stakeholder recipient and unrelated
accounts. Use a synthetic inspection and file; do not upload identity documents
or real customer data. These are manual steps, not recorded browser passes.

| Case       | Action                                                                                                                                                                                        | Expected result                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QUALITY-01 | Owner selects an own held-lot inspection, document type and small flattened PDF or supported image; leave buyer sharing off and select Attach document.                                       | Your documents shows Business only. Original inspection is unchanged. Buyer and unrelated account cannot download the file.                                                                                |
| QUALITY-02 | Attach a second file with Share this document with the named buyer checked. Buyer downloads it, chooses Conditional, enters a reason and records it; then records Accepted with a new reason. | Buyer decision history retains both records. The inspector's decision, stock and payment stay unchanged. Viewer cannot record a decision.                                                                  |
| QUALITY-03 | Try an oversized file, mismatched format, active PDF, foreign inspection and a 21st attachment.                                                                                               | Rejected without an attached record. An unauthenticated or expired session cannot download. Do not claim that file validation is a malware scan.                                                           |
| QUALITY-04 | Owner opens Shared audit reports, selects the inspection and exact approved recipient, enters purpose and a future expiry, checks one file and selects Share report.                          | Fixed snapshot includes only selected inspection fields, existing buyer decisions and checked files. No private ancestry, recipe, sibling lots or contact fields. Wrong recipient cannot read or download. |
| QUALITY-05 | Recipient selects Read report and Download. Buyer records a later decision, or owner records a new inspection and shares a newer report.                                                      | Original snapshot remains unchanged. New evidence requires a new report; no implied certification.                                                                                                         |
| QUALITY-06 | Owner revokes the grant, withdraws an included file, or lets the report expire. Repeat with lost stakeholder approval or a suspended source business.                                         | Future reads/downloads fail. Existing downloaded copies cannot be recalled. No global access follows from stakeholder approval.                                                                            |
| QUALITY-07 | Open an upload or report draft, switch workspace or lose owner permission, then retry an old action.                                                                                          | Draft scope and download controls reset; server rejects stale/foreign authority. Viewer cannot share or revoke.                                                                                            |
| QUALITY-08 | Repeat file selection, buyer decision and report creation in Arabic and Kannada at phone/tablet/desktop widths and both themes. Use Tab through controls.                                     | Labels fit, selectors follow direction, focus is visible and every action is reachable. No credentials, contacts or real identifiers appear in screenshots.                                                |

Record the candidate, account role, actual result and screenshot after the final
connected run. Provider or government execution is not part of these cases.
