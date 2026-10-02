# Six-month execution plan: October 2026–March 2027

Status: proposed plan, 2 October 2026. These are decision gates and suggested
team goals, not committed delivery dates, traction claims or approved spending.
The founder selects scope and assigns people to the owner roles below. If a
release gate is not met, move the affected milestone; do not bypass it to keep
a calendar promise.

The current product connects households, shops, yards, recyclers, manufacturers
and Saathis, with one admin. The implemented pilot has phone authentication,
onboarding, pickup dispatch, weighed receipts, stock, simulated business trade,
job records and bounded reports. Public UI and 33 translated catalogues do not
prove live operations, provider approval, native release acceptance or native
language review. Use the [feature inventory](features.md),
[launch checklist](../operations/launch-checklist.md) and current delivery handoff
for verified status.

## Working ownership and order

- **Founder/product:** pilot scope, partners, budget, release decisions and legal
  adviser coordination. A proposal does not authorise a production change.
- **Engineering lead:** auth/data integrity, releases, instrumentation, recovery
  and technical acceptance evidence.
- **Operations lead/admin:** business verification, dispatch exceptions, price
  approval, support and field training.
- **Design/QA lead:** the UI contract, role testing, accessibility, translation
  review and maintained guide.
- **Release/security owner:** environment isolation, backup/restore, secrets,
  provider budgets and signed native distribution. One person may hold several
  roles; each milestone still needs one accountable owner and a reviewer.

Critical path: **isolated environment and controlled identities → verified
provider/auth flow → auditable end-to-end recovery → repeatable field operations
→ measured chain trade → justified expansion**. Design polish, legal research,
training preparation and offline test data can proceed in parallel. A provider
key alone does not complete any operational gate.

## October 2026 — make the Bengaluru pilot safe to operate

**Accountable:** engineering lead; operations and QA review. **Dependencies:**
founder chooses demo/staging isolation; approved controlled identities; matching
frontend/backend origins; admin setup and 2FA; MSG91 approval and budgets.

Finish core role acceptance using the [team manual](../testing/team-end-to-end-manual.md).
Run a controlled household→shop pickup from booking through measured receipt,
then a permitted shop→yard trade with the simulation boundary visible. Verify
reassignment, cancellation, invalid transitions, private-file ownership and
exact stock/points once-only effects. Complete the price review and Kannada,
Hindi and English field-copy review. Rehearse backup restoration in a disposable
environment. Keep demo rows separate from pilot reporting.

**Exit evidence:** no open P0/P1 in the agreed pilot scope; approved real-device
OTP and handset delivery record; functioning 2FA; reviewed restore result;
current guide and role training; support/rollback owners named. The previously
proposed 13–20 October pilot window is conditional on these gates, not a launch
promise. Legal/privacy and brand checks must have a named adviser and decision
owner before the public pilot; use the separate legal workstream for current
requirements.

**Measure:** eligible offers, accepted/completed/cancelled/reassigned bookings,
acceptance time, estimate-versus-weighed differences, receipt corrections,
support incidents and actual provider cost. Establish a baseline first; no
customer-volume or revenue claim is implied.

## November 2026 — stabilise pickup work and support

**Accountable:** operations lead; engineering and QA review. **Dependencies:**
October core gates and a real, consented pilot cohort.

Observe household and shop tasks in the field. Fix the largest measured causes
of abandonment, stale offers, missed work and receipt disputes. Define the
accepted-work exception process with operators; if cancellation/release or
correction tools are needed, design and review their state/audit rules before
implementation. Improve support triage and training from actual incidents.
Keep OTP, SMS spend and request limits under review. Do not add dashboards just
to fill space.

**Exit evidence:** a written and rehearsed pickup exception procedure; every
critical bug has a reproduced regression test and retest; consecutive weekly
operations reviews reconcile completed receipts with stock. Any new workflow
has a guide update and staging acceptance before pilot rollout.

**Measure:** completion rate within a defined booking cohort, reassignment rate,
median/upper-percentile acceptance time, support response time, duplicate records
and cost per completed pickup. Set improvement targets only after checking the
October denominator and data quality.

## December 2026 — validate the business chain

**Accountable:** founder/product; engineering and operations review.
**Dependencies:** reliable recovery records, willing verified businesses and
agreed physical handoff/quality practices.

Run supervised shop→yard, yard→recycler and recycler→manufacturer scenarios.
Check quantities, grades, packaging, transport evidence and receipt expectations
with each party. Confirm listing reservations, partial quantities, competing
orders and delivery acknowledgement against stock. Record the actual reasons a
business would repeat a trade. Document disputes, returns and settlement needs
before adding those features.

**Exit evidence:** all three permitted handoffs pass the staging manual; each
handoff has a field-reviewed operating checklist and a reconciled record sample.
Keep escrow labelled simulation. Real payments require a separate approved
commercial, legal, provider and reconciliation design; December does not promise
fund custody or settlement.

