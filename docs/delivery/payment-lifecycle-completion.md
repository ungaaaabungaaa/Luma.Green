# Payment lifecycle completion

7 October 2026. Backend implementation, focused checks and combined local browser acceptance complete; final documentation and release checks pending. Owner: business release agent; UI owner: root; independent review: auth release agent.

The first supported flow is one accepted trade, its full agreed quantity, one full captured INR payment and one seller split. Collection, delivery, refund and settlement are independent facts. Collection is not escrow. No settlement delay until delivery is assumed.

## Authority and current owners

`cashfreePayments` owns immutable orders and verified collection evidence. `market` already reserves accepted stock. `cashfreeLifecycle` owns one financial state per trade and the guarded delivery/cancellation ledger. New immutable policy, refund and settlement evidence rows supplement that state. Existing legacy simulated statuses remain readable but cannot grant authority. No records are deleted or migrated into verified state.

The current inventory cache plus audit log is the implemented stock owner; the old convex-data playbook's inventoryMovements table does not exist. This change adds a uniquely keyed financial movement ledger and update the existing inventory cache atomically for these new movements. It does not create a competing total for historical stock.

## Scope and stages

1. Add immutable versioned approved policy records. Each live order freezes one policy ID. Explicit server configuration selects the version and enables live checkout; absent configuration fails closed. Policy records state the fee payer, refund funder, supported admin refund authority, settlement terms reference and provider acceptance reference. These are approvals, not payment evidence.
2. Extend existing checkout/reconciliation to live mode only through that gate, active provider vendor evidence and existing signed/lookup proof. Sandbox remains unable to authorize material movements. Exact-once collection authorizes an accepted trade without reserving its stock a second time.
3. Guard full-quantity seller dispatch and buyer receipt, with explicit references, immutable uniquely keyed movements, atomic inventory changes and audit. Existing trade status is updated by this owner; legacy pay/dispatch shortcuts remain blocked.
4. Record cancellation requests. No-provider-order cancellation may release stock immediately. Once an order exists, terminal unpaid provider evidence is required. Expiry or a browser close alone is not proof. Late or conflicting collection holds the trade for reconciliation without silently moving stock or refunding.
5. Add immutable full-refund requests, exact cumulative limits, frozen provider refund identity, durable leases/retry, lookup-before-retry and immutable provider observations. Admin requests require the frozen approved authority and funder. Refund evidence never asserts a physical return or silently restores inventory.
6. Reconcile provider order-level seller split settlement, including fees and reversals. Aggregate settlement webhooks trigger order lookup only. No aggregate SUCCESS can settle one trade. Unknown/mismatched/partial evidence holds rather than completes the flow.
7. Add meaningful Convex, HTTP/action and race tests. Root wires guarded status/action and admin policy/refund/reconciliation screens, translations, component and browser tests. Re-run all checks and fresh captures; rebuild the maintained guide.

## Explicit holds

Partial payments, partial receipts, QC disputes, arbitrary adjustments, replacement orders and automatic refund decisions are unsupported in this first flow. Do not invent commercial rules for them. Provider onboarding, Easy Split access, seller KYC, approved origins, real sandbox/webhook tests and final live acceptance remain external gates. No external funds or cloud configuration will be changed during this work.

## Verification

TDD Route: light, project tests required, no user request for strict test-first ordering. Tests cover org/role/admin boundaries; missing policy/settings; live/sandbox isolation; concurrent/replayed success; stale leases and changed identities; exact amounts and stock; cancellation/expiry races; full refund sum/retries/reversal; per-order settlement matching; immutable policies and historical legacy denial. Source review is independent. Local injected responses prove software contracts only.

Execution route: inline backend owner plus existing separate UI/review/document owners. No new worktree, dependency, destructive migration or production operation is needed.

## Provider references checked

- Cashfree Create Refund: https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund
- Cashfree order split/settlement lookup: https://www.cashfree.com/docs/api-reference/payments/latest/easy-split/get-split-and-settlement-details-by-orderid
- Cashfree split webhooks: https://www.cashfree.com/docs/payments/split/webhooks

These document mechanics. They do not select Luma's commercial policies or prove its account approval.

## Focused backend verification — 7 October 2026

All 137 focused tests passed across `cashfreeLifecycle.test.ts`, `cashfreeLifecycleActions.test.ts`, `cashfreeLifecycleHttp.test.ts`, `cashfreePayments.test.ts` and `market.test.ts`. This includes real HTTP HMAC validation with synthetic provider payloads, malformed signed amounts, sandbox isolation, uncertain refund POST recovery, immutable refund identity, gross/net fee reconciliation, material revocation, stock replay protection and policy-pause recovery. Backend TypeScript and scoped lint passed. Logs: `/private/tmp/luma-financial-units-final.log`, `/private/tmp/luma-financial-types-final.log` and `/private/tmp/luma-financial-lint-final.log`. Independent source review found no remaining actionable issue in the reviewed boundary. These checks used no real provider account or funds.

New checkout and dispatch require the selected policy and explicit activation. Existing-order receipt, refund and reconciliation use the frozen order policy and their current permission/provider guards, so pausing new checkout does not prevent incident recovery.

A full refund confirms money returned only. The financial state remains held for physical and commercial resolution; it does not cancel the trade, restore stock or release the reservation automatically. Automatic approval review rejected the proposed automatic cancellation, so it was not applied. Partial refunds, partial delivery and dispute decisions remain explicit unsupported holds. The complete production-mode local browser suite subsequently passed 50 of 50 cases, including inactive policy save and unpaid cancellation. Full web/backend type checks also passed. Final whole-project checks, fresh visual captures, documentation publication, deployment and provider acceptance remain separate gates.
