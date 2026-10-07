# 0009. Money stays off the platform in the pilot

- **Status:** Superseded by 0019 for business trades
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

Households are paid at the door in cash or by UPI. The vision includes escrow
between businesses, which needs a payment-aggregator setup (Razorpay Route),
business KYC and settlement rules — weeks of work and approvals.

## Decision

- In the pilot, Luma.Green **records** payments — amount, method, time — and
  does not move money.
- Escrow for business-to-business trades comes later as a `payments` module on
  Razorpay Route; the `trades` table already has room for a payment reference.
- All amounts stay integer paise.

## Consequences

- No payment licences or card data in the pilot.
- "Business generated through Luma.Green" is measured from recorded receipts,
  which depend on kabadiwalas recording every pickup — the weigh-and-pay screen
  must be the fastest way to finish a pickup.

## Alternatives considered

- **UPI collect or payment links for households** — adds a step at the door for
  no pilot benefit.