**Measure:** order acceptance/completion, time between each trade state,
quantity/quality disputes, repeat activity by a defined business cohort and
reconciled grams. Collect confidential business feedback without inventing
marketplace liquidity or contracted demand.

## January 2027 — decide the next traceability and reporting scope

**Accountable:** engineering lead; product and operations review.
**Dependencies:** December evidence and a documented reason for each new record.

Review whether operators need processing batches, input/output mass balance,
quality grades or a controlled report export. Define integer units, correction
rules, ownership, audit events and migration/rollback before schema work. Resolve
textile onboarding, normal shop-family restrictions and missing recycled output
codes with domain reviewers; do not invent a complete chain from the current
catalogue. Assess separate reviewer/support roles only if the single-admin
workload justifies them.

**Exit evidence:** reviewed ADRs and acceptance cases for selected changes; one
bounded staging implementation at a time; mass-balance/permission/concurrency
checks and restore evidence. Unselected proposals stay out of production.
EPR records and impact estimates remain distinct from regulatory certificates
and issued carbon credits.

**Measure:** traceability completeness for sampled transactions, unexplained
stock differences, report reconciliation time and admin review age. State report
bounds and demo inclusion. A partial report cannot support an unqualified total.

## February 2027 — prove device and language readiness

**Accountable:** design/QA lead; release/security owner review.
**Dependencies:** stable hosted workflows, owned app identifiers, signing access
and approved test channels.

Run field-device acceptance on Android/iOS and macOS/Windows with actual fonts,
large text, RTL, camera, location denial, private documents and poor networks.
Test a previous signed install updating to the candidate, Later/Restart behavior,
bad signatures, unavailable feeds and recovery. Complete human review for each
language the team intends to support operationally; keep automated checks across
all 33 catalogues and document remaining native-review gaps.

**Exit evidence:** named devices/build IDs with passing core cases, reviewed
signatures and rollback, current store/privacy submission materials and guide.
Publish only after the relevant platform acceptance; a JavaScript export or
unsigned package is not an approved app release.

**Measure:** task completion and support friction by device/launch language,
missing-glyph/overflow defects, crash reports from the supported instrumentation,
update failures and download size. Do not infer Convex/native crash coverage
from browser Sentry alone.

## March 2027 — choose a measured expansion or a focused repair cycle

**Accountable:** founder/product; operations, engineering and finance/adviser
review. **Dependencies:** prior gates, reliable cost and cohort data, operational
capacity and documented business demand.

Review six months of evidence. Decide whether to deepen Bengaluru coverage,
expand one supported chain, add a carefully chosen area, or spend another cycle
on reliability. Compare service cost, operator workload, support load, real
completed activity and repeat use. Conduct bounded load/readiness and recovery
checks before increasing traffic. Reassess pricing/business model and required
legal arrangements with the appropriate advisers.

**Exit evidence:** an explicit go/no-go decision with scope, budget, owners,
capacity assumptions and rollback; a prioritised next-quarter plan linked to
observed needs. Carbon-credit feasibility may be researched, but issuance,
verification, trading and retirement remain a separate programme with external
requirements—not an automatic March deliverable.

**Measure:** contribution assumptions using actual recorded costs, support and
verification capacity, cohort retention/repeat activity, correctness incidents,
performance and restore time. Label forecasts as forecasts and exclude demo data.

## Review cadence and scorecard

Hold a weekly engineering/operations review and a monthly founder gate review.
Each metric entry records definition, date range, timezone, source, completeness,
demo exclusions, owner and collection method. Use operational records for
private workflow measures; do not widen public analytics to collect identities
or private routes. Current pilot reports are bounded, use current outcomes and
do not measure abandoned forms or original AI accuracy. Add reviewed measurement
only when it answers a specific decision.

| Gate             | Evidence required                                                         | Decision if missing                                       |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| Correctness      | Reconciled integer receipts/stock; audit and concurrency tests            | Stop affected mutations and repair before expansion       |
| Access/privacy   | Role/file denials; controlled identities; retention/settings review       | Keep environment closed; investigate exposure immediately |
| Provider         | Configuration plus controlled acceptance/delivery and cost evidence       | Leave optional feature disabled; keep manual alternative  |
| Usability        | Core role tasks, native review, responsive/a11y/motion evidence           | Restrict launch scope or fix the failing path             |
| Release/recovery | Current CI/build, guide, backup/restore, signed-device proof where needed | Hold release and keep last accepted build                 |
| Commercial       | Real cohort and cost evidence with adviser-reviewed assumptions           | Continue discovery; make no traction/return guarantee     |

No month authorises broad production seeding, whole-table resets, purchased
accounts, unsolicited messages or spend. Keep API/account setup, legal/trademark
research and the team/investor pack as linked workstreams owned by the founder;
their conclusions must be current and separately verified.
