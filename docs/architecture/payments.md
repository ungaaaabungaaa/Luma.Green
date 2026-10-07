# Cashfree business payments

Implementation boundary checkpoint updated 7 October 2026. This extends ADR 0019.
Cashfree Payment Gateway with Easy Split is the selected provider. Selection is
not merchant approval, KYC approval, Easy Split enablement or proof of delivery.

The current source implements the payment-to-trade bridge, full remaining
refund requests and per-order settlement reconciliation. All 137 focused backend
tests, backend types/scoped lint and independent source review pass. The final
combined connected browser suite passed 55/55 cases in 4.6 minutes; four final
focused byproduct, operations and quality-sharing regressions also pass. These
local checks do not prove real provider or production execution. The full release
check, hosted CI and deployment remain separate gates in the delivery handoff.

## Scope and release boundary

Sandbox and live checkout are separate. Sandbox evidence never changes trade
status or inventory. Live checkout is off by default and requires matching live
credentials, explicit server activation, an approved immutable policy selected
by version, an active verified vendor and the existing actor/phone/trade checks.
There is no manual paid flag or off-platform B2B payment alternative.

The supported commercial scope is one full agreed quantity, one INR collection
and one seller split. Verified full live collection authorizes dispatch; it does
not itself move inventory. Seller dispatch subtracts exact grams once. Buyer
receipt adds the same full grams once. Partial quantities and quality disputes
require review. A completed material receipt does not prove seller settlement.

A full remaining refund is an administrator operation under the policy frozen
on the order. A confirmed refund leaves the order held for physical resolution;
it does not cancel the trade, restore stock or prove returned material.
Collection, seller settlement and refunds stay separate. Kabadiwala payment to
a household remains outside this B2B flow.

## Provider contract

Use API version `2026-01-01`. Cashfree orders accept amounts in rupees with two
decimal places and a minimum of INR 1. Orders carry a persisted UUID idempotency
key and one seller split. The HTTP boundary serializes integer paise as an exact
decimal JSON number; internal arithmetic stays in paise. The split assigns the
full material-order amount to the seller. No platform commission, SaaS fee or gateway surcharge is invented. The owner
records the approved fee payer and refund funder in a frozen policy; the form
does not add a charge to the material amount. [Create Order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order).

