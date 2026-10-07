# 0019. Business payments require a verified gateway

- **Status:** Decided — supersedes ADR 0009 for business trades
- **Date:** 6 Oct 2026
- **Decider:** founder

## Context

The prototype lets a buyer advance a trade through simulated escrow. This
changes a trade status and creates a receipt number without moving money. The
founder now requires business-to-business payments only through a payment
gateway. On 6 October the founder delegated provider selection to the engineer.
Cashfree Payment Gateway with Easy Split is selected for implementation. The
production account and marketplace use case still require provider approval.

## Decision

- No buyer, seller or administrator may mark a business payment complete by
  entering a reference or pressing a simulated pay action.
- Payment-dependent dispatch, completion, settlement and receipt claims stay
  blocked until a verified gateway event supports them. Webhook signatures,
  idempotency, reconciliation, refunds and failure handling are release gates.
- Old prototype payment states, if retained for audit, are labelled
  unverified. They are not evidence of funds being held or transferred.
- The kabadiwala buys household material and pays the household directly;
  that household payment is outside this B2B gateway decision. Luma does not
  collect or send it.
- Use one Cashfree adapter for checkout and marketplace seller splits. Do not
  add a second gateway fallback. Keep provider order amounts in exact paise at
  the app boundary, validate signed raw webhook payloads and reconcile payment
  attempts separately from seller settlement. A sandbox success cannot unlock
  a live trade.
- Cashfree must confirm the use case, business onboarding, seller verification,
  Easy Split activation and the refund/dispute process. These are release gates,
  not consequences of selecting the provider.

## Consequences

Business quotations and evidence can be recorded while the gateway is being
built, but a trade cannot advance through payment-dependent states. The
frontend, industry API and reports must use the same payment truth. Gateway
fees, responsible payer and settlement terms remain interview decisions.

Cashfree's [Easy Split overview](https://www.cashfree.com/docs/payments/split/overview)
documents vendor management, order splits, refunds and settlement reports, with
account-manager activation. These capabilities fit Luma's marketplace payment
flow; this technical fit is not proof of merchant eligibility. Razorpay Route
was considered but has not been implemented or configured.