Easy Split needs Cashfree enablement. The platform must associate each seller
with an approved provider vendor; a provider GET must confirm active status
before checkout. The backend keeps only vendor ID and verification evidence,
not bank or KYC payloads. [Easy Split](https://www.cashfree.com/docs/payments/split/overview),
[Vendor lookup](https://www.cashfree.com/docs/api-reference/payments/latest/easy-split/get-vendor-all-details).

Verify `x-webhook-signature` over the exact bytes of `x-webhook-timestamp` followed
by the raw request body, using HMAC-SHA256 and the mode's secret. Reject oversized
bodies before parsing. Parse only the required fields after verification. A
signed delayed event is retained for reconciliation, never discarded merely
because it is old. [Signature verification](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification).

Deduplicate attempts by mode and `cf_payment_id`. A failed attempt cannot undo
success. Multiple successes, changed payment identity or scope mismatches open
reconciliation issues. Payment webhooks do not establish the vendor allocation:
GET the immutable order and compare buyer, amount, currency and sole seller split
before confirmed sandbox collection. A provider payment lookup must return one
matching SUCCESS with captured funds. If authorization details are present,
CAPTURE must be SUCCESS and its captured amount must equal the frozen total.
Pending or partial capture cannot confirm collection. [Webhook idempotency](https://www.cashfree.com/docs/payments/online/webhooks/webhook-indempotency),
[Payment lookup](https://www.cashfree.com/docs/api-reference/payments/latest/payments/get-payments-for-an-order).

## Durable state and races

- `cashfreeVendors`: immutable org/mode/vendor mapping, latest provider status and
  confirmation time. Guarded admin setup registers a candidate; only provider lookup
  updates confirmation. One vendor cannot represent two orgs in one mode.
- `cashfreeOrders`: one row per trade/mode, frozen buyer, seller, trade amount,
  customer, phone, vendor, expiry, provider order ID and UUID. No caller supplies
  price, currency or seller. Checkout requires an accepted trade, active parties,
  an allowed business operator and a verified account phone.
- `cashfreeAttempts`: sanitized payment identity, status and integer amounts.
  Success is monotonic. Attempts never allocate inventory.
- `cashfreeIssues`: deduplicated reasons and order/payment references, with audit
  rows. No raw provider bodies, keys, session IDs, bank data or contact details
  enter the audit log.

Prepare and claim happen in a Convex transaction. Concurrent calls share one
order and one lease. A request marks the attempt before HTTP. After a timeout or
crash, GET the same order; a provider `order_not_found` permits retry of exactly
the same order ID and idempotency key. Never replace an uncertain order. Lease
revisions reject stale HTTP results. Frozen scope is checked again on completion.

A claimed order schedules a durable watchdog after its lease. Webhook success
shares that pending recovery, so a webhook that arrives while checkout holds the
lease is not lost. Recovery uses the same provider order and never creates one.
At most four scheduled recovery runs are allowed per order, with increasing
5/10/20/40-second delays and an additional wait for an active lease. Replayed
scheduler calls are ignored. Each recovery schedules its successor transactionally
before provider I/O; the final successor only checks unresolved exhaustion and
cannot make a fifth provider request. Confirmed, closed or mismatched evidence stops
recovery. Exhaustion records an audit issue for manual internal reconciliation;
manual calls do not reset the automatic budget or change trade/stock state.

Provider session IDs are private and returned only to the authorized buyer's
checkout action. Each active checkout refreshes the provider vendor status,
including an existing order. The final session query checks that the frozen
vendor mapping is still ACTIVE and its evidence is at most five minutes old.
Blocked or stale vendors cannot receive a session; collection reconciliation
continues independently so collected funds remain visible. Status queries return safe facts to the buyer and seller.
Reconciliation is an internal action and can be rerun after a network failure.
Unknown, late, orphan or mismatched success remains an issue requiring review.

## Configuration and setup

All configuration is server-only through `src/lib/env.ts`; no `NEXT_PUBLIC_`
payment key exists. Empty or invalid settings disable the feature.

| Variable                                                       | Meaning                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `CASHFREE_MODE`                                                | `off` (default), `sandbox` or `live`                               |
| `CASHFREE_SANDBOX_CLIENT_ID`, `CASHFREE_SANDBOX_CLIENT_SECRET` | Sandbox credentials                                                |
| `CASHFREE_LIVE_CLIENT_ID`, `CASHFREE_LIVE_CLIENT_SECRET`       | Separate live credentials; insufficient alone to activate checkout |
| `CASHFREE_SANDBOX_CHECKOUT_ENABLED`                            | Explicit `true` opt-in for sandbox sessions                        |

Two additional server-only settings govern new live checkout:
`CASHFREE_LIVE_CHECKOUT_ENABLED=true` is the explicit activation flag;
`CASHFREE_LIVE_POLICY_VERSION` selects a saved immutable approved policy.
Default is off. The configured administrator records a unique version, fee payer,
refund funder, platform-admin refund authority, approved settlement-terms
reference and provider-acceptance test reference. Exact retries are idempotent;
changed terms require a new version. Each order freezes its policy reference.
Saving terms is an approval record, not provider evidence or activation.

Fixed API hosts are `https://sandbox.cashfree.com/pg` and
`https://api.cashfree.com/pg`. Never accept a caller-supplied endpoint. Configure
POST `/payments/cashfree/sandbox` and `/payments/cashfree/live` on the Convex HTTP
site for the corresponding account only. The configured mode must match the
route. Use distinct credentials; identical sandbox/live keys are invalid.

Before activation: Cashfree must accept the recycling marketplace use case,
complete merchant and seller KYC, enable Easy Split and approve the checkout
origin. Configure signed payment webhooks and test retries. Confirm vendor
status and the full seller split through provider responses. No accounts,
credentials, provider requests or funds are created by local unit tests.

## Financial lifecycle and inventory

`tradeFinancials` tracks awaiting payment, authorized, dispatched, received,
cancellation pending, cancelled and held states. It records collection,
settlement and refund separately. `financialMovements` owns each exact dispatch
or receipt and its actor/reference; duplicate same-reference retries cannot
move inventory twice, and a changed reference conflicts. Material and party
eligibility are rechecked. A later eligibility problem holds the trade.

Without a live provider order, cancellation can release the accepted stock
commitment immediately, with no change to on-hand inventory. Sandbox-only orders
do not prevent this. A live provider order requires terminal unpaid evidence;
expiry alone is insufficient. Pending or uncertain cancellation preserves the
commitment. Late or conflicting collection opens a review hold. A successful
collection replay cannot clear an existing refund or review hold.

New checkout and dispatch require the current activation and approved policy.
Receipt of already dispatched material, refunds and reconciliation of existing
funds retain the order's frozen policy when new checkout is paused or a selected
policy changes. Matching live provider configuration and the relevant actor,
state and evidence checks still apply. An operator cannot force a held record
forward by reloading or repeating an action.

## Refund and settlement boundaries

The administrator requests the full remaining order amount with an approved
reason and unique reference. The frozen policy specifies who funds it. One
immutable provider refund ID and idempotency key survive lookup, timeout and
retry. The provider refund must match the order, successful payment, exact amount
and required vendor split. Other refunds or mismatched evidence require review.
Bounded durable retries and lease checks prevent concurrent duplicate work.
A request is pending until provider evidence confirms its result. Partial-refund
entry is not supported. [Refund API](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund).

Confirmed refunds remain held with no automatic cancellation, inventory release
or stock restoration. Physical return and disposition need an explicit reviewed
resolution. Automatic approval review rejected automatic post-refund trade
cancellation; that excluded behavior must not be reintroduced as a convenience.

Seller settlement needs an exact order/vendor allocation plus signed transfer
evidence. Fees must reconcile under the frozen fee-payer policy. Aggregate
success alone, nonzero adjustments, partial amounts or mismatches cannot settle
an individual trade. A reversal remains sticky and holds the trade. The UI's
**Recheck provider evidence** reads evidence; it cannot manually mark money paid.
[Order split lookup](https://www.cashfree.com/docs/api-reference/payments/latest/easy-split/get-split-and-settlement-details-by-orderid),
[Settlement events](https://www.cashfree.com/docs/payments/split/webhooks).

## Remaining live release gates

1. Finish backend guard review, focused financial tests and the final combined
   browser suite; the planned suite has 50 cases, not a recorded 50-case pass.
2. Obtain merchant/KYC and Easy Split approval for the actual business model,
   approved sellers and actual provider sandbox access.
3. Confirm the commercial agreement: fee payer, refund funder, settlement terms,
   chargeback handling and acceptance reference. Do not save invented values.
4. Complete real sandbox checkout, signed webhook, full capture, cancellation,
   fee/refund and settlement/reversal acceptance. Local injected responses do
   not prove provider execution or compatibility with an approved account.
5. Complete reviewed deployment, production administrator setup and explicit
   activation. Keys alone do not finish code review, business approval, provider
   acceptance or release checks. No live funds have been processed in this pass.

## Verification plan and guide impact

Unit tests cover exact amounts, HMAC/raw bytes, invalid headers and bounded
payloads. Convex tests cover frozen scope, authorization, one persisted order,
lease races, duplicate/reordered events, orphan/mismatched/late success, retry
identity, missing settings and live blocking. Injected HTTP responses prove local
adapter behavior only. Buyer accounts without a verified Indian phone remain
blocked; no placeholder contact is sent. The accepted-trade sandbox dialog,
admin payment setup and verified-email phone binding are user-visible. The
maintained guide describes these controls, their unavailable states and the
default-off live activation and separate financial states. Real local screenshots and labelled isolated fixtures
must keep their provenance separate from provider acceptance.

## Administrator setup controls

The authenticated `/admin/payments` page lists approved businesses in bounded
pages and separates sandbox and live vendor references. The configured admin
must complete TOTP before reading or changing this setup. The administrator can
save an existing Cashfree vendor reference once; a business or vendor cannot be
reassigned silently. Repeating the same mapping is a no-op. Suspended businesses
cannot register a mapping or request provider lookup. Registration writes an
audit record with the admin identity and leaves status `UNVERIFIED`.

**Check with Cashfree** is a separate explicit action. It is available only when
matching backend credentials exist. The server checks admin access, business
status and the frozen mapping again, then reads the fixed provider endpoint.
Only the response can change provider status. The page returns no API keys,
bank details or KYC documents. It does not create provider accounts, move money
or activate live checkout. Sandbox tests with injected responses do not
prove provider approval or a real request.

## Buyer sandbox interface and phone ownership

An accepted trade exposes **Sandbox checkout** in the trade UI. The dialog
reads guarded availability and status for the current business. Only an eligible
buyer operator sees **Open sandbox**. Without configuration or other required
approval it shows the unavailable state. Merely loading a page or opening the
dialog must not request Cashfree's SDK or create a provider order.

An explicit **Open sandbox** click first calls the guarded checkout action.
Only a returned sandbox-ready session can load the fixed SDK URL
`https://sdk.cashfree.com/js/v3/cashfree.js` into the inline checkout target.
The session remains in component memory. It does not enter a URL, document,
local storage or log. Identity/workspace changes, loss of permission or
configuration, dialog close and unmount cancel pending client work and remove
the checkout host. A late action or SDK result cannot reopen it. The server
rechecks permission and frozen scope independently of UI state.

Status is based on the server's evidence: waiting, sandbox collection confirmed,
review required or unavailable. A client SDK callback cannot mark collection
confirmed. Sandbox collection never authorizes live dispatch, receipt, refunds or
settlement. The separate live dialog appears only when the server permits live
checkout. Both modes use the same protected in-memory session handling; SDK
callbacks never establish collection.

A verified email user can explicitly verify one unused Indian mobile number
through Account security. The current full email session and any TOTP remain
required; stale assurance requires full sign-in again. The operation retains
that identity/session, does not merge an existing phone account, does not replace
an existing verified number and does not enable phone-OTP sign-in to an email
account. Checkout still requires the verified phone on the auth identity and its
matching profile. See [authentication](auth.md).

The administrator setup page records the immutable org/vendor mapping and
requests provider verification. First checkout requires fresh ACTIVE provider
evidence; an administrator cannot assert ACTIVE manually. Provider-confirmed terminal unpaid orders can complete cancellation under the
reviewed lifecycle. Expiry alone cannot release a commitment. The same trade
does not receive a replacement provider order merely because a checkout failed.

## Commercial document references remain separate

The approved business workspace has `/app/evidence` for reported GST invoice,
e-way bill, CPCB EPR certificate and pollution-control consent references. A
reference can link only to an owned trade. Operators may add a reference or an
append-only replacement; viewers can read permitted history only. The original
remains visible and replacements preserve their document-type/trade chain.

These records are explicitly unverified. No file upload, authority integration,
certificate minting, payment confirmation, stock change or settlement follows
from saving one. An EPR reference does not satisfy a payment gate, and sandbox
payment evidence does not validate a tax or compliance document.
